import { useEffect, useMemo, useState, useCallback } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  X,
  FileText,
  Package,
  Loader2,
  Eye,
  User,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

type StatusFilter = "pending" | "released" | "all";
type SortField =
  | "nuchave"
  | "dhsolicit"
  | "vlrlimite"
  | "vlratual"
  | "vlrliberado"
  | "tabela"
  | "solicitante_nome";
type SortDir = "asc" | "desc";

interface ReleaseRow {
  nuchave: number;
  sequencia: number;
  tabela: string | null;
  evento: number | null;
  codususolicit: number | null;
  dhsolicit: string | null;
  vlrlimite: number | string | null;
  vlratual: number | string | null;
  vlrliberado: number | string | null;
  codusulib: number | null;
  dhlib: string | null;
  observacao: string | null;
  perclimite: number | null;
  vlrtotal: number | string | null;
  obslib: string | null;
  reprovado: string | null;
  codparc: number | null;
  codcencus: number | null;
  codnat: number | null;
  codproj: number | null;
  solicitante_nome?: string | null;
}

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
interface EmpresaLite {
  codemp: number;
  nomefant: string | null;
  razaosocial: string | null;
}
interface OperacaoLite {
  codtipoper: number;
  descroper: string | null;
}
interface NaturezaLite {
  codnat: number;
  descrnat: string | null;
}
interface ProdutoLite {
  codprod: number;
  descrprod: string | null;
  referencia: string | null;
}
interface TributacaoLite {
  codtrib: number;
  descrtrib: string | null;
  cst: string | null;
  csosn: string | null;
}

interface NoteHeader {
  nunota?: number;
  numnota?: number;
  serienota?: string | null;
  codparc?: number;
  codvend?: number;
  codemp?: number;
  codnat?: number | null;
  codtipoper?: number | null;
  codusu?: number | null;
  codusuinc?: number | null;
  dtneg?: string | null;
  dtfatur?: string | null;
  dtentsai?: string | null;
  dtmov?: string | null;
  vlrnota?: number | string | null;
  observacao?: string | null;
  statusnota?: string | null;
  aprovado?: string | null;
  tipmov?: string | null;
  baseicms?: number | string | null;
  vlricms?: number | string | null;
  baseipi?: number | string | null;
  vlripi?: number | string | null;
  basesubstit?: number | string | null;
  vlrsubst?: number | string | null;
  baseiss?: number | string | null;
  vlriss?: number | string | null;
  vlrfrete?: number | string | null;
  icmsfrete?: number | string | null;
  baseicmsfrete?: number | string | null;
  vlrdesctot?: number | string | null;
  vlrdesctotitem?: number | string | null;
  vlroutros?: number | string | null;
  vlrjuro?: number | string | null;
  vlrseg?: number | string | null;
  vlrirf?: number | string | null;
  vlrinss?: number | string | null;
  basepis?: number | string | null;
  vlrpis?: number | string | null;
  basecofins?: number | string | null;
  vlrcofins?: number | string | null;
  parceiro?: ParceiroLite | null;
  vendedor?: VendedorLite | null;
  empresa?: EmpresaLite | null;
  operacao?: OperacaoLite | null;
  natureza?: NaturezaLite | null;
}

interface NoteItem {
  nunota?: number;
  sequencia?: number;
  codprod?: number;
  codvol?: string | null;
  codtrib?: number | null;
  qtdneg?: number | string | null;
  vlrunit?: number | string | null;
  vlrtot?: number | string | null;
  vlrdesc?: number | string | null;
  percdesc?: number | string | null;
  observacao?: string | null;
  baseicms?: number | string | null;
  aliqicms?: number | string | null;
  vlricms?: number | string | null;
  aliqicmsred?: number | string | null;
  baseipi?: number | string | null;
  aliqipi?: number | string | null;
  vlripi?: number | string | null;
  basesubstit?: number | string | null;
  vlrsubst?: number | string | null;
  baseiss?: number | string | null;
  aliqiss?: number | string | null;
  vlriss?: number | string | null;
  cstipi?: number | string | null;
  csosn?: number | string | null;
  produto?: ProdutoLite | null;
  tributacao?: TributacaoLite | null;
}

interface UsuariosRef {
  solicitante: { codusu: number | null; nome: string };
  liberador: { codusu: number | null; nome: string };
  nota_responsavel: { codusu: number | null; nome: string } | null;
  nota_inclusor: { codusu: number | null; nome: string } | null;
}

