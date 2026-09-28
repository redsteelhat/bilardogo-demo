import { and, appSettings, eq, subscriptions, type DbOrTx } from '@bilardogo/db';

export type Entitlement = {
  active: boolean;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
  endsAt: Date | null;
  daysLeft: number | null;
};

export async function getSetting<T>(db: DbOrTx, key: string, fallback: T): Promise<T> {
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, key));
  return (row?.value as T | undefined) ?? fallback;
}

export async function isEnforced(db: DbOrTx): Promise<boolean> {
  return (await getSetting<boolean>(db, 'subscriptions_enforced', false)) === true;
}

/**
 * Abonelik hakkını hesaplar. Süre kontrolü cron'u beklemeden anlık tarihe göre yapılır.
 * past_due 3 günlük ödeme toleransı içinde hâlâ aktif sayılır.
 */
export async function getEntitlement(
  db: DbOrTx,
  subject: { userId: string } | { businessId: string },
  now = new Date(),
): Promise<Entitlement> {
  const where =
    'userId' in subject ? eq(subscriptions.userId, subject.userId) : eq(subscriptions.businessId, subject.businessId);
  const [sub] = await db.select().from(subscriptions).where(and(where));
  if (!sub) return { active: false, status: 'none', endsAt: null, daysLeft: null };
  const endsAt = sub.status === 'trialing' ? sub.trialEndsAt : sub.currentPeriodEnd;
  const graceMs = 3 * 86400_000;
  let active = false;
  if (sub.status === 'trialing') active = !!endsAt && endsAt > now;
  else if (sub.status === 'active') active = !endsAt || endsAt.getTime() + graceMs > now.getTime();
  else if (sub.status === 'past_due') active = !!endsAt && endsAt.getTime() + graceMs > now.getTime();
  const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86400_000)) : null;
  return { active, status: sub.status, endsAt: endsAt ?? null, daysLeft };
}
