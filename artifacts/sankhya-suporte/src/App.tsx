import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { House, FileText, PackageSearch, Users } from "lucide-react";
import { Toaster } from "sonner";
import { type ReactNode } from "react";
import { Link, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import Clients from "@/pages/clients";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Products from "@/pages/products";
import Reports from "@/pages/reports";

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

function AppShell({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const title = titleByPath[pathname] ?? "Painel";

  return (
    <div className="min-h-screen bg-[#0b0d10] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b0d10]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <p className="mt-0.5 text-xs text-slate-400">{formatDate()}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
            TI
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[#0b0d10]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                  isActive ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
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

function AppRoutes() {
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppRoutes />
      </WouterRouter>
      <Toaster theme="dark" richColors position="top-right" />
    </QueryClientProvider>
  );
}
