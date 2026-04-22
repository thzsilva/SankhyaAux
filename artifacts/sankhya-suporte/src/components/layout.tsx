import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Rocket, 
  RefreshCw, 
  FileBarChart,
  LogOut,
  Menu,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Avatar, AvatarFallback } from "./ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Chamados", href: "/chamados", icon: Ticket },
  { name: "Liberações", href: "/liberacoes", icon: Rocket },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Sincronização", href: "/sincronizacao", icon: RefreshCw },
  { name: "Relatórios", href: "/relatorios", icon: FileBarChart },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col gap-y-5 bg-sidebar px-6 py-4">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Ticket size={20} />
          </div>
          Sankhya Suporte
        </div>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`
                        group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium
                        ${isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}
                      `}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"}`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <Link
              href="/login"
              className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut className="h-5 w-5 shrink-0 text-sidebar-foreground/70 group-hover:text-sidebar-foreground" aria-hidden="true" />
              Sair
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile sidebar */}
      <div className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <div className="bg-primary text-primary-foreground p-1 rounded">
            <Ticket size={18} />
          </div>
          Sankhya Suporte
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent pathname={pathname} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border z-10">
        <SidebarContent pathname={pathname} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 z-10">
          <div className="flex flex-1">
            <div className="text-sm font-medium text-muted-foreground">
              Cockpit Operacional
            </div>
          </div>
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />
            <div className="flex items-center gap-x-4">
              <Avatar className="h-8 w-8 cursor-pointer border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">JS</AvatarFallback>
              </Avatar>
              <span className="hidden lg:flex lg:items-center text-sm font-semibold leading-6 text-foreground">
                João Silva
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}