import { Router, type IRouter } from "express";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [clientResult, productResult] = await Promise.all([
    supabase.from("tgfpar").select("codparc, dtcad, ativo"),
    supabase.from("tgfpro").select("codprod, dtalter, ativo"),
  ]);

  if (clientResult.error) {
    logger.error({ err: clientResult.error }, "Failed to query tgfpar for dashboard");
    res.status(500).json({ error: "Erro interno ao carregar dashboard" });
    return;
  }

  if (productResult.error) {
    logger.error({ err: productResult.error }, "Failed to query tgfpro for dashboard");
    res.status(500).json({ error: "Erro interno ao carregar dashboard" });
    return;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const newClientsThisMonth = (clientResult.data ?? []).filter((client: any) => {
    const createdAt = client.dtcad ? new Date(String(client.dtcad)) : null;
    return (
      createdAt &&
      createdAt.getMonth() === currentMonth &&
      createdAt.getFullYear() === currentYear
    );
  }).length;

  res.json(
    GetDashboardSummaryResponse.parse({
      activeClients: (clientResult.data ?? []).filter((c: any) => c.ativo === "S").length,
      newClientsThisMonth,
      releasesToday: 0,
      pendingReleases: 0,
      totalProducts: (productResult.data ?? []).filter((p: any) => p.ativo === "S").length,
      lastSync: null,
    }),
  );
});

export default router;
