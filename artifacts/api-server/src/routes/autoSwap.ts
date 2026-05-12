import { Router, type IRouter } from "express";
import { getAutoSwapStatus, triggerAutoSwapNow } from "../lib/autoSwapWorker";

const router: IRouter = Router();

router.get("/auto-swap/status", (_req, res) => {
  res.json(getAutoSwapStatus());
});

router.post("/auto-swap/trigger", async (_req, res) => {
  void triggerAutoSwapNow();
  res.json({ ok: true, triggeredAt: new Date().toISOString() });
});

export default router;
