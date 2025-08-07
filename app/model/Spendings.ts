import { MaterialCommunityIcons } from '@expo/vector-icons';

export type DisplayCategory = {
  id: number;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  limit: number | null;
  sum: number;
  subcategories: DisplaySubcategory[];
};

export type DisplaySubcategory = {
  id: number;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  sum: number;
};
