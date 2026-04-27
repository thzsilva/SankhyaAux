import { Router, type IRouter, type Response } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import { requireAuth, type AuthedRequest } from "./auth";

const router: IRouter = Router();

const TABLE = "tsilib";

router.get(
  "/releases",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const status = String(req.query.status ?? "all").toLowerCase();

    let query = supabase
      .from(TABLE)
      .select("*")
      .order("dhsolicit", { ascending: false })
      .limit(500);

    if (status === "pending") {
      query = query.is("dhlib", null).eq("reprovado", "N");
    } else if (status === "released") {
      query = query.not("dhlib", "is", null);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ err: error }, "Failed to query tsilib releases");
      res.status(500).json({ error: "Erro interno ao buscar liberacoes" });
      return;
    }

    res.json(data ?? []);
  },
);

router.post(
  "/releases/:nuchave/:sequencia/release",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const role = req.user?.role;
    if (role !== "robot" && role !== "human" && role !== "SA") {
      res.status(403).json({ error: "Sem permissao para liberar" });
      return;
    }

    const nuchave = Number(req.params.nuchave);
    const sequencia = Number(req.params.sequencia);
    if (!Number.isFinite(nuchave) || !Number.isFinite(sequencia)) {
      res.status(400).json({ error: "Chave invalida" });
      return;
    }

    const obslibRaw = req.body?.obslib;
    const obslib =
      typeof obslibRaw === "string" && obslibRaw.trim() !== ""
        ? obslibRaw.trim().slice(0, 255)
        : null;
    const vlrLiberadoRaw = Number(req.body?.vlrliberado);

    const { data: existing, error: existingErr } = await supabase
      .from(TABLE)
      .select("nuchave, sequencia, vlratual, vlrliberado, dhlib")
      .eq("nuchave", nuchave)
      .eq("sequencia", sequencia)
      .maybeSingle();

    if (existingErr) {
      logger.error({ err: existingErr }, "Failed to load tsilib record");
      res.status(500).json({ error: "Erro ao carregar liberacao" });
      return;
    }
    if (!existing) {
      res.status(404).json({ error: "Liberacao nao encontrada" });
      return;
    }
    if (existing.dhlib) {
      res.status(409).json({ error: "Liberacao ja efetuada" });
      return;
    }

    const fallback = Number(existing.vlratual ?? existing.vlrliberado ?? 0);
    const vlrLiberado =
      Number.isFinite(vlrLiberadoRaw) && vlrLiberadoRaw > 0
        ? vlrLiberadoRaw
        : fallback;

    const userIdRaw = req.user?.id ?? 0;
    // codusulib is smallint (max 32767)
    const codusulib = Math.max(0, Math.min(32767, Math.trunc(userIdRaw)));

    const update: Record<string, unknown> = {
      dhlib: new Date().toISOString(),
      codusulib,
      vlrliberado: vlrLiberado,
    };
    if (obslib !== null) update.obslib = obslib;

    const { data: updated, error: updateError } = await supabase
      .from(TABLE)
      .update(update)
      .eq("nuchave", nuchave)
      .eq("sequencia", sequencia)
      .select()
      .maybeSingle();

    if (updateError) {
      logger.error({ err: updateError }, "Failed to release tsilib row");
      res.status(500).json({ error: "Erro ao liberar" });
      return;
    }

    res.json(updated);
  },
);

export default router;
