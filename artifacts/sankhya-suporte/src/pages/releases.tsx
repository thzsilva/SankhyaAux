import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
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
}

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<StatusFilter, string> = {
  pending: "Pendentes",
  released: "Liberadas",
  all: "Todas",
};

function apiUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/api${path}`;
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

function statusOf(row: ReleaseRow): {
  label: string;
  className: string;
} {
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

export default function Releases() {
  const { token, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<ReleaseRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [vlrLiberadoInput, setVlrLiberadoInput] = useState("");
  const [obslibInput, setObslibInput] = useState("");

  const canRelease = user?.role === "robot" || user?.role === "human" || user?.role === "SA";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetch(apiUrl(`/releases?status=${statusFilter}`), {
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
        setError(err instanceof Error ? err.message : "Erro ao carregar liberacoes");
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, statusFilter, refreshKey]);

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
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openRelease(row: ReleaseRow) {
    setSelected(row);
    const fallback = Number(row.vlratual ?? row.vlrliberado ?? 0);
    setVlrLiberadoInput(Number.isFinite(fallback) ? String(fallback) : "");
    setObslibInput("");
  }

  function closeRelease() {
    setSelected(null);
    setVlrLiberadoInput("");
    setObslibInput("");
  }

  async function submitRelease() {
    if (!selected || !token) return;
    const vlr = Number(vlrLiberadoInput);
    if (!Number.isFinite(vlr) || vlr <= 0) {
      toast.error("Informe um valor liberado valido.");
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
          body: JSON.stringify({ vlrliberado: vlr, obslib: obslibInput }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Liberacao efetuada com sucesso.");
      closeRelease();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao liberar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Liberacoes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Solicitacoes registradas em <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">tsilib</code>.
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

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="pending">Pendentes</option>
          <option value="released">Liberadas</option>
          <option value="all">Todas</option>
        </select>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por chave, tabela, parceiro ou observacao"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring-2 md:col-span-2"
        />
        <div className="flex items-center text-sm text-slate-500 md:col-span-3">
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Chave</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Tabela / Evento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Solicitacao</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Limite</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Atual</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Liberado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Carregando liberacoes...
                </td>
              </tr>
            )}
            {!isLoading && error && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
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
                      <span className="text-xs text-slate-400"> / {row.sequencia}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{(row.tabela ?? "").trim() || "-"}</div>
                      <div className="text-xs text-slate-500">Evento {row.evento ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{fmtDate(row.dhsolicit)}</div>
                      <div className="text-xs text-slate-500">Por usuario {row.codususolicit ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{fmtMoney(row.vlrlimite)}</td>
                    <td className="px-4 py-3 text-right text-sm">{fmtMoney(row.vlratual)}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div>{fmtMoney(row.vlrliberado)}</div>
                      {row.dhlib && (
                        <div className="text-xs text-slate-500">{fmtDate(row.dhlib)}</div>
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
                      {isPending && canRelease ? (
                        <button
                          type="button"
                          onClick={() => openRelease(row)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Liberar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
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
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Liberar solicitacao</h3>
              <button
                type="button"
                onClick={closeRelease}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Chave</p>
                <p className="font-medium">
                  {selected.nuchave}/{selected.sequencia}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tabela</p>
                <p className="font-medium">{(selected.tabela ?? "").trim() || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Limite</p>
                <p className="font-medium">{fmtMoney(selected.vlrlimite)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Atual</p>
                <p className="font-medium">{fmtMoney(selected.vlratual)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Observacao do solicitante</p>
                <p className="font-medium">{selected.observacao?.trim() || "-"}</p>
              </div>
            </div>

            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Valor liberado</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={vlrLiberadoInput}
                onChange={(event) => setVlrLiberadoInput(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
              />
            </label>

            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Observacao da liberacao</span>
              <textarea
                rows={3}
                maxLength={255}
                value={obslibInput}
                onChange={(event) => setObslibInput(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
                placeholder="Opcional (ate 255 caracteres)"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRelease}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitRelease}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Liberando..." : "Confirmar liberacao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
