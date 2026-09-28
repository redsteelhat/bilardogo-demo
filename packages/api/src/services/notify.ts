import {
  and,
  blocks,
  eq,
  inArray,
  notificationPrefs,
  notificationTemplates,
  notifications,
  or,
  pushSubscriptions,
  venueFollows,
  type Database,
  type DbOrTx,
} from '@bilardogo/db';
import { renderTemplate, type GameType, type NotificationTemplateKey } from '@bilardogo/domain';
import { friendIds } from '../lib/users';
import type { Services } from './types';

type NotifyCtx = { db: Database | DbOrTx; services: Services };

export type NotifyOptions = {
  link?: string;
  payload?: Record<string, unknown>;
  /** Bildirimi tetikleyen kullanıcı: kendisine gitmez, onu engelleyenlere gitmez. */
  actorId?: string | null;
  /** Oyun türü tercihine göre filtrele (durum / maç bildirimleri) */
  gameType?: GameType | null;
};

const CATEGORY_FIELD = {
  presence: 'presence',
  match: 'match',
  social: 'social',
  order: 'order',
  venue: 'venue',
  bulletin: 'bulletin',
  account: null,
} as const;

/**
 * Şablonlu, hedefli bildirim gönderir: uygulama içi kayıt + web push.
 * Metinler notification_templates tablosundan gelir (admin düzenler); kodda sabit değildir.
 * Kullanıcı tercihleri (kategori, oyun türü, push) ve engellemeler dikkate alınır.
 */
export async function notify(
  ctx: NotifyCtx,
  key: NotificationTemplateKey,
  recipientIds: string[],
  vars: Record<string, string | number | null | undefined>,
  opts: NotifyOptions = {},
): Promise<number> {
  const db = ctx.db;
  let recipients = [...new Set(recipientIds)].filter((id) => id && id !== opts.actorId);
  if (recipients.length === 0) return 0;

  const [tpl] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.key, key));
  if (!tpl || !tpl.isActive) return 0;

  if (opts.actorId) {
    const blocked = await db
      .select({ a: blocks.blockerId, b: blocks.blockedId })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, opts.actorId), inArray(blocks.blockedId, recipients)),
          and(eq(blocks.blockedId, opts.actorId), inArray(blocks.blockerId, recipients)),
        ),
      );
    const exclude = new Set(blocked.map((r) => (r.a === opts.actorId ? r.b : r.a)));
    recipients = recipients.filter((id) => !exclude.has(id));
  }

  const prefs = await db.select().from(notificationPrefs).where(inArray(notificationPrefs.userId, recipients));
  const prefMap = new Map(prefs.map((p) => [p.userId, p]));
  const field = CATEGORY_FIELD[tpl.category];
  recipients = recipients.filter((id) => {
    const p = prefMap.get(id);
    if (!p) return true;
    if (field && p[field] === false) return false;
    if (opts.gameType && (tpl.category === 'presence' || tpl.category === 'match') && p.gameTypes.length > 0) {
      if (!p.gameTypes.includes(opts.gameType)) return false;
    }
    return true;
  });
  if (recipients.length === 0) return 0;

  const title = renderTemplate(tpl.title, vars);
  const body = renderTemplate(tpl.body, vars);
  await db.insert(notifications).values(
    recipients.map((userId) => ({
      userId,
      templateKey: key,
      category: tpl.category,
      title,
      body,
      link: opts.link ?? null,
      payload: opts.payload ?? null,
    })),
  );

  const pushRecipients = recipients.filter((id) => prefMap.get(id)?.pushEnabled !== false);
  if (ctx.services.push.enabled && pushRecipients.length > 0) {
    const services = ctx.services;
    const rootDb = db;
    services.defer(async () => {
      const subs = await rootDb.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, pushRecipients));
      const gone: string[] = [];
      await Promise.all(
        subs.map(async (s) => {
          const res = await services.push.send(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            { title, body, url: opts.link, tag: key },
          );
          if (res === 'gone') gone.push(s.id);
        }),
      );
      if (gone.length) await rootDb.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
    });
  }
  return recipients.length;
}

/**
 * Salondaki hareketlerin (durum, maç başlangıcı, sonuç) kime gideceği:
 * aktörün arkadaşları + salonu takip eden ve "salon hareketleri" tercihini açık tutanlar.
 * Bildirimler şehre körlemesine gönderilmez.
 */
export async function venueActivityAudience(db: DbOrTx, venueId: string, actorIds: string[]): Promise<string[]> {
  const friends = (await Promise.all(actorIds.map((id) => friendIds(db, id)))).flat();
  const followers = await db
    .select({ id: venueFollows.userId, activity: notificationPrefs.venueActivity })
    .from(venueFollows)
    .leftJoin(notificationPrefs, eq(notificationPrefs.userId, venueFollows.userId))
    .where(eq(venueFollows.venueId, venueId));
  const followerIds = followers.filter((f) => f.activity !== false).map((f) => f.id);
  const actors = new Set(actorIds);
  return [...new Set([...friends, ...followerIds])].filter((id) => !actors.has(id));
}
