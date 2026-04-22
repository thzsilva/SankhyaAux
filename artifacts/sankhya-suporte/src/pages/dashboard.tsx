import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Bar, 
  BarChart, 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Area, 
  AreaChart,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Ticket, 
  Rocket, 
  Users, 
  RefreshCw, 
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

import { 
  useGetDashboardSummary, 
  useGetTicketsByMonth, 
  useGetTicketsByStatus, 
  useGetTicketsByPriority, 
  useGetRecentActivity,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: ticketsByMonth, isLoading: isLoadingMonth } = useGetTicketsByMonth();
  const { data: ticketsByStatus, isLoading: isLoadingStatus } = useGetTicketsByStatus();
  const { data: ticketsByPriority, isLoading: isLoadingPriority } = useGetTicketsByPriority();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity();

  const COLORS = {
    aberto: "hsl(var(--destructive))",
    em_andamento: "hsl(var(--primary))",
    aguardando: "hsl(var(--chart-3))",
    fechado: "hsl(var(--chart-4))",
    
    baixa: "hsl(var(--chart-4))",
    media: "hsl(var(--chart-3))",
    alta: "hsl(var(--chart-2))",
    urgente: "hsl(var(--destructive))",
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "aberto": return COLORS.aberto;
      case "em_andamento": return COLORS.em_andamento;
      case "aguardando": return COLORS.aguardando;
      case "fechado": return COLORS.fechado;
      default: return "hsl(var(--muted))";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "baixa": return COLORS.baixa;
      case "media": return COLORS.media;
      case "alta": return COLORS.alta;
      case "urgente": return COLORS.urgente;
      default: return "hsl(var(--muted))";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral das operações e chamados.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chamados Abertos</CardTitle>
            <div className="bg-destructive/10 p-2 rounded-md">
              <Ticket className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{summary?.openTickets ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-primary font-medium mr-1">{summary?.closedThisMonth ?? 0}</span> fechados este mês
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liberações Pendentes</CardTitle>
            <div className="bg-primary/10 p-2 rounded-md">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{summary?.pendingReleases ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
            <div className="bg-primary/10 p-2 rounded-md">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{summary?.activeClients ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total de {summary?.activeClients ?? 0} cadastrados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última Sincronização</CardTitle>
            <div className="bg-primary/10 p-2 rounded-md">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-lg font-bold">
                {summary?.lastSync ? format(new Date(summary.lastSync), "HH:mm", { locale: ptBR }) : "N/A"}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.lastSync ? format(new Date(summary.lastSync), "dd MMM yyyy", { locale: ptBR }) : "Sincronização pendente"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Histórico de Chamados</CardTitle>
            <CardDescription>Abertos vs Fechados nos últimos meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingMonth ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ticketsByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "var(--shadow-md)" }}
                    itemStyle={{ fontSize: "14px", fontWeight: 500 }}
                  />
                  <Area type="monotone" dataKey="opened" name="Abertos" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" />
                  <Area type="monotone" dataKey="closed" name="Fechados" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorClosed)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Chamados por Status</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pb-8">
            {isLoadingStatus ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketsByStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="label"
                    >
                      {(ticketsByStatus || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.label)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [value, name.replace('_', ' ')]}
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-4 px-4">
              {(ticketsByStatus || []).map((status) => (
                <div key={status.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(status.label) }} />
                  <span className="text-sm font-medium capitalize text-muted-foreground">{status.label.replace('_', ' ')}</span>
                  <span className="text-sm font-bold ml-auto">{status.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Prioridade de Chamados</CardTitle>
            <CardDescription>Chamados abertos por urgência</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {isLoadingPriority ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByPriority || []} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {(ticketsByPriority || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getPriorityColor(entry.label)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>Últimas ações no sistema</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {isLoadingActivity ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : recentActivity?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>Nenhuma atividade recente.</p>
                </div>
              ) : (
                recentActivity?.map((activity, i) => (
                  <div key={activity.id} className="flex items-start gap-4 relative">
                    {i !== recentActivity.length - 1 && (
                      <div className="absolute top-6 bottom-[-1.5rem] left-1.5 w-px bg-border -z-10" />
                    )}
                    <div className="mt-1 relative z-0">
                      {activity.action.includes('create') ? (
                        <CheckCircle2 className="h-4 w-4 text-primary bg-card" />
                      ) : activity.action.includes('update') ? (
                        <RefreshCw className="h-4 w-4 text-chart-3 bg-card" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive bg-card" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{activity.user || 'Sistema'}</span>{" "}
                        <span className="text-muted-foreground">{activity.description}</span>
                      </p>
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {format(new Date(activity.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                        <Badge variant="outline" className="ml-2 py-0 h-4 text-[10px]">
                          {activity.entity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}