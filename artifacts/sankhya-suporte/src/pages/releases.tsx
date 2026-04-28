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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

type StatusFilter = "pending" | "released" | "all";

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

// Entidades enriquecidas devolvidas pelo backend novo
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
  // impostos / valores
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
  // entidades relacionadas
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
  // impostos por item
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
  // entidades relacionadas
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
const STATUS_LABEL: Record<StatusFilter, string> = {
  pending: "Pendentes",
  released: "Liberadas",
  all: "Todas",
};

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

function fmtMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtQty(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function fmtPerc(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })}%`;
}

function userLabel(
  codusu: number | null | undefined,
  nome?: string | null,
): string {
  const c = codusu == null ? null : Number(codusu);
  const hasCode = c != null && Number.isFinite(c);
  const cleanName = (nome ?? "").trim();
  if (hasCode && cleanName) return `${cleanName} (#${c})`;
  if (hasCode) return `Usuário #${c}`;
  return "-";
}

// Mostra "Nome (codigo)" para parceiro/vendedor/operacao/natureza/empresa.
// Se a entidade nao chegou (tabela auxiliar ainda nao existe), mostra so o codigo.
function entityLabel(
  code: number | null | undefined,
  name: string | null | undefined,
  prefix = "",
): string {
  const c = code == null ? null : Number(code);
  const hasCode = c != null && Number.isFinite(c);
  const cleanName = (name ?? "").trim();
  if (hasCode && cleanName) return `${cleanName} (#${c})`;
  if (hasCode) return `${prefix}${c}`;
  return "-";
}

function statusOf(row: ReleaseRow): { label: string; className: string } {
  if (row.reprovado === "S") {
    return {
      label: "Reprovada",
      className: "bg-rose-100 text-rose-700 ring-rose-200",
    };
  }
  if (row.dhlib) {
    return {
      label: "Liberada",
      className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    };
  }
  return {
    label: "Pendente",
    className: "bg-amber-100 text-amber-700 ring-amber-200",
  };
}

