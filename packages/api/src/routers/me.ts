import {
  and,
  businessMembers,
  businesses,
  consents,
  conversationMembers,
  eq,
  friendships,
  inArray,
  isNull,
  legalDocuments,
  notificationPrefs,
  notifications,
  or,
  presence,
  profiles,
  pushSubscriptions,
  sql,
  venueFollows,
  venues,
  count,
} from '@bilardogo/db';
import { consentKinds, gameTypeSchema, onboardingSchema, profileUpdateSchema, usernameSchema } from '@bilardogo/domain';
import { z } from 'zod';
import { audit } from '../lib/audit';
import { getEntitlement } from '../lib/entitlements';
import { badRequest } from '../lib/errors';
import { assertOwnedPath, buildUploadPath, resolveMediaUrl, uploadRequestSchema } from '../lib/storage';
import { authedProcedure, protectedProcedure, publicProcedure, router } from '../trpc';

const RESERVED = new Set(['admin', 'bilardogo', 'destek', 'support', 'moderator', 'isletme', 'salon', 'api', 'root']);

async function usernameTaken(db: Parameters<typeof audit>[0], username: string, exceptId: string) {
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.username}) = ${username.toLowerCase()} and ${profiles.id} <> ${exceptId}`)
    .limit(1);
  return rows.length > 0;
}

export const meRouter = router({
  /** Oturum özeti: giriş yapılmamışsa null. */
  session: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const [p] = await ctx.db.select().from(profiles).where(eq(profiles.id, ctx.user.id));
    if (!p || p.deletedAt) return null;
    const memberships = await ctx.db
      .select({
        businessId: businesses.id,
        legalName: businesses.legalName,
        status: businesses.status,
        isActive: businesses.isActive,
        role: businessMembers.role,
        permissions: businessMembers.permissions,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
      .where(eq(businessMembers.userId, p.id));
    const venueRows = memberships.length
      ? await ctx.db
          .select({ id: venues.id, name: venues.name, slug: venues.slug, businessId: venues.businessId })
          .from(venues)
          .where(inArray(venues.businessId, memberships.map((m) => m.businessId)))
      : [];
    const [unread] = await ctx.db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, p.id), isNull(notifications.readAt)));
    const entitlement = await getEntitlement(ctx.db, { userId: p.id });
    return {
      id: p.id,
      email: ctx.user.email,
      username: p.username,
      fullName: p.fullName,
      avatarUrl: resolveMediaUrl(ctx.services.storage.publicUrl, p.avatarPath),
      cityPlate: p.cityPlate,
      level: p.level,
      gameTypes: p.gameTypes,
      bio: p.bio,
      role: p.role,
      status: p.status,
      statusReason: p.statusReason,
      onboarded: !!p.onboardedAt && !!p.username,
      isAdmin: p.role === 'admin',
      memberships: memberships.map((m) => ({ ...m, venues: venueRows.filter((v) => v.businessId === m.businessId) })),
      unreadNotifications: unread?.n ?? 0,
      entitlement,
    };
  }),

  checkUsername: authedProcedure.input(z.object({ username: usernameSchema })).query(async ({ ctx, input }) => {
    if (RESERVED.has(input.username)) return { available: false };
    return { available: !(await usernameTaken(ctx.db, input.username, ctx.profile.id)) };
  }),

  completeOnboarding: authedProcedure.input(onboardingSchema).mutation(async ({ ctx, input }) => {
    if (RESERVED.has(input.username) || (await usernameTaken(ctx.db, input.username, ctx.profile.id))) {
      badRequest('Bu kullanıcı adı alınmış.');
    }
    const docs = await ctx.db
      .select({ id: legalDocuments.id, kind: legalDocuments.kind })
      .from(legalDocuments)
      .where(eq(legalDocuments.isCurrent, true));
    const docId = (k: string) => docs.find((d) => d.kind === k)?.id ?? null;
    await ctx.db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          username: input.username,
          fullName: input.fullName,
          cityPlate: input.cityPlate,
          level: input.level,
          gameTypes: input.gameTypes,
          bio: input.bio ?? null,
          onboardedAt: ctx.profile.onboardedAt ?? new Date(),
        })
        .where(eq(profiles.id, ctx.profile.id));
      const base = { userId: ctx.profile.id, ip: ctx.ip, userAgent: ctx.userAgent };
      await tx.insert(consents).values([
        { ...base, kind: 'user_agreement', documentId: docId('user_agreement'), granted: true },
        { ...base, kind: 'kvkk_notice', documentId: docId('kvkk_notice'), granted: true },
        { ...base, kind: 'explicit_consent', documentId: docId('explicit_consent'), granted: input.explicitConsent },
        { ...base, kind: 'marketing', documentId: docId('marketing'), granted: input.marketingConsent },
      ]);
      await tx
        .insert(notificationPrefs)
        .values({ userId: ctx.profile.id, gameTypes: [] })
        .onConflictDoNothing();
    });
    return { ok: true };
  }),

  update: protectedProcedure.input(profileUpdateSchema).mutation(async ({ ctx, input }) => {
    if (RESERVED.has(input.username) || (await usernameTaken(ctx.db, input.username, ctx.profile.id))) {
      badRequest('Bu kullanıcı adı alınmış.');
    }
    await ctx.db
      .update(profiles)
      .set({
        username: input.username,
        fullName: input.fullName,
        cityPlate: input.cityPlate,
        level: input.level,
        gameTypes: input.gameTypes,
        bio: input.bio ?? null,
      })
      .where(eq(profiles.id, ctx.profile.id));
    return { ok: true };
  }),

  setCity: authedProcedure.input(z.object({ cityPlate: z.number().int().min(1).max(81) })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(profiles).set({ cityPlate: input.cityPlate }).where(eq(profiles.id, ctx.profile.id));
    return { ok: true };
  }),

  avatarUpload: authedProcedure.input(uploadRequestSchema).mutation(async ({ ctx, input }) => {
    const { path } = buildUploadPath(`avatars/${ctx.profile.id}`, input, 'image');
    return ctx.services.storage.createSignedUpload('public-media', path);
  }),

  setAvatar: authedProcedure.input(z.object({ path: z.string().nullable() })).mutation(async ({ ctx, input }) => {
    assertOwnedPath(input.path, `avatars/${ctx.profile.id}`);
    const old = ctx.profile.avatarPath;
    await ctx.db.update(profiles).set({ avatarPath: input.path }).where(eq(profiles.id, ctx.profile.id));
    if (old && !/^https?:/.test(old) && old !== input.path) {
      ctx.services.defer(() => ctx.services.storage.remove('public-media', [old]));
    }
    return { avatarUrl: resolveMediaUrl(ctx.services.storage.publicUrl, input.path) };
  }),

  consents: authedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(consents)
      .where(eq(consents.userId, ctx.profile.id))
      .orderBy(sql`${consents.createdAt} desc`);
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.kind)) latest.set(r.kind, r);
    return consentKinds.map((kind) => ({
      kind,
      granted: latest.get(kind)?.granted ?? false,
      at: latest.get(kind)?.createdAt ?? null,
    }));
  }),

  setConsent: authedProcedure
    .input(z.object({ kind: z.enum(['explicit_consent', 'marketing']), granted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [doc] = await ctx.db
        .select({ id: legalDocuments.id })
        .from(legalDocuments)
        .where(and(eq(legalDocuments.kind, input.kind), eq(legalDocuments.isCurrent, true)));
      await ctx.db.insert(consents).values({
        userId: ctx.profile.id,
        kind: input.kind,
        documentId: doc?.id ?? null,
        granted: input.granted,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { ok: true };
    }),

  prefs: authedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, ctx.profile.id));
    if (row) return row;
    const [created] = await ctx.db.insert(notificationPrefs).values({ userId: ctx.profile.id }).returning();
    return created!;
  }),

  updatePrefs: authedProcedure
    .input(
      z.object({
        pushEnabled: z.boolean(),
        presence: z.boolean(),
        match: z.boolean(),
        social: z.boolean(),
        order: z.boolean(),
        venue: z.boolean(),
        bulletin: z.boolean(),
        venueActivity: z.boolean(),
        gameTypes: z.array(gameTypeSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(notificationPrefs)
        .values({ userId: ctx.profile.id, ...input })
        .onConflictDoUpdate({ target: notificationPrefs.userId, set: input });
      return { ok: true };
    }),

  pushSubscribe: authedProcedure
    .input(
      z.object({
        endpoint: z.string().url().max(1000),
        keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(pushSubscriptions)
        .values({
          userId: ctx.profile.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: ctx.userAgent,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: { userId: ctx.profile.id, p256dh: input.keys.p256dh, auth: input.keys.auth, lastUsedAt: new Date() },
        });
      return { ok: true };
    }),

  pushUnsubscribe: authedProcedure.input(z.object({ endpoint: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, input.endpoint), eq(pushSubscriptions.userId, ctx.profile.id)));
    return { ok: true };
  }),

  /**
   * KVKK: hesap silme. Profil anonimleştirilir (rakiplerin maç geçmişi bozulmasın diye maç kayıtları kalır),
   * kişisel ilişkiler silinir, Supabase Auth kullanıcısı yumuşak silinir.
   */
  deleteAccount: authedProcedure
    .input(z.object({ confirm: z.literal('SİL') }))
    .mutation(async ({ ctx }) => {
      const uid = ctx.profile.id;
      const owned = await ctx.db
        .select({ id: businessMembers.businessId })
        .from(businessMembers)
        .where(and(eq(businessMembers.userId, uid), eq(businessMembers.role, 'owner')));
      if (owned.length) badRequest('İşletme sahibisin. Önce destek ekibiyle işletme hesabını kapat.');
      await ctx.db.transaction(async (tx) => {
        await tx.delete(presence).where(eq(presence.userId, uid));
        await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, uid));
        await tx.delete(venueFollows).where(eq(venueFollows.userId, uid));
        await tx.delete(friendships).where(or(eq(friendships.requesterId, uid), eq(friendships.addresseeId, uid)));
        await tx.delete(conversationMembers).where(eq(conversationMembers.userId, uid));
        await tx.delete(businessMembers).where(eq(businessMembers.userId, uid));
        await tx
          .update(profiles)
          .set({
            username: null,
            fullName: 'Silinmiş kullanıcı',
            avatarPath: null,
            bio: null,
            status: 'passive',
            deletedAt: new Date(),
          })
          .where(eq(profiles.id, uid));
        await audit(tx, uid, 'account.deleted', { type: 'user', id: uid });
      });
      await ctx.services.authAdmin.deleteUser(uid);
      return { ok: true };
    }),
});
