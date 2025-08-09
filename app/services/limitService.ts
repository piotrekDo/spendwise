import { getDb } from '../database/db';

export const upsertCategoryLimit = async (opts: {
  categoryId: number;
  limit: number;
  scope: 'global' | 'year' | 'month';
  year?: number;
  month?: number; // 1..12
}) => {
  const db = getDb();

  let year: number | null = null;
  let month: number | null = null;

  if (opts.scope === 'year') {
    year = opts.year ?? new Date().getFullYear();
  } else if (opts.scope === 'month') {
    year = opts.year ?? new Date().getFullYear();
    month = opts.month ?? new Date().getMonth() + 1;
  }

  const where =
    (year === null ? 'year IS NULL' : 'year = ?') +
    ' AND ' +
    (month === null ? 'month IS NULL' : 'month = ?');

  const params: any[] = [opts.categoryId];
  if (year !== null) params.push(year);
  if (month !== null) params.push(month);

  const existing = await db.getFirstAsync(
    `SELECT id FROM category_limits WHERE categoryId = ? AND ${where}`,
    params
  );

  if (existing?.id) {
    await db.runAsync(`UPDATE category_limits SET "limit" = ? WHERE id = ?`, [opts.limit, existing.id]);
  } else {
    await db.runAsync(
      `INSERT INTO category_limits (categoryId, year, month, "limit") VALUES (?, ?, ?, ?)`,
      [opts.categoryId, year, month, opts.limit]
    );
  }
  return true;
};

export const deleteCategoryLimit = async (opts: {
  categoryId: number;
  scope: 'global' | 'year' | 'month';
  year?: number;
  month?: number;
}) => {
  const db = getDb();

  let year: number | null = null;
  let month: number | null = null;

  if (opts.scope === 'year') {
    year = opts.year ?? new Date().getFullYear();
  } else if (opts.scope === 'month') {
    year = opts.year ?? new Date().getFullYear();
    month = opts.month ?? new Date().getMonth() + 1;
  }

  const where =
    (year === null ? 'year IS NULL' : 'year = ?') +
    ' AND ' +
    (month === null ? 'month IS NULL' : 'month = ?');

  const params: any[] = [opts.categoryId];
  if (year !== null) params.push(year);
  if (month !== null) params.push(month);

  await db.runAsync(
    `DELETE FROM category_limits WHERE categoryId = ? AND ${where}`,
    params
  );

  return true;
};

export const getCategoryLimits = async (categoryId: number) => {
  const db = getDb();
  return (await db.getAllAsync(
    `SELECT id, categoryId, year, month, "limit"
     FROM category_limits
     WHERE categoryId = ?
     ORDER BY 
       CASE WHEN year IS NULL AND month IS NULL THEN 1
            WHEN year IS NOT NULL AND month IS NULL THEN 2
            ELSE 3 END,
       year, month`,
    [categoryId]
  )) as Array<{ id: number; categoryId: number; year: number | null; month: number | null; limit: number }>;
};
