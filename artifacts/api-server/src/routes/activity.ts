import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, activityLogTable } from "@workspace/db";
import { GetRecentActivityResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/activity/recent", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(activityLogTable)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(15);
  res.json(GetRecentActivityResponse.parse(rows));
});

export default router;
