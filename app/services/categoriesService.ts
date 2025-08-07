import { getDb } from '../database/db';
import { DisplayCategory } from '../model/Spendings';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const getCategorySkeleton = async (): Promise<DisplayCategory[]> => {
  const db = getDb();

  const categories = await db.getAllAsync<{
    id: number;
    name: string;
    icon: string;
  }>(`SELECT id, name, icon FROM categories`);

  const subcategories = await db.getAllAsync<{
    id: number;
    name: string;
    icon: string;
    categoryId: number;
  }>(`SELECT id, name, icon, categoryId FROM subcategories`);

  const grouped: DisplayCategory[] = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon as keyof typeof MaterialCommunityIcons.glyphMap,
    sum: 0,
    subcategories: subcategories
      .filter((sub) => sub.categoryId === cat.id)
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        icon: sub.icon as keyof typeof MaterialCommunityIcons.glyphMap,
        sum: 0,
      })),
  }));

  return grouped;
};
