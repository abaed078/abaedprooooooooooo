import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, adasCalibrationsTable, adasSystemsTable, vehiclesTable } from "@workspace/db";
import {
  CreateAdasCalibrationBody,
  ListAdasCalibrationsQueryParams,
  ListAdasCalibrationsResponse,
  ListAdasSystemsResponse,
} from "@workspace/api-zod";
import { sanitize, sanitizeArray } from "../utils/sanitize";

const router: IRouter = Router();

router.get("/adas/systems", async (req, res): Promise<void> => {
  const systems = await db.select().from(adasSystemsTable);
  res.json(ListAdasSystemsResponse.parse(sanitizeArray(systems.map((s) => ({
    ...s,
    supportedCalibrationTypes: s.supportedCalibrationTypes.split(","),
  })))));
});

router.get("/adas/calibrations", async (req, res): Promise<void> => {
  const query = ListAdasCalibrationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let calibrationsQuery = db.select().from(adasCalibrationsTable).$dynamic();
  if (query.data.vehicleId) {
    calibrationsQuery = calibrationsQuery.where(eq(adasCalibrationsTable.vehicleId, query.data.vehicleId));
  }
  const calibrations = await calibrationsQuery.orderBy(desc(adasCalibrationsTable.startedAt));

  const withVehicle = await Promise.all(
    calibrations.map(async (c) => {
      const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, c.vehicleId));
      return sanitize({ ...c, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });
    })
  );

  res.json(ListAdasCalibrationsResponse.parse(withVehicle));
});

router.post("/adas/calibrations", async (req, res): Promise<void> => {
  const parsed = CreateAdasCalibrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [calibration] = await db
    .insert(adasCalibrationsTable)
    .values({
      vehicleId: parsed.data.vehicleId,
      system: parsed.data.system,
      calibrationType: parsed.data.calibrationType,
      notes: parsed.data.notes,
      status: "completed",
      result: "pass",
      completedAt: new Date(),
    } as typeof adasCalibrationsTable.$inferInsert)
    .returning();

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parsed.data.vehicleId));
  const withVehicle = sanitize({ ...calibration, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });

  res.status(201).json(withVehicle);
});

export default router;
