import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, Database, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { 
  useGetSyncStatus, 
  useTriggerSync,
  getGetSyncStatusQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function SyncStatus() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: syncStatus, isLoading } = useGetSyncStatus();
  const triggerSync = useTriggerSync();

  const handleSync = () => {
    setIsSyncing(true);
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);

    triggerSync.mutate(undefined, {
      onSuccess: () => {
        setTimeout(() => {
          clearInterval(interval);
          setProgress(100);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
            toast.success("Sincronização concluída com sucesso!");
            setIsSyncing(false);
            setProgress(0);
          }, 500);
        }, 1000);
      },
      onError: () => {
        clearInterval(interval);
        toast.error("Erro ao sincronizar com o Sankhya.");
        setIsSyncing(false);
        setProgress(0);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case "error": return <XCircle className="h-5 w-5 text-destructive" />;
      case "pending": return <Clock className="h-5 w-5 text-chart-3" />;
      default: return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success": return <Badge variant="default" className="bg-primary hover:bg-primary/90">Sincronizado</Badge>;
      case "error": return <Badge variant="destructive">Erro</Badge>;
      case "pending": return <Badge variant="outline" className="text-chart-3 border-chart-3 bg-chart-3/10">Pendente</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sincronização ERP</h1>
          <p className="text-muted-foreground mt-1">Status de espelhamento das tabelas do Sankhya.</p>
        </div>
        
        <Button onClick={handleSync} disabled={isSyncing || triggerSync.isPending} className="min-w-[140px]">
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
        </Button>
      </div>

      {isSyncing && (
        <Card className="border-primary/50 bg-primary/5 shadow-sm">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-primary flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sincronizando dados com o ERP Sankhya...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Resumo Geral</CardTitle>
            <CardDescription>Status atual da integração</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">
                {isLoading ? <Skeleton className="h-7 w-24 mx-auto" /> : "Conectado"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Banco de Dados Oracle</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Última Sincronização</span>
                <span className="text-sm font-medium">
                  {isLoading ? <Skeleton className="h-4 w-20" /> : 
                    syncStatus?.lastSync ? format(new Date(syncStatus.lastSync), "dd/MM/yy HH:mm") : "N/A"
                  }
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Tabelas Monitoradas</span>
                <span className="text-sm font-medium">
                  {isLoading ? <Skeleton className="h-4 w-8" /> : syncStatus?.tables?.length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Registros Sincronizados</span>
                <span className="text-sm font-medium">
                  {isLoading ? <Skeleton className="h-4 w-16" /> : 
                    new Intl.NumberFormat('pt-BR').format(
                      syncStatus?.tables?.reduce((acc, curr) => acc + curr.recordCount, 0) || 0
                    )
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Tabelas (Espelhamento)</CardTitle>
            <CardDescription>Detalhes por entidade do Sankhya</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead>Última Sincronização</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : syncStatus?.tables?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        Nenhuma tabela configurada para sincronização.
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncStatus?.tables?.map((table) => (
                      <TableRow key={table.name} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-medium text-sm">
                          {table.name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat('pt-BR').format(table.recordCount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {table.lastSync ? format(new Date(table.lastSync), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(table.status)}
                            {getStatusBadge(table.status)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}