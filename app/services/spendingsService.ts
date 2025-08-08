import { getDb } from '../database/db';

export type SpendingEntry = {
  id: number;
  amount: number;
  description: string;
  date: string;
  subcategoryId: number;
  subcategoryName: string;
  subcategoryIcon: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
};

export const getSpendingsInRange = async (startDate: string, endDate: string): Promise<SpendingEntry[]> => {
  const db = getDb();

  const query = `
    SELECT 
      e.id, e.amount, e.description, e.date, 
      s.id AS subcategoryId, s.name AS subcategoryName, ai1.name AS subcategoryIcon,
      c.id AS categoryId, c.name AS categoryName, ai2.name AS categoryIcon
    FROM entries e
    JOIN subcategories s ON e.subcategoryId = s.id
    JOIN app_icons ai1 ON s.iconId = ai1.id
    JOIN categories c ON s.categoryId = c.id
    JOIN app_icons ai2 ON c.iconId = ai2.id
    WHERE e.date BETWEEN ? AND ?
  `;

  const results = await db.getAllAsync(query, [startDate, endDate]);
  return results as SpendingEntry[];
};


export const getSelectedCategorySpendings = async (categoryId: number, startDate: string, endDate: string) => {
  const db = getDb();
  const query = `
    SELECT 
      e.id, e.amount, e.description, e.date, 
      s.id AS subcategoryId, s.name AS subcategoryName, ai1.name AS subcategoryIcon,
      c.id AS categoryId, c.name AS categoryName, ai2.name AS categoryIcon
    FROM entries e
    JOIN subcategories s ON e.subcategoryId = s.id
    JOIN app_icons ai1 ON s.iconId = ai1.id
    JOIN categories c ON s.categoryId = c.id
    JOIN app_icons ai2 ON c.iconId = ai2.id
    WHERE s.categoryId = ? AND e.date BETWEEN ? AND ?
  `;

  const results = await db.getAllAsync(query, [categoryId, startDate, endDate]);
  return results as SpendingEntry[];
};

export const deleteEntry = async (id: number): Promise<void> => {
  const db = getDb();
  const query = `DELETE FROM entries WHERE id = ?`;

  await db.runAsync(query, [id]);
};
