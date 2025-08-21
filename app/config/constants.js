export const OTHER_INCOME_SUBCAT_ID = 1;
export const ENVELOPE_FUND_SUBCAT_ID = 2;
export const OTHER_EXPENSES_SUBCAT_ID = 3;

export const RADIUS = 12;

export const presetColors = [
  '#FF5722', '#4CAF50', '#2196F3', '#FFC107',
  '#9C27B0', '#00BCD4', '#795548', '#607D8B',

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


export function debugLog(obj, label) {
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