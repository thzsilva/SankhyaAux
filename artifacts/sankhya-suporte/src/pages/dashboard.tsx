import {
  useGetDashboardSummary,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { FileText, ShieldCheck, UserPlus, PackageSearch, ArrowRight } from "lucide-react";

const tiles = [
  {
    href: "/relatorios",
    title: "Relatorios",
    description: "Visualize e exporte dados do sistema",
    icon: FileText,
    color: "text-sky-700",
    bg: "bg-sky-100",
    ring: "ring-sky-200",
  },
  {
    href: "/liberacoes",
    title: "Liberacoes",
    description: "Aprovacoes e controle de acesso",
    icon: ShieldCheck,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    ring: "ring-emerald-200",
  },
  {
    href: "/clientes",
    title: "Clientes",
    description: "Cadastro e historico de clientes",
    icon: UserPlus,
    color: "text-rose-700",
    bg: "bg-rose-100",
    ring: "ring-rose-200",
  },
  {
    href: "/produtos",
    title: "Produtos",
    description: "Consulta e movimentacoes",
    icon: PackageSearch,
    color: "text-amber-700",
    bg: "bg-amber-100",
    ring: "ring-amber-200",
  },
] as const;

const statusStyles: Record<string, { label: string; cls: string; dot: string }> = {
  ok: {
    label: "OK",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  pendente: {
    label: "Pendente",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  alerta: {
    label: "Alerta",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
};

function classifyActivity(action: string): keyof typeof statusStyles {
  const a = action.toLowerCase();
  if (a.includes("pend") || a.includes("aguard")) return "pendente";
  if (a.includes("erro") || a.includes("falha") || a.includes("alert")) return "alerta";
  return "ok";
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Hoje, ${time}`;
  if (isYesterday) return `Ontem, ${time}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + `, ${time}`;
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: activity } = useGetRecentActivity();

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Clientes ativos</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {isLoading ? "..." : summary?.activeClients ?? 0}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-600">
            +{summary?.newClientsThisMonth ?? 0} este mes
          </p>
        </article>
        <article className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Liberacoes hoje</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {isLoading ? "..." : summary?.releasesToday ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary?.pendingReleases ?? 0} pendentes
          </p>
        </article>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300"
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tile.bg} ${tile.color} ring-1 ${tile.ring}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-base font-semibold text-slate-900">{tile.title}</p>
              <p className="mt-1 text-xs leading-snug text-slate-500">{tile.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 transition group-hover:text-emerald-700">
                Acessar <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          );
        })}
      </section>

      <section>
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Atividade recente
        </p>
        <div className="mt-2 space-y-2">
          {(activity ?? []).slice(0, 5).map((item) => {
            const status = statusStyles[classifyActivity(item.action)];
            return (
              <article
                key={item.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${status.dot}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatRelativeTime(item.createdAt)}</p>
                  </div>
                </div>
                <span
                  className={`ml-3 flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${status.cls}`}
                >
                  {status.label}
                </span>
              </article>
            );
          })}
          {(!activity || activity.length === 0) && (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 ring-1 ring-slate-200 shadow-sm">
              Sem atividades recentes.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
