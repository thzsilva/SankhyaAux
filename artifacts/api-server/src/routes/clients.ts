import { Router, type IRouter } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import {
  ListClientsQueryParams,
  ListClientsResponse,
  GetClientParams,
  GetClientResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeClient(row: any) {
  return {
    id: Number(row.codparc ?? 0),
    name: String(row.nomeparc ?? ""),
    sankhyaCode: String(row.codparc ?? ""),
    cnpj: String(row.cgc_cpf ?? ""),
    phone: String(row.telefone ?? ""),
    email: String(row.email ?? ""),
    notes: row.razaosocial ? String(row.razaosocial) : null,
    createdAt: row.dtcad ? new Date(String(row.dtcad)) : new Date(),
  };
}

router.get("/clients", async (req, res): Promise<void> => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = supabase
    .from("tgfpar")
    .select("codparc,nomeparc,cgc_cpf,telefone,email,razaosocial,dtcad")
    .order("dtcad", { ascending: false })
    .limit(1000);

  if (parsed.data.search) {
    const q = `%${parsed.data.search}%`;
    const numericSearch = Number(parsed.data.search);

    // Se for numérico inclui codparc.eq para bater exatamente o código
    if (Number.isFinite(numericSearch) && numericSearch > 0) {
      query = query.or(
        `nomeparc.ilike.${q},cgc_cpf.ilike.${q},razaosocial.ilike.${q},codparc.eq.${numericSearch}`,
      );
    } else {
      query = query.or(`nomeparc.ilike.${q},cgc_cpf.ilike.${q},razaosocial.ilike.${q}`);
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.error({ err: error }, "Failed to query tgfpar clients");
    res.status(500).json({ error: "Erro interno ao buscar clientes" });
    return;
  }

  res.json(ListClientsResponse.parse((data ?? []).map(serializeClient)));
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { data, error } = await supabase
    .from("tgfpar")
    .select("*")
    .eq("codparc", params.data.id)
    .maybeSingle();

  if (error) {
    logger.error({ err: error }, "Failed to query tgfpar client by id");
    res.status(500).json({ error: "Erro interno ao buscar cliente" });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }

  res.json(GetClientResponse.parse(serializeClient(data)));
});

export default router;
