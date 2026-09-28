import {
  and,
  blocks,
  conversationMembers,
  conversations,
  desc,
  eq,
  friendships,
  gt,
  inArray,
  isNull,
  lt,
  messages,
  or,
  profiles,
  reports,
  sql,
  venues,
} from '@bilardogo/db';
import { messageSendSchema, reportSchema } from '@bilardogo/domain';
import { z } from 'zod';
import { getVenueAccess } from '../lib/access';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { rateLimit } from '../lib/rate-limit';
import { assertOwnedPath, buildUploadPath, uploadRequestSchema } from '../lib/storage';
import { blockedRelations, getUserSummaries, isBlockedBetween, toUserSummary, userSummaryColumns } from '../lib/users';
import { notify } from '../services/notify';
import { protectedProcedure, router } from '../trpc';

const uid = z.string().uuid();

type Ctx = Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]['ctx'];

/** Sohbete erişim: genel kanallar herkese açık; DM yalnız üyelere. */
async function requireConversation(ctx: Ctx, conversationId: string) {
  const [c] = await ctx.db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!c) notFound('Sohbet');
  if (c.type === 'dm') {
    const [m] = await ctx.db
      .select()
      .from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, c.id), eq(conversationMembers.userId, ctx.profile.id)));
    if (!m) notFound('Sohbet');
  }
  return c;
}

async function conversationTitle(ctx: Ctx, c: typeof conversations.$inferSelect) {
  if (c.type === 'country') return { title: 'Türkiye Sohbeti', subtitle: 'Tüm oyuncuların ortak alanı' };
  if (c.type === 'city') {
    const [row] = await ctx.db.execute<{ name: string }>(sql`select name from cities where plate = ${c.cityPlate}`);
    return { title: `${row?.name ?? ''} Sohbeti`, subtitle: 'Şehrindeki oyuncular' };
  }
  if (c.type === 'venue') {
    const [v] = await ctx.db.select({ name: venues.name, slug: venues.slug }).from(venues).where(eq(venues.id, c.venueId!));
    return { title: v?.name ?? 'Salon', subtitle: 'Salon sohbeti', venueSlug: v?.slug };
  }
  return { title: 'Özel mesaj', subtitle: '' };
}

