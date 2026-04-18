import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, programmingSessionsTable, vehiclesTable } from "@workspace/db";
import {
  StartProgrammingSessionBody,
  ListProgrammingSessionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/programming/sessions", async (req, res): Promise<void> => {
  const sessions = await db.select().from(programmingSessionsTable).orderBy(desc(programmingSessionsTable.startedAt));

  const withVehicle = await Promise.all(
    sessions.map(async (s) => {
      const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, s.vehicleId));
      return { ...s, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" };
    })
  );

  const sanitized = withVehicle.map(s => ({ ...s, notes: s.notes ?? undefined }));
  res.json(ListProgrammingSessionsResponse.parse(sanitized));
});

router.post("/programming/sessions", async (req, res): Promise<void> => {
  const parsed = StartProgrammingSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(programmingSessionsTable)
    .values({
      vehicleId: parsed.data.vehicleId,
      type: parsed.data.type,
      ecuModule: parsed.data.ecuModule,
      notes: parsed.data.notes,
      status: "completed",
      progressPercent: 100,
      completedAt: new Date(),
    } as typeof programmingSessionsTable.$inferInsert)
    .returning();

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parsed.data.vehicleId));
  const withVehicle = { ...session, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" };

  res.status(201).json(withVehicle);
});

export default router;
