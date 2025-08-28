export const OTHER_INCOME_SUBCAT_ID = 1;
export const ENVELOPE_FUND_SUBCAT_ID = 2;
export const OTHER_EXPENSES_SUBCAT_ID = 3;

export const RADIUS = 12;

export const presetColors = [
  '#FF5722',
  '#4CAF50',
  '#2196F3',
  '#FFC107',
  '#9C27B0',
  '#00BCD4',
  '#795548',
  '#607D8B',

  '#FF1493', // deep pink (fuksja)
  '#7FFF00', // chartreuse – neon żółto-zielony
  '#00FA9A', // spring green – miętowy

  // ZAMIENNIKI za bardzo ciemne:
  '#7EA0FF', // bright indigo (zamiast midnight blue)
  '#FF9F1C', // tangerine (zamiast maroon)
  '#2EC4B6', // tiffany teal (zamiast dark slate gray)

  // Dodatkowe, mocno zróżnicowane:
  '#9B5DE5', // vivid violet
  '#E71D36', // carmine red
  '#00F5D4', // neon aqua
  '#BDE0FE', // powder blue (jasny, czytelny na dark)
  '#F4A261', // sandy orange
];

export const monthLabels = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
export const MONTHS_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
] as const;

export const monthIcons: Record<number, string> = {
  0: 'snowflake',
  1: 'snowman',
  2: 'sprout',
  3: 'weather-pouring',
  4: 'flower-tulip',
  5: 'white-balance-sunny',
  6: 'umbrella-beach',
  7: 'weather-sunny',
  8: 'leaf',
  9: 'pumpkin',
  10: 'weather-windy',
  11: 'pine-tree',
};

export const monthColors: Record<number, string> = {
  0: 'rgba(120,180,255,0.18)',
  1: 'rgba(120,180,255,0.18)',
  2: 'rgba(130,220,150,0.18)',
  3: 'rgba(120,200,255,0.18)',
  4: 'rgba(140,230,170,0.18)',
  5: 'rgba(255,220,120,0.18)',
  6: 'rgba(255,210,120,0.18)',
  7: 'rgba(255,200,120,0.18)',
  8: 'rgba(255,170,120,0.18)',
  9: 'rgba(255,150,120,0.18)',
  10: 'rgba(200,200,200,0.18)',
  11: 'rgba(160,200,255,0.18)',
};

export const monthColorsText: Record<number, string> = {
  0: 'rgba(120,180,255, .7)',
  1: 'rgba(120,180,255, .7)',
  2: 'rgba(130,220,150, .7)',
  3: 'rgba(120,200,255, .7)',
  4: 'rgba(140,230,170, .7)',
  5: 'rgba(255,220,120, .7)',
  6: 'rgba(255,210,120, .7)',
  7: 'rgba(255,200,120, .7)',
  8: 'rgba(255,170,120, .7)',
  9: 'rgba(255,150,120, .7)',
  10: 'rgba(200,200,200, .7)',
  11: 'rgba(160,200,255, .7)',
};

export function debugLog(obj: any, label: any) {
  try {
    const str = JSON.stringify(obj, null, 2);
    if (label) {
      console.log(`${label}:`, str);
    } else {
      console.log(str);
    }
  } catch (e) {
    console.log('debugLog error:', e);
    console.log(obj);
  }
}

export const getMonthDateRange = (y: number, m0: number) => {
  const m = m0 + 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${last}`;
  return { start, end };
};
