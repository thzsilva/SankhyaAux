import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { House, PackageSearch, Users } from "lucide-react";
import { Toaster } from "sonner";
import { type ReactNode } from "react";
import { Link, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import Clients from "@/pages/clients";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Products from "@/pages/products";

const queryClient = new QueryClient();

const menuItems = [
  { href: "/", label: "Dashboard", icon: House },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/clientes", label: "Clientes", icon: Users },
];

function AppShell({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Green Core</p>
            <h1 className="text-lg font-bold">Painel de Consulta</h1>
          </div>
          <nav className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">{children}</main>
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
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
