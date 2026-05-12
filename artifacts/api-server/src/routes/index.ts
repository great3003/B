import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import gasRouter from "./gas";
import swapHistoryRouter from "./swapHistory";
import autoSwapRouter from "./autoSwap";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountsRouter);
router.use(gasRouter);
router.use(swapHistoryRouter);
router.use(autoSwapRouter);

export default router;
