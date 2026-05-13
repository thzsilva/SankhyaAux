import {
  useGetDashboardSummary,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { FileText, ShieldCheck, UserPlus, PackageSearch, ArrowRight, Users, CheckCircle2, Clock } from "lucide-react";

const tiles = [
  { href: "/relatorios", title: "Relatorios", description: "Visualize e exporte dados do sistema", icon: FileText, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" },
  { href: "/liberacoes", title: "Liberacoes", description: "Aprovacoes e controle de acesso", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  { href: "/clientes", title: "Clientes", description: "Cadastro e historico de clientes", icon: UserPlus, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  { href: "/produtos", title: "Produtos", description: "Consulta e movimentacoes", icon: PackageSearch, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
] as const;

const statusStyles: Record<string, { label: string; cls: string; dot: string }> = {
  ok: { label: "OK", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  pendente: { label: "Pendente", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-400" },
  alerta: { label: "Alerta", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
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
  const { data: activityRaw } = useGetRecentActivity();
  const activity = Array.isArray(activityRaw) ? activityRaw : [];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Clientes ativos</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900 tabular-nums">
            {isLoading
              ? <span className="inline-block h-8 w-14 animate-pulse rounded-lg bg-slate-100" />
              : (summary?.activeClients ?? 0)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-emerald-600">
            +{isLoading ? "–" : (summary?.newClientsThisMonth ?? 0)} este mes
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Liberacoes hoje</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900 tabular-nums">
            {isLoading
              ? <span className="inline-block h-8 w-14 animate-pulse rounded-lg bg-slate-100" />
              : (summary?.releasesToday ?? 0)}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-amber-500" />
            <p className="text-xs font-medium text-amber-600">
              {isLoading ? "–" : (summary?.pendingReleases ?? 0)} pendentes
            </p>
          </div>
        </div>
      </section>

      {/* Quick access */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Acesso rapido</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="group flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 active:scale-[0.99]"
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border ${tile.bg} ${tile.border} ${tile.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{tile.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{tile.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Atividade recente</p>
        <div className="space-y-2">
          {activity.slice(0, 5).map((item) => {
            const status = statusStyles[classifyActivity(item.action)];
            return (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 ring-1 ring-slate-200 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${status.dot}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{item.description}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(item.createdAt)}</p>
                  </div>
                </div>
                <span className={`ml-3 flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${status.cls}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
          {activity.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-4 py-12 ring-1 ring-slate-200 shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-slate-200" />
              <p className="mt-2 text-sm text-slate-400">Sem atividades recentes.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
