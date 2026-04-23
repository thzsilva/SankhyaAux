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
  color: string;
  bg: string;
  ring: string;
}> = [
  {
    key: "clientes",
    label: "Clientes",
    description: "Cadastro completo com contato e codigo Sankhya.",
    icon: Users,
    color: "text-rose-300",
    bg: "bg-rose-500/15",
    ring: "ring-rose-400/20",
  },
  {
    key: "produtos",
    label: "Produtos",
    description: "Catalogo com preco, estoque e categoria.",
    icon: PackageSearch,
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    ring: "ring-amber-400/20",
  },
  {
    key: "resumo",
    label: "Resumo Geral",
    description: "Indicadores consolidados do painel.",
    icon: Gauge,
    color: "text-sky-300",
    bg: "bg-sky-500/15",
    ring: "ring-sky-400/20",
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
    <section className="overflow-hidden rounded-2xl bg-[#15181d] ring-1 ring-white/5">
      <div className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
            <Download className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">Exportar relatorios</h3>
            <p className="text-xs text-slate-400">Baixe dados consolidados em CSV ou JSON.</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tipo de relatorio</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {reports.map((report) => {
              const Icon = report.icon;
              const isActive = selected === report.key;
              return (
                <button
                  key={report.key}
                  type="button"
                  onClick={() => setSelected(report.key)}
                  className={`rounded-xl p-3 text-left transition ring-1 ${
                    isActive
                      ? "bg-[#1a1e24] ring-emerald-400/40"
                      : "bg-[#15181d] ring-white/5 hover:bg-[#1a1e24] hover:ring-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${report.bg} ${report.color} ring-1 ${report.ring}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-white/10">
                      {counts[report.key]} reg.
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{report.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">{report.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Formato</p>
          <div className="inline-flex rounded-xl bg-[#0b0d10] p-1 ring-1 ring-white/5">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                format === "csv" ? "bg-[#1a1e24] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                format === "json" ? "bg-[#1a1e24] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileJson className="h-4 w-4" />
              JSON
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[#0b0d10] p-4 ring-1 ring-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resumo</p>
          <p className="mt-2 text-sm text-slate-300">
            Voce esta prestes a exportar{" "}
            <span className="font-semibold text-white">{counts[selected]} registro(s)</span> de{" "}
            <span className="font-semibold text-white">{reports.find((r) => r.key === selected)?.label}</span> no formato{" "}
            <span className="font-semibold text-white">{format.toUpperCase()}</span>.
          </p>
          {lastExport && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 ring-1 ring-emerald-400/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ultima exportacao: {lastExport}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || counts[selected] === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
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
    </section>
  );
}
