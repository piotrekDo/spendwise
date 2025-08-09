import { getDb } from '../database/db';

/** Aktualizacja kategorii */
export const updateCategory = async (name: string, iconId: number, color: string, categoryId: number) => {
  const db = getDb();
  await db.runAsync(
    `UPDATE categories SET name = ?, iconId = ?, color = ? WHERE id = ?`,
    [name, iconId, color, categoryId]
  );
  return true;
};

/** Dodawanie nowej kategorii */
export const addNewCategory = async (name: string, iconId: number, color: string) => {
  const db = getDb();
  try {
    await db.execAsync('BEGIN');

    const result = await db.runAsync(
      `INSERT INTO categories (name, iconId, color) VALUES (?, ?, ?)`,
      [name, iconId, color]
    );
    const catId = result.lastInsertRowId;

    await db.runAsync(
      `INSERT INTO subcategories (name, iconId, color, categoryId) VALUES (?, ?, ?, ?)`,
      ['Nowe wydatki', 12, '#ccc', catId]
    );

    await db.execAsync('COMMIT');
    return true;
  } catch (err) {
    await db.execAsync('ROLLBACK');
    console.error('❌ addNewCategory failed:', err);
    return false;
  }
};

/** Aktualizacja podkategorii */
export const updateSubcategory = async (
  name: string,
  iconId: number,
  color: string,
  categoryId: number,
  edditedSubId: number
) => {
  const db = getDb();
  await db.runAsync(
    `UPDATE subcategories SET name = ?, iconId = ?, color = ?, categoryId = ? WHERE id = ?`,
    [name, iconId, color, categoryId, edditedSubId]
  );
  return true;
};

