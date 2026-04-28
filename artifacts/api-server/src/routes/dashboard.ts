import { Router, type IRouter } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Activity log is not yet implemented in the data layer (see lib/log-activity.ts
// which is a no-op stub). The frontend dashboard expects an array — return one
// to keep things tidy until the feature is built.
router.get("/activity/recent", (_req, res) => {
  res.json([]);
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  // Conta direto no banco usando head+count para ser eficiente e ignorar
  // o limite padrao de 1000 linhas do PostgREST.
  const headCount = { count: "exact" as const, head: true };
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const [
    activeClientsResult,
    newClientsResult,
    activeProductsResult,
    pendingReleasesResult,
    releasesTodayResult,
  ] = await Promise.all([
    // Clientes ativos = parceiros marcados como cliente E ativos
    supabase
      .from("tgfpar")
      .select("codparc", headCount)
      .eq("cliente", "S")
      .eq("ativo", "S"),
    // Novos clientes este mes
    supabase
      .from("tgfpar")
      .select("codparc", headCount)
      .eq("cliente", "S")
      .gte("dtcad", monthStartIso),
    // Produtos ativos
    supabase
      .from("tgfpro")
      .select("codprod", headCount)
      .eq("ativo", "S"),
    // Liberacoes pendentes em tsilib (sem dhlib e nao reprovadas)
    supabase
      .from("tsilib")
      .select("nuchave", headCount)
      .is("dhlib", null)
      .eq("reprovado", "N"),
    // Liberacoes feitas hoje
    supabase
      .from("tsilib")
      .select("nuchave", headCount)
      .gte("dhlib", todayStartIso),
  ]);

  const results = [
    activeClientsResult,
    newClientsResult,
    activeProductsResult,
    pendingReleasesResult,
    releasesTodayResult,
  ];
  for (const r of results) {
    if (r.error) {
      logger.error({ err: r.error }, "Failed to load dashboard counts");
      res.status(500).json({ error: "Erro interno ao carregar dashboard" });
      return;
    }
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      activeClients: activeClientsResult.count ?? 0,
      newClientsThisMonth: newClientsResult.count ?? 0,
      releasesToday: releasesTodayResult.count ?? 0,
      pendingReleases: pendingReleasesResult.count ?? 0,
      totalProducts: activeProductsResult.count ?? 0,
      lastSync: null,
    }),
  );
});

export default router;
