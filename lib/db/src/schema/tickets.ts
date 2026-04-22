import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("media"),
  status: text("status").notNull().default("aberto"),
  sector: text("sector").notNull(),
  openedBy: text("opened_by").notNull(),
  assignedTo: text("assigned_to"),
  clientId: integer("client_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export type Ticket = typeof ticketsTable.$inferSelect;
