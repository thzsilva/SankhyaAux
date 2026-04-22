import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, ticketsTable, clientsTable } from "@workspace/db";
import {
  ListTicketsQueryParams,
  ListTicketsResponse,
  CreateTicketBody,
  GetTicketParams,
  GetTicketResponse,
  UpdateTicketParams,
  UpdateTicketBody,
  UpdateTicketResponse,
  DeleteTicketParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/log-activity";

const router: IRouter = Router();

const SELECT_FIELDS = {
  id: ticketsTable.id,
  title: ticketsTable.title,
  description: ticketsTable.description,
  priority: ticketsTable.priority,
  status: ticketsTable.status,
  sector: ticketsTable.sector,
  openedBy: ticketsTable.openedBy,
  assignedTo: ticketsTable.assignedTo,
  clientId: ticketsTable.clientId,
  clientName: clientsTable.name,
  createdAt: ticketsTable.createdAt,
  updatedAt: ticketsTable.updatedAt,
  closedAt: ticketsTable.closedAt,
};

router.get("/tickets", async (req, res): Promise<void> => {
  const parsed = ListTicketsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conds = [];
  if (parsed.data.status)
    conds.push(eq(ticketsTable.status, parsed.data.status));
  if (parsed.data.priority)
    conds.push(eq(ticketsTable.priority, parsed.data.priority));

  const rows = await db
    .select(SELECT_FIELDS)
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(ticketsTable.createdAt));

  res.json(ListTicketsResponse.parse(rows));
});

router.post("/tickets", async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(ticketsTable)
    .values(parsed.data)
    .returning();
  if (!created) {
    res.status(500).json({ error: "Failed" });
    return;
  }
  await logActivity(
    "criou",
    "chamado",
    `Novo chamado: ${created.title}`,
    parsed.data.openedBy,
  );
  const [row] = await db
    .select(SELECT_FIELDS)
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .where(eq(ticketsTable.id, created.id));
  res.status(201).json(GetTicketResponse.parse(row));
});

router.get("/tickets/:id", async (req, res): Promise<void> => {
  const params = GetTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select(SELECT_FIELDS)
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .where(eq(ticketsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Chamado não encontrado" });
    return;
  }
  res.json(GetTicketResponse.parse(row));
});

router.patch("/tickets/:id", async (req, res): Promise<void> => {
  const params = UpdateTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "fechado") {
    updateData.closedAt = sql`now()`;
  }
  const [updated] = await db
    .update(ticketsTable)
    .set(updateData)
    .where(eq(ticketsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Chamado não encontrado" });
    return;
  }
  await logActivity(
    "atualizou",
    "chamado",
    `Chamado #${updated.id} atualizado`,
  );
  const [row] = await db
    .select(SELECT_FIELDS)
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .where(eq(ticketsTable.id, updated.id));
  res.json(UpdateTicketResponse.parse(row));
});

router.delete("/tickets/:id", async (req, res): Promise<void> => {
  const params = DeleteTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(ticketsTable)
    .where(eq(ticketsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Chamado não encontrado" });
    return;
  }
  await logActivity("excluiu", "chamado", `Chamado #${deleted.id} excluído`);
  res.sendStatus(204);
});

export default router;
