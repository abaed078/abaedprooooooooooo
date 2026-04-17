import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, diagnosticSessionsTable, dtcCodesTable, liveDataParamsTable, vehiclesTable } from "@workspace/db";
import {
  StartDiagnosticSessionBody,
  GetDiagnosticSessionParams,
  GetDiagnosticSessionResponse,
  ListDiagnosticSessionsQueryParams,
  ListDiagnosticSessionsResponse,
  ListDtcCodesQueryParams,
  ListDtcCodesResponse,
  ClearDtcCodeParams,
  ClearDtcCodeResponse,
  GetLiveDataQueryParams,
  GetLiveDataResponse,
  GetDiagnosticSummaryResponse,
} from "@workspace/api-zod";
import { sanitize } from "../utils/sanitize";

const router: IRouter = Router();

router.get("/diagnostics/summary", async (req, res): Promise<void> => {
  const vehicles = await db.select().from(vehiclesTable);
  const sessions = await db.select().from(diagnosticSessionsTable).orderBy(desc(diagnosticSessionsTable.startedAt)).limit(5);
  const allDtc = await db.select().from(dtcCodesTable);
  const activeDtc = allDtc.filter((d) => d.status === "active");
  const clearedDtc = allDtc.filter((d) => d.status === "cleared");
  const criticalAlerts = allDtc.filter((d) => d.severity === "critical" && d.status === "active").length;

  const recentWithVehicle = await Promise.all(
    sessions.map(async (s) => {
      const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, s.vehicleId));
      return sanitize({ ...s, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });
    })
  );

  res.json(
    GetDiagnosticSummaryResponse.parse({
      totalVehicles: vehicles.length,
      totalSessions: (await db.select().from(diagnosticSessionsTable)).length,
      totalDtcCodes: allDtc.length,
      activeDtcCodes: activeDtc.length,
      clearedDtcCodes: clearedDtc.length,
      recentSessions: recentWithVehicle,
      criticalAlerts,
    })
  );
});

router.get("/diagnostics/sessions", async (req, res): Promise<void> => {
  const query = ListDiagnosticSessionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let sessionsQuery = db.select().from(diagnosticSessionsTable).$dynamic();
  if (query.data.vehicleId) {
    sessionsQuery = sessionsQuery.where(eq(diagnosticSessionsTable.vehicleId, query.data.vehicleId));
  }
  const sessions = await sessionsQuery.orderBy(desc(diagnosticSessionsTable.startedAt));

  const withVehicle = await Promise.all(
    sessions.map(async (s) => {
      const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, s.vehicleId));
      return sanitize({ ...s, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });
    })
  );

  res.json(ListDiagnosticSessionsResponse.parse(withVehicle));
});

router.post("/diagnostics/sessions", async (req, res): Promise<void> => {
  const parsed = StartDiagnosticSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const totalSystems = parsed.data.scanType === "full_scan" ? 30 : parsed.data.scanType === "quick_scan" ? 10 : 5;

  const [session] = await db
    .insert(diagnosticSessionsTable)
    .values({
      vehicleId: parsed.data.vehicleId,
      scanType: parsed.data.scanType,
      systems: parsed.data.systems?.join(","),
      notes: parsed.data.notes,
      status: "completed",
      dtcCount: Math.floor(Math.random() * 5),
      systemsScanned: totalSystems,
      totalSystems,
      completedAt: new Date(),
    })
    .returning();

  await db.update(vehiclesTable).set({ lastDiagnosed: new Date() }).where(eq(vehiclesTable.id, parsed.data.vehicleId));

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, parsed.data.vehicleId));
  const sessionWithVehicle = sanitize({ ...session, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" });

  res.status(201).json(GetDiagnosticSessionResponse.parse(sessionWithVehicle));
});

router.get("/diagnostics/sessions/:id", async (req, res): Promise<void> => {
  const params = GetDiagnosticSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db.select().from(diagnosticSessionsTable).where(eq(diagnosticSessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, session.vehicleId));
  res.json(GetDiagnosticSessionResponse.parse(sanitize({ ...session, vehicleName: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown" })));
});

router.get("/diagnostics/dtc", async (req, res): Promise<void> => {
  const query = ListDtcCodesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const codes = await db.select().from(dtcCodesTable).where(eq(dtcCodesTable.sessionId, query.data.sessionId));
  res.json(ListDtcCodesResponse.parse(codes.map((c) => sanitize({ ...c, possibleCauses: c.possibleCauses ? c.possibleCauses.split("|") : [] }))));
});

router.post("/diagnostics/dtc/:id/clear", async (req, res): Promise<void> => {
  const params = ClearDtcCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [code] = await db
    .update(dtcCodesTable)
    .set({ status: "cleared", clearedAt: new Date() })
    .where(eq(dtcCodesTable.id, params.data.id))
    .returning();
  if (!code) {
    res.status(404).json({ error: "DTC code not found" });
    return;
  }
  res.json(ClearDtcCodeResponse.parse(sanitize({ ...code, possibleCauses: code.possibleCauses ? code.possibleCauses.split("|") : [] })));
});

// Realistic fluctuation ranges per parameter type
const FLUCTUATION: Record<string, { range: number; decimals: number }> = {
  "Engine RPM": { range: 80, decimals: 0 },
  "Vehicle Speed": { range: 2, decimals: 0 },
  "Coolant Temperature": { range: 1.5, decimals: 1 },
  "Throttle Position": { range: 1.2, decimals: 1 },
  "O2 Sensor Bank 1": { range: 0.08, decimals: 3 },
  "O2 Sensor Bank 2": { range: 0.06, decimals: 3 },
  "Fuel Trim Short Term": { range: 0.5, decimals: 1 },
  "Fuel Trim Long Term": { range: 0.2, decimals: 1 },
  "Intake Air Temperature": { range: 1.0, decimals: 1 },
  "MAP Sensor": { range: 1.5, decimals: 1 },
  "Battery Voltage": { range: 0.15, decimals: 2 },
  "Mass Air Flow": { range: 2.0, decimals: 1 },
  "Ignition Timing": { range: 1.0, decimals: 1 },
  "Fuel Pressure": { range: 1.0, decimals: 1 },
};

function fluctuate(base: number, paramName: string, min?: number, max?: number): number {
  const cfg = FLUCTUATION[paramName] || { range: 1, decimals: 1 };
  const delta = (Math.random() - 0.5) * 2 * cfg.range;
  let val = base + delta;
  if (min !== undefined) val = Math.max(min, val);
  if (max !== undefined) val = Math.min(max, val);
  return parseFloat(val.toFixed(cfg.decimals));
}

router.get("/diagnostics/live-data", async (req, res): Promise<void> => {
  const query = GetLiveDataQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const params = await db.select().from(liveDataParamsTable).where(eq(liveDataParamsTable.sessionId, query.data.sessionId));
  res.json(GetLiveDataResponse.parse(params.map((p) => {
    const min = p.minValue ? parseFloat(p.minValue) : undefined;
    const max = p.maxValue ? parseFloat(p.maxValue) : undefined;
    const base = p.currentNumericValue ? parseFloat(p.currentNumericValue) : undefined;
    const live = base !== undefined ? fluctuate(base, p.name, min, max) : undefined;
    return sanitize({
      ...p,
      minValue: min,
      maxValue: max,
      currentNumericValue: live,
      value: live !== undefined ? live.toString() : p.value,
    });
  })));
});

export default router;