export const socialRouter = router({
  // ───────────────────────────────────────────── Arkadaşlar
  friends: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.profile.id;
    const rows = await ctx.db
      .select()
      .from(friendships)
      .where(or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)))
      .orderBy(desc(friendships.createdAt));
    const users = await getUserSummaries(
      ctx.db,
      rows.map((r) => (r.requesterId === me ? r.addresseeId : r.requesterId)),
      ctx.services.storage.publicUrl,
    );
    const map = (r: (typeof rows)[number]) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      user: users.get(r.requesterId === me ? r.addresseeId : r.requesterId)!,
    });
    return {
      friends: rows.filter((r) => r.status === 'accepted').map(map).filter((x) => x.user),
      incoming: rows.filter((r) => r.status === 'pending' && r.addresseeId === me).map(map).filter((x) => x.user),
      outgoing: rows.filter((r) => r.status === 'pending' && r.requesterId === me).map(map).filter((x) => x.user),
    };
  }),

  addFriend: protectedProcedure.input(z.object({ userId: uid })).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    if (input.userId === me) badRequest('Kendini arkadaş olarak ekleyemezsin.');
    await rateLimit(ctx.db, `friend:${me}`, 50, 3600);
    if (await isBlockedBetween(ctx.db, me, input.userId)) forbidden('Bu kullanıcıyı ekleyemezsin.');
    const [existing] = await ctx.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, me), eq(friendships.addresseeId, input.userId)),
          and(eq(friendships.requesterId, input.userId), eq(friendships.addresseeId, me)),
        ),
      );
    if (existing) {
      // Karşı taraf zaten istek göndermişse kabul et
      if (existing.status === 'pending' && existing.addresseeId === me) {
        await ctx.db
          .update(friendships)
          .set({ status: 'accepted', respondedAt: new Date() })
          .where(eq(friendships.id, existing.id));
        await notify(ctx, 'friend_accepted', [input.userId], { kullanici: ctx.profile.fullName }, { actorId: me, link: `/profil/${ctx.profile.username}` });
        return { status: 'accepted' as const };
      }
      return { status: existing.status };
    }
    await ctx.db.insert(friendships).values({ requesterId: me, addresseeId: input.userId });
    await notify(ctx, 'friend_request', [input.userId], { kullanici: ctx.profile.fullName }, { actorId: me, link: '/sosyal/arkadaslar' });
    return { status: 'pending' as const };
  }),

  respondFriend: protectedProcedure
    .input(z.object({ friendshipId: uid, accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [f] = await ctx.db.select().from(friendships).where(eq(friendships.id, input.friendshipId));
      if (!f || f.addresseeId !== ctx.profile.id || f.status !== 'pending') notFound('İstek');
      if (input.accept) {
        await ctx.db.update(friendships).set({ status: 'accepted', respondedAt: new Date() }).where(eq(friendships.id, f.id));
        await notify(ctx, 'friend_accepted', [f.requesterId], { kullanici: ctx.profile.fullName }, { actorId: ctx.profile.id, link: `/profil/${ctx.profile.username}` });
      } else {
        await ctx.db.delete(friendships).where(eq(friendships.id, f.id));
      }
      return { ok: true };
    }),

  removeFriend: protectedProcedure.input(z.object({ userId: uid })).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    await ctx.db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, me), eq(friendships.addresseeId, input.userId)),
          and(eq(friendships.requesterId, input.userId), eq(friendships.addresseeId, me)),
        ),
      );
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Engelleme
  blocked: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ ...userSummaryColumns, at: blocks.createdAt })
      .from(blocks)
      .innerJoin(profiles, eq(profiles.id, blocks.blockedId))
      .where(eq(blocks.blockerId, ctx.profile.id));
    return rows.map((r) => ({ user: toUserSummary(r, ctx.services.storage.publicUrl), at: r.at }));
  }),

  /** Engellenen kullanıcı DM atamaz, maç isteği gönderemez; mesajları sohbetlerde gizlenir. */
  block: protectedProcedure.input(z.object({ userId: uid })).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    if (input.userId === me) badRequest('Kendini engelleyemezsin.');
    await ctx.db.transaction(async (tx) => {
      await tx.insert(blocks).values({ blockerId: me, blockedId: input.userId }).onConflictDoNothing();
      await tx
        .delete(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, me), eq(friendships.addresseeId, input.userId)),
            and(eq(friendships.requesterId, input.userId), eq(friendships.addresseeId, me)),
          ),
        );
    });
    return { ok: true };
  }),

  unblock: protectedProcedure.input(z.object({ userId: uid })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(blocks).where(and(eq(blocks.blockerId, ctx.profile.id), eq(blocks.blockedId, input.userId)));
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Sohbetler
  /** Sohbet listesi: Türkiye, şehir, takip edilen/üye olunan salonlar ve DM'ler; okunmamış sayılarıyla. */
  conversations: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.profile.id;
    const general = await ctx.db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.type, 'country'),
          and(eq(conversations.type, 'city'), eq(conversations.cityPlate, ctx.profile.cityPlate ?? -1)),
        ),
      );
    const venueConvs = await ctx.db.execute<{ id: string }>(sql`
      select c.id from conversations c
       where c.type = 'venue' and (
         exists (select 1 from venue_follows f where f.venue_id = c.venue_id and f.user_id = ${me})
         or exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = ${me})
         or exists (select 1 from venues v join business_members bm on bm.business_id = v.business_id
                     where v.id = c.venue_id and bm.user_id = ${me}))
    `);
    const dmRows = await ctx.db
      .select({ c: conversations })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .where(and(eq(conversationMembers.userId, me), eq(conversations.type, 'dm')));
    const venueRows = venueConvs.length
      ? await ctx.db.select().from(conversations).where(inArray(conversations.id, venueConvs.map((v) => v.id)))
      : [];
    const all = [...general, ...venueRows, ...dmRows.map((d) => d.c)];
    const ids = all.map((c) => c.id);
    if (ids.length === 0) return [];
    const blocked = await blockedRelations(ctx.db, me);

    const [lastMessages, memberRows, unreadRows, venueNames] = await Promise.all([
      ctx.db.execute<{ conversation_id: string; body: string; media_type: string | null; sender_id: string; created_at: string }>(sql`
        select distinct on (conversation_id) conversation_id, body, media_type, sender_id, created_at
          from messages
         where conversation_id in ${ids} and deleted_at is null and not hidden_by_moderation
         order by conversation_id, created_at desc
      `),
      ctx.db.select().from(conversationMembers).where(inArray(conversationMembers.conversationId, ids)),
      ctx.db.execute<{ conversation_id: string; n: number }>(sql`
        select msg.conversation_id, count(*)::int as n
          from messages msg
          left join conversation_members cm on cm.conversation_id = msg.conversation_id and cm.user_id = ${me}
         where msg.conversation_id in ${ids}
           and msg.sender_id <> ${me}
           and msg.deleted_at is null
           and msg.created_at > coalesce(cm.last_read_at, now() - interval '7 days')
         group by msg.conversation_id
      `),
      ctx.db
        .select({ id: venues.id, name: venues.name, slug: venues.slug })
        .from(venues)
        .where(inArray(venues.id, venueRows.map((v) => v.venueId!).filter(Boolean).concat(['00000000-0000-0000-0000-000000000000']))),
    ]);
    const cityNames = await ctx.db.execute<{ plate: number; name: string }>(sql`select plate, name from cities`);
    const dmOthers = memberRows.filter((m) => m.userId !== me);
    const users = await getUserSummaries(
      ctx.db,
      [...dmOthers.map((m) => m.userId), ...lastMessages.map((l) => l.sender_id)],
      ctx.services.storage.publicUrl,
    );
    return all
      .map((c) => {
        const last = lastMessages.find((l) => l.conversation_id === c.id);
        const other = c.type === 'dm' ? dmOthers.find((m) => m.conversationId === c.id) : undefined;
        const venue = venueNames.find((v) => v.id === c.venueId);
        const title =
          c.type === 'country'
            ? 'Türkiye Sohbeti'
            : c.type === 'city'
              ? `${cityNames.find((x) => x.plate === c.cityPlate)?.name ?? ''} Sohbeti`
              : c.type === 'venue'
                ? (venue?.name ?? 'Salon')
                : (users.get(other?.userId ?? '')?.displayName ?? 'Oyuncu');
        return {
          id: c.id,
          type: c.type,
          title,
          venueSlug: venue?.slug ?? null,
          otherUser: other ? (users.get(other.userId) ?? null) : null,
          isBlocked: other ? blocked.has(other.userId) : false,
          lastMessage: last
            ? {
                body: last.media_type ? (last.media_type === 'image' ? '📷 Fotoğraf' : '🎬 Video') : last.body,
                senderName: last.sender_id === me ? 'Sen' : (users.get(last.sender_id)?.displayName ?? ''),
                at: new Date(last.created_at),
              }
            : null,
          unread: unreadRows.find((u) => u.conversation_id === c.id)?.n ?? 0,
        };
      })
      .sort((a, b) => {
        const order = { country: 0, city: 1, venue: 2, dm: 3 } as const;
        if (a.type !== 'dm' || b.type !== 'dm') return order[a.type] - order[b.type];
        return (b.lastMessage?.at.getTime() ?? 0) - (a.lastMessage?.at.getTime() ?? 0);
      });
  }),

  /** Kullanıcıyla DM aç (yoksa oluştur). */
  openDm: protectedProcedure.input(z.object({ userId: uid })).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    if (input.userId === me) badRequest('Kendine mesaj gönderemezsin.');
    if (await isBlockedBetween(ctx.db, me, input.userId)) forbidden('Bu kullanıcıyla mesajlaşamazsın.');
    const [target] = await ctx.db.select({ id: profiles.id, deletedAt: profiles.deletedAt }).from(profiles).where(eq(profiles.id, input.userId));
    if (!target || target.deletedAt) notFound('Oyuncu');
    const key = [me, input.userId].sort().join(':');
    const [existing] = await ctx.db.select().from(conversations).where(eq(conversations.dmKey, key));
    if (existing) return { id: existing.id };
    const id = await ctx.db.transaction(async (tx) => {
      const [c] = await tx
        .insert(conversations)
        .values({ type: 'dm', dmKey: key })
        .onConflictDoUpdate({ target: conversations.dmKey, set: { dmKey: key } })
        .returning({ id: conversations.id });
      await tx
        .insert(conversationMembers)
        .values([
          { conversationId: c!.id, userId: me },
          { conversationId: c!.id, userId: input.userId },
        ])
        .onConflictDoNothing();
      return c!.id;
    });
    return { id };
  }),

  conversation: protectedProcedure.input(z.object({ conversationId: uid })).query(async ({ ctx, input }) => {
    const c = await requireConversation(ctx, input.conversationId);
    const meta = await conversationTitle(ctx, c);
    let otherUser = null;
    let isBlocked = false;
    if (c.type === 'dm') {
      const [m] = await ctx.db
        .select()
        .from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId, c.id), sql`${conversationMembers.userId} <> ${ctx.profile.id}`));
      if (m) {
        otherUser = (await getUserSummaries(ctx.db, [m.userId], ctx.services.storage.publicUrl)).get(m.userId) ?? null;
        isBlocked = await isBlockedBetween(ctx.db, ctx.profile.id, m.userId);
      }
    }
    const staffVenue = c.type === 'venue' ? await getVenueAccess(ctx.db, ctx.profile.id, c.venueId!) : null;
    return {
      id: c.id,
      type: c.type,
      ...meta,
      otherUser,
      isBlocked,
      canPostAsVenue: !!staffVenue && (staffVenue.role === 'owner' || staffVenue.permissions.includes('chat')),
    };
  }),

  /** Mesajlar (en yeniden eskiye, sayfalı). Engellenen kullanıcıların mesajları filtrelenir. */
  messages: protectedProcedure
    .input(z.object({ conversationId: uid, cursor: z.string().datetime({ offset: true }).optional(), limit: z.number().int().min(1).max(100).default(40) }))
    .query(async ({ ctx, input }) => {
      await requireConversation(ctx, input.conversationId);
      const blocked = await blockedRelations(ctx.db, ctx.profile.id);
      const rows = await ctx.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, input.conversationId),
            input.cursor ? lt(messages.createdAt, new Date(input.cursor)) : undefined,
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(input.limit + 1);
      const page = rows.slice(0, input.limit).filter((m) => !blocked.has(m.senderId));
      const replyIds = page.map((m) => m.replyToId).filter((x): x is string => !!x);
      const replies = replyIds.length ? await ctx.db.select().from(messages).where(inArray(messages.id, replyIds)) : [];
      const users = await getUserSummaries(
        ctx.db,
        [...page.map((m) => m.senderId), ...replies.map((r) => r.senderId)],
        ctx.services.storage.publicUrl,
      );
      const venueIds = page.map((m) => m.asVenueId).filter((x): x is string => !!x);
      const venueRows = venueIds.length
        ? await ctx.db.select({ id: venues.id, name: venues.name, slug: venues.slug }).from(venues).where(inArray(venues.id, venueIds))
        : [];
      const mediaPaths = page.filter((m) => m.mediaPath && !m.deletedAt && !m.hiddenByModeration).map((m) => m.mediaPath!);
      const signed = mediaPaths.length ? await ctx.services.storage.createSignedReads('chat-media', mediaPaths, 3600) : {};
      return {
        items: page.map((m) => {
          const removed = !!m.deletedAt || m.hiddenByModeration;
          const reply = m.replyToId ? replies.find((r) => r.id === m.replyToId) : undefined;
          return {
            id: m.id,
            sender: users.get(m.senderId) ?? null,
            asVenue: venueRows.find((v) => v.id === m.asVenueId) ?? null,
            isMine: m.senderId === ctx.profile.id,
            body: removed ? '' : m.body,
            mediaUrl: removed || !m.mediaPath ? null : (signed[m.mediaPath] ?? null),
            mediaType: removed ? null : m.mediaType,
            removed: m.deletedAt ? ('deleted' as const) : m.hiddenByModeration ? ('moderated' as const) : null,
            replyTo: reply
              ? {
                  id: reply.id,
                  senderName: users.get(reply.senderId)?.displayName ?? '',
                  body: reply.deletedAt || reply.hiddenByModeration ? 'Mesaj kaldırıldı' : reply.body || (reply.mediaType === 'video' ? '🎬 Video' : '📷 Fotoğraf'),
                }
              : null,
            createdAt: m.createdAt,
          };
        }),
        nextCursor: rows.length > input.limit ? rows[input.limit - 1]!.createdAt.toISOString() : null,
      };
    }),

  mediaUpload: protectedProcedure
    .input(uploadRequestSchema.extend({ conversationId: uid }))
    .mutation(async ({ ctx, input }) => {
      await requireConversation(ctx, input.conversationId);
      await rateLimit(ctx.db, `chat_media:${ctx.profile.id}`, 40, 3600);
      const { path, mediaType } = buildUploadPath(`${input.conversationId}/${ctx.profile.id}`, input, 'image_or_video');
      const signed = await ctx.services.storage.createSignedUpload('chat-media', path);
      return { ...signed, mediaType: mediaType! };
    }),

  send: protectedProcedure
    .input(messageSendSchema.and(z.object({ asVenue: z.boolean().optional() })))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.profile.id;
      await rateLimit(ctx.db, `msg:${me}`, 120, 600);
      const c = await requireConversation(ctx, input.conversationId);
      assertOwnedPath(input.mediaPath, `${c.id}/${me}`);
      let dmOther: string | null = null;
      if (c.type === 'dm') {
        const [m] = await ctx.db
          .select()
          .from(conversationMembers)
          .where(and(eq(conversationMembers.conversationId, c.id), sql`${conversationMembers.userId} <> ${me}`));
        dmOther = m?.userId ?? null;
        if (dmOther && (await isBlockedBetween(ctx.db, me, dmOther))) forbidden('Bu kullanıcıyla mesajlaşamazsın.');
      }
      let asVenueId: string | null = null;
      if (input.asVenue) {
        if (c.type !== 'venue') badRequest('Salon adına yalnız salon sohbetinde yazılabilir.');
        const access = await getVenueAccess(ctx.db, me, c.venueId!);
        if (!access || (access.role !== 'owner' && !access.permissions.includes('chat'))) forbidden();
        asVenueId = c.venueId;
      }
      if (input.replyToId) {
        const [r] = await ctx.db.select({ c: messages.conversationId }).from(messages).where(eq(messages.id, input.replyToId));
        if (!r || r.c !== c.id) badRequest('Yanıtlanan mesaj bu sohbette değil.');
      }
      const [msg] = await ctx.db
        .insert(messages)
        .values({
          conversationId: c.id,
          senderId: me,
          asVenueId,
          body: input.body,
          mediaPath: input.mediaPath ?? null,
          mediaType: input.mediaPath ? (input.mediaType ?? 'image') : null,
          replyToId: input.replyToId ?? null,
        })
        .returning();
      await ctx.db
        .insert(conversationMembers)
        .values({ conversationId: c.id, userId: me, lastReadAt: new Date() })
        .onConflictDoUpdate({
          target: [conversationMembers.conversationId, conversationMembers.userId],
          set: { lastReadAt: new Date() },
        });
      if (dmOther) {
        // Yeni DM bildirimi: aynı sohbetten son 2 dakikada bildirim gittiyse tekrar gönderme
        const recent = await ctx.db.execute<{ n: number }>(sql`
          select count(*)::int as n from notifications
           where user_id = ${dmOther} and template_key = 'new_dm'
             and payload ->> 'conversationId' = ${c.id} and created_at > now() - interval '2 minutes'
        `);
        if ((recent[0]?.n ?? 0) === 0) {
          await notify(
            ctx,
            'new_dm',
            [dmOther],
            {
              kullanici: ctx.profile.fullName || `@${ctx.profile.username}`,
              mesaj: input.body ? input.body.slice(0, 120) : input.mediaType === 'video' ? '🎬 Video' : '📷 Fotoğraf',
            },
            { actorId: me, link: `/sosyal/${c.id}`, payload: { conversationId: c.id } },
          );
        }
      }
      return { id: msg!.id, createdAt: msg!.createdAt };
    }),

  deleteMessage: protectedProcedure.input(z.object({ messageId: uid })).mutation(async ({ ctx, input }) => {
    const [m] = await ctx.db.select().from(messages).where(eq(messages.id, input.messageId));
    if (!m || m.senderId !== ctx.profile.id) notFound('Mesaj');
    await ctx.db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, m.id));
    if (m.mediaPath) ctx.services.defer(() => ctx.services.storage.remove('chat-media', [m.mediaPath!]));
    return { ok: true };
  }),

  markRead: protectedProcedure.input(z.object({ conversationId: uid })).mutation(async ({ ctx, input }) => {
    await requireConversation(ctx, input.conversationId);
    await ctx.db
      .insert(conversationMembers)
      .values({ conversationId: input.conversationId, userId: ctx.profile.id, lastReadAt: new Date() })
      .onConflictDoUpdate({
        target: [conversationMembers.conversationId, conversationMembers.userId],
        set: { lastReadAt: new Date() },
      });
    return { ok: true };
  }),

  unreadTotal: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.profile.id;
    const [row] = await ctx.db.execute<{ n: number }>(sql`
      select count(*)::int as n
        from conversation_members cm
        join conversations c on c.id = cm.conversation_id and c.type = 'dm'
        join messages m on m.conversation_id = cm.conversation_id
       where cm.user_id = ${me} and m.sender_id <> ${me} and m.deleted_at is null
         and m.created_at > coalesce(cm.last_read_at, 'epoch'::timestamptz)
         and not exists (select 1 from blocks b where (b.blocker_id = ${me} and b.blocked_id = m.sender_id))
    `);
    return { count: row?.n ?? 0 };
  }),

  // ───────────────────────────────────────────── Şikâyet
  /** Kullanıcı, mesaj veya salon şikâyeti. Mesajın o anki içeriği moderasyon için saklanır. */
  report: protectedProcedure.input(reportSchema).mutation(async ({ ctx, input }) => {
    await rateLimit(ctx.db, `report:${ctx.profile.id}`, 20, 3600);
    let snapshot: Record<string, unknown> | null = null;
    if (input.targetType === 'message') {
      const [m] = await ctx.db.select().from(messages).where(eq(messages.id, input.targetId));
      if (!m) notFound('Mesaj');
      const [c] = await ctx.db.select().from(conversations).where(eq(conversations.id, m.conversationId));
      if (c?.type === 'dm') {
        const [mem] = await ctx.db
          .select()
          .from(conversationMembers)
          .where(and(eq(conversationMembers.conversationId, c.id), eq(conversationMembers.userId, ctx.profile.id)));
        if (!mem) notFound('Mesaj');
      }
      snapshot = {
        body: m.body,
        mediaPath: m.mediaPath,
        senderId: m.senderId,
        conversationId: m.conversationId,
        conversationType: c?.type,
        createdAt: m.createdAt,
      };
    } else if (input.targetType === 'user') {
      const [u] = await ctx.db.select({ id: profiles.id, username: profiles.username, fullName: profiles.fullName }).from(profiles).where(eq(profiles.id, input.targetId));
      if (!u) notFound('Kullanıcı');
      snapshot = u;
    } else {
      const [v] = await ctx.db.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.id, input.targetId));
      if (!v) notFound('Salon');
      snapshot = v;
    }
    await ctx.db.insert(reports).values({
      reporterId: ctx.profile.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ?? null,
      snapshot,
    });
    return { ok: true };
  }),
});

