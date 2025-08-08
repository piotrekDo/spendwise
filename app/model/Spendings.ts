import { MaterialCommunityIcons } from '@expo/vector-icons';

export type DisplayCategory = {
  id: number;
  name: string;
  iconId: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  limit: number | null;
  sum: number;
  positive: boolean;
  isDefault: boolean;
  subcategories: DisplaySubcategory[];
};

export type DisplaySubcategory = {
  id: number;
  name: string;
  iconId: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  isDefault: boolean;
  sum: number;
};
