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
import Clients from "@/pages/clients";
import Releases from "@/pages/releases";
import Products from "@/pages/products";
import Reports from "@/pages/reports";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        <AppLayout>
          <Dashboard />
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
      <Route path="/produtos">
        <AppLayout>
          <Products />
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
      <ThemeProvider defaultTheme="dark" storageKey="sankhya-theme">
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
