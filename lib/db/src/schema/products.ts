import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull(),
  sankhyaCode: text("sankhya_code"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
