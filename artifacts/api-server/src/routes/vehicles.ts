import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vehiclesTable } from "@workspace/db";
import {
  CreateVehicleBody,
  GetVehicleParams,
  GetVehicleResponse,
  UpdateVehicleParams,
  UpdateVehicleBody,
  UpdateVehicleResponse,
  DeleteVehicleParams,
  ListVehiclesResponse,
} from "@workspace/api-zod";
import { sanitize, sanitizeArray } from "../utils/sanitize";

const router: IRouter = Router();

router.get("/vehicles", async (req, res): Promise<void> => {
  const vehicles = await db.select().from(vehiclesTable).orderBy(vehiclesTable.createdAt);
  res.json(ListVehiclesResponse.parse(sanitizeArray(vehicles)));
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vehicle] = await db.insert(vehiclesTable).values(parsed.data).returning();
  res.status(201).json(GetVehicleResponse.parse(sanitize(vehicle)));
});

router.get("/vehicles/:id", async (req, res): Promise<void> => {
  const params = GetVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, params.data.id));
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(GetVehicleResponse.parse(sanitize(vehicle)));
});

router.put("/vehicles/:id", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vehicle] = await db.update(vehiclesTable).set(parsed.data).where(eq(vehiclesTable.id, params.data.id)).returning();
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(UpdateVehicleResponse.parse(sanitize(vehicle)));
});

router.delete("/vehicles/:id", async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vehicle] = await db.delete(vehiclesTable).where(eq(vehiclesTable.id, params.data.id)).returning();
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
