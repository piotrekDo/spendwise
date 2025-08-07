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

export const getSpendingsForMonth = async (year: number, month: number): Promise<SpendingEntry[]> => {
  const db = getDb();
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`; // uproszczone

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
