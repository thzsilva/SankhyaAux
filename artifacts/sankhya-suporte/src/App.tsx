import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tickets from "@/pages/tickets";
import TicketDetail from "@/pages/ticket-detail";
import Clients from "@/pages/clients";
import Releases from "@/pages/releases";
import SyncStatus from "@/pages/sync";
import Reports from "@/pages/reports";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes (Visual only) */}
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/chamados">
        <AppLayout>
          <Tickets />
        </AppLayout>
      </Route>
      <Route path="/chamados/:id">
        <AppLayout>
          <TicketDetail />
        </AppLayout>
      </Route>
      <Route path="/liberacoes">
        <AppLayout>
          <Releases />
        </AppLayout>
      </Route>
      <Route path="/clientes">
        <AppLayout>
          <Clients />
        </AppLayout>
      </Route>
      <Route path="/sincronizacao">
        <AppLayout>
          <SyncStatus />
        </AppLayout>
      </Route>
      <Route path="/relatorios">
        <AppLayout>
          <Reports />
        </AppLayout>
      </Route>

      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="sankhya-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
