import { Router, type IRouter } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import {
  ListClientsResponse,
  GetClientParams,
  GetClientResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("tgfpar")
    .select("*")
    .order("dtcad", { ascending: false });

  if (error) {
    logger.error({ err: error }, "Failed to query tgfpar clients");
    res.status(500).json({ error: "Erro interno ao buscar clientes" });
    return;
  }

  const clients = (data ?? []).map((row: any) => ({
    id: Number(row.codparc ?? 0),
    name: String(row.nomeparc ?? ""),
    sankhyaCode: String(row.codparc ?? ""),
    cnpj: String(row.cgc_cpf ?? ""),
    phone: String(row.telefone ?? ""),
    email: String(row.email ?? ""),
    notes: row.razaosocial ? String(row.razaosocial) : null,
    createdAt: row.dtcad ? new Date(String(row.dtcad)) : new Date(),
  }));

  res.json(ListClientsResponse.parse(clients));
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

  const client = {
    id: Number(data.codparc ?? 0),
    name: String(data.nomeparc ?? ""),
    sankhyaCode: String(data.codparc ?? ""),
    cnpj: String(data.cgc_cpf ?? ""),
    phone: String(data.telefone ?? ""),
    email: String(data.email ?? ""),
    notes: data.razaosocial ? String(data.razaosocial) : null,
    createdAt: data.dtcad ? new Date(String(data.dtcad)) : new Date(),
  };

  res.json(GetClientResponse.parse(client));
});

export default router;
