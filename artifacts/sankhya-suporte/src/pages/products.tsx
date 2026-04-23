import { useMemo, useState } from "react";
import { useGetProduct, useListProducts, type Product } from "@workspace/api-client-react";

const PAGE_SIZE = 10;

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, isError } = useListProducts();
  const selectedQuery = useGetProduct(selectedId ?? 0);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedProduct = (selectedQuery.data ?? null) as Product | null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight">Produtos</h2>
        <p className="mt-1 text-sm text-slate-600">Consulta de produtos sem operacoes de cadastro, edicao ou exclusao.</p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por codigo, nome ou referencia"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        />
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <div className="flex items-center text-sm text-slate-500">Total: {filtered.length} registros</div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Codigo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Referencia</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Categoria</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Carregando produtos...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-rose-600">
                  Erro ao carregar produtos.
                </td>
              </tr>
            )}
            {!isLoading && !isError && pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              pageItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-medium">{item.code}</td>
                  <td className="px-4 py-3 text-sm">{item.name}</td>
                  <td className="px-4 py-3 text-sm">{item.sankhyaCode ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">{item.category}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      onClick={() => setSelectedId(item.id)}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
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

      {selectedId && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Detalhes do Produto</h3>
            <button type="button" onClick={() => setSelectedId(null)} className="text-sm text-slate-600 underline">
              Fechar
            </button>
          </div>
          {selectedQuery.isLoading && <p className="text-sm text-slate-500">Carregando detalhes...</p>}
          {selectedQuery.isError && <p className="text-sm text-rose-600">Erro ao carregar detalhes do produto.</p>}
          {selectedProduct && (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><strong>Codigo:</strong> {selectedProduct.code}</p>
              <p><strong>Nome:</strong> {selectedProduct.name}</p>
              <p><strong>Referencia:</strong> {selectedProduct.sankhyaCode ?? "-"}</p>
              <p><strong>Categoria:</strong> {selectedProduct.category}</p>
              <p><strong>Unidade:</strong> {selectedProduct.unit}</p>
              <p><strong>Estoque:</strong> {selectedProduct.stock}</p>
              <p><strong>Preco:</strong> R$ {selectedProduct.unitPrice.toFixed(2)}</p>
              <p><strong>Criado em:</strong> {new Date(selectedProduct.createdAt).toLocaleDateString("pt-BR")}</p>
              <p className="sm:col-span-2"><strong>Descricao:</strong> {selectedProduct.description || "-"}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
