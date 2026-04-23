import { useMemo, useState } from "react";
import { useGetClient, useListClients, type Client } from "@workspace/api-client-react";

const PAGE_SIZE = 10;

export default function Clients() {
  const [search, setSearch] = useState("");
  const [startsWith, setStartsWith] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, isError } = useListClients();
  const selectedQuery = useGetClient(selectedId ?? 0);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.sankhyaCode.toLowerCase().includes(term) ||
        item.cnpj.toLowerCase().includes(term);
      const matchesLetter =
        startsWith === "all" || item.name.toLowerCase().startsWith(startsWith.toLowerCase());
      return matchesSearch && matchesLetter;
    });
  }, [data, search, startsWith]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedClient = (selectedQuery.data ?? null) as Client | null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <p className="mt-1 text-sm text-slate-600">
          Consulta de clientes sem operacoes de cadastro, edicao ou exclusao.
        </p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por codigo, nome ou CPF/CNPJ"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        />
        <select
          value={startsWith}
          onChange={(event) => {
            setStartsWith(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="all">Todos os nomes</option>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
            <option key={letter} value={letter.toLowerCase()}>
              Inicia com {letter}
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">CPF/CNPJ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Contato</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Carregando clientes...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-rose-600">
                  Erro ao carregar clientes.
                </td>
              </tr>
            )}
            {!isLoading && !isError && pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              pageItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-medium">{item.sankhyaCode}</td>
                  <td className="px-4 py-3 text-sm">{item.name}</td>
                  <td className="px-4 py-3 text-sm">{item.cnpj}</td>
                  <td className="px-4 py-3 text-sm">{item.email}</td>
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
            <h3 className="text-lg font-semibold">Detalhes do Cliente</h3>
            <button type="button" onClick={() => setSelectedId(null)} className="text-sm text-slate-600 underline">
              Fechar
            </button>
          </div>
          {selectedQuery.isLoading && <p className="text-sm text-slate-500">Carregando detalhes...</p>}
          {selectedQuery.isError && <p className="text-sm text-rose-600">Erro ao carregar detalhes do cliente.</p>}
          {selectedClient && (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><strong>Codigo:</strong> {selectedClient.sankhyaCode}</p>
              <p><strong>Nome:</strong> {selectedClient.name}</p>
              <p><strong>CPF/CNPJ:</strong> {selectedClient.cnpj}</p>
              <p><strong>Telefone:</strong> {selectedClient.phone}</p>
              <p><strong>E-mail:</strong> {selectedClient.email}</p>
              <p><strong>Criado em:</strong> {new Date(selectedClient.createdAt).toLocaleDateString("pt-BR")}</p>
              <p className="sm:col-span-2"><strong>Observacoes:</strong> {selectedClient.notes || "-"}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}