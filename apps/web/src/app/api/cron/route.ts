import { createServices, dispatchPendingBulletins } from '@bilardogo/api/server';
import { getDb, sql } from '@bilardogo/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Bakım işleri: pg_cron dakikada bir aynı SQL fonksiyonunu çalıştırır; bu uç Vercel Cron ile yedek olarak
 * ve planlanan bültenlerin push bildirimleri için çağrılır. Authorization: Bearer CRON_SECRET
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = getDb();
  const [maintenance] = await db.execute<{ result: unknown }>(sql`select public.bg_run_maintenance() as result`);
  const tasks: Promise<unknown>[] = [];
  const services = createServices((t) => tasks.push(t()));
  const bulletins = await dispatchPendingBulletins({ db, services });
  await Promise.allSettled(tasks);
  return NextResponse.json({ ok: true, maintenance: maintenance?.result, bulletinNotifications: bulletins });
}
