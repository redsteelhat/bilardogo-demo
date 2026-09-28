import { DomainError } from '@bilardogo/domain';
import { TRPCError } from '@trpc/server';

/** Veritabanı kısıt adlarından kullanıcıya gösterilecek mesajlar. */
const CONSTRAINT_MESSAGES: Record<string, { code: TRPCError['code']; message: string }> = {
  match_players_user_active_key: {
    code: 'CONFLICT',
    message: 'Oyunculardan biri zaten aktif bir maçta. Bir kullanıcı aynı anda yalnız 1 aktif maçta olabilir.',
  },
  matches_table_active_key: { code: 'CONFLICT', message: 'Bu masa şu an dolu.' },
  matches_table_game: { code: 'BAD_REQUEST', message: 'Bu masada bu oyun türü oynanamaz.' },
  matches_table_venue: { code: 'BAD_REQUEST', message: 'Masa bu salona ait değil.' },
  profiles_username_key: { code: 'CONFLICT', message: 'Bu kullanıcı adı alınmış.' },
  venue_tables_venue_number_key: { code: 'CONFLICT', message: 'Bu masa numarası zaten tanımlı.' },
  match_results_open_key: { code: 'CONFLICT', message: 'Bu maç için onay bekleyen bir sonuç zaten var.' },
  friendships_pair_key: { code: 'CONFLICT', message: 'Bu kullanıcıyla zaten bir arkadaşlık kaydın var.' },
  reports_once_key: { code: 'CONFLICT', message: 'Bunu zaten şikâyet ettin; moderasyon inceliyor.' },
  venue_products_key: { code: 'CONFLICT', message: 'Bu ürün menünde zaten var.' },
  orders_open_match_key: { code: 'CONFLICT', message: 'Bu maç için açık bir sipariş oturumu zaten var.' },
  venues_slug_unique: { code: 'CONFLICT', message: 'Bu salon adresi alınmış.' },
};

type PgError = { code?: string; constraint_name?: string; constraint?: string; message?: string };

function findPgError(err: unknown): PgError | null {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    const e = cur as PgError & { cause?: unknown };
    if (typeof e.code === 'string' && /^[0-9A-Z]{5}$/.test(e.code)) return e;
    cur = e.cause;
  }
  return null;
}

/** DomainError ve Postgres kısıt ihlallerini anlaşılır tRPC hatalarına çevirir. */
export function toTRPCError(err: unknown): TRPCError | null {
  if (err instanceof TRPCError) return err;
  if (err instanceof DomainError) return new TRPCError({ code: 'BAD_REQUEST', message: err.message, cause: err });
  const pg = findPgError(err);
  if (pg) {
    const name = pg.constraint_name ?? pg.constraint;
    if (name && CONSTRAINT_MESSAGES[name]) {
      const m = CONSTRAINT_MESSAGES[name]!;
      return new TRPCError({ code: m.code, message: m.message, cause: err });
    }
    if (pg.code === 'P0001' || pg.code === '23514') {
      // RAISE EXCEPTION / check_violation mesajları kullanıcıya uygundur
      return new TRPCError({ code: 'BAD_REQUEST', message: pg.message ?? 'Geçersiz işlem', cause: err });
    }
    if (pg.code === '23505') return new TRPCError({ code: 'CONFLICT', message: 'Bu kayıt zaten var.', cause: err });
    if (pg.code === '23503') return new TRPCError({ code: 'BAD_REQUEST', message: 'İlişkili kayıt bulunamadı.', cause: err });
  }
  return null;
}

export function notFound(what = 'Kayıt'): never {
  throw new TRPCError({ code: 'NOT_FOUND', message: `${what} bulunamadı.` });
}
export function forbidden(message = 'Bu işlem için yetkin yok.'): never {
  throw new TRPCError({ code: 'FORBIDDEN', message });
}
export function badRequest(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message });
}
export function conflict(message: string): never {
  throw new TRPCError({ code: 'CONFLICT', message });
}
