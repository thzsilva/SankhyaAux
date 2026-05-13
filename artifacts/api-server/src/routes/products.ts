import { Router, type IRouter } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  GetProductParams,
  GetProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serialize(row: any) {
  return {
    id: Number(row.codprod ?? 0),
    code: String(row.referencia ?? ""),
    name: String(row.descrprod ?? ""),
    description: row.descrprod ? String(row.descrprod) : null,
    unit: String(row.codvol ?? "UN"),
    unitPrice: 0,
    stock: 0,
    category: row.codgrupoprod != null ? String(row.codgrupoprod) : "",
    sankhyaCode: String(row.codprod ?? ""),
    createdAt: row.dtalter ? new Date(String(row.dtalter)) : new Date(),
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = supabase.from("tgfpro").select("*");

  if (parsed.data.search) {
    const q = `%${parsed.data.search}%`;
    query = query.or(`descrprod.ilike.${q},referencia.ilike.${q}`);
  }

  if (parsed.data.category) {
    query = query.eq("codgrupoprod", Number(parsed.data.category));
  }

  const { data, error } = await query.order("dtalter", { ascending: false });
  if (error) {
    logger.error({ err: error }, "Failed to query tgfpro products");
    res.status(500).json({ error: "Erro interno ao buscar produtos" });
    return;
  }

  res.json(ListProductsResponse.parse((data ?? []).map(serialize)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { data, error } = await supabase
    .from("tgfpro")
    .select("*")
    .eq("codprod", params.data.id)
    .maybeSingle();

  if (error) {
    logger.error({ err: error }, "Failed to query tgfpro product by id");
    res.status(500).json({ error: "Erro interno ao buscar produto" });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }

  res.json(GetProductResponse.parse(serialize(data)));
});

router.patch("/products/:id/toggle-lote", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  // Lê valor atual
  const { data: current, error: fetchError } = await supabase
    .from("tgfpro")
    .select("temrastrolote")
    .eq("codprod", id)
    .maybeSingle();

  if (fetchError) {
    logger.error({ err: fetchError }, "toggle-lote: falha ao buscar tgfpro");
    res.status(500).json({ error: "Erro ao buscar produto", detail: fetchError.message });
    return;
  }
  if (!current) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }

  const novoValor = current.temrastrolote === "N" ? "S" : "N";

  const { error: updateError } = await supabase
    .from("tgfpro")
    .update({ temrastrolote: novoValor })
    .eq("codprod", id);

  if (updateError) {
    logger.error({ err: updateError }, "toggle-lote: falha ao atualizar tgfpro");
    res.status(500).json({ error: "Erro ao atualizar produto", detail: updateError.message });
    return;
  }

  res.json({ temrastrolote: novoValor });
});

export default router;
