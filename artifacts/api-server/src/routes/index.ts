import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import activityRouter from "./activity";
import ticketsRouter from "./tickets";
import clientsRouter from "./clients";
import releasesRouter from "./releases";
import productsRouter from "./products";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(activityRouter);
router.use(ticketsRouter);
router.use(clientsRouter);
router.use(releasesRouter);
router.use(productsRouter);
router.use(syncRouter);

export default router;
