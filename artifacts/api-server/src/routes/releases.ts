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

router.get(
  "/releases/:nuchave/:sequencia/details",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const nuchave = Number(req.params.nuchave);
    const sequencia = Number(req.params.sequencia);
    if (!Number.isFinite(nuchave) || !Number.isFinite(sequencia)) {
      res.status(400).json({ error: "Chave invalida" });
      return;
    }

    const { data: release, error: relErr } = await supabase
      .from(TABLE)
      .select("*")
      .eq("nuchave", nuchave)
      .eq("sequencia", sequencia)
      .maybeSingle();

    if (relErr) {
      logger.error({ err: relErr }, "Failed to load tsilib row for details");
      res.status(500).json({ error: "Erro ao carregar liberacao" });
      return;
    }
    if (!release) {
      res.status(404).json({ error: "Liberacao nao encontrada" });
      return;
    }

    let event: { evento: number; descricao: string } | null = null;
    if (release.evento != null) {
      const { data: evt, error: evtErr } = await supabase
        .from("VGFLIBEVE")
        .select("EVENTO,DESCRICAO")
        .eq("EVENTO", release.evento)
        .maybeSingle();
      if (evtErr) {
        logger.warn({ err: evtErr }, "Failed to load VGFLIBEVE event");
      } else if (evt) {
        event = {
          evento: Number((evt as any).EVENTO),
          descricao: String((evt as any).DESCRICAO ?? ""),
        };
      }
    }

    let note: Record<string, unknown> | null = null;
    let items: Record<string, unknown>[] = [];

    const tabela = String(release.tabela ?? "").trim().toUpperCase();
    if (tabela === "TGFCAB") {
      const { data: cab, error: cabErr } = await supabase
        .from("TGFCAB")
        .select(
          "NUNOTA,CODPARC,CODVEND,CODEMP,DTNEG,DTFATUR,DTENTSAI,VLRNOTA,OBSERVACAO,STATUSNOTA,APROVADO,TIPMOV,CODTIPOPER",
        )
        .eq("NUNOTA", release.nuchave)
        .maybeSingle();
      if (cabErr) {
        logger.warn({ err: cabErr }, "Failed to load TGFCAB header");
      } else if (cab) {
        note = cab as Record<string, unknown>;
      }

      const { data: ite, error: iteErr } = await supabase
        .from("TGFITE")
        .select(
          "NUNOTA,SEQUENCIA,CODPROD,CODVOL,QTDNEG,VLRUNIT,VLRTOT,VLRDESC,PERCDESC,OBSERVACAO",
        )
        .eq("NUNOTA", release.nuchave)
        .order("SEQUENCIA", { ascending: true });
      if (iteErr) {
        logger.warn({ err: iteErr }, "Failed to load TGFITE items");
      } else if (Array.isArray(ite)) {
        items = ite as Record<string, unknown>[];
      }
    }

    res.json({ release, event, note, items });
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
    const obslibTrimmed =
      typeof obslibRaw === "string" ? obslibRaw.trim() : "";
    if (obslibTrimmed === "") {
      res
        .status(400)
        .json({ error: "Observacao da liberacao e obrigatoria." });
      return;
    }
    const obslib = obslibTrimmed.slice(0, 255);

    const { data: existing, error: existingErr } = await supabase
      .from(TABLE)
      .select("nuchave, sequencia, vlratual, dhlib")
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

    // Always release exactly the requested value (vlratual). Any value supplied
    // by the client is intentionally ignored to prevent over/under-releasing.
    const vlrLiberado = Number(existing.vlratual ?? 0);

    const userIdRaw = req.user?.id ?? 0;
    // codusulib is smallint (max 32767)
    const codusulib = Math.max(0, Math.min(32767, Math.trunc(userIdRaw)));

    const update: Record<string, unknown> = {
      dhlib: new Date().toISOString(),
      codusulib,
      vlrliberado: vlrLiberado,
      obslib,
    };

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
