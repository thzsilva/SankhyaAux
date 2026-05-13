import { useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

type StatusFilter = "pending" | "released" | "all";

interface ReleaseRow {
  nuchave: number;
  sequencia: number;
  tabela: string | null;
  evento: number | null;
  evento_descricao?: string | null;
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
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "pending", label: "Pendentes" },
  { key: "released", label: "Liberadas" },
  { key: "all", label: "Todas" },
];

function apiUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/backend${path}`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  if (row.reprovado === "S") return { label: "Reprovada", className: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
  if (row.dhlib) return { label: "Liberada", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" };
  return { label: "Pendente", className: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-400" };
}

type ModalMode = "details" | "release";

/* ── Small reusable helpers ─────────────────────────────────────── */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value || "-"}</p>
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-3">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

export default function Releases() {
  const { token, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [solicitanteFilter, setSolicitanteFilter] = useState<string>("");
  const [solicitantes, setSolicitantes] = useState<SolicitanteOption[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<ReleaseRow | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("details");
  const [details, setDetails] = useState<ReleaseDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [obslibInput, setObslibInput] = useState("");

  const canRelease = user?.role === "robot" || user?.role === "human" || user?.role === "SA";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(apiUrl(`/releases/solicitantes`), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (cancelled) return; setSolicitantes(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ status: statusFilter });
    if (solicitanteFilter) params.set("codususolicit", solicitanteFilter);
    fetch(apiUrl(`/releases?${params.toString()}`), { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error ?? `HTTP ${res.status}`); }
        return (await res.json()) as ReleaseRow[];
      })
      .then((data) => { if (cancelled) return; setRows(Array.isArray(data) ? data : []); setPage(1); })
      .catch((err: unknown) => { if (cancelled) return; setError(err instanceof Error ? err.message : "Erro ao carregar liberacoes"); setRows([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [token, statusFilter, solicitanteFilter, refreshKey]);

  useEffect(() => {
    if (!selected || !token) { setDetails(null); setDetailsError(null); return; }
    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError(null);
    setDetails(null);
    fetch(apiUrl(`/releases/${selected.nuchave}/${selected.sequencia}/details`), { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error ?? `HTTP ${res.status}`); }
        return (await res.json()) as ReleaseDetails;
      })
      .then((data) => { if (cancelled) return; setDetails(data); })
      .catch((err: unknown) => { if (cancelled) return; setDetailsError(err instanceof Error ? err.message : "Erro ao carregar detalhes"); })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [selected, token]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const haystack = [String(row.nuchave ?? ""), String(row.sequencia ?? ""), String(row.tabela ?? ""), String(row.codparc ?? ""), String(row.observacao ?? ""), String(row.codususolicit ?? ""), String(row.solicitante_nome ?? "")].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, search]);

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
    if (!obslibValid) { toast.error("Informe a observacao da liberacao."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/releases/${selected.nuchave}/${selected.sequencia}/release`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ obslib: obslibTrimmed }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error ?? `HTTP ${res.status}`); }
      toast.success("Liberacao efetuada com sucesso.");
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao liberar.");
    } finally {
      setSubmitting(false);
    }
  }

  const isReleaseMode = modalMode === "release";

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-4">

      {/* ── Permission badge ── */}
      {canRelease && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 ring-1 ring-emerald-200">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-700">Voce tem permissao para liberar solicitacoes.</p>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="space-y-3">
        {/* Status pill tabs */}
        <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200 shadow-sm">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                statusFilter === tab.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search row */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por chave, parceiro, solicitante..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <select
            value={solicitanteFilter}
            onChange={(e) => { setSolicitanteFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Todos os solicitantes</option>
            {solicitantes.map((opt) => (
              <option key={opt.codusu} value={opt.codusu}>
                {opt.nome ? `${opt.nome} (#${opt.codusu})` : `Usuário #${opt.codusu}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          {filtered.length} registro(s)
        </p>
      </div>

      {/* ── Release list ── */}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-2xl bg-white py-16 ring-1 ring-slate-200 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-400">Carregando liberacoes...</span>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-2xl bg-rose-50 px-4 py-4 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && pageItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 ring-1 ring-slate-200 shadow-sm">
          <ShieldCheck className="h-8 w-8 text-slate-200" />
          <p className="mt-2 text-sm text-slate-400">Nenhuma liberacao encontrada.</p>
        </div>
      )}

      {/* Cards — mobile */}
      {!isLoading && !error && pageItems.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {pageItems.map((row) => {
              const status = statusOf(row);
              const isPending = !row.dhlib && row.reprovado !== "S";
              return (
                <div
                  key={`${row.nuchave}-${row.sequencia}`}
                  className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${status.dot}`} />
                        <p className="text-sm font-semibold text-slate-900 tabular-nums">
                          #{row.nuchave}
                          <span className="font-normal text-slate-400">/{row.sequencia}</span>
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {userLabel(row.codususolicit, row.solicitante_nome)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{fmtDate(row.dhsolicit)}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <p className="text-sm font-semibold text-slate-900">{fmtMoney(row.vlratual)}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detalhes
                      </button>
                      {isPending && canRelease && (
                        <button
                          type="button"
                          onClick={() => openRelease(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Liberar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table — desktop */}
          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    {["Chave", "Tabela / Evento", "Solicitante", "Solicitacao", "Limite", "Atual", "Liberado", "Status", "Acoes"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${i >= 4 && i <= 6 ? "text-right" : i === 8 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((row) => {
                    const status = statusOf(row);
                    const isPending = !row.dhlib && row.reprovado !== "S";
                    return (
                      <tr key={`${row.nuchave}-${row.sequencia}`} className="group transition hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 tabular-nums">
                          {row.nuchave}<span className="font-normal text-slate-400">/{row.sequencia}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-slate-800">{(row.tabela ?? "").trim() || "-"}</div>
                          <div className="text-xs text-slate-400">
                            {row.evento_descricao || (row.evento != null ? `Evento ${row.evento}` : "-")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                            <span className="text-slate-700">{userLabel(row.codususolicit, row.solicitante_nome)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(row.dhsolicit)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">{fmtMoney(row.vlrlimite)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 tabular-nums">{fmtMoney(row.vlratual)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">
                          <div className="text-slate-600">{fmtMoney(row.vlrliberado)}</div>
                          {row.dhlib && <div className="text-xs text-slate-400">{fmtDate(row.dhlib)}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${status.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openDetails(row)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" /> Detalhes
                            </button>
                            {isPending && canRelease && (
                              <button
                                type="button"
                                onClick={() => openRelease(row)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Liberar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Pagination ── */}
      {!isLoading && !error && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Pagina {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              Proxima <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL / DRAWER
      ══════════════════════════════════════════════════ */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl" style={{ maxHeight: "92vh" }}>
            {/* Modal header */}
            <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  {isReleaseMode ? "Confirmar liberacao" : "Detalhes da liberacao"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Chave {selected.nuchave}/{selected.sequencia}
                  {details?.event && (
                    <> · <span className="font-medium text-slate-600">Evento {details.event.evento}: {details.event.descricao}</span></>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="ml-3 flex-shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* ── Solicitacao info ── */}
              <div className="rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Tabela" value={(selected.tabela ?? "").trim() || "-"} />
                  <Field
                    label="Evento"
                    value={details?.event ? details.event.descricao : selected.evento != null ? `#${selected.evento}` : "-"}
                  />
                  <Field label="Limite" value={fmtMoney(selected.vlrlimite)} />
                  <Field label="Atual" value={fmtMoney(selected.vlratual)} />
                  <div className="col-span-2">
                    <Field
                      label="Solicitante"
                      value={userLabel(details?.usuarios.solicitante.codusu ?? selected.codususolicit, details?.usuarios.solicitante.nome ?? selected.solicitante_nome)}
                    />
                    <p className="mt-0.5 text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {fmtDate(selected.dhsolicit)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Field
                      label="Liberador"
                      value={selected.dhlib ? userLabel(details?.usuarios.liberador.codusu ?? selected.codusulib, details?.usuarios.liberador.nome) : "Pendente"}
                    />
                    {selected.dhlib && <p className="mt-0.5 text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(selected.dhlib)}</p>}
                  </div>
                  {selected.observacao?.trim() && (
                    <div className="col-span-2 sm:col-span-4">
                      <Field label="Observacao do solicitante" value={selected.observacao.trim()} />
                    </div>
                  )}
                  {selected.obslib && (
                    <div className="col-span-2 sm:col-span-4">
                      <Field label="Observacao da liberacao" value={selected.obslib} />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Loading details ── */}
              {detailsLoading && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando dados da nota...
                </div>
              )}
              {!detailsLoading && detailsError && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
                  Nao foi possivel carregar detalhes: {detailsError}
                </div>
              )}

              {/* ── Note header + taxes + items ── */}
              {!detailsLoading && !detailsError && details && (
                <>
                  {details.note ? (
                    <>
                      {/* Note header */}
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                        <SectionHeading icon={FileText} label="Cabecalho da nota (tgfcab)" />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <Field label="N° nota" value={`${details.note.numnota ?? details.note.nunota ?? "-"}${details.note.serienota ? ` / ${details.note.serienota}` : ""}`} />
                          <Field label="Empresa" value={entityLabel(details.note.codemp, details.note.empresa?.nomefant ?? details.note.empresa?.razaosocial)} />
                          <Field label="Tipo mov." value={details.note.tipmov ?? "-"} />
                          <Field label="Aprovado" value={details.note.aprovado ?? "-"} />
                          <div className="col-span-2">
                            <Field label="Parceiro" value={entityLabel(details.note.codparc, details.note.parceiro?.nomeparc)} />
                            {details.note.parceiro?.cgc_cpf && (
                              <p className="mt-0.5 text-xs text-slate-400">CNPJ/CPF: {details.note.parceiro.cgc_cpf}</p>
                            )}
                          </div>
                          <Field label="Vendedor" value={entityLabel(details.note.codvend, details.note.vendedor?.apelido)} />
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vlr. nota</p>
                            <p className="mt-0.5 text-base font-bold text-emerald-700">{fmtMoney(details.note.vlrnota)}</p>
                          </div>
                          <div className="col-span-2">
                            <Field label="Tipo de operacao (TOP)" value={entityLabel(details.note.codtipoper, details.note.operacao?.descroper)} />
                          </div>
                          <div className="col-span-2">
                            <Field label="Natureza" value={entityLabel(details.note.codnat, details.note.natureza?.descrnat)} />
                          </div>
                          <Field label="Data negoc." value={fmtDate(details.note.dtneg)} />
                          <Field label="Data faturam." value={fmtDate(details.note.dtfatur)} />
                          <Field label="Responsavel (nota)" value={userLabel(details.usuarios.nota_responsavel?.codusu ?? null, details.usuarios.nota_responsavel?.nome)} />
                          <Field label="Inclusor (nota)" value={userLabel(details.usuarios.nota_inclusor?.codusu ?? null, details.usuarios.nota_inclusor?.nome)} />
                          {details.note.observacao && (
                            <div className="col-span-2 sm:col-span-4">
                              <Field label="Observacao da nota" value={details.note.observacao} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax summary */}
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                        <SectionHeading icon={Receipt} label="Impostos e valores (cabecalho)" />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {([
                            ["Base ICMS",   details.note.baseicms],
                            ["Vlr. ICMS",   details.note.vlricms],
                            ["Base IPI",    details.note.baseipi],
                            ["Vlr. IPI",    details.note.vlripi],
                            ["Base ICMS-ST",details.note.basesubstit],
                            ["Vlr. ICMS-ST",details.note.vlrsubst],
                            ["Vlr. PIS",    details.note.vlrpis],
                            ["Vlr. COFINS", details.note.vlrcofins],
                            ["Vlr. ISS",    details.note.vlriss],
                            ["Vlr. IRF",    details.note.vlrirf],
                            ["Vlr. INSS",   details.note.vlrinss],
                            ["Frete",       details.note.vlrfrete],
                            ["Desconto",    details.note.vlrdesctot],
                            ["Outros",      details.note.vlroutros],
                            ["Juros",       details.note.vlrjuro],
                            ["Seguro",      details.note.vlrseg],
                          ] as [string, number | string | null | undefined][]).map(([label, value]) => (
                            <div key={label}>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                              <p className="mt-0.5 text-sm font-medium text-slate-700 tabular-nums">{fmtMoney(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      Sem cabecalho de nota associado (tabela <code className="rounded bg-slate-100 px-1">{selected.tabela ?? "-"}</code>).
                    </div>
                  )}

                  {/* Items table */}
                  {details.items.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Itens da nota (tgfite) — {details.items.length}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              {["Seq", "Produto", "Qtd", "Un", "Vlr unit.", "Desc.", "Total", "CST/CSOSN", "Base ICMS", "% ICMS", "Vlr ICMS", "Vlr IPI", "ICMS-ST"].map((h, i) => (
                                <th key={h} className={`px-2 py-2 font-semibold uppercase text-slate-500 ${[2,4,5,6,8,9,10,11,12].includes(i) ? "text-right" : "text-left"}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {details.items.map((it) => {
                              const cst = it.tributacao?.cst ?? (it.tributacao?.csosn != null ? it.tributacao.csosn : null) ?? (it.csosn != null ? String(it.csosn) : null);
                              return (
                                <tr key={`${it.nunota}-${it.sequencia}`} className="hover:bg-slate-50">
                                  <td className="px-2 py-2 text-slate-500">{it.sequencia ?? "-"}</td>
                                  <td className="px-2 py-2">
                                    <div className="flex items-baseline gap-2">
                                      {it.codprod != null && <span className="shrink-0 font-mono text-xs text-slate-400">{it.codprod}</span>}
                                      <span className="font-medium text-slate-900">{it.produto?.descrprod ?? "-"}</span>
                                    </div>
                                    {it.produto?.referencia && <div className="text-[10px] text-slate-400 mt-0.5">Ref: {it.produto.referencia}</div>}
                                  </td>
                                  <td className="px-2 py-2 text-right">{fmtQty(it.qtdneg)}</td>
                                  <td className="px-2 py-2 text-slate-500">{it.codvol ?? "-"}</td>
                                  <td className="px-2 py-2 text-right">{fmtMoney(it.vlrunit)}</td>
                                  <td className="px-2 py-2 text-right text-slate-500">{fmtMoney(it.vlrdesc)}</td>
                                  <td className="px-2 py-2 text-right font-semibold">{fmtMoney(it.vlrtot)}</td>
                                  <td className="px-2 py-2">
                                    <div className="font-mono">{cst ?? "-"}</div>
                                    {it.tributacao?.descrtrib && <div className="text-[10px] text-slate-400">{it.tributacao.descrtrib}</div>}
                                  </td>
                                  <td className="px-2 py-2 text-right">{fmtMoney(it.baseicms)}</td>
                                  <td className="px-2 py-2 text-right text-slate-500">{fmtPerc(it.aliqicms)}</td>
                                  <td className="px-2 py-2 text-right">{fmtMoney(it.vlricms)}</td>
                                  <td className="px-2 py-2 text-right">{fmtMoney(it.vlripi)}</td>
                                  <td className="px-2 py-2 text-right">{fmtMoney(it.vlrsubst)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    details.note != null && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                        Nenhum item encontrado em <code className="rounded bg-amber-100 px-1">tgfite</code> para a nota <strong>{details.note.nunota}</strong>.
                      </div>
                    )
                  )}
                </>
              )}

              {/* ── Release form ── */}
              {isReleaseMode && (
                <div className="rounded-xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200">
                  <p className="mb-3 text-sm font-semibold text-amber-800">Confirmar liberacao</p>
                  <label className="mb-1.5 block text-xs font-semibold text-amber-700">
                    Observacao da liberacao <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={obslibInput}
                    onChange={(e) => setObslibInput(e.target.value)}
                    rows={3}
                    placeholder="Descreva o motivo ou contexto da liberacao..."
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none"
                    maxLength={255}
                  />
                  <p className="mt-1 text-right text-[10px] text-amber-600">{obslibInput.trim().length}/255</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Fechar
              </button>

              <div className="flex gap-2">
                {!isReleaseMode && canRelease && !selected.dhlib && selected.reprovado !== "S" && (
                  <button
                    type="button"
                    onClick={switchToRelease}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Liberar
                  </button>
                )}
                {isReleaseMode && (
                  <button
                    type="button"
                    onClick={submitRelease}
                    disabled={!obslibValid || submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {submitting ? "Liberando..." : "Confirmar liberacao"}
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
