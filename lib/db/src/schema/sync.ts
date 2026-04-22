import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const syncStatusTable = pgTable("sync_status", {
  tableName: text("table_name").primaryKey(),
  lastSync: timestamp("last_sync", { withTimezone: true }),
  recordCount: integer("record_count").notNull().default(0),
  status: text("status").notNull().default("pendente"),
});

export type SyncStatusRow = typeof syncStatusTable.$inferSelect;
