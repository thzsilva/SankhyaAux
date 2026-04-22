import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  Rocket, 
  Users, 
  Package, 
  CheckCircle2, 
  Clock, 
  XCircle 
} from "lucide-react";

import { 
  useGetDashboardSummary, 
  useGetRecentActivity,
} from "@workspace/api-client-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const { theme } = useTheme();

  const today = new Date();
  const formattedDate = format(today, "EEEE, dd MMM", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Mobile Header (replaces generic layout header) */}
      <div className="md:hidden flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Painel</h1>
          <p className="text-muted-foreground mt-1 font-medium capitalize">{capitalizedDate}</p>
        </div>
        <Avatar className="h-12 w-12 border-2 border-card">
          <AvatarFallback className="bg-primary/20 text-primary font-bold">TI</AvatarFallback>
        </Avatar>
      </div>

      <div className="hidden md:block mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Painel</h1>
        <p className="text-muted-foreground mt-1 font-medium capitalize">{capitalizedDate}</p>
      </div>

      {/* Stats Highlight */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Clientes ativos</p>
          {isLoadingSummary ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div className="text-4xl font-bold">{summary?.activeClients ?? 0}</div>
          )}
          <p className="text-xs font-medium text-primary border-b border-primary/20 inline-block pb-0.5">
            +{summary?.newClientsThisMonth ?? 0} este mês
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Liberações hoje</p>
          {isLoadingSummary ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div className="text-4xl font-bold">{summary?.releasesToday ?? 0}</div>
          )}
          <p className="text-xs font-medium text-chart-4 border-b border-chart-4/20 inline-block pb-0.5">
            {summary?.pendingReleases ?? 0} pendentes
          </p>
        </div>
      </div>

      {/* 2x2 Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/relatorios">
          <Card className="h-full border-transparent bg-card/60 hover:bg-card hover:border-border transition-all cursor-pointer group shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col h-full">
              <div className="bg-chart-1/10 p-2.5 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-chart-1" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Relatórios</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">Visualize e exporte dados do sistema</p>
              <div className="text-xs font-medium text-muted-foreground group-hover:text-chart-1 transition-colors flex items-center">
                Acessar <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/liberacoes">
          <Card className="h-full border-transparent bg-card/60 hover:bg-card hover:border-border transition-all cursor-pointer group shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col h-full">
              <div className="bg-primary/10 p-2.5 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Liberações</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">Aprovações e controle de acesso</p>
              <div className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center">
                Acessar <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clientes">
          <Card className="h-full border-transparent bg-card/60 hover:bg-card hover:border-border transition-all cursor-pointer group shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col h-full">
              <div className="bg-chart-3/10 p-2.5 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Clientes</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">Cadastro e histórico de clientes</p>
              <div className="text-xs font-medium text-muted-foreground group-hover:text-chart-3 transition-colors flex items-center">
                Acessar <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/produtos">
          <Card className="h-full border-transparent bg-card/60 hover:bg-card hover:border-border transition-all cursor-pointer group shadow-sm">
            <CardContent className="p-4 sm:p-5 flex flex-col h-full">
              <div className="bg-chart-4/10 p-2.5 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-chart-4" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Produtos</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">Consulta e movimentações</p>
              <div className="text-xs font-medium text-muted-foreground group-hover:text-chart-4 transition-colors flex items-center">
                Acessar <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity List */}
      <div>
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground mb-4 uppercase">Atividade Recente</h2>
        
        <div className="space-y-4">
          {isLoadingActivity ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : recentActivity?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
          ) : (
            recentActivity?.slice(0, 5).map((activity) => {
              let Icon = Clock;
              let colorClass = "text-muted-foreground";
              let badgeColor = "outline";
              let badgeText = "Info";

              if (activity.action.includes('create') || activity.action.includes('approve')) {
                colorClass = "text-primary";
                badgeColor = "default";
                badgeText = "OK";
              } else if (activity.action.includes('update') || activity.action.includes('pending')) {
                colorClass = "text-chart-4";
                badgeColor = "secondary";
                badgeText = "Pendente";
              } else if (activity.action.includes('delete') || activity.action.includes('reject')) {
                colorClass = "text-destructive";
                badgeColor = "destructive";
                badgeText = "Erro";
              }

              return (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${colorClass.replace('text-', 'bg-')}`} />
                  
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(activity.createdAt), "dd MMM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <Badge variant={badgeColor as any} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0 h-5 mt-0.5">
                    {badgeText}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
