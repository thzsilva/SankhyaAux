import { Router, type IRouter, type Response } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import { requireAuth, type AuthedRequest } from "./auth";

const router: IRouter = Router();
const TABLE = "tsilib";

// =====================================================================
// Helpers de carga de tabelas auxiliares.
function nowBrasiliaISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}


// Todas tolerantes a "tabela inexistente" (Postgrest erro PGRST205) -
// se a tabela ainda nao foi criada no Supabase, retornam mapa vazio em
// vez de quebrar a request. Isso permite ir adicionando as tabelas de
// apoio (tgftop, tgfnat, tgftrb, tgfemp) gradualmente sem precisar de
// um deploy coordenado.
// =====================================================================

interface ParceiroLite {
  codparc: number;
  nomeparc: string;
  razaosocial: string | null;
  cgc_cpf: string | null;
}

interface VendedorLite {
  codvend: number;
  apelido: string | null;
}

interface ProdutoLite {
  codprod: number;
  descrprod: string | null;
  referencia: string | null;
}

interface TipoOperacaoLite {
  codtipoper: number;
  descroper: string | null;
}

interface NaturezaLite {
  codnat: number;
  descrnat: string | null;
}

interface EmpresaLite {
  codemp: number;
  nomefant: string | null;
  razaosocial: string | null;
}

interface TributacaoLite {
  codtrib: number;
  descrtrib: string | null;
  cst: string | null;
  csosn: string | null;
}

// Util generico para carregar { id -> obj } sendo tolerante a:
// - lista vazia / ids invalidos
// - tabela inexistente (PGRST205)
// - erros de schema/coluna (logados em warn, retorna mapa vazio)
async function safeLoadMap<T>(
  table: string,
  pkCol: string,
  ids: number[],
  selectCols: string,
  builder: (row: Record<string, unknown>) => [number, T] | null,
): Promise<Map<number, T>> {
  const result = new Map<number, T>();
  const unique = Array.from(new Set(ids.filter((c) => Number.isFinite(c))));
  if (unique.length === 0) return result;

  const { data, error } = await supabase
    .from(table)
    .select(selectCols)
    .in(pkCol, unique);

  if (error) {
    // PGRST205 = relation not found. Tudo bem, segue sem enriquecer.
    if (error.code !== "PGRST205") {
      logger.warn({ err: error, table }, `Falha ao carregar ${table}`);
    }
    return result;
  }

  for (const row of data ?? []) {
    const built = builder(row as Record<string, unknown>);
    if (built) result.set(built[0], built[1]);
  }
  return result;
}

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
    if (error.code !== "PGRST205") {
      logger.warn({ err: error }, "Falha ao carregar nomes em sankhya_users");
    }
    return result;
  }

  for (const row of data ?? []) {
    const codusu = Number((row as Record<string, unknown>).codusu);
    const nome = String((row as Record<string, unknown>).nome ?? "").trim();
    if (Number.isFinite(codusu)) result.set(codusu, nome);
  }
  return result;
}

async function loadParceiros(ids: number[]): Promise<Map<number, ParceiroLite>> {
  return safeLoadMap<ParceiroLite>(
    "tgfpar",
    "codparc",
    ids,
    "codparc,nomeparc,razaosocial,cgc_cpf",
    (r) => {
      const id = Number(r.codparc);
      if (!Number.isFinite(id)) return null;
      return [
        id,
        {
          codparc: id,
          nomeparc: String(r.nomeparc ?? "").trim(),
          razaosocial: (r.razaosocial as string | null) ?? null,
          cgc_cpf: (r.cgc_cpf as string | null) ?? null,
        },
      ];
    },
  );
}

async function loadVendedores(ids: number[]): Promise<Map<number, VendedorLite>> {
  return safeLoadMap<VendedorLite>(
    "tgfven",
    "codvend",
    ids,
    "codvend,apelido",
    (r) => {
      const id = Number(r.codvend);
      if (!Number.isFinite(id)) return null;
      return [id, { codvend: id, apelido: (r.apelido as string | null) ?? null }];
    },
  );
}

async function loadProdutos(ids: number[]): Promise<Map<number, ProdutoLite>> {
  return safeLoadMap<ProdutoLite>(
    "tgfpro",
    "codprod",
    ids,
    "codprod,descrprod,referencia",
    (r) => {
      const id = Number(r.codprod);
      if (!Number.isFinite(id)) return null;
      return [
        id,
        {
          codprod: id,
          descrprod: (r.descrprod as string | null) ?? null,
          referencia: (r.referencia as string | null) ?? null,
        },
      ];
    },
  );
}

async function loadTiposOperacao(
  ids: number[],
): Promise<Map<number, TipoOperacaoLite>> {
  return safeLoadMap<TipoOperacaoLite>(
    "tgftop",
    "codtipoper",
    ids,
    "codtipoper,descroper",
    (r) => {
      const id = Number(r.codtipoper);
      if (!Number.isFinite(id)) return null;
      return [
        id,
        { codtipoper: id, descroper: (r.descroper as string | null) ?? null },
      ];
    },
  );
}

