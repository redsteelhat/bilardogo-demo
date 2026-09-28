import { auditLog, type DbOrTx } from '@bilardogo/db';

export async function audit(
  db: DbOrTx,
  actorId: string | null,
  action: string,
  target?: { type: string; id: string },
  meta?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({
    actorId,
    action,
    targetType: target?.type ?? null,
    targetId: target?.id ?? null,
    meta: meta ?? null,
  });
}
