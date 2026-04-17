import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, reportsTable, vehiclesTable } from "@workspace/db";
import {
  CreateReportBody,
  GetReportParams,
  GetReportResponse,
  DeleteReportParams,
  ListReportsResponse,
} from "@workspace/api-zod";
import { sanitize } from "../utils/sanitize";

const router: IRouter = Router();

router.get("/reports", async (req, res): Promise<void> => {
  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
  const withVehicle = await Promise.all(
    reports.map(async (r) => {
      const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, r.vehicleId));
      return sanitize({ ...r, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });
    })
  );
  res.json(ListReportsResponse.parse(withVehicle));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [report] = await db.insert(reportsTable).values({ ...parsed.data, dtcCount: 0, status: "draft" }).returning();
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parsed.data.vehicleId));
  const withVehicle = sanitize({ ...report, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });
  res.status(201).json(GetReportResponse.parse(withVehicle));
});

router.get("/reports/:id", async (req, res): Promise<void> => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, params.data.id));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, report.vehicleId));
  res.json(GetReportResponse.parse(sanitize({ ...report, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" })));
});

router.delete("/reports/:id", async (req, res): Promise<void> => {
  const params = DeleteReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [report] = await db.delete(reportsTable).where(eq(reportsTable.id, params.data.id)).returning();
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