async function loadNaturezas(ids: number[]): Promise<Map<number, NaturezaLite>> {
  return safeLoadMap<NaturezaLite>(
    "tgfnat",
    "codnat",
    ids,
    "codnat,descrnat",
    (r) => {
      const id = Number(r.codnat);
      if (!Number.isFinite(id)) return null;
      return [id, { codnat: id, descrnat: (r.descrnat as string | null) ?? null }];
    },
  );
}

async function loadEmpresas(ids: number[]): Promise<Map<number, EmpresaLite>> {
  return safeLoadMap<EmpresaLite>(
    "tgfemp",
    "codemp",
    ids,
    "codemp,nomefant,razaosocial",
    (r) => {
      const id = Number(r.codemp);
      if (!Number.isFinite(id)) return null;
      return [
        id,
        {
          codemp: id,
          nomefant: (r.nomefant as string | null) ?? null,
          razaosocial: (r.razaosocial as string | null) ?? null,
        },
      ];
    },
  );
}

async function loadTributacoes(
  ids: number[],
): Promise<Map<number, TributacaoLite>> {
  return safeLoadMap<TributacaoLite>(
    "tgftrb",
    "codtrib",
    ids,
    "codtrib,descrtrib,cst,csosn",
    (r) => {
      const id = Number(r.codtrib);
      if (!Number.isFinite(id)) return null;
      return [
        id,
        {
          codtrib: id,
          descrtrib: (r.descrtrib as string | null) ?? null,
          cst: (r.cst as string | null) ?? null,
          csosn: (r.csosn as string | null) ?? null,
        },
      ];
    },
  );
}

// =====================================================================
// Lista de usuarios solicitantes distintos (com nome quando disponivel).
// (mantida igual)
// =====================================================================
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
          .map((r: Record<string, unknown>) => Number(r.codususolicit))
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

// =====================================================================
// Lista de liberacoes (com filtros + nome do solicitante)
// (mantida quase igual - so trocando map markdown-quebrado por map limpo)
// =====================================================================
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

