import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adasSystemsTable = pgTable("adas_systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  supportedCalibrationTypes: text("supported_calibration_types").notNull(),
  requiresTargetBoard: boolean("requires_target_board").notNull().default(false),
  requiresLevel: boolean("requires_level").notNull().default(false),
});

export const adasCalibrationsTable = pgTable("adas_calibrations", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  system: text("system").notNull(),
  calibrationType: text("calibration_type").notNull(),
  status: text("status").notNull().default("pending"),
  result: text("result"),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertAdasSystemSchema = createInsertSchema(adasSystemsTable).omit({ id: true });
export const insertAdasCalibrationSchema = createInsertSchema(adasCalibrationsTable).omit({ id: true, startedAt: true });

export type InsertAdasSystem = z.infer<typeof insertAdasSystemSchema>;
export type AdasSystem = typeof adasSystemsTable.$inferSelect;
export type AdasCalibration = typeof adasCalibrationsTable.$inferSelect;
