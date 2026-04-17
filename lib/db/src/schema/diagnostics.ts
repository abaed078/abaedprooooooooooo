import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const diagnosticSessionsTable = pgTable("diagnostic_sessions", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  status: text("status").notNull().default("running"),
  dtcCount: integer("dtc_count").notNull().default(0),
  systemsScanned: integer("systems_scanned").notNull().default(0),
  totalSystems: integer("total_systems").notNull().default(0),
  scanType: text("scan_type").notNull().default("full_scan"),
  systems: text("systems"),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const dtcCodesTable = pgTable("dtc_codes", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  code: text("code").notNull(),
  system: text("system").notNull(),
  severity: text("severity").notNull().default("warning"),
  description: text("description").notNull(),
  possibleCauses: text("possible_causes"),
  status: text("status").notNull().default("active"),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const liveDataParamsTable = pgTable("live_data_params", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  minValue: text("min_value"),
  maxValue: text("max_value"),
  currentNumericValue: text("current_numeric_value"),
  status: text("status").notNull().default("normal"),
  category: text("category"),
});

export const insertDiagnosticSessionSchema = createInsertSchema(diagnosticSessionsTable).omit({ id: true, startedAt: true });
export const insertDtcCodeSchema = createInsertSchema(dtcCodesTable).omit({ id: true, detectedAt: true });
export const insertLiveDataParamSchema = createInsertSchema(liveDataParamsTable).omit({ id: true });

export type InsertDiagnosticSession = z.infer<typeof insertDiagnosticSessionSchema>;
export type DiagnosticSession = typeof diagnosticSessionsTable.$inferSelect;
export type DtcCode = typeof dtcCodesTable.$inferSelect;
export type LiveDataParam = typeof liveDataParamsTable.$inferSelect;
