import { useState } from "react";
import { Download, FileBarChart, Filter } from "lucide-react";
import { format } from "date-fns";

import {
  useListClients,
  useListReleases,
  useListProducts,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const { data: clients, isLoading: isLoadingClients } = useListClients();
  const { data: releases, isLoading: isLoadingReleases } = useListReleases();
  const { data: products, isLoading: isLoadingProducts } = useListProducts();

  const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            let value: unknown = row[header];
            if (value === null || value === undefined) value = "";
            if (
              typeof value === "string" &&
              (value.includes(",") ||
                value.includes('"') ||
                value.includes("\n"))
            ) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Relatório ${filename} exportado com sucesso!`);
    }
  };

  const handleExportClients = () => {
    if (!clients) return;
    const exportData = clients.map((c) => ({
      ID: c.id,
      Nome: c.name,
      Cod_Sankhya: c.sankhyaCode,
      CNPJ: c.cnpj,
      Email: c.email,
      Telefone: c.phone,
      Data_Cadastro: format(new Date(c.createdAt), "dd/MM/yyyy HH:mm:ss"),
    }));
    downloadCSV(exportData, "relatorio_clientes");
  };

  const handleExportReleases = () => {
    if (!releases) return;
    const exportData = releases.map((r) => ({
      ID: r.id,
      Cliente: r.clientName,
      Solicitante: r.requestedBy,
      Status: r.status,
      Descricao: r.description,
      Data_Solicitacao: format(new Date(r.createdAt), "dd/MM/yyyy HH:mm:ss"),
    }));
    downloadCSV(exportData, "relatorio_liberacoes");
  };

  const handleExportProducts = () => {
    if (!products) return;
    const exportData = products.map((p) => ({
      ID: p.id,
      Codigo: p.code,
      Nome: p.name,
      Categoria: p.category,
      Unidade: p.unit,
      Preco_Unitario: p.unitPrice,
      Estoque: p.stock,
      Cod_Sankhya: p.sankhyaCode ?? "",
      Data_Cadastro: format(new Date(p.createdAt), "dd/MM/yyyy HH:mm:ss"),
    }));
    downloadCSV(exportData, "relatorio_produtos");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Extração de dados e métricas operacionais.
          </p>
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
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Base de clientes cadastrados e dados de integração Sankhya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Total de registros:{" "}
                {isLoadingClients ? (
                  <Skeleton className="h-4 w-8 inline-block align-middle" />
                ) : (
                  <strong>{clients?.length || 0}</strong>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleExportClients}
                disabled={
                  isLoadingClients || !clients || clients.length === 0
                }
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
            <CardDescription>
              Histórico de solicitações de liberação, aprovadas e pendentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Total de registros:{" "}
                {isLoadingReleases ? (
                  <Skeleton className="h-4 w-8 inline-block align-middle" />
                ) : (
                  <strong>{releases?.length || 0}</strong>
                )}
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleExportReleases}
                disabled={
                  isLoadingReleases || !releases || releases.length === 0
                }
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
            <CardTitle>Produtos</CardTitle>
            <CardDescription>
              Catálogo completo de produtos com preços e estoque.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Total de registros:{" "}
                {isLoadingProducts ? (
                  <Skeleton className="h-4 w-8 inline-block align-middle" />
                ) : (
                  <strong>{products?.length || 0}</strong>
                )}
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleExportProducts}
                disabled={
                  isLoadingProducts || !products || products.length === 0
                }
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
