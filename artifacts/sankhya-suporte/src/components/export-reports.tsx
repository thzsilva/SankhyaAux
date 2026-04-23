import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, Users, PackageSearch, Gauge, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  useListClients,
  useListProducts,
  useGetDashboardSummary,
} from "@workspace/api-client-react";

type ReportKey = "clientes" | "produtos" | "resumo";
type FormatKey = "csv" | "json";

const reports: Array<{
  key: ReportKey;
  label: string;
  description: string;
  icon: typeof Users;
  accent: string;
}> = [
  {
    key: "clientes",
    label: "Clientes",
    description: "Cadastro completo com contato e codigo Sankhya.",
    icon: Users,
    accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-700",
  },
  {
    key: "produtos",
    label: "Produtos",
    description: "Catalogo com preco, estoque e categoria.",
    icon: PackageSearch,
    accent: "from-sky-500/15 to-sky-500/0 text-sky-700",
  },
  {
    key: "resumo",
    label: "Resumo Geral",
    description: "Indicadores consolidados do painel.",
    icon: Gauge,
    accent: "from-amber-500/15 to-amber-500/0 text-amber-700",
  },
];

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportReports() {
  const [selected, setSelected] = useState<ReportKey>("clientes");
  const [format, setFormat] = useState<FormatKey>("csv");
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const { data: clients } = useListClients();
  const { data: products } = useListProducts();
  const { data: summary } = useGetDashboardSummary();

  const counts: Record<ReportKey, number> = {
    clientes: clients?.length ?? 0,
    produtos: products?.length ?? 0,
    resumo: summary ? Object.keys(summary).length : 0,
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let rows: Record<string, unknown>[] = [];
      if (selected === "clientes") rows = (clients ?? []) as Record<string, unknown>[];
      else if (selected === "produtos") rows = (products ?? []) as Record<string, unknown>[];
      else if (selected === "resumo" && summary) rows = [summary as Record<string, unknown>];

      if (rows.length === 0) {
        toast.error("Nenhum dado disponivel para exportar.");
        return;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      const base = `${selected}_${stamp}`;
      if (format === "csv") {
        downloadFile(toCsv(rows), `${base}.csv`, "text/csv;charset=utf-8");
      } else {
        downloadFile(JSON.stringify(rows, null, 2), `${base}.json`, "application/json");
      }
      setLastExport(
        `${reports.find((r) => r.key === selected)?.label} - ${format.toUpperCase()} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      );
      toast.success("Relatorio exportado com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao exportar o relatorio.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
            <Download className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Exportar relatorios</h3>
            <p className="text-sm text-slate-600">Baixe dados consolidados em CSV ou JSON em poucos cliques.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de relatorio</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {reports.map((report) => {
              const Icon = report.icon;
              const isActive = selected === report.key;
              return (
                <button
                  key={report.key}
                  type="button"
                  onClick={() => setSelected(report.key)}
                  className={`group relative overflow-hidden rounded-xl border p-4 text-left transition ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/30"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${report.accent} opacity-60`} />
                  <div className="relative flex items-start justify-between">
                    <Icon className="h-5 w-5" />
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                      {counts[report.key]} reg.
                    </span>
                  </div>
                  <p className="relative mt-3 text-sm font-semibold text-slate-900">{report.label}</p>
                  <p className="relative mt-1 text-xs leading-snug text-slate-600">{report.description}</p>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formato</p>
            <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  format === "csv" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  format === "json" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileJson className="h-4 w-4" />
                JSON
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo</p>
            <p className="mt-2 text-sm text-slate-700">
              Voce esta prestes a exportar{" "}
              <span className="font-semibold text-slate-900">{counts[selected]} registro(s)</span> de{" "}
              <span className="font-semibold text-slate-900">{reports.find((r) => r.key === selected)?.label}</span> no
              formato <span className="font-semibold text-slate-900">{format.toUpperCase()}</span>.
            </p>
            {lastExport && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ultima exportacao: {lastExport}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || counts[selected] === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Baixar relatorio
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
