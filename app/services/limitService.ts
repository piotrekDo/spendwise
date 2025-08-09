import { getDb } from '../database/db';


// scope = 'global' | 'year' | 'month'
export const upsertCategoryLimit = async ({
  categoryId, limit, scope, year, month,
}: { categoryId: number; limit: number; scope: 'global'|'year'|'month'; year?: number; month?: number; }) => {
  const db = getDb();

  if (scope === 'global') {
    await db.runAsync(
      `INSERT INTO category_limits (categoryId, year, month, "limit")
       VALUES (?, NULL, NULL, ?)
       ON CONFLICT(categoryId) WHERE year IS NULL AND month IS NULL
       DO UPDATE SET "limit" = excluded."limit"`,
      [categoryId, limit]
    );
    return true;
  }

  if (scope === 'year') {
    const y = year ?? new Date().getFullYear();
    await db.runAsync(
      `INSERT INTO category_limits (categoryId, year, month, "limit")
       VALUES (?, ?, NULL, ?)
       ON CONFLICT(categoryId, year) WHERE month IS NULL
       DO UPDATE SET "limit" = excluded."limit"`,
      [categoryId, y, limit]
    );
    return true;
  }

  // month
  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth() + 1;
  await db.runAsync(
    `INSERT INTO category_limits (categoryId, year, month, "limit")
     VALUES (?, ?, ?, ?)
     ON CONFLICT(categoryId, year, month)
     DO UPDATE SET "limit" = excluded."limit"`,
    [categoryId, y, m, limit]
  );
  return true;
};




/** Upsert limitu: global/rok/miesiąc */
// export const upsertCategoryLimit = async (opts: {
//   categoryId: number;
//   limit: number;
//   scope: 'global' | 'year' | 'month';
//   year?: number;
//   month?: number; // 1..12
// }) => {
//   const db = getDb();

//   let year: number | null = null;
//   let month: number | null = null;

//   if (opts.scope === 'year') {
//     year = opts.year ?? new Date().getFullYear();
//   } else if (opts.scope === 'month') {
//     year = opts.year ?? new Date().getFullYear();
//     month = opts.month ?? new Date().getMonth() + 1;
//   }

//   // SQLite nie ma natywnego UPSERT z unikalnością bez UNIQUE.
//   // Zrobimy manualny upsert: sprawdź czy istnieje → UPDATE, inaczej INSERT.
//   const existing = await db.getFirstAsync(
//     `SELECT id FROM category_limits WHERE categoryId = ? AND 
//      ${year === null ? 'year IS NULL' : 'year = ?'} AND 
//      ${month === null ? 'month IS NULL' : 'month = ?'}`,
//     year === null
//       ? [opts.categoryId, ...(month === null ? [] : [month])]
//       : month === null
//       ? [opts.categoryId, year]
//       : [opts.categoryId, year, month]
//   );

//   if (existing?.id) {
//     await db.runAsync(
//       `UPDATE category_limits SET "limit" = ? WHERE id = ?`,
//       [opts.limit, existing.id]
//     );
//   } else {
//     await db.runAsync(
//       `INSERT INTO category_limits (categoryId, year, month, "limit") VALUES (?, ?, ?, ?)`,
//       [opts.categoryId, year, month, opts.limit]
//     );
//   }
//   return true;
// };

/** Usunięcie konkretnego limitu (global/rok/miesiąc) */
export const deleteCategoryLimit = async (opts: {
  categoryId: number;
  scope: 'global' | 'year' | 'month';
  year?: number;
  month?: number;
}) => {
  const db = getDb();

  let year: number | null = null;
  let month: number | null = null;
  if (opts.scope === 'year') year = opts.year ?? new Date().getFullYear();
  if (opts.scope === 'month') {
    year = opts.year ?? new Date().getFullYear();
    month = opts.month ?? new Date().getMonth() + 1;
  }

  await db.runAsync(
    `DELETE FROM category_limits 
     WHERE categoryId = ? 
       AND ${year === null ? 'year IS NULL' : 'year = ?'}
       AND ${month === null ? 'month IS NULL' : 'month = ?'}`,
    year === null
      ? [opts.categoryId, ...(month === null ? [] : [month])]
      : month === null
      ? [opts.categoryId, year]
      : [opts.categoryId, year, month]
  );
  return true;
};

/** Podgląd istniejących limitów dla kategorii (opcjonalnie do UI) */
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
