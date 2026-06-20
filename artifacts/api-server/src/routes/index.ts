import { Router, type IRouter } from "express";
import healthRouter from "./health";
import evaluateRouter from "./evaluate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(evaluateRouter);

export default router;
