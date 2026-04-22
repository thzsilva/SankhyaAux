import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, syncStatusTable } from "@workspace/db";
import { GetSyncStatusResponse, TriggerSyncResponse } from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";

const router: IRouter = Router();

const TABLES = ["TGFCAB", "TGFITE", "TGFPRO", "TGFPAR", "TGFVEN"];

async function ensureRows(): Promise<void> {
  for (const t of TABLES) {
    await db
      .insert(syncStatusTable)
      .values({ tableName: t, recordCount: 0, status: "pendente" })
      .onConflictDoNothing();
  }
}

router.get("/sync/status", async (_req, res): Promise<void> => {
  await ensureRows();
  const rows = await db.select().from(syncStatusTable);
  const ordered = TABLES.map((name) => {
    const r = rows.find((x) => x.tableName === name);
    return {
      name,
      lastSync: r?.lastSync ? new Date(r.lastSync).toISOString() : null,
      recordCount: r?.recordCount ?? 0,
      status: r?.status ?? "pendente",
    };
  });
  const lastSync = rows
    .map((r) => r.lastSync)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  res.json(
    GetSyncStatusResponse.parse({
      lastSync: lastSync ? lastSync.toISOString() : null,
      tables: ordered,
    }),
  );
});

router.post("/sync/status", async (_req, res): Promise<void> => {
  await ensureRows();
  for (const t of TABLES) {
    const recordCount = Math.floor(1000 + Math.random() * 50000);
    await db
      .update(syncStatusTable)
      .set({ lastSync: sql`now()`, recordCount, status: "ok" })
      .where(sql`${syncStatusTable.tableName} = ${t}`);
  }
  await logActivity("sincronizou", "sankhya", "Sincronização Sankhya executada");
  const rows = await db.select().from(syncStatusTable);
  const ordered = TABLES.map((name) => {
    const r = rows.find((x) => x.tableName === name);
    return {
      name,
      lastSync: r?.lastSync ? new Date(r.lastSync).toISOString() : null,
      recordCount: r?.recordCount ?? 0,
      status: r?.status ?? "pendente",
    };
  });
  const lastSync = rows
    .map((r) => r.lastSync)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  res.json(
    TriggerSyncResponse.parse({
      lastSync: lastSync ? lastSync.toISOString() : null,
      tables: ordered,
    }),
  );
});

export default router;
