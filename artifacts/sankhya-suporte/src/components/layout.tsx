import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home,
  FileText,
  Package,
  Users,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  KeyRound
} from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";
import { Avatar, AvatarFallback } from "./ui/avatar";

const navigation = [
  { name: "Início", href: "/", icon: Home },
  { name: "Liberações", href: "/liberacoes", icon: KeyRound },
  { name: "Produtos", href: "/produtos", icon: Package },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Relatórios", href: "/relatorios", icon: FileText },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col gap-y-5 bg-card border-r border-border px-6 py-4">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
          <div className="bg-primary/10 text-primary p-1.5 rounded-md">
            <LayoutDashboard size={20} />
          </div>
          Suporte Sankhya
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
                        group flex items-center gap-x-3 rounded-md p-3 text-sm leading-6 font-medium transition-colors
                        ${isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                      `}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                        aria-hidden="true"
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto pb-4">
            <Link
              href="/login"
              className="group -mx-2 flex items-center gap-x-3 rounded-md p-3 text-sm font-medium leading-6 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
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
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row pb-16 md:pb-0">
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-20">
        <SidebarContent pathname={pathname} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 shrink-0 items-center justify-end gap-x-4 px-8 z-10">
          <div className="flex items-center gap-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <div className="h-6 w-px bg-border" aria-hidden="true" />
            <div className="flex items-center gap-x-3 cursor-pointer">
              <span className="text-sm font-medium text-foreground">TI</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">TI</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <item.icon 
                className="h-5 w-5" 
                strokeWidth={isActive ? 2.5 : 2}
                fill={isActive && item.name === 'Início' ? 'currentColor' : 'none'} 
              />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
