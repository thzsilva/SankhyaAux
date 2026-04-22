import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import {
  db,
  ticketsTable,
  releasesTable,
  clientsTable,
  syncStatusTable,
  productsTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetTicketsByMonthResponse,
  GetTicketsByStatusResponse,
  GetTicketsByPriorityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [actC] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(clientsTable);
  const [newC] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(sql`${clientsTable.createdAt} >= date_trunc('month', now())`);
  const [relToday] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(releasesTable)
    .where(sql`${releasesTable.createdAt} >= date_trunc('day', now())`);
  const [pendR] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(releasesTable)
    .where(eq(releasesTable.status, "pendente"));
  const [totalP] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(productsTable);
  const [lastSync] = await db
    .select({ ls: sql<Date | null>`max(${syncStatusTable.lastSync})` })
    .from(syncStatusTable);

  res.json(
    GetDashboardSummaryResponse.parse({
      activeClients: actC?.c ?? 0,
      newClientsThisMonth: newC?.c ?? 0,
      releasesToday: relToday?.c ?? 0,
      pendingReleases: pendR?.c ?? 0,
      totalProducts: totalP?.c ?? 0,
      lastSync: lastSync?.ls ? new Date(lastSync.ls).toISOString() : null,
    }),
  );
});

router.get("/dashboard/tickets-by-month", async (_req, res): Promise<void> => {
  const rows = await db.execute<{
    month: string;
    opened: number;
    closed: number;
  }>(sql`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', now()) - interval '5 months',
        date_trunc('month', now()),
        interval '1 month'
      ) AS m
    )
    SELECT
      to_char(m, 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN date_trunc('month', t.created_at) = m THEN 1 ELSE 0 END), 0)::int AS opened,
      COALESCE(SUM(CASE WHEN date_trunc('month', t.closed_at) = m THEN 1 ELSE 0 END), 0)::int AS closed
    FROM months
    LEFT JOIN tickets t ON date_trunc('month', t.created_at) = m OR date_trunc('month', t.closed_at) = m
    GROUP BY m
    ORDER BY m
  `);
  res.json(GetTicketsByMonthResponse.parse(rows.rows));
});

router.get("/dashboard/tickets-by-status", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      label: ticketsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ticketsTable)
    .groupBy(ticketsTable.status);
  res.json(GetTicketsByStatusResponse.parse(rows));
});

router.get(
  "/dashboard/tickets-by-priority",
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        label: ticketsTable.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(ticketsTable)
      .groupBy(ticketsTable.priority);
    res.json(GetTicketsByPriorityResponse.parse(rows));
  },
);

export default router;
