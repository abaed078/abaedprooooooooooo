import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const programmingSessionsTable = pgTable("programming_sessions", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  type: text("type").notNull(),
  ecuModule: text("ecu_module").notNull(),
  status: text("status").notNull().default("pending"),
  progressPercent: integer("progress_percent").notNull().default(0),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertProgrammingSessionSchema = createInsertSchema(programmingSessionsTable).omit({ id: true, startedAt: true });
export type InsertProgrammingSession = z.infer<typeof insertProgrammingSessionSchema>;
export type ProgrammingSession = typeof programmingSessionsTable.$inferSelect;