/** Dodawanie nowej podkategorii */
export const addNewSubcategory = async (name: string, iconId: number, color: string, categoryId: number) => {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO subcategories (name, iconId, color, categoryId) VALUES (?, ?, ?, ?)`,
    [name, iconId, color, categoryId]
  );
  return true;
};

/** Wewnętrzna wersja usuwania podkategorii — bez transakcji */
const deleteSubcategoryByIdInternal = async (subCategoryId: number) => {
  const db = getDb();

  const row = await db.getFirstAsync(
    `SELECT s.name AS subName, c.name AS catName, c.positive
     FROM subcategories s
     JOIN categories c ON c.id = s.categoryId
     WHERE s.id = ?`,
    [subCategoryId]
  );
  const sub = row as { subName: string; catName: string; positive: number } | undefined;
  if (!sub) throw new Error(`Subcategory ${subCategoryId} not found`);

  const targetId = sub.positive ? 1 : 2;
  const prefix = `[${sub.catName}/${sub.subName}: ] `;

  await db.runAsync(
    `UPDATE entries
     SET subcategoryId = ?,
         description = ? || IFNULL(description, ''),
         isArchived = 1
     WHERE subcategoryId = ?`,
    [targetId, prefix, subCategoryId]
  );

  await db.runAsync(`DELETE FROM subcategories WHERE id = ?`, [subCategoryId]);
};


/** Usuwanie podkategorii z transakcją */
export const deleteSubcategoryById = async (subCategoryId: number) => {
  const db = getDb();

  const row = await db.getFirstAsync(
    `SELECT isDefault FROM subcategories WHERE id = ?`,
    [subCategoryId]
  );
  const guard = row as { isDefault: number } | undefined;

  if (guard?.isDefault) {
    console.warn(`⛔ Próba usunięcia domyślnej podkategorii ID=${subCategoryId}`);
    return false;
  }

  try {
    await db.execAsync('BEGIN');
    await deleteSubcategoryByIdInternal(subCategoryId);
    await db.execAsync('COMMIT');
    return true;
  } catch (err) {
    await db.execAsync('ROLLBACK');
    console.error('❌ deleteSubcategoryById failed:', err);
    return false;
  }
};


/** Usuwanie kategorii wraz z podkategoriami */
export const deleteCategoryById = async (categoryId: number) => {
  const db = getDb();

  // getFirstAsync: bez generyka, potem cast
  const guardRow = await db.getFirstAsync(
    `SELECT isDefault FROM categories WHERE id = ?`,
    [categoryId]
  );
  const guard = guardRow as { isDefault: number } | undefined;

  if (guard?.isDefault) {
    console.warn(`⛔ Próba usunięcia domyślnej kategorii ID=${categoryId}`);
    return false;
  }

  try {
    await db.execAsync('BEGIN');

    // getAllAsync: bez generyka, potem cast na tablicę
    const subsRows = await db.getAllAsync(
      `SELECT id FROM subcategories WHERE categoryId = ?`,
      [categoryId]
    );
    const subs = subsRows as Array<{ id: number }>;

    for (const { id } of subs) {
      await deleteSubcategoryByIdInternal(id); // wersja bez transakcji
    }

    await db.runAsync(`DELETE FROM categories WHERE id = ?`, [categoryId]);

    await db.execAsync('COMMIT');
    return true;
  } catch (err) {
    await db.execAsync('ROLLBACK');
    console.error('❌ deleteCategoryById failed:', err);
    return false;
  }
};


/** Pobieranie kategorii + subkategorii + limitów */
export const getCategorySkeletonForSelectedmonth = async (year?: number, month?: number) => {
  const db = getDb();

  const categories = await db.getAllAsync(
    `SELECT c.id, c.name, i.name as icon, i.id as iconId, c.color, c.positive, c.isDefault
     FROM categories c
     LEFT JOIN app_icons i ON c.iconId = i.id
     ORDER BY c.positive DESC, c.isDefault ASC`
  );

  const subcategories = await db.getAllAsync(
    `SELECT s.id, s.name, s.categoryId, i.name as icon, i.id as iconId, s.color, s.isDefault
     FROM subcategories s
     JOIN app_icons i ON s.iconId = i.id
     ORDER BY s.isDefault ASC`
  );

  // --- LIMITY ---
  let limits: { categoryId: number; limit: number }[] = [];

  if (typeof year === 'number' && typeof month === 'number') {
    limits = (await db.getAllAsync(
      `
      WITH best_limits AS (
        SELECT 
          cl.categoryId,
          cl."limit",
          ROW_NUMBER() OVER (
            PARTITION BY cl.categoryId
            ORDER BY 
              CASE
                WHEN cl.year = ? AND cl.month = ? THEN 1
                WHEN cl.year = ? AND cl.month IS NULL THEN 2
                WHEN cl.year IS NULL AND cl.month IS NULL THEN 3
                ELSE 4
              END
          ) AS rn
        FROM category_limits cl
        WHERE
          (cl.year = ? AND cl.month = ?)
          OR (cl.year = ? AND cl.month IS NULL)
          OR (cl.year IS NULL AND cl.month IS NULL)
      )
      SELECT categoryId, "limit"
      FROM best_limits
      WHERE rn = 1;
      `,
      [year, month, year, year, month, year]
    )) as any[];
  }

  const categoryLimitMap = new Map<number, number>();
  for (const row of limits) categoryLimitMap.set(row.categoryId, row.limit);

  return categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    iconId: cat.iconId,
    icon: cat.icon,
    color: cat.color,
    limit: categoryLimitMap.get(cat.id) ?? null, // będzie 200 z Twojego screena
    sum: 0,
    positive: !!cat.positive,
    isDefault: !!cat.isDefault,
    subcategories: subcategories
      .filter((sub: any) => sub.categoryId === cat.id)
      .map((sub: any) => ({
        id: sub.id,
        categoryId: sub.categoryId,
        name: sub.name,
        iconId: sub.iconId,
        icon: sub.icon,
        color: sub.color,
        isDefault: !!sub.isDefault,
        sum: 0,
      })),
  }));
};
