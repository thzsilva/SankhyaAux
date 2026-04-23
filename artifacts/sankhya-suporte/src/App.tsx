import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { House, FileText, PackageSearch, Users, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { type ReactNode } from "react";
import { Link, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import Clients from "@/pages/clients";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Products from "@/pages/products";
import Reports from "@/pages/reports";
import Login from "@/pages/login";
import { AuthProvider, ROLE_BADGE, ROLE_LABEL, useAuth } from "@/lib/auth";

const queryClient = new QueryClient();

const tabs = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/relatorios", label: "Relatorios", icon: FileText },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/clientes", label: "Clientes", icon: Users },
];

const titleByPath: Record<string, string> = {
  "/": "Painel",
  "/relatorios": "Relatorios",
  "/produtos": "Produtos",
  "/clientes": "Clientes",
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-0.5 text-xs text-slate-500">{formatDate()}</p>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{user.name}</p>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${ROLE_BADGE[user.role]}`}
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              title="Sair"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div
              title={user ? `${user.name} (${ROLE_LABEL[user.role]})` : undefined}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ring-1 ${user ? ROLE_BADGE[user.role] : "bg-slate-100 text-slate-500 ring-slate-200"}`}
            >
              {user ? initials(user.name) : "?"}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                  isActive ? "text-emerald-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.4]" : ""}`} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function AuthedRoutes() {
  return (
    <Switch>
      <Route path="/">
        <AppShell>
          <Dashboard />
        </AppShell>
      </Route>
      <Route path="/relatorios">
        <AppShell>
          <Reports />
        </AppShell>
      </Route>
      <Route path="/produtos">
        <AppShell>
          <Products />
        </AppShell>
      </Route>
      <Route path="/clientes">
        <AppShell>
          <Clients />
        </AppShell>
      </Route>
      <Route>
        <AppShell>
          <NotFound />
        </AppShell>
      </Route>
    </Switch>
  );
}

function Gate() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Carregando...
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
