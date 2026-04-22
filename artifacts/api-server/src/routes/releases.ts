import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, releasesTable, clientsTable } from "@workspace/db";
import {
  ListReleasesResponse,
  CreateReleaseBody,
  UpdateReleaseParams,
  UpdateReleaseBody,
  UpdateReleaseResponse,
  DeleteReleaseParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";

const router: IRouter = Router();

const SELECT_FIELDS = {
  id: releasesTable.id,
  clientId: releasesTable.clientId,
  clientName: clientsTable.name,
  requestedBy: releasesTable.requestedBy,
  description: releasesTable.description,
  status: releasesTable.status,
  createdAt: releasesTable.createdAt,
};

router.get("/releases", async (_req, res): Promise<void> => {
  const rows = await db
    .select(SELECT_FIELDS)
    .from(releasesTable)
    .leftJoin(clientsTable, eq(releasesTable.clientId, clientsTable.id))
    .orderBy(desc(releasesTable.createdAt));
  res.json(
    ListReleasesResponse.parse(
      rows.map((r) => ({ ...r, clientName: r.clientName ?? "—" })),
    ),
  );
});

router.post("/releases", async (req, res): Promise<void> => {
  const parsed = CreateReleaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(releasesTable)
    .values(parsed.data)
    .returning();
  if (!created) {
    res.status(500).json({ error: "Failed" });
    return;
  }
  await logActivity(
    "criou",
    "liberacao",
    `Nova liberação para cliente #${created.clientId}`,
    parsed.data.requestedBy,
  );
  const [row] = await db
    .select(SELECT_FIELDS)
    .from(releasesTable)
    .leftJoin(clientsTable, eq(releasesTable.clientId, clientsTable.id))
    .where(eq(releasesTable.id, created.id));
  res.status(201).json({ ...row, clientName: row?.clientName ?? "—" });
});

router.patch("/releases/:id", async (req, res): Promise<void> => {
  const params = UpdateReleaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReleaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(releasesTable)
    .set(parsed.data)
    .where(eq(releasesTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Liberação não encontrada" });
    return;
  }
  await logActivity(
    "atualizou",
    "liberacao",
    `Liberação #${updated.id} → ${updated.status}`,
  );
  const [row] = await db
    .select(SELECT_FIELDS)
    .from(releasesTable)
    .leftJoin(clientsTable, eq(releasesTable.clientId, clientsTable.id))
    .where(eq(releasesTable.id, updated.id));
  res.json(UpdateReleaseResponse.parse({ ...row, clientName: row?.clientName ?? "—" }));
});

router.delete("/releases/:id", async (req, res): Promise<void> => {
  const params = DeleteReleaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(releasesTable)
    .where(eq(releasesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Liberação não encontrada" });
    return;
  }
  await logActivity("excluiu", "liberacao", `Liberação #${deleted.id} excluída`);
  res.sendStatus(204);
});

export default router;
