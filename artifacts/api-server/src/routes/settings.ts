import { Router, type IRouter } from "express";
import { db, systemSettingsTable } from "@workspace/db";
import {
  UpdateSettingsBody,
  GetSettingsResponse,
  UpdateSettingsResponse,
  GetDeviceInfoResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const [existing] = await db.select().from(systemSettingsTable);
  if (existing) return existing;
  const [created] = await db.insert(systemSettingsTable).values({}).returning();
  return created;
}

router.get("/settings", async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  const safe = {
    ...settings,
    printHeader: settings.printHeader ?? undefined,
    shopName: settings.shopName ?? undefined,
    technicianName: settings.technicianName ?? undefined,
    dateFormat: settings.dateFormat ?? undefined,
    timezone: settings.timezone ?? undefined,
  };
  res.json(GetSettingsResponse.parse(safe));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await getOrCreateSettings();
  const [updated] = await db.update(systemSettingsTable).set(parsed.data).returning();
  res.json(UpdateSettingsResponse.parse(updated ?? existing));
});

router.get("/settings/device-info", async (req, res): Promise<void> => {
  res.json(
    GetDeviceInfoResponse.parse({
      deviceModel: "Autel MaxiSYS MS Ultra S2",
      serialNumber: "MS2-20241201-00412",
      firmwareVersion: "V3.2.1",
      softwareVersion: "V10.05",
      vehicleCoverageVersion: "V2024.12",
      imei: "359123456789012",
      wifiMac: "A4:C3:F0:12:34:56",
      androidVersion: "11.0",
      totalStorage: 256000,
      usedStorage: 47200,
      batteryLevel: 84,
      batteryStatus: "discharging",
      connectedVci: "MaxiVCI V200",
      vciSerialNumber: "VCI-200-00815",
      vciStatus: "connected",
    })
  );
});

export default router;
