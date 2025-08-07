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
      s.id AS subcategoryId, s.name AS subcategoryName, s.icon AS subcategoryIcon,
      c.id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon
    FROM entries e
    JOIN subcategories s ON e.subcategoryId = s.id
    JOIN categories c ON s.categoryId = c.id
    WHERE date BETWEEN ? AND ?
  `;

  const results = await db.getAllAsync(query, [startDate, endDate]);
  return results as SpendingEntry[];
};

export const getSelectedSubCategorySpendings = async (subcategoryId: number, startDate: string, endDate: string) => {
  const db = getDb();
  const query = `
    SELECT 
      e.id, e.amount, e.description, e.date, 
    FROM entries e
    WHERE e.subcategoryId = ? AND (date BETWEEN ? AND ?)
  `;

  const results = await db.getAllAsync(query, [subcategoryId, startDate, endDate]);
  return results as SpendingEntry[];
};

export const getSelectedCategorySpendings = async (categoryId: number, startDate: string, endDate: string) => {
  const db = getDb();
  const query = `
    SELECT 
      e.id, e.amount, e.description, e.date, 
      s.id AS subcategoryId, s.name AS subcategoryName, s.icon AS subcategoryIcon,
      c.id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon
    FROM entries e
    JOIN subcategories s ON e.subcategoryId = s.id
    JOIN categories c ON s.categoryId = c.id
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
