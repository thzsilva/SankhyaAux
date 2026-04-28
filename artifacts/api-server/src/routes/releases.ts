import { Router, type IRouter, type Response } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import { requireAuth, type AuthedRequest } from "./auth";

const router: IRouter = Router();

const TABLE = "tsilib";

// Carrega o mapa codusu -> nome a partir da tabela opcional `sankhya_users`.
// Se a tabela nao existir (migration nao foi rodada), retorna mapa vazio
// silenciosamente para nao quebrar o fluxo.
async function loadSankhyaUserNames(
  codusus: number[],
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const unique = Array.from(new Set(codusus.filter((c) => Number.isFinite(c))));
  if (unique.length === 0) return result;
  const { data, error } = await supabase
    .from("sankhya_users")
    .select("codusu,nome")
    .in("codusu", unique);
  if (error) {
    // PGRST205 = tabela nao encontrada (migration nao rodada). Tudo bem.
    if (error.code !== "PGRST205") {
      logger.warn({ err: error }, "Falha ao carregar nomes em sankhya_users");
    }
    return result;
  }
  for (const row of data ?? []) {
    const codusu = Number((row as any).codusu);
    const nome = String((row as any).nome ?? "").trim();
    if (Number.isFinite(codusu)) result.set(codusu, nome);
  }
  return result;
}

// Lista de usuarios solicitantes distintos (com nome quando disponivel).
router.get(
  "/releases/solicitantes",
  requireAuth,
  async (_req: AuthedRequest, res: Response): Promise<void> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("codususolicit")
      .not("codususolicit", "is", null)
      .limit(2000);
    if (error) {
      logger.error({ err: error }, "Falha ao listar solicitantes");
      res.status(500).json({ error: "Erro ao listar solicitantes" });
      return;
    }
    const codigos = Array.from(
      new Set(
        (data ?? [])
          .map((r: any) => Number(r.codususolicit))
          .filter((n) => Number.isFinite(n)),
      ),
    ).sort((a, b) => a - b);
    const names = await loadSankhyaUserNames(codigos);
    res.json(
      codigos.map((codusu) => ({
        codusu,
        nome: names.get(codusu) ?? "",
      })),
    );
  },
);

router.get(
  "/releases",
  requireAuth,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const status = String(req.query.status ?? "all").toLowerCase();
    const codusuFilterRaw = req.query.codususolicit;
    const codusuFilter =
      codusuFilterRaw != null && codusuFilterRaw !== ""
        ? Number(codusuFilterRaw)
        : null;

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
    if (codusuFilter != null && Number.isFinite(codusuFilter)) {
      query = query.eq("codususolicit", codusuFilter);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ err: error }, "Failed to query tsilib releases");
      res.status(500).json({ error: "Erro interno ao buscar liberacoes" });
      return;
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const codusus = rows
      .map((r) => Number(r.codususolicit))
      .filter((n) => Number.isFinite(n));
    const names = await loadSankhyaUserNames(codusus);
    const enriched = rows.map((r) => {
      const c = Number(r.codususolicit);
      return {
        ...r,
        solicitante_nome: Number.isFinite(c) ? names.get(c) ?? "" : "",
      };
    });

    res.json(enriched);
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

    // VGFLIBEVE foi criada com nome em UPPERCASE (entre aspas) no Supabase,
    // entao o nome da tabela e suas colunas precisam vir em UPPERCASE.
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

    // Tabelas tgfcab/tgfite no Supabase estao em LOWERCASE (sem aspas).
    // Identificadores precisam casar exatamente, entao usamos lowercase aqui.
    const tabela = String(release.tabela ?? "").trim().toUpperCase();
    if (tabela === "TGFCAB") {
      const { data: cab, error: cabErr } = await supabase
        .from("tgfcab")
        .select(
          "nunota,codparc,codvend,codemp,codusu,codusuinc,dtneg,dtfatur,dtentsai,vlrnota,observacao,statusnota,aprovado,tipmov,codtipoper",
        )
        .eq("nunota", release.nuchave)
        .maybeSingle();
      if (cabErr) {
        logger.warn({ err: cabErr }, "Failed to load tgfcab header");
      } else if (cab) {
        note = cab as Record<string, unknown>;
      }

      const { data: ite, error: iteErr } = await supabase
        .from("tgfite")
        .select(
          "nunota,sequencia,codprod,codvol,qtdneg,vlrunit,vlrtot,vlrdesc,percdesc,observacao",
        )
        .eq("nunota", release.nuchave)
        .order("sequencia", { ascending: true });
      if (iteErr) {
        logger.warn({ err: iteErr }, "Failed to load tgfite items");
      } else if (Array.isArray(ite)) {
        items = ite as Record<string, unknown>[];
      }
    }

    // Resolve nomes para codususolicit (tsilib) e codusu/codusuinc (tgfcab).
    const codusus: number[] = [];
    if (release.codususolicit != null) codusus.push(Number(release.codususolicit));
    if (release.codusulib != null) codusus.push(Number(release.codusulib));
    if (note?.codusu != null) codusus.push(Number(note.codusu));
    if (note?.codusuinc != null) codusus.push(Number(note.codusuinc));
    const names = await loadSankhyaUserNames(codusus);
    const nameOf = (v: unknown): string => {
      const n = Number(v);
      return Number.isFinite(n) ? names.get(n) ?? "" : "";
    };

    const usuarios = {
      solicitante: {
        codusu: release.codususolicit ?? null,
        nome: nameOf(release.codususolicit),
      },
      liberador: {
        codusu: release.codusulib ?? null,
        nome: nameOf(release.codusulib),
      },
      nota_responsavel:
        note != null
          ? {
              codusu: note.codusu ?? null,
              nome: nameOf(note.codusu),
            }
          : null,
      nota_inclusor:
        note != null
          ? {
              codusu: note.codusuinc ?? null,
              nome: nameOf(note.codusuinc),
            }
          : null,
    };

    res.json({ release, event, note, items, usuarios });
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
