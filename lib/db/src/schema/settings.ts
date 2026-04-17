import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  language: text("language").notNull().default("ar"),
  units: text("units").notNull().default("metric"),
  brightness: integer("brightness").notNull().default(80),
  volume: integer("volume").notNull().default(70),
  autoSleep: integer("auto_sleep").notNull().default(5),
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
  timezone: text("timezone").notNull().default("Asia/Riyadh"),
  wifiEnabled: boolean("wifi_enabled").notNull().default(true),
  bluetoothEnabled: boolean("bluetooth_enabled").notNull().default(true),
  autoConnect: boolean("auto_connect").notNull().default(true),
  printHeader: text("print_header"),
  shopName: text("shop_name"),
  technicianName: text("technician_name"),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettingsTable).omit({ id: true });
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettingsTable.$inferSelect;
