import { db, activityLogTable } from "@workspace/db";

export async function logActivity(
  action: string,
  entity: string,
  description: string,
  user?: string,
): Promise<void> {
  await db.insert(activityLogTable).values({
    action,
    entity,
    description,
    user: user ?? "Sistema",
  });
}