interface ReleaseDetails {
  release: ReleaseRow;
  event: { evento: number; descricao: string } | null;
  note: NoteHeader | null;
  items: NoteItem[];
  usuarios: UsuariosRef;
}

interface SolicitanteOption {
  codusu: number;
  nome: string;
}

const PAGE_SIZE = 10;

function apiUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/backend${path}`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function fmtMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtQty(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function fmtPerc(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v) || 0;
}

function userLabel(codusu: number | null | undefined, nome?: string | null): string {
  const c = codusu == null ? null : Number(codusu);
  const hasCode = c != null && Number.isFinite(c);
  const cleanName = (nome ?? "").trim();
  if (hasCode && cleanName) return `${cleanName} (#${c})`;
  if (hasCode) return `Usuário #${c}`;
  return "-";
}

function entityLabel(code: number | null | undefined, name: string | null | undefined, prefix = ""): string {
  const c = code == null ? null : Number(code);
  const hasCode = c != null && Number.isFinite(c);
  const cleanName = (name ?? "").trim();
  if (hasCode && cleanName) return `${cleanName} (#${c})`;
  if (hasCode) return `${prefix}${c}`;
  return "-";
}

function statusOf(row: ReleaseRow): { label: string; className: string; dot: string } {
  if (row.reprovado === "S") {
    return { label: "Reprovada", className: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
  }
  if (row.dhlib) {
    return { label: "Liberada", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" };
  }
  return { label: "Pendente", className: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-400" };
}

// ── Sort icon ────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  if (field !== active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-slate-700" />
    : <ArrowDown className="h-3 w-3 text-slate-700" />;
}

type ModalMode = "details" | "release";

export default function Releases() {
  const { token, user } = useAuth();

  // ── filters ─────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [solicitanteFilter, setSolicitanteFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [tabelaFilter, setTabelaFilter] = useState<string>("");

  // ── sort ────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("dhsolicit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── data ────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [solicitantes, setSolicitantes] = useState<SolicitanteOption[]>([]);

  // ── modal ────────────────────────────────────────────────────
  const [selected, setSelected] = useState<ReleaseRow | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("details");
  const [details, setDetails] = useState<ReleaseDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [obslibInput, setObslibInput] = useState("");

  const canRelease = user?.role === "robot" || user?.role === "human" || user?.role === "SA";

  // ── sort handler ─────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir("asc");
      return field;
    });
    setPage(1);
  }, []);

  // ── fetch solicitantes ───────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(apiUrl("/releases/solicitantes"), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (!cancelled) setSolicitantes(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  // ── fetch releases ───────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ status: statusFilter });
    if (solicitanteFilter) params.set("codususolicit", solicitanteFilter);
    fetch(apiUrl(`/releases?${params.toString()}`), { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return (await res.json()) as ReleaseRow[];
      })
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
        setPage(1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar liberações");
        setRows([]);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [token, statusFilter, solicitanteFilter, refreshKey]);

  // ── fetch details ────────────────────────────────────────────
  useEffect(() => {
    if (!selected || !token) { setDetails(null); setDetailsError(null); return; }
    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError(null);
    setDetails(null);
    fetch(apiUrl(`/releases/${selected.nuchave}/${selected.sequencia}/details`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return (await res.json()) as ReleaseDetails;
      })
      .then((data) => { if (!cancelled) setDetails(data); })
      .catch((err: unknown) => {
        if (!cancelled) setDetailsError(err instanceof Error ? err.message : "Erro ao carregar detalhes");
      })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [selected, token]);

  // ── unique tabelas for filter ────────────────────────────────
  const tabelasUnicas = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.tabela?.trim()) s.add(r.tabela.trim());
    return Array.from(s).sort();
  }, [rows]);

  // ── filter + sort ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

    let result = rows.filter((row) => {
      // text search
      if (term) {
        const haystack = [
          String(row.nuchave ?? ""),
          String(row.sequencia ?? ""),
          String(row.tabela ?? ""),
          String(row.codparc ?? ""),
          String(row.observacao ?? ""),
          String(row.codususolicit ?? ""),
          String(row.solicitante_nome ?? ""),
        ].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      // date range
      if (from || to) {
        const d = row.dhsolicit ? new Date(row.dhsolicit) : null;
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }

      // tabela filter
      if (tabelaFilter && (row.tabela ?? "").trim() !== tabelaFilter) return false;

      return true;
    });

    // sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "nuchave":       cmp = a.nuchave - b.nuchave; break;
        case "dhsolicit":     cmp = (a.dhsolicit ?? "").localeCompare(b.dhsolicit ?? ""); break;
        case "vlrlimite":     cmp = toNum(a.vlrlimite) - toNum(b.vlrlimite); break;
        case "vlratual":      cmp = toNum(a.vlratual) - toNum(b.vlratual); break;
        case "vlrliberado":   cmp = toNum(a.vlrliberado) - toNum(b.vlrliberado); break;
        case "tabela":        cmp = (a.tabela ?? "").localeCompare(b.tabela ?? ""); break;
        case "solicitante_nome": cmp = (a.solicitante_nome ?? "").localeCompare(b.solicitante_nome ?? ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [rows, search, dateFrom, dateTo, tabelaFilter, sortField, sortDir]);

  // ── summary stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending  = rows.filter((r) => !r.dhlib && r.reprovado !== "S");
    const released = rows.filter((r) => !!r.dhlib);
    const reproved = rows.filter((r) => r.reprovado === "S");
    const totalPendingValue = pending.reduce((s, r) => s + toNum(r.vlratual), 0);
    return { pending: pending.length, released: released.length, reproved: reproved.length, totalPendingValue };
  }, [rows]);

  const clearFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo(""); setTabelaFilter(""); setSolicitanteFilter(""); setPage(1);
  };
  const hasActiveFilters = search || dateFrom || dateTo || tabelaFilter || solicitanteFilter;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openDetails(row: ReleaseRow) { setSelected(row); setModalMode("details"); setObslibInput(""); }
  function openRelease(row: ReleaseRow) { setSelected(row); setModalMode("release"); setObslibInput(""); }
  function switchToRelease() { setModalMode("release"); }
  function closeModal() { setSelected(null); setObslibInput(""); setDetails(null); setDetailsError(null); setModalMode("details"); }

  const obslibTrimmed = obslibInput.trim();
  const obslibValid = obslibTrimmed.length > 0;

  async function submitRelease() {
    if (!selected || !token) return;
    if (!obslibValid) { toast.error("Informe a observação da liberação."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(
        apiUrl(`/releases/${selected.nuchave}/${selected.sequencia}/release`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ obslib: obslibTrimmed }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Liberação efetuada com sucesso.");
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao liberar.");
    } finally {
      setSubmitting(false);
    }
  }

  const isReleaseMode = modalMode === "release";

  // ── th helper ────────────────────────────────────────────────
  function Th({ field, children, className = "" }: { field: SortField; children: React.ReactNode; className?: string }) {
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 cursor-pointer select-none hover:bg-slate-100 transition-colors ${className}`}
        onClick={() => handleSort(field)}
      >
        <span className="flex items-center gap-1">
          {children}
          <SortIcon field={field} active={sortField} dir={sortDir} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Header + Stats ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Liberações</h2>
            <p className="mt-1 text-sm text-slate-500">
              Solicitações registradas em{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">tsilib</code>.{" "}
              {canRelease
                ? "Você pode liberar pendências."
                : "Apenas usuários com perfil Robô, Usuário ou Super Admin podem liberar."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canRelease && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Pode liberar
              </span>
            )}
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            type="button"
            onClick={() => { setStatusFilter("pending"); setPage(1); }}
            className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${statusFilter === "pending" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
            <p className="text-xs text-slate-500 mt-0.5">{fmtMoney(stats.totalPendingValue)}</p>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter("released"); setPage(1); }}
            className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${statusFilter === "released" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase">Liberadas</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.released}</p>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setPage(1); }}
            className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${statusFilter === "all" ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{rows.length}</p>
          </button>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase">Reprovadas</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.reproved}</p>
          </div>
        </div>
      </section>

      {/* ── Filters ────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs text-rose-600 hover:underline font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition"
            >
              <option value="pending">Pendentes</option>
              <option value="released">Liberadas</option>
              <option value="all">Todas</option>
            </select>
          </div>

          {/* Solicitante */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Solicitante</label>
            <select
              value={solicitanteFilter}
              onChange={(e) => { setSolicitanteFilter(e.target.value); setPage(1); }}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition"
            >
              <option value="">Todos</option>
              {solicitantes.map((opt) => (
                <option key={opt.codusu} value={opt.codusu}>
                  {opt.nome ? `${opt.nome} (#${opt.codusu})` : `Usuário #${opt.codusu}`}
                </option>
              ))}
            </select>
          </div>

          {/* Tabela */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tabela</label>
            <select
              value={tabelaFilter}
              onChange={(e) => { setTabelaFilter(e.target.value); setPage(1); }}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition"
            >
              <option value="">Todas as tabelas</option>
              {tabelasUnicas.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Busca</label>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Chave, parceiro, solicitante..."
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Data de (solicitação)</span>
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Data até</span>
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>
            Exibindo <strong className="text-slate-700">{filtered.length}</strong> de{" "}
            <strong className="text-slate-700">{rows.length}</strong> registros
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 ring-1 ring-blue-200 font-medium">
              Filtros ativos
            </span>
          )}
        </div>
      </section>

      {/* ── Table ──────────────────────────────────────────────── */}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <Th field="nuchave">Chave</Th>
              <Th field="tabela">Tabela / Evento</Th>
              <Th field="solicitante_nome">Solicitante</Th>
              <Th field="dhsolicit">Solicitação</Th>
              <Th field="vlrlimite" className="text-right">Limite</Th>
              <Th field="vlratual" className="text-right">Atual</Th>
              <Th field="vlrliberado" className="text-right">Liberado</Th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Carregando liberações...</span>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && error && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && !error && pageItems.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                  Nenhuma liberação encontrada{hasActiveFilters ? " com os filtros aplicados" : ""}.
                </td>
              </tr>
            )}
            {!isLoading && !error && pageItems.map((row) => {
              const status = statusOf(row);
              const isPending = !row.dhlib && row.reprovado !== "S";
              return (
                <tr
                  key={`${row.nuchave}-${row.sequencia}`}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono font-semibold text-slate-800">{row.nuchave}</span>
                    <span className="text-xs text-slate-400 ml-1">/{row.sequencia}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-slate-800">{(row.tabela ?? "").trim() || "-"}</div>
                    <div className="text-xs text-slate-400">Evento {row.evento ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
                        <User className="h-3 w-3" />
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[120px]" title={row.solicitante_nome ?? ""}>
                        {row.solicitante_nome ?? `#${row.codususolicit ?? "-"}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{fmtDateShort(row.dhsolicit)}</div>
                    <div className="text-xs text-slate-400">{row.dhsolicit ? new Date(row.dhsolicit).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-slate-700">{fmtMoney(row.vlrlimite)}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-slate-800">{fmtMoney(row.vlratual)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="font-mono text-slate-700">{fmtMoney(row.vlrliberado)}</div>
                    {row.dhlib && <div className="text-xs text-slate-400">{fmtDateShort(row.dhlib)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${status.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDetails(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                        title="Ver detalhes"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detalhes
                      </button>
                      {isPending && canRelease && (
                        <button
                          type="button"
                          onClick={() => openRelease(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Liberar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Pagination ─────────────────────────────────────────── */}
      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-500">
          Página <strong className="text-slate-700">{page}</strong> de{" "}
          <strong className="text-slate-700">{totalPages}</strong>
          {" · "}
          <span className="text-slate-400">{filtered.length} registros</span>
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
          >
            «
          </button>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 transition"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 transition"
          >
            Próxima
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
          >
            »
          </button>
        </div>
      </section>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {isReleaseMode ? "Liberar solicitação" : "Detalhes da liberação"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chave {selected.nuchave}/{selected.sequencia}
                  {details?.event && (
                    <> · <span className="font-medium text-slate-600">Evento {details.event.evento}: {details.event.descricao}</span></>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Resumo da solicitação */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Tabela</p>
                  <p className="font-semibold text-slate-800">{(selected.tabela ?? "").trim() || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Evento</p>
                  <p className="font-semibold text-slate-800">
                    {details?.event ? details.event.descricao : selected.evento != null ? `Evento ${selected.evento}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Limite</p>
                  <p className="font-semibold text-slate-800">{fmtMoney(selected.vlrlimite)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Valor atual</p>
                  <p className="font-semibold text-slate-800">{fmtMoney(selected.vlratual)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Solicitante</p>
                  <p className="font-semibold text-slate-800">
                    {userLabel(details?.usuarios.solicitante.codusu ?? selected.codususolicit, details?.usuarios.solicitante.nome ?? selected.solicitante_nome)}
                  </p>
                  <p className="text-xs text-slate-400">{fmtDate(selected.dhsolicit)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Liberador</p>
                  <p className="font-semibold text-slate-800">
                    {selected.dhlib
                      ? userLabel(details?.usuarios.liberador.codusu ?? selected.codusulib, details?.usuarios.liberador.nome)
                      : <span className="text-amber-600">Pendente</span>}
                  </p>
                  {selected.dhlib && <p className="text-xs text-slate-400">{fmtDate(selected.dhlib)}</p>}
                </div>
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-slate-400 mb-0.5">Observação do solicitante</p>
                  <p className="text-slate-700">{selected.observacao?.trim() || "-"}</p>
                </div>
                {selected.obslib && (
                  <div className="col-span-2 md:col-span-4 rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-100">
                    <p className="text-xs text-emerald-600 mb-0.5 font-medium">Observação da liberação</p>
                    <p className="text-slate-700">{selected.obslib}</p>
                  </div>
                )}
              </div>

              {/* Loading/Error details */}
              {detailsLoading && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando detalhes da nota...
                </div>
              )}
              {!detailsLoading && detailsError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {detailsError}
                </div>
              )}

              {!detailsLoading && !detailsError && details && (
                <>
                  {details.note ? (
                    <>
                      {/* Cabeçalho da nota */}
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-semibold uppercase text-slate-500">Cabeçalho da nota (tgfcab)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 p-4 text-sm md:grid-cols-4">
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">N° nota</p>
                            <p className="font-semibold">{details.note.numnota ?? details.note.nunota ?? "-"}{details.note.serienota ? ` / ${details.note.serienota}` : ""}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Empresa</p>
                            <p className="font-semibold">{entityLabel(details.note.codemp, details.note.empresa?.nomefant ?? details.note.empresa?.razaosocial)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Tipo mov.</p>
                            <p className="font-semibold">{details.note.tipmov ?? "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Aprovado</p>
                            <p className="font-semibold">{details.note.aprovado ?? "-"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-slate-400 mb-0.5">Parceiro</p>
                            <p className="font-semibold">{entityLabel(details.note.codparc, details.note.parceiro?.nomeparc)}</p>
                            {details.note.parceiro?.cgc_cpf && <p className="text-xs text-slate-400">CNPJ/CPF: {details.note.parceiro.cgc_cpf}</p>}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Vendedor</p>
                            <p className="font-semibold">{entityLabel(details.note.codvend, details.note.vendedor?.apelido)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Valor nota</p>
                            <p className="font-bold text-slate-900">{fmtMoney(details.note.vlrnota)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-slate-400 mb-0.5">Tipo de operação (TOP)</p>
                            <p className="font-semibold">{entityLabel(details.note.codtipoper, details.note.operacao?.descroper)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-slate-400 mb-0.5">Natureza</p>
                            <p className="font-semibold">{entityLabel(details.note.codnat, details.note.natureza?.descrnat)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Data negoc.</p>
                            <p className="font-semibold">{fmtDate(details.note.dtneg)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Data fatur.</p>
                            <p className="font-semibold">{fmtDate(details.note.dtfatur)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Responsável</p>
                            <p className="font-semibold">{userLabel(details.usuarios.nota_responsavel?.codusu ?? null, details.usuarios.nota_responsavel?.nome)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-0.5">Inclusor</p>
                            <p className="font-semibold">{userLabel(details.usuarios.nota_inclusor?.codusu ?? null, details.usuarios.nota_inclusor?.nome)}</p>
                          </div>
                          {details.note.observacao && (
                            <div className="col-span-2 md:col-span-4">
                              <p className="text-xs text-slate-400 mb-0.5">Observação da nota</p>
                              <p className="whitespace-pre-wrap text-slate-600">{details.note.observacao}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Impostos */}
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                          <Receipt className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-semibold uppercase text-slate-500">Impostos e valores</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 p-4 text-sm md:grid-cols-4">
                          {[
                            ["Base ICMS", details.note.baseicms], ["Vlr. ICMS", details.note.vlricms],
                            ["Base IPI", details.note.baseipi], ["Vlr. IPI", details.note.vlripi],
                            ["Base ICMS-ST", details.note.basesubstit], ["Vlr. ICMS-ST", details.note.vlrsubst],
                            ["Vlr. PIS", details.note.vlrpis], ["Vlr. COFINS", details.note.vlrcofins],
                            ["Vlr. ISS", details.note.vlriss], ["Vlr. IRF", details.note.vlrirf],
                            ["Vlr. INSS", details.note.vlrinss], ["Frete", details.note.vlrfrete],
                            ["Desconto", details.note.vlrdesctot], ["Outros", details.note.vlroutros],
                            ["Juros", details.note.vlrjuro], ["Seguro", details.note.vlrseg],
                          ].map(([label, value]) => (
                            <div key={label as string}>
                              <p className="text-xs text-slate-400 mb-0.5">{label as string}</p>
                              <p className="font-semibold font-mono text-slate-700">{fmtMoney(value as never)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      Sem cabeçalho de nota associado (tabela{" "}
                      <code className="rounded bg-slate-100 px-1">{selected.tabela ?? "-"}</code>).
                    </div>
                  )}

                  {/* Itens */}
                  {details.items.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Itens da nota (tgfite) — {details.items.length} item(s)
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              {["Seq", "Produto", "Qtd", "Un", "Vlr unit.", "Desc.", "Total", "CST/CSOSN", "Base ICMS", "% ICMS", "Vlr ICMS", "Vlr IPI", "ICMS-ST"].map((h) => (
                                <th key={h} className="px-3 py-2 text-left font-semibold uppercase text-slate-500 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {details.items.map((it) => {
                              const cst = it.tributacao?.cst ?? (it.tributacao?.csosn != null ? it.tributacao.csosn : null) ?? (it.csosn != null ? String(it.csosn) : null);
                              const prodLabel = it.produto?.descrprod ?? (it.codprod != null ? `#${it.codprod}` : "-");
                              return (
                                <tr key={`${it.nunota}-${it.sequencia}`} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 text-slate-400 font-mono">{it.sequencia ?? "-"}</td>
                                  <td className="px-3 py-2 max-w-[200px]">
                                    <div className="font-medium text-slate-800 truncate" title={prodLabel}>{prodLabel}</div>
                                    {it.produto?.referencia && <div className="text-[10px] text-slate-400">Ref: {it.produto.referencia}</div>}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{fmtQty(it.qtdneg)}</td>
                                  <td className="px-3 py-2 text-slate-400">{it.codvol ?? "-"}</td>
                                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(it.vlrunit)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-400">{fmtMoney(it.vlrdesc)}</td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{fmtMoney(it.vlrtot)}</td>
                                  <td className="px-3 py-2">
                                    <div className="font-mono">{cst ?? "-"}</div>
                                    {it.tributacao?.descrtrib && <div className="text-[10px] text-slate-400">{it.tributacao.descrtrib}</div>}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(it.baseicms)}</td>
                                  <td className="px-3 py-2 text-right text-slate-400">{fmtPerc(it.aliqicms)}</td>
                                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(it.vlricms)}</td>
                                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(it.vlripi)}</td>
                                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(it.vlrsubst)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    details.note != null && (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Nenhum item encontrado em <code className="rounded bg-amber-100 px-1">tgfite</code> para a nota <strong>{details.note.nunota}</strong>.
                      </div>
                    )
                  )}
                </>
              )}

              {/* Release form */}
              {isReleaseMode && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">Valor a ser liberado</p>
                    <p className="text-xl font-bold text-emerald-900">{fmtMoney(selected.vlratual)}</p>
                    <p className="text-xs text-emerald-600 mt-1">Igual ao valor solicitado, sem alteração.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Observação da liberação <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={255}
                      value={obslibInput}
                      onChange={(e) => setObslibInput(e.target.value)}
                      required
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 transition resize-none ${
                        obslibValid ? "border-slate-200 focus:ring-emerald-300" : "border-rose-300 focus:ring-rose-300"
                      }`}
                      placeholder="Obrigatório. Descreva o motivo da liberação (até 255 caracteres)."
                    />
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${obslibValid ? "text-slate-400" : "text-rose-500 font-medium"}`}>
                        {obslibValid ? `${obslibTrimmed.length}/255 caracteres` : "Campo obrigatório."}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Fechar
                </button>
                {!isReleaseMode && canRelease && !selected.dhlib && selected.reprovado !== "S" && (
                  <button
                    type="button"
                    onClick={switchToRelease}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Liberar esta solicitação
                  </button>
                )}
                {isReleaseMode && (
                  <button
                    type="button"
                    onClick={submitRelease}
                    disabled={submitting || !obslibValid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {submitting ? "Liberando..." : "Confirmar liberação"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}