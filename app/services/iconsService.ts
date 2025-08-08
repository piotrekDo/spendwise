import { getDb } from '../database/db';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface AppIcon {
    id: number;
    name: keyof typeof MaterialCommunityIcons.glyphMap;
}

export const getIconNames = async () => {
  const db = getDb();

  const query = 'select id, name from app_icons';
  const result = await db.getAllAsync(query);
  return result as AppIcon[];
};
