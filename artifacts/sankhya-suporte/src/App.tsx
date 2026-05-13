import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { House, FileText, PackageSearch, Users, LogOut, ShieldCheck } from "lucide-react";
import { Toaster } from "sonner";
import { type ReactNode } from "react";
import { Link, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import Clients from "@/pages/clients";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Products from "@/pages/products";
import Reports from "@/pages/reports";
import Releases from "@/pages/releases";
import Login from "@/pages/login";
import { AuthProvider, ROLE_BADGE, ROLE_LABEL, useAuth } from "@/lib/auth";

const queryClient = new QueryClient();

const tabs = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/relatorios", label: "Relatorios", icon: FileText },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/liberacoes", label: "Liberacoes", icon: ShieldCheck },
];

const titleByPath: Record<string, string> = {
  "/": "Painel",
  "/relatorios": "Relatorios",
  "/produtos": "Produtos",
  "/clientes": "Clientes",
  "/liberacoes": "Liberacoes",
};

function formatDate() {
  const d = new Date();
  const txt = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
  return txt.charAt(0).toUpperCase() + txt.slice(1).replace(".", "");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function AppShell({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const { user, logout } = useAuth();
  const title = titleByPath[pathname] ?? "Painel";

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden lg:flex lg:w-56 lg:flex-shrink-0 lg:flex-col fixed inset-y-0 left-0 z-20 bg-white border-r border-slate-200">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 leading-tight">Sankhya</p>
            <p className="text-[10px] text-slate-500 leading-tight">Suporte</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 px-3 py-3">
          {user && (
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${ROLE_BADGE[user.role]}`}
              >
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                <span className={`inline-block rounded-full px-1.5 py-px text-[9px] font-semibold ring-1 ${ROLE_BADGE[user.role]}`}>
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sair"
                className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col lg:pl-56 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <h1 className="text-base font-bold text-slate-900">{title}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              {user && (
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-1 ${ROLE_BADGE[user.role]}`}
                >
                  {initials(user.name)}
                </div>
              )}
              <button
                type="button"
                onClick={logout}
                title="Sair"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop page header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="mt-0.5 text-xs text-slate-500">{formatDate()}</p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{user.name}</p>
                <span className={`mt-0.5 inline-block rounded-full px-2 py-px text-[10px] font-semibold ring-1 ${ROLE_BADGE[user.role]}`}>
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-1 ${ROLE_BADGE[user.role]}`}>
                {initials(user.name)}
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-6 lg:pb-8">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </main>

        {/* Bottom nav (mobile only) */}
        <nav className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-around px-1 py-1.5">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition ${
                    isActive ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function AuthedRoutes() {
  return (
    <Switch>
      <Route path="/">
        <AppShell><Dashboard /></AppShell>
      </Route>
      <Route path="/relatorios">
        <AppShell><Reports /></AppShell>
      </Route>
      <Route path="/produtos">
        <AppShell><Products /></AppShell>
      </Route>
      <Route path="/clientes">
        <AppShell><Clients /></AppShell>
      </Route>
      <Route path="/liberacoes">
        <AppShell><Releases /></AppShell>
      </Route>
      <Route>
        <AppShell><NotFound /></AppShell>
      </Route>
    </Switch>
  );
}

function Gate() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Login />;
  return <AuthedRoutes />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Gate />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
