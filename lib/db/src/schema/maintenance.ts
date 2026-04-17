import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resetTypesTable = pgTable("reset_types", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  requiresObd: boolean("requires_obd").notNull().default(true),
});

export const serviceResetsTable = pgTable("service_resets", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  resetType: text("reset_type").notNull(),
  status: text("status").notNull().default("success"),
  notes: text("notes"),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResetTypeSchema = createInsertSchema(resetTypesTable).omit({ id: true });
export const insertServiceResetSchema = createInsertSchema(serviceResetsTable).omit({ id: true, performedAt: true });

export type InsertResetType = z.infer<typeof insertResetTypeSchema>;
export type ResetType = typeof resetTypesTable.$inferSelect;
export type ServiceReset = typeof serviceResetsTable.$inferSelect;
