import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Link } from "wouter";

const summaryItems = [
  { key: "activeClients", label: "Clientes ativos" },
  { key: "newClientsThisMonth", label: "Novos clientes no mes" },
  { key: "totalProducts", label: "Produtos cadastrados" },
  { key: "pendingReleases", label: "Pendencias gerais" },
] as const;

export default function Dashboard() {
  const { data, isLoading, isError } = useGetDashboardSummary();

  if (isError) {
    return (
      <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Nao foi possivel carregar o dashboard. Verifique a API e tente novamente.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Visao geral do sistema com foco em consulta de clientes e produtos.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryItems.map((item, index) => (
          <article
            key={item.key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold ${index % 2 === 0 ? "text-emerald-700" : "text-slate-900"}`}>
              {isLoading ? "..." : data?.[item.key] ?? 0}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/produtos" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
          <h3 className="font-semibold">Modulo de Produtos</h3>
          <p className="mt-1 text-sm text-slate-600">Consulta com busca, filtros, detalhes e paginacao.</p>
        </Link>
        <Link href="/clientes" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
          <h3 className="font-semibold">Modulo de Clientes</h3>
          <p className="mt-1 text-sm text-slate-600">Consulta com busca, filtros, detalhes e paginacao.</p>
        </Link>
      </section>
    </div>
  );
}
