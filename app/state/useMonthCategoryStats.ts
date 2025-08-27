import { create } from 'zustand';
import { monthLabels } from '../config/constants';
import { getCategoryYearSeries } from '../services/statService';
import { CatLite } from '../components/home/CategoryYear';

interface MonthCategoryStatus {
  year: number;
  selectedCategory: CatLite | null;
  series: (number | null)[];
  isDataloading: boolean;
  total: number;
  avg: number;
  maxIdx: number;
  minNonZeroIdx: number;
  barData: BarData[] | undefined;
  setYear: (year: number) => Promise<void>;
  setSelectedCategory: (cat: CatLite) => Promise<void>;
}

export interface BarData {
  value: number;
  label: string;
  month: number;
}

let fetchToken = 0;

const loadSeries = async (year: number, selectedCategory: number, set: (fn: any) => void) => {
  const token = ++fetchToken;
  try {
    const series = await getCategoryYearSeries(year, selectedCategory);
    if (token !== fetchToken) return; // stara odpowiedź → ignoruj

    set((state: MonthCategoryStatus) => {
      const total = settleTotal(series);
      return {
        ...state,
        series,
        isDataloading: false,
        total,
        avg: settleAvg(series, total),
        maxIdx: settleMaxIdx(series),
        minNonZeroIdx: settleMinNonZeroIdx(series),
        barData: settleBarData(series),
      };
    });
  } catch (e) {
    if (token !== fetchToken) return;
    set({ isDataloading: false });
    console.error(e);
  }
};

const useMonthCategoryStats = create<MonthCategoryStatus>((set, get) => ({
  year: new Date().getFullYear(),
  selectedCategory: null,
  series: [],
  isDataloading: false,
  total: 0,
  avg: 0,
  maxIdx: -1,
  minNonZeroIdx: -1,
  barData: undefined,

  // zmiana roku → loading + wspólny loader
  setYear: async (year: number) => {
    set({ year, isDataloading: true });
    const { selectedCategory } = get();
    await loadSeries(year, selectedCategory?.id || -1, set);
  },

  setSelectedCategory: async (cat: CatLite) => {
    set({ selectedCategory: cat, isDataloading: true });
    const { year } = get();
    await loadSeries(year, cat.id, set);
  },
}));

// --- helpers ---

const settleTotal = (series: (number | null)[]): number =>
  series.filter((v): v is number => v != null).reduce((a, r) => a + r, 0);

const settleAvg = (series: (number | null)[], total: number) => {
  const nonNull = series.filter(s => s !== null);
  return nonNull.length ? total / nonNull.length : 0;
};

const settleMaxIdx = (series: (number | null)[]) => {
  let idx = -1;
  let max = -Infinity;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (n > max) {
      max = n;
      idx = i;
    }
  }
  return idx;
};

const settleMinNonZeroIdx = (series: (number | null)[]) => {
  if (!series.length) return -1;
  let idx = -1;
  let min = Infinity;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (v != null && v > 0 && v < min) {
      min = v;
      idx = i;
    }
  }
  return idx;
};

const settleBarData = (series: (number | null)[]): BarData[] =>
  series.map((r, i) => ({
    value: r || 0,
    label: monthLabels[i],
    month: i,
  }));

export default useMonthCategoryStats;
