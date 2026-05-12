import { pgTable, text, serial, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  operatorKey: text("operator_key").notNull(),
  tradingKey: text("trading_key").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  autoSwapEnabled: boolean("auto_swap_enabled").notNull().default(false),
  gasThreshold: real("gas_threshold"),
  defaultSwapDirection: text("default_swap_direction").notNull().default("cbtc_to_usdcx"),
  defaultSwapAmount: text("default_swap_amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
