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
    color: "text-sky-300",
    bg: "bg-sky-500/15",
    ring: "ring-sky-400/20",
  },
  {
    href: "/liberacoes",
    title: "Liberacoes",
    description: "Aprovacoes e controle de acesso",
    icon: ShieldCheck,
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-400/20",
  },
  {
    href: "/clientes",
    title: "Clientes",
    description: "Cadastro e historico de clientes",
    icon: UserPlus,
    color: "text-rose-300",
    bg: "bg-rose-500/15",
    ring: "ring-rose-400/20",
  },
  {
    href: "/produtos",
    title: "Produtos",
    description: "Consulta e movimentacoes",
    icon: PackageSearch,
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    ring: "ring-amber-400/20",
  },
] as const;

const statusStyles: Record<string, { label: string; cls: string; dot: string }> = {
  ok: {
    label: "OK",
    cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
  pendente: {
    label: "Pendente",
    cls: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    dot: "bg-amber-400",
  },
  alerta: {
    label: "Alerta",
    cls: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
    dot: "bg-rose-400",
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
        <article className="rounded-2xl bg-[#15181d] p-4 ring-1 ring-white/5">
          <p className="text-xs font-medium text-slate-400">Clientes ativos</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {isLoading ? "..." : summary?.activeClients ?? 0}
          </p>
          <p className="mt-1 text-xs text-emerald-400">
            +{summary?.newClientsThisMonth ?? 0} este mes
          </p>
        </article>
        <article className="rounded-2xl bg-[#15181d] p-4 ring-1 ring-white/5">
          <p className="text-xs font-medium text-slate-400">Liberacoes hoje</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {isLoading ? "..." : summary?.releasesToday ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">
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
              className="group flex flex-col rounded-2xl bg-[#15181d] p-4 ring-1 ring-white/5 transition hover:bg-[#1a1e24] hover:ring-white/10"
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tile.bg} ${tile.color} ring-1 ${tile.ring}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-base font-semibold text-white">{tile.title}</p>
              <p className="mt-1 text-xs leading-snug text-slate-400">{tile.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-300 transition group-hover:text-emerald-300">
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
                className="flex items-center justify-between rounded-2xl bg-[#15181d] p-4 ring-1 ring-white/5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${status.dot}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.description}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(item.createdAt)}</p>
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
            <p className="rounded-2xl bg-[#15181d] p-4 text-center text-sm text-slate-400 ring-1 ring-white/5">
              Sem atividades recentes.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
