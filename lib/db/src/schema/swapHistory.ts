import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const swapHistoryTable = pgTable("swap_history", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  accountName: text("account_name").notNull(),
  direction: text("direction").notNull(),
  inputAmount: text("input_amount").notNull(),
  inputSymbol: text("input_symbol").notNull(),
  outputAmount: text("output_amount").notNull(),
  outputSymbol: text("output_symbol").notNull(),
  price: text("price"),
  status: text("status").notNull().default("success"),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSwapHistorySchema = createInsertSchema(swapHistoryTable).omit({ id: true, executedAt: true });
export type InsertSwapHistory = z.infer<typeof insertSwapHistorySchema>;
export type SwapHistory = typeof swapHistoryTable.$inferSelect;
