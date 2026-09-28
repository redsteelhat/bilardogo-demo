import { and, businessMembers, businesses, eq, venues, type DbOrTx } from '@bilardogo/db';
import type { STAFF_PERMISSIONS } from '@bilardogo/domain';
import { forbidden, notFound } from './errors';

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export type VenueAccess = {
  venueId: string;
  businessId: string;
  role: 'owner' | 'staff';
  permissions: string[];
  businessStatus: 'pending' | 'needs_docs' | 'approved' | 'rejected';
  businessActive: boolean;
};

export async function getVenueAccess(db: DbOrTx, userId: string, venueId: string): Promise<VenueAccess | null> {
  const [row] = await db
    .select({
      venueId: venues.id,
      businessId: venues.businessId,
      role: businessMembers.role,
      permissions: businessMembers.permissions,
      businessStatus: businesses.status,
      businessActive: businesses.isActive,
    })
    .from(venues)
    .innerJoin(businesses, eq(businesses.id, venues.businessId))
    .innerJoin(businessMembers, and(eq(businessMembers.businessId, venues.businessId), eq(businessMembers.userId, userId)))
    .where(eq(venues.id, venueId));
  return row ?? null;
}

/**
 * Salon sahibi her şeyi yapabilir. Çalışan yalnız verilen yetkilerle çalışır ve salon ayarlarını değiştiremez.
 * `permission` verilmezse yalnız sahip geçer.
 */
export async function requireVenueAccess(
  db: DbOrTx,
  userId: string,
  venueId: string,
  permission?: StaffPermission,
  opts: { allowUnapproved?: boolean } = {},
): Promise<VenueAccess> {
  const access = await getVenueAccess(db, userId, venueId);
  if (!access) notFound('Salon');
  if (!access.businessActive) forbidden('İşletme hesabı pasif durumda.');
  if (!opts.allowUnapproved && access.businessStatus !== 'approved') {
    forbidden('İşletme başvurun onaylandıktan sonra bu işlemi yapabilirsin.');
  }
  if (access.role === 'owner') return access;
  if (!permission || !access.permissions.includes(permission)) {
    forbidden(permission ? 'Çalışan hesabının bu işlem için yetkisi yok.' : 'Bu işlemi yalnız salon sahibi yapabilir.');
  }
  return access;
}

/** Salonun herhangi bir üyesi (sahip veya herhangi bir yetkisi olan çalışan). */
export async function requireVenueMember(
  db: DbOrTx,
  userId: string,
  venueId: string,
  opts: { allowUnapproved?: boolean } = {},
): Promise<VenueAccess> {
  const access = await getVenueAccess(db, userId, venueId);
  if (!access) notFound('Salon');
  if (!access.businessActive) forbidden('İşletme hesabı pasif durumda.');
  if (!opts.allowUnapproved && access.businessStatus !== 'approved') {
    forbidden('İşletme başvurun onaylandıktan sonra bu işlemi yapabilirsin.');
  }
  return access;
}
