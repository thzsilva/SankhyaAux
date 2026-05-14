import { useEffect, useMemo, useState } from "react";
import { useGetProduct, useListProducts, type Product } from "@workspace/api-client-react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loteStatus, setLoteStatus] = useState<Record<number, "S" | "N">>({});
  const [serverResults, setServerResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data, isLoading, isError } = useListProducts();
  const selectedQuery = useGetProduct(selectedId ?? 0);

  useEffect(() => {
    if (!data) return;
    setLoteStatus((prev) => {
      const next: Record<number, "S" | "N"> = { ...prev };
      for (const item of data) {
        if (!(item.id in next)) {
          next[item.id] = item.temrastrolote === "N" ? "N" : "S";
        }
      }
      return next;
    });
  }, [data]);

  const categories = useMemo(() => {
    const values = new Set((data ?? []).map((item) => item.category).filter(Boolean));
    return Array.from(values).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      const matchesSearch =
        !term ||
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        (item.sankhyaCode ?? "").toLowerCase().includes(term);
      const matchesCategory = category === "all" || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, data, search]);

  useEffect(() => {
    const term = search.trim();
    if (!term || filtered.length > 0) {
      setServerResults([]);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    fetch(`/api/products?search=${encodeURIComponent(term)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => setServerResults(res as Product[]))
      .catch(() => {})
      .finally(() => setIsSearching(false));
    return () => controller.abort();
  }, [search, filtered.length]);

  const displayItems = filtered.length > 0 ? filtered : serverResults;
  const totalPages = Math.max(1, Math.ceil(displayItems.length / PAGE_SIZE));
  const pageItems = displayItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedProduct = (selectedQuery.data ?? null) as Product | null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por codigo, nome ou referencia"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none shadow-sm transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none shadow-sm transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
          {displayItems.length} registro(s)
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cod. Sankhya</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nome</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Referencia</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:table-cell">Categoria</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">Carregando produtos...</td></tr>
              )}
              {isSearching && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">Buscando no servidor...</td></tr>
              )}
              {isError && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-rose-600">Erro ao carregar produtos.</td></tr>
              )}
              {!isLoading && !isSearching && !isError && pageItems.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">Nenhum produto encontrado.</td></tr>
              )}
              {!isLoading && !isSearching && !isError && pageItems.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-slate-700">{item.sankhyaCode ?? "-"}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.name}</td>
                  <td className="hidden px-4 py-3 text-sm text-slate-500 sm:table-cell">{item.code}</td>
                  <td className="hidden px-4 py-3 text-sm text-slate-500 md:table-cell">{item.category}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/products/${item.id}/toggle-lote`, { method: "PATCH" });
                            const body = await res.json() as { temrastrolote?: "S" | "N"; error?: string; detail?: string };
                            if (!res.ok) {
                              toast.error(body.detail ?? body.error ?? `Erro ${res.status}`);
                              return;
                            }
                            const novo = body.temrastrolote!;
                            setLoteStatus((prev) => ({ ...prev, [item.id]: novo }));
                            toast.success(novo === "N" ? "Rastreio de lote desabilitado." : "Rastreio de lote habilitado.");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Falha ao alterar rastreio de lote.");
                          }
                        }}
                        className={
                          loteStatus[item.id] === "N"
                            ? "rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:border-rose-400 hover:bg-rose-100"
                            : loteStatus[item.id] === "S"
                            ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
                            : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                        }
                      >
                        {loteStatus[item.id] === "N" ? "Habilitar Rastreio de Lote" : "Desabilitar Rastreio de Lote"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Pagina {page} de {totalPages}</p>
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

      {/* [ALTERADO] era um painel fixo no final da página, agora é um modal centralizado com overlay escuro */}
      {selectedId && (
        // overlay — clique fora fecha o modal
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedId(null)}
        >
          {/* container do modal — stopPropagation impede que clique interno feche o modal */}
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* cabeçalho */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Detalhes do Produto</h3>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* corpo */}
            <div className="p-5">
              {selectedQuery.isLoading && <p className="text-sm text-slate-400">Carregando...</p>}
              {selectedQuery.isError && <p className="text-sm text-rose-600">Erro ao carregar detalhes.</p>}
              {selectedProduct && (
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  {[
                    ["Cod. Sankhya", selectedProduct.sankhyaCode ?? "-"],
                    ["Nome", selectedProduct.name],
                    ["Referencia", selectedProduct.code],
                    ["Categoria", selectedProduct.category],
                    ["Unidade", selectedProduct.unit],
                    ["Estoque", String(selectedProduct.stock)],
                    ["Preco", `R$ ${selectedProduct.unitPrice.toFixed(2)}`],
                    ["Criado em", new Date(selectedProduct.createdAt).toLocaleDateString("pt-BR")],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-1 font-medium text-slate-800">{value || "-"}</p>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Descricao</p>
                    <p className="mt-1 font-medium text-slate-800">{selectedProduct.description || "-"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}