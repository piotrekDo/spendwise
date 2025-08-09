import { getDb } from '../database/db';

/** Aktualizacja kategorii */
export const updateCategory = async (name: string, iconId: number, color: string, categoryId: number) => {
  const db = getDb();

  const query = `
    UPDATE categories
    SET name = ?, iconId = ?, color = ?
    WHERE id = ?
  `;

  await db.runAsync(query, [name, iconId, color, categoryId]);
  return true;
};

export const addNewCategory = async (name: string, iconId: number, color: string) => {
  const db = getDb();

  try {
    await db.execAsync('BEGIN');

    const result = await db.runAsync(`INSERT INTO categories (name, iconId, color) VALUES (?, ?, ?)`, [
      name,
      iconId,
      color,
    ]);
    const catId = result.lastInsertRowId;

    await db.runAsync(`INSERT INTO subcategories (name, iconId, color, categoryId) VALUES (?, ?, ?, ?)`, [
      'Nowe wydatki',
      12,
      '#ccc',
      catId,
    ]);

    await db.execAsync('COMMIT');
    return true;
  } catch (err) {
    await db.execAsync('ROLLBACK');
    console.error('Transaction failed:', err);
    return false;
  }
};

export const updateSubcategory = async (
  name: string,
  iconId: number,
  color: string,
  categoryId: number,
  edditedSubId: number
) => {
  const db = getDb();

  const query = `
    UPDATE subcategories
    SET name = ?, iconId = ?, color = ?, categoryId = ?
    WHERE id = ?
  `;

  await db.runAsync(query, [name, iconId, color, categoryId, edditedSubId]);
  return true;
};

export const addNewSubcategory = async (name: string, iconId: number, color: string, categoryId: number) => {
  const db = getDb();

  await db.runAsync(`INSERT INTO subcategories (name, iconId, color, categoryId) VALUES (?, ?, ?, ?)`, [
    name,
    iconId,
    color,
    categoryId,
  ]);

  return true;
};

/**
 * Wewnętrzna wersja usuwania podkategorii — BEZ transakcji.
 * Używana przez deleteCategoryById (który sam zarządza transakcją).
 * Przenosi entries do ID=1 (gdy positive=1) lub ID=2 (gdy positive=0),
 * dodaje prefiks "[Kategoria/Podkategoria: ] " i ustawia isArchived=1.
 */
const deleteSubcategoryByIdInternal = async (subCategoryId: number) => {
  const db = getDb();

  const sub = await db.getFirstAsync(
    `SELECT s.name AS subName, c.name AS catName, c.positive
     FROM subcategories s
     JOIN categories c ON c.id = s.categoryId
     WHERE s.id = ?`,
    [subCategoryId]
  );

  if (!sub) throw new Error(`Subcategory ${subCategoryId} not found`);

  const targetSubId = sub.positive ? 1 : 2; // 1 = "Pozostałe dochody", 2 = "Inne zakupy"
  const prefix = `[${sub.catName}/${sub.subName}] `;

  await db.runAsync(
    `UPDATE entries
       SET subcategoryId = ?,
           description = ? || IFNULL(description, ''),
           isArchived = 1
     WHERE subcategoryId = ?`,
    [targetSubId, prefix, subCategoryId]
  );

  await db.runAsync(`DELETE FROM subcategories WHERE id = ?`, [subCategoryId]);
};

/** Usuwanie pojedynczej podkategorii — Z transakcją (publiczne API) */
export const deleteSubcategoryById = async (subCategoryId: number) => {
  const db = getDb();

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

/**
 * Usuwanie całej kategorii:
 * - przenosi wpisy każdej jej podkategorii (jak wyżej, zależnie od positive),
 * - usuwa subkategorie,
 * - usuwa kategorię.
 * Całość w jednej transakcji.
 */
export const deleteCategoryById = async (categoryId: number) => {
  const db = getDb();

  try {
    await db.execAsync('BEGIN');

    // (opcjonalnie) nie pozwalaj kasować defaultów
    const guard = (await db.getFirstAsync(`SELECT isDefault FROM categories WHERE id = ?`, [categoryId])) as
      | { isDefault: number }
      | undefined;
    if (guard && guard.isDefault === 1) {
      throw new Error('Cannot delete default category');
    }

    // getAllAsync nie jest generyczne – rzutujemy wynik
    const subs = (await db.getAllAsync(`SELECT id FROM subcategories WHERE categoryId = ?`, [categoryId])) as Array<{
      id: number;
    }>;

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

export const getCategorySkeletonForSelectedmonthWrapped = async (year?: number, month?: number) => {
  try {
    return await getCategorySkeletonForSelectedmonth(year, month);
  } catch (error) {
    console.log('💥 Błąd przy pobieraniu limitów:', error);
  }
};

/** Pobieranie szkieletu kategorii + subkategorii + limitów dla danego roku i miesiąca */
export const getCategorySkeletonForSelectedmonth = async (year?: number, month?: number) => {
  const db = getDb();

  // Kategorie
  const categories = await db.getAllAsync(
    `SELECT c.id, c.name, i.name as icon, i.id as iconId, c.color, c.positive, c.isDefault
     FROM categories c
     LEFT JOIN app_icons i ON c.iconId = i.id
     ORDER BY c.positive DESC, c.isDefault ASC`
  );

  // Subkategorie
  const subcategories = await db.getAllAsync(
    `SELECT s.id, s.name, s.categoryId, i.name as icon, i.id as iconId, s.color, s.isDefault
     FROM subcategories s
     JOIN app_icons i ON s.iconId = i.id
     ORDER BY s.isDefault ASC`
  );

  // Limity (jeden najlepszy per categoryId)
  const limits =
    typeof year === 'number' && typeof month === 'number'
      ? await db.getAllAsync(
          `
    WITH ordered_limits AS (
      SELECT 
        cl.categoryId,
        cl."limit",
        ROW_NUMBER() OVER (
          PARTITION BY cl.categoryId
          ORDER BY 
            CASE
              WHEN cl.year = ? AND cl.month = ? THEN 1
              WHEN cl.year = ? AND cl.month IS NULL THEN 2
              ELSE 3
            END
        ) as rn
      FROM category_limits cl
      WHERE
        (cl.year = ? AND cl.month = ?)
        OR (cl.year = ? AND cl.month IS NULL)
        OR (cl.year IS NULL AND cl.month IS NULL)
    )
    SELECT categoryId, "limit"
    FROM ordered_limits
    WHERE rn = 1;
    `,
          [year, month, year, year, month, year]
        )
      : [];

  const categoryLimitMap = new Map<number, number>();
  for (const { categoryId, limit } of limits) {
    categoryLimitMap.set(categoryId, limit);
  }

  // Grupowanie w strukturę DisplayCategory[]
  return categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    iconId: cat.iconId,
    icon: cat.icon,
    color: cat.color,
    limit: categoryLimitMap.get(cat.id) ?? null,
    sum: 0,
    positive: Boolean(cat.positive),
    isDefault: Boolean(cat.isDefault),
    subcategories: subcategories
      .filter((sub: any) => sub.categoryId === cat.id)
      .map((sub: any) => ({
        id: sub.id,
        categoryId: sub.categoryId,
        name: sub.name,
        iconId: sub.iconId,
        icon: sub.icon,
        color: sub.color,
        isDefault: Boolean(sub.isDefault),
        sum: 0,
      })),
  }));
};
