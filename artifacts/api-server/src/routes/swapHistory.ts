import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, swapHistoryTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/swap-history", async (_req, res): Promise<void> => {
  const history = await db
    .select()
    .from(swapHistoryTable)
    .orderBy(desc(swapHistoryTable.executedAt))
    .limit(100);

  res.json(
    history.map((h) => ({
      ...h,
      executedAt: h.executedAt.toISOString(),
    }))
  );
});

export default router;
