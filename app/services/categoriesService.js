import { getDb } from '../database/db';

export const getCategorySkeleton = async () => {
  const db = getDb();

  const categories = await db.getAllAsync(`
    SELECT c.id, c.name, i.name as icon, c.color
    FROM categories c
    JOIN app_icons i ON c.iconId = i.id
  `);

  const subcategories = await db.getAllAsync(`
    SELECT s.id, s.name, s.categoryId, i.name as icon
    FROM subcategories s
    JOIN app_icons i ON s.iconId = i.id
  `);

  const grouped = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    sum: 0,
    subcategories: subcategories
      .filter(sub => sub.categoryId === cat.id)
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        icon: sub.icon,
        sum: 0,
      })),
  }));

  return grouped;
};
