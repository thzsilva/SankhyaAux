import { useState } from "react";
import { Download, FileBarChart, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  useListTickets, 
  useListClients,
  useListReleases
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Reports() {
  const [period, setPeriod] = useState("30");

  const { data: tickets, isLoading: isLoadingTickets } = useListTickets();
  const { data: clients, isLoading: isLoadingClients } = useListClients();
  const { data: releases, isLoading: isLoadingReleases } = useListReleases();

  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          let value = row[header];
          // Handle null/undefined
          if (value === null || value === undefined) value = "";
          // Escape quotes and commas
          if (typeof value === "string" && (value.includes(",") || value.includes("\"") || value.includes("\n"))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Relatório ${filename} exportado com sucesso!`);
    }
  };

  const handleExportTickets = () => {
    if (!tickets) return;
    const exportData = tickets.map(t => ({
      ID: t.id,
      Título: t.title,
      Cliente: t.clientName || "Interno",
      Status: t.status,
      Prioridade: t.priority,
      Setor: t.sector,
      Aberto_Por: t.openedBy,
      Atribuido_A: t.assignedTo || "Não atribuído",
      Data_Abertura: format(new Date(t.createdAt), "dd/MM/yyyy HH:mm:ss"),
      Data_Fechamento: t.closedAt ? format(new Date(t.closedAt), "dd/MM/yyyy HH:mm:ss") : ""
    }));
    downloadCSV(exportData, "relatorio_chamados");
  };

  const handleExportClients = () => {
    if (!clients) return;
    const exportData = clients.map(c => ({
      ID: c.id,
      Nome: c.name,
      Cod_Sankhya: c.sankhyaCode,
      CNPJ: c.cnpj,
      Email: c.email,
      Telefone: c.phone,
      Data_Cadastro: format(new Date(c.createdAt), "dd/MM/yyyy HH:mm:ss")
    }));
    downloadCSV(exportData, "relatorio_clientes");
  };

  const handleExportReleases = () => {
    if (!releases) return;
    const exportData = releases.map(r => ({
      ID: r.id,
      Cliente: r.clientName,
      Solicitante: r.requestedBy,
      Status: r.status,
      Descricao: r.description,
      Data_Solicitacao: format(new Date(r.createdAt), "dd/MM/yyyy HH:mm:ss")
    }));
    downloadCSV(exportData, "relatorio_liberacoes");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Extração de dados e métricas operacionais.</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <FileBarChart className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Chamados</CardTitle>
            <CardDescription>Extração completa do histórico de tickets, status e SLA.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Total de registros: {isLoadingTickets ? <Skeleton className="h-4 w-8 inline-block align-middle" /> : <strong>{tickets?.length || 0}</strong>}
              </div>
              <Button 
                className="w-full" 
                onClick={handleExportTickets}
                disabled={isLoadingTickets || !tickets || tickets.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <FileBarChart className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Base de clientes cadastrados e dados de integração Sankhya.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Total de registros: {isLoadingClients ? <Skeleton className="h-4 w-8 inline-block align-middle" /> : <strong>{clients?.length || 0}</strong>}
              </div>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleExportClients}
                disabled={isLoadingClients || !clients || clients.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <FileBarChart className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Liberações</CardTitle>
            <CardDescription>Histórico de solicitações de liberação, aprovadas e pendentes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Total de registros: {isLoadingReleases ? <Skeleton className="h-4 w-8 inline-block align-middle" /> : <strong>{releases?.length || 0}</strong>}
              </div>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleExportReleases}
                disabled={isLoadingReleases || !releases || releases.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}