type ModalMode = "details" | "release";

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

  const canRelease =
    user?.role === "robot" || user?.role === "human" || user?.role === "SA";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(apiUrl(`/releases/solicitantes`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        setSolicitantes(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ status: statusFilter });
    if (solicitanteFilter) params.set("codususolicit", solicitanteFilter);
    fetch(apiUrl(`/releases?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
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
        setError(
          err instanceof Error ? err.message : "Erro ao carregar liberacoes",
        );
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, statusFilter, solicitanteFilter, refreshKey]);

  useEffect(() => {
    if (!selected || !token) {
      setDetails(null);
      setDetailsError(null);
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError(null);
    setDetails(null);
    fetch(
      apiUrl(`/releases/${selected.nuchave}/${selected.sequencia}/details`),
      { headers: { Authorization: `Bearer ${token}` } },
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return (await res.json()) as ReleaseDetails;
      })
      .then((data) => {
        if (cancelled) return;
        setDetails(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDetailsError(
          err instanceof Error ? err.message : "Erro ao carregar detalhes",
        );
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, token]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const haystack = [
        String(row.nuchave ?? ""),
        String(row.sequencia ?? ""),
        String(row.tabela ?? ""),
        String(row.codparc ?? ""),
        String(row.observacao ?? ""),
        String(row.codususolicit ?? ""),
        String(row.solicitante_nome ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openDetails(row: ReleaseRow) {
    setSelected(row);
    setModalMode("details");
    setObslibInput("");
  }
  function openRelease(row: ReleaseRow) {
    setSelected(row);
    setModalMode("release");
    setObslibInput("");
  }
  function switchToRelease() {
    setModalMode("release");
  }
  function closeModal() {
    setSelected(null);
    setObslibInput("");
    setDetails(null);
    setDetailsError(null);
    setModalMode("details");
  }

  const obslibTrimmed = obslibInput.trim();
  const obslibValid = obslibTrimmed.length > 0;

  async function submitRelease() {
    if (!selected || !token) return;
    if (!obslibValid) {
      toast.error("Informe a observacao da liberacao.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        apiUrl(`/releases/${selected.nuchave}/${selected.sequencia}/release`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ obslib: obslibTrimmed }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
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

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Liberacoes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Solicitacoes registradas em{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                tsilib
              </code>
              .
              {canRelease
                ? " Voce pode liberar pendencias."
                : " Apenas usuarios com perfil Robo, Usuario ou Super Admin podem liberar."}
            </p>
          </div>
          {canRelease && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pode liberar
            </span>
          )}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="pending">Pendentes</option>
          <option value="released">Liberadas</option>
          <option value="all">Todas</option>
        </select>
        <select
          value={solicitanteFilter}
          onChange={(event) => {
            setSolicitanteFilter(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="">Todos os solicitantes</option>
          {solicitantes.map((opt) => (
            <option key={opt.codusu} value={opt.codusu}>
              {opt.nome
                ? `${opt.nome} (#${opt.codusu})`
                : `Usuário #${opt.codusu}`}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por chave, parceiro, observacao ou solicitante"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring-2 md:col-span-2"
        />
        <div className="flex items-center text-sm text-slate-500 md:col-span-4">
          {STATUS_LABEL[statusFilter]} - Total: {filtered.length} registro(s)
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                Chave
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                Tabela / Evento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                Solicitante
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                Solicitação
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                Limite
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                Atual
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                Liberado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Carregando liberacoes...
                </td>
              </tr>
            )}
            {!isLoading && error && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-rose-600"
                >
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Nenhuma liberacao encontrada.
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              pageItems.map((row) => {
                const status = statusOf(row);
                const isPending = !row.dhlib && row.reprovado !== "S";
                return (
                  <tr key={`${row.nuchave}-${row.sequencia}`}>
                    <td className="px-4 py-3 text-sm font-medium">
                      {row.nuchave}
                      <span className="text-xs text-slate-400">
                        {" "}
                        / {row.sequencia}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">
                        {(row.tabela ?? "").trim() || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Evento {row.evento ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium">
                          {userLabel(row.codususolicit, row.solicitante_nome)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{fmtDate(row.dhsolicit)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {fmtMoney(row.vlrlimite)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {fmtMoney(row.vlratual)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div>{fmtMoney(row.vlrliberado)}</div>
                      {row.dhlib && (
                        <div className="text-xs text-slate-500">
                          {fmtDate(row.dhlib)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetails(row)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          title="Ver detalhes da liberação"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detalhes
                        </button>
                        {isPending && canRelease && (
                          <button
                            type="button"
                            onClick={() => openRelease(row)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
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

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-500">
          Pagina {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {isReleaseMode
                    ? "Liberar solicitacao"
                    : "Detalhes da liberacao"}
                </h3>
                <p className="text-xs text-slate-500">
                  Chave {selected.nuchave}/{selected.sequencia}
                  {details?.event && (
                    <>
                      {" · "}
                      <span className="font-medium text-slate-700">
                        Evento {details.event.evento}: {details.event.descricao}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cabecalho da solicitacao (tsilib) */}
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Tabela</p>
                <p className="font-medium">
                  {(selected.tabela ?? "").trim() || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Evento</p>
                <p className="font-medium">
                  {details?.event
                    ? details.event.descricao
                    : selected.evento != null
                      ? `Evento ${selected.evento}`
                      : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Limite</p>
                <p className="font-medium">{fmtMoney(selected.vlrlimite)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Atual</p>
                <p className="font-medium">{fmtMoney(selected.vlratual)}</p>
              </div>
              <div className="col-span-2 md:col-span-2">
                <p className="text-xs text-slate-500">Solicitante</p>
                <p className="font-medium">
                  {userLabel(
                    details?.usuarios.solicitante.codusu ??
                      selected.codususolicit,
                    details?.usuarios.solicitante.nome ??
                      selected.solicitante_nome,
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {fmtDate(selected.dhsolicit)}
                </p>
              </div>
              <div className="col-span-2 md:col-span-2">
                <p className="text-xs text-slate-500">Liberador</p>
                <p className="font-medium">
                  {selected.dhlib
                    ? userLabel(
                        details?.usuarios.liberador.codusu ??
                          selected.codusulib,
                        details?.usuarios.liberador.nome,
                      )
                    : "Pendente"}
                </p>
                {selected.dhlib && (
                  <p className="text-xs text-slate-500">
                    {fmtDate(selected.dhlib)}
                  </p>
                )}
              </div>
              <div className="col-span-2 md:col-span-4">
                <p className="text-xs text-slate-500">
                  Observacao do solicitante
                </p>
                <p className="font-medium">
                  {selected.observacao?.trim() || "-"}
                </p>
              </div>
              {selected.obslib && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-slate-500">
                    Observacao da liberacao
                  </p>
                  <p className="font-medium">{selected.obslib}</p>
                </div>
              )}
            </div>

            {detailsLoading && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando detalhes da nota...
              </div>
            )}
            {!detailsLoading && detailsError && (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Nao foi possivel carregar detalhes: {detailsError}
              </div>
            )}

            {!detailsLoading && !detailsError && details && (
              <>
                {details.note ? (
                  <>
                    {/* Cabecalho da nota: Parceiro / Vendedor / Operacao / Natureza */}
                    <div className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600">
                        <FileText className="h-3.5 w-3.5" />
                        Cabecalho da nota (tgfcab)
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs text-slate-500">N° nota</p>
                          <p className="font-medium">
                            {details.note.numnota ?? details.note.nunota ?? "-"}
                            {details.note.serienota
                              ? ` / ${details.note.serienota}`
                              : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Empresa</p>
                          <p className="font-medium">
                            {entityLabel(
                              details.note.codemp,
                              details.note.empresa?.nomefant ??
                                details.note.empresa?.razaosocial,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Tipo mov.</p>
                          <p className="font-medium">
                            {details.note.tipmov ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Aprovado</p>
                          <p className="font-medium">
                            {details.note.aprovado ?? "-"}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Parceiro</p>
                          <p className="font-medium">
                            {entityLabel(
                              details.note.codparc,
                              details.note.parceiro?.nomeparc,
                            )}
                          </p>
                          {details.note.parceiro?.cgc_cpf && (
                            <p className="text-xs text-slate-500">
                              CNPJ/CPF: {details.note.parceiro.cgc_cpf}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vendedor</p>
                          <p className="font-medium">
                            {entityLabel(
                              details.note.codvend,
                              details.note.vendedor?.apelido,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. nota</p>
                          <p className="font-semibold text-slate-800">
                            {fmtMoney(details.note.vlrnota)}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">
                            Tipo de operação (TOP)
                          </p>
                          <p className="font-medium">
                            {entityLabel(
                              details.note.codtipoper,
                              details.note.operacao?.descroper,
                            )}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">Natureza</p>
                          <p className="font-medium">
                            {entityLabel(
                              details.note.codnat,
                              details.note.natureza?.descrnat,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Data negoc.</p>
                          <p className="font-medium">
                            {fmtDate(details.note.dtneg)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">
                            Data faturam.
                          </p>
                          <p className="font-medium">
                            {fmtDate(details.note.dtfatur)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">
                            Responsável (codusu)
                          </p>
                          <p className="font-medium">
                            {userLabel(
                              details.usuarios.nota_responsavel?.codusu ?? null,
                              details.usuarios.nota_responsavel?.nome,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">
                            Inclusor (codusuinc)
                          </p>
                          <p className="font-medium">
                            {userLabel(
                              details.usuarios.nota_inclusor?.codusu ?? null,
                              details.usuarios.nota_inclusor?.nome,
                            )}
                          </p>
                        </div>

                        {details.note.observacao && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-xs text-slate-500">
                              Observacao da nota
                            </p>
                            <p className="whitespace-pre-wrap text-slate-700">
                              {details.note.observacao}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resumo de impostos do cabecalho */}
                    <div className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600">
                        <Receipt className="h-3.5 w-3.5" />
                        Impostos e valores (cabeçalho)
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs text-slate-500">Base ICMS</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.baseicms)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. ICMS</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlricms)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Base IPI</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.baseipi)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. IPI</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlripi)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Base ICMS-ST</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.basesubstit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. ICMS-ST</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrsubst)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. PIS</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrpis)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. COFINS</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrcofins)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. ISS</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlriss)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. IRF</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrirf)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Vlr. INSS</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrinss)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Frete</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrfrete)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Desconto</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrdesctot)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Outros</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlroutros)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Juros</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrjuro)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Seguro</p>
                          <p className="font-medium">
                            {fmtMoney(details.note.vlrseg)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Sem cabecalho de nota associado (tabela{" "}
                    <code className="rounded bg-slate-100 px-1">
                      {selected.tabela ?? "-"}
                    </code>
                    ).
                  </div>
                )}

                {details.items.length > 0 ? (
                  <div className="mb-4 overflow-x-auto rounded-md border border-slate-200">
                    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600">
                      <Package className="h-3.5 w-3.5" />
                      Itens da nota (tgfite) — {details.items.length}
                    </div>
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-2 text-left font-semibold uppercase text-slate-600">
                            Seq
                          </th>
                          <th className="px-2 py-2 text-left font-semibold uppercase text-slate-600">
                            Produto
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            Qtd
                          </th>
                          <th className="px-2 py-2 text-left font-semibold uppercase text-slate-600">
                            Un
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            Vlr unit.
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            Desc.
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            Total
                          </th>
                          <th className="px-2 py-2 text-left font-semibold uppercase text-slate-600">
                            CST/CSOSN
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            Base ICMS
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            % ICMS
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            Vlr ICMS
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            Vlr IPI
                          </th>
                          <th className="px-2 py-2 text-right font-semibold uppercase text-slate-600">
                            ICMS-ST
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {details.items.map((it) => {
                          const cst =
                            it.tributacao?.cst ??
                            (it.tributacao?.csosn != null
                              ? it.tributacao.csosn
                              : null) ??
                            (it.csosn != null ? String(it.csosn) : null);
                          const prodLabel =
                            it.produto?.descrprod ??
                            (it.codprod != null ? `#${it.codprod}` : "-");
                          return (
                            <tr key={`${it.nunota}-${it.sequencia}`}>
                              <td className="px-2 py-2 text-slate-500">
                                {it.sequencia ?? "-"}
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-medium">{prodLabel}</div>
                                {it.produto?.referencia && (
                                  <div className="text-[10px] text-slate-500">
                                    Ref: {it.produto.referencia}
                                  </div>
                                )}
                                {it.codprod != null &&
                                  it.produto?.descrprod && (
                                    <div className="text-[10px] text-slate-400">
                                      #{it.codprod}
                                    </div>
                                  )}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {fmtQty(it.qtdneg)}
                              </td>
                              <td className="px-2 py-2 text-slate-500">
                                {it.codvol ?? "-"}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {fmtMoney(it.vlrunit)}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-500">
                                {fmtMoney(it.vlrdesc)}
                              </td>
                              <td className="px-2 py-2 text-right font-semibold">
                                {fmtMoney(it.vlrtot)}
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-mono">{cst ?? "-"}</div>
                                {it.tributacao?.descrtrib && (
                                  <div className="text-[10px] text-slate-500">
                                    {it.tributacao.descrtrib}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {fmtMoney(it.baseicms)}
                              </td>
                              <td className="px-2 py-2 text-right text-slate-500">
                                {fmtPerc(it.aliqicms)}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {fmtMoney(it.vlricms)}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {fmtMoney(it.vlripi)}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {fmtMoney(it.vlrsubst)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  details.note != null && (
                    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Nenhum item encontrado em{" "}
                      <code className="rounded bg-amber-100 px-1">tgfite</code>{" "}
                      para a nota <strong>{details.note.nunota}</strong>.
                    </div>
                  )
                )}
              </>
            )}

            {isReleaseMode && (
              <>
                <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                  <p className="text-xs text-emerald-700">
                    Valor a ser liberado
                  </p>
                  <p className="text-base font-semibold text-emerald-900">
                    {fmtMoney(selected.vlratual)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Sempre igual ao valor solicitado, sem alteracao.
                  </p>
                </div>
                <label className="mb-4 block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">
                    Observacao da liberacao{" "}
                    <span className="text-rose-600">*</span>
                  </span>
                  <textarea
                    rows={3}
                    maxLength={255}
                    value={obslibInput}
                    onChange={(event) => setObslibInput(event.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={!obslibValid}
                    className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                      obslibValid
                        ? "border-slate-300 ring-emerald-500"
                        : "border-rose-300 ring-rose-500"
                    }`}
                    placeholder="Obrigatorio. Explique o motivo da liberacao (ate 255 caracteres)."
                  />
                  <span
                    className={`mt-1 block text-xs ${
                      obslibValid ? "text-slate-500" : "text-rose-600"
                    }`}
                  >
                    {obslibValid
                      ? `${obslibTrimmed.length}/255 caracteres`
                      : "Campo obrigatorio."}
                  </span>
                </label>
              </>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Fechar
              </button>
              {!isReleaseMode &&
                canRelease &&
                !selected.dhlib &&
                selected.reprovado !== "S" && (
                  <button
                    type="button"
                    onClick={switchToRelease}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? "Liberando..." : "Confirmar liberacao"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
