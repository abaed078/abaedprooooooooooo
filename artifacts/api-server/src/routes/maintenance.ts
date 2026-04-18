import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, serviceResetsTable, resetTypesTable, vehiclesTable } from "@workspace/db";
import {
  PerformServiceResetBody,
  ListServiceResetsQueryParams,
  ListServiceResetsResponse,
  ListResetTypesResponse,
} from "@workspace/api-zod";
import { sanitize, sanitizeArray } from "../utils/sanitize";

const router: IRouter = Router();

router.get("/maintenance/reset-types", async (req, res): Promise<void> => {
  const types = await db.select().from(resetTypesTable);
  res.json(ListResetTypesResponse.parse(sanitizeArray(types)));
});

router.get("/maintenance/resets", async (req, res): Promise<void> => {
  const query = ListServiceResetsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let resetsQuery = db.select().from(serviceResetsTable).$dynamic();
  if (query.data.vehicleId) {
    resetsQuery = resetsQuery.where(eq(serviceResetsTable.vehicleId, query.data.vehicleId));
  }
  const resets = await resetsQuery.orderBy(desc(serviceResetsTable.performedAt));

  const withVehicle = await Promise.all(
    resets.map(async (r) => {
      const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, r.vehicleId));
      return sanitize({
        ...r,
        vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown",
      });
    })
  );

  res.json(ListServiceResetsResponse.parse(withVehicle));
});

router.post("/maintenance/resets", async (req, res): Promise<void> => {
  const parsed = PerformServiceResetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reset] = await db
    .insert(serviceResetsTable)
    .values({
      vehicleId: parsed.data.vehicleId,
      resetType: parsed.data.resetType,
      notes: parsed.data.notes,
      status: "success",
    } as typeof serviceResetsTable.$inferInsert)
    .returning();

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parsed.data.vehicleId));
  const withVehicle = sanitize({ ...reset, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });

  res.status(201).json(withVehicle);
});

export default router;
