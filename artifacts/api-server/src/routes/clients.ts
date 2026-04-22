import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, clientsTable } from "@workspace/db";
import {
  ListClientsResponse,
  CreateClientBody,
  GetClientParams,
  GetClientResponse,
  UpdateClientParams,
  UpdateClientBody,
  UpdateClientResponse,
  DeleteClientParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";

const router: IRouter = Router();

router.get("/clients", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(clientsTable)
    .orderBy(desc(clientsTable.createdAt));
  res.json(ListClientsResponse.parse(rows));
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(clientsTable)
    .values(parsed.data)
    .returning();
  if (!created) {
    res.status(500).json({ error: "Failed" });
    return;
  }
  await logActivity("criou", "cliente", `Novo cliente: ${created.name}`);
  res.status(201).json(GetClientResponse.parse(created));
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  res.json(GetClientResponse.parse(row));
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  await logActivity("atualizou", "cliente", `Cliente ${updated.name} atualizado`);
  res.json(UpdateClientResponse.parse(updated));
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(clientsTable)
    .where(eq(clientsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  await logActivity("excluiu", "cliente", `Cliente ${deleted.name} excluído`);
  res.sendStatus(204);
});

export default router;
