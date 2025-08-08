import { getDb } from '../database/db';


export const updateCategory = async (name, iconId, color, categoryId) => {
  const db = getDb();

  const query = `
    UPDATE categories
    SET name = ?, iconId = ?, color = ?
    WHERE id = ?
  `;

  await db.runAsync(query, [name, iconId, color, categoryId]);
  return true;
};

export const getCategorySkeleton = async () => {
  const db = getDb();

const categories = await db.getAllAsync(
  `SELECT c.id, c.name, i.name as icon, i.id as iconId, c.color, c."limit", c.positive, c.isDefault
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

  const grouped = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    iconId: cat.iconId,
    icon: cat.icon,
    color: cat.color,
    sum: 0,
    positive: Boolean(cat.positive),
    isDefault: Boolean(cat.isDefault),
    subcategories: subcategories
      .filter(sub => sub.categoryId === cat.id)
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        iconId: sub.iconId,
        icon: sub.icon,
        color: sub.color,
        isDefault: Boolean(sub.isDefault),
        sum: 0,
      })),
  }));

  return grouped;
};