// =====================================================================
// DETALHES da liberacao (versao enriquecida)
//
// Retorna:
//   release   -> linha da tsilib
//   event     -> { evento, descricao } (de VGFLIBEVE)
//   note      -> linha de tgfcab + valores fiscais + entidades relacionadas:
//                  parceiro, vendedor, empresa, operacao, natureza
//   items     -> linhas de tgfite + impostos por item +
//                  produto, tributacao (cst/csosn/descricao)
//   usuarios  -> { solicitante, liberador, nota_responsavel, nota_inclusor }
//
// Se uma tabela auxiliar (tgftop, tgfnat, tgftrb, tgfemp) ainda nao
// existe no Supabase, o objeto correspondente vem null - o front
// faz fallback pro codigo.
// =====================================================================
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

    // 1) Carrega a propria liberacao -----------------------------------
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

    // 2) Carrega o evento (VGFLIBEVE em UPPERCASE) ----------------------
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
          evento: Number((evt as Record<string, unknown>).EVENTO),
          descricao: String((evt as Record<string, unknown>).DESCRICAO ?? ""),
        };
      }
    }

    // 3) Cabecalho da nota + itens -------------------------------------
    let note: Record<string, unknown> | null = null;
    let items: Record<string, unknown>[] = [];

    const tabela = String(release.tabela ?? "").trim().toUpperCase();

    if (tabela === "TGFCAB") {
      // Mais colunas - incluindo todos os campos de imposto e os codigos
      // que serao resolvidos depois (operacao, natureza, empresa, etc.)
      const cabSelect = [
        "nunota",
        "numnota",
        "serienota",
        "codparc",
        "codvend",
        "codemp",
        "codnat",
        "codtipoper",
        "codusu",
        "codusuinc",
        "dtneg",
        "dtfatur",
        "dtentsai",
        "dtmov",
        "vlrnota",
        "observacao",
        "statusnota",
        "aprovado",
        "tipmov",
        // ---- impostos / valores ----
        "baseicms",
        "vlricms",
        "baseipi",
        "vlripi",
        "basesubstit",
        "vlrsubst",
        "baseiss",
        "vlriss",
        "vlrfrete",
        "icmsfrete",
        "baseicmsfrete",
        "vlrdesctot",
        "vlrdesctotitem",
        "vlroutros",
        "vlrjuro",
        "vlrseg",
        "vlrirf",
        "vlrinss",
        "basepis",
        "vlrpis",
        "basecofins",
        "vlrcofins",
      ].join(",");

      const { data: cab, error: cabErr } = await supabase
        .from("tgfcab")
        .select(cabSelect)
        .eq("nunota", release.nuchave)
        .maybeSingle();

      if (cabErr) {
        logger.warn({ err: cabErr }, "Failed to load tgfcab header");
      } else if (cab) {
        note = cab as Record<string, unknown>;
      }

      const iteSelect = [
        "nunota",
        "sequencia",
        "codprod",
        "codvol",
        "codtrib",
        "qtdneg",
        "vlrunit",
        "vlrtot",
        "vlrdesc",
        "percdesc",
        "observacao",
        // ---- impostos por item ----
        "baseicms",
        "aliqicms",
        "vlricms",
        "aliqicmsred",
        "baseipi",
        "aliqipi",
        "vlripi",
        "basesubstit",
        "vlrsubst",
        "baseiss",
        "aliqiss",
        "vlriss",
        "cstipi",
        "csosn",
      ].join(",");

      const { data: ite, error: iteErr } = await supabase
        .from("tgfite")
        .select(iteSelect)
        .eq("nunota", release.nuchave)
        .order("sequencia", { ascending: true });

      if (iteErr) {
        logger.warn({ err: iteErr }, "Failed to load tgfite items");
      } else if (Array.isArray(ite)) {
        items = ite as Record<string, unknown>[];
      }
    }

    // 4) Coleta IDs para resolver as entidades relacionadas ------------
    const codusus: number[] = [];
    if (release.codususolicit != null)
      codusus.push(Number(release.codususolicit));
    if (release.codusulib != null) codusus.push(Number(release.codusulib));
    if (note?.codusu != null) codusus.push(Number(note.codusu));
    if (note?.codusuinc != null) codusus.push(Number(note.codusuinc));

    const codparcs = note?.codparc != null ? [Number(note.codparc)] : [];
    const codvends = note?.codvend != null ? [Number(note.codvend)] : [];
    const codemps = note?.codemp != null ? [Number(note.codemp)] : [];
    const codtipopers =
      note?.codtipoper != null ? [Number(note.codtipoper)] : [];
    const codnats = note?.codnat != null ? [Number(note.codnat)] : [];

    const codprods: number[] = [];
    const codtribs: number[] = [];
    for (const it of items) {
      if (it.codprod != null) codprods.push(Number(it.codprod));
      if (it.codtrib != null) codtribs.push(Number(it.codtrib));
    }

    // 5) Carrega tudo em paralelo --------------------------------------
    const [
      names,
      parcMap,
      vendMap,
      empMap,
      topMap,
      natMap,
      prodMap,
      tribMap,
    ] = await Promise.all([
      loadSankhyaUserNames(codusus),
      loadParceiros(codparcs),
      loadVendedores(codvends),
      loadEmpresas(codemps),
      loadTiposOperacao(codtipopers),
      loadNaturezas(codnats),
      loadProdutos(codprods),
      loadTributacoes(codtribs),
    ]);

    const nameOf = (v: unknown): string => {
      const n = Number(v);
      return Number.isFinite(n) ? names.get(n) ?? "" : "";
    };

    // 6) Monta o note enriquecido --------------------------------------
    let noteEnriched: Record<string, unknown> | null = null;
    if (note) {
      const codparc = Number(note.codparc);
      const codvend = Number(note.codvend);
      const codemp = Number(note.codemp);
      const codtipoper = Number(note.codtipoper);
      const codnat = Number(note.codnat);

      noteEnriched = {
        ...note,
        parceiro: Number.isFinite(codparc)
          ? parcMap.get(codparc) ?? null
          : null,
        vendedor: Number.isFinite(codvend)
          ? vendMap.get(codvend) ?? null
          : null,
        empresa: Number.isFinite(codemp) ? empMap.get(codemp) ?? null : null,
        operacao: Number.isFinite(codtipoper)
          ? topMap.get(codtipoper) ?? null
          : null,
        natureza: Number.isFinite(codnat) ? natMap.get(codnat) ?? null : null,
      };
    }

    // 7) Itens enriquecidos --------------------------------------------
    const itemsEnriched = items.map((it) => {
      const codprod = Number(it.codprod);
      const codtrib = Number(it.codtrib);
      return {
        ...it,
        produto: Number.isFinite(codprod) ? prodMap.get(codprod) ?? null : null,
        tributacao: Number.isFinite(codtrib)
          ? tribMap.get(codtrib) ?? null
          : null,
      };
    });

    // 8) Usuarios -------------------------------------------------------
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

    res.json({
      release,
      event,
      note: noteEnriched,
      items: itemsEnriched,
      usuarios,
    });
  },
);

// =====================================================================
// POST /releases/:nuchave/:sequencia/release
// (mantido EXATAMENTE como estava - login/codusulib intocados)
// =====================================================================
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

    const vlrLiberado = Number(existing.vlratual ?? 0);
    const userIdRaw = req.user?.id ?? 0;
    const codusulib = Math.max(0, Math.min(32767, Math.trunc(userIdRaw)));

    const update: Record<string, unknown> = {
      dhlib: nowBrasiliaISO(),
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