import { Router, type IRouter } from "express";
import {
  GetUpdateStatusResponse,
  ListAvailableUpdatesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/updates/status", async (req, res): Promise<void> => {
  res.json(
    GetUpdateStatusResponse.parse({
      firmwareVersion: "V3.2.1",
      softwareVersion: "V10.05",
      vehicleCoverageVersion: "V2024.12",
      lastChecked: new Date().toISOString(),
      updatesAvailable: 2,
      autoUpdate: true,
    })
  );
});

router.get("/updates/available", async (req, res): Promise<void> => {
  res.json(
    ListAvailableUpdatesResponse.parse([
      {
        id: 1,
        name: "Vehicle Coverage Update",
        version: "V2025.01",
        type: "vehicle_coverage",
        sizeKb: 245000,
        description: "Adds support for 2025 model year vehicles including Toyota, BMW, Mercedes-Benz, Audi, and 50+ more brands",
        releaseDate: new Date("2025-01-15").toISOString(),
        mandatory: false,
      },
      {
        id: 2,
        name: "Security Patch",
        version: "V3.2.2",
        type: "security",
        sizeKb: 12000,
        description: "Critical security update for VCI communication protocol. Fixes authentication bypass vulnerability.",
        releaseDate: new Date("2025-01-20").toISOString(),
        mandatory: true,
      },
      {
        id: 3,
        name: "ADAS Module Enhancement",
        version: "V5.1.0",
        type: "feature_module",
        sizeKb: 89000,
        description: "Enhanced ADAS calibration procedures for forward-facing cameras and radar systems",
        releaseDate: new Date("2025-01-10").toISOString(),
        mandatory: false,
      },
    ])
  );
});

export default router;
