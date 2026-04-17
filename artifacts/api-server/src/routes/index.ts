import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vehiclesRouter from "./vehicles";
import diagnosticsRouter from "./diagnostics";
import adasRouter from "./adas";
import programmingRouter from "./programming";
import maintenanceRouter from "./maintenance";
import reportsRouter from "./reports";
import updatesRouter from "./updates";
import settingsRouter from "./settings";
import anthropicRouter from "./anthropic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vehiclesRouter);
router.use(diagnosticsRouter);
router.use(adasRouter);
router.use(programmingRouter);
router.use(maintenanceRouter);
router.use(reportsRouter);
router.use(updatesRouter);
router.use(settingsRouter);
router.use(anthropicRouter);

export default router;
