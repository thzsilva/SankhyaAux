import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const releasesTable = pgTable("releases", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Release = typeof releasesTable.$inferSelect;
