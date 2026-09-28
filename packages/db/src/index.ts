export * from './client';
export * as schema from './schema';
export * from './schema';
export { sql, eq, and, or, not, inArray, notInArray, isNull, isNotNull, desc, asc, gt, gte, lt, lte, ne, ilike, count, exists } from 'drizzle-orm';
export type { Column, SQL } from 'drizzle-orm';
import { sql as _sql, type Column as _Column } from 'drizzle-orm';
/** integer[] sütunu verilen değeri içeriyor mu */
export function arrayContainsSql(column: _Column, value: number) {
  return _sql`${value}::int = any(${column})`;
}
