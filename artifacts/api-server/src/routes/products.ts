import { Router, type IRouter } from "express";
import { eq, desc, or, ilike, and } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";

const router: IRouter = Router();

function serialize(p: typeof productsTable.$inferSelect) {
  return { ...p, unitPrice: Number(p.unitPrice) };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conds = [];
  if (parsed.data.search) {
    const q = `%${parsed.data.search}%`;
    conds.push(
      or(
        ilike(productsTable.name, q),
        ilike(productsTable.code, q),
        ilike(productsTable.description, q),
      ),
    );
  }
  if (parsed.data.category)
    conds.push(eq(productsTable.category, parsed.data.category));

  const rows = await db
    .select()
    .from(productsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(productsTable.createdAt));
  res.json(ListProductsResponse.parse(rows.map(serialize)));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(productsTable)
    .values({ ...parsed.data, unitPrice: String(parsed.data.unitPrice) })
    .returning();
  if (!created) {
    res.status(500).json({ error: "Failed" });
    return;
  }
  await logActivity("criou", "produto", `Novo produto: ${created.name}`);
  res.status(201).json(GetProductResponse.parse(serialize(created)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }
  res.json(GetProductResponse.parse(serialize(row)));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.unitPrice !== undefined)
    updateData.unitPrice = String(parsed.data.unitPrice);
  const [updated] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }
  await logActivity("atualizou", "produto", `Produto ${updated.name} atualizado`);
  res.json(UpdateProductResponse.parse(serialize(updated)));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }
  await logActivity("excluiu", "produto", `Produto ${deleted.name} excluído`);
  res.sendStatus(204);
});

export default router;
