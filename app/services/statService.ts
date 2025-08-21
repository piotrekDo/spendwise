import { ENVELOPE_FUND_SUBCAT_ID } from '../config/constants';
import { getDb } from '../database/db';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EMPTY_12 = () => Array(12).fill(0);

export type LimitItem = {
  id: number;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  limit: number;
  used: number;
  percent: number; // used/limit * 100 (może >100)
  left: number; // limit - used (może być ujemne)
};

export type YearMonthRow = {
  month: number; // 1..12
  income: number;
  expense: number;
  deposits: number; // wpłaty do kopert
  cashSavings: number; // max(0, income - expense)
  totalSavings: number; // cashSavings + deposits
};

export type CatMonthRow = {
  month: number;
  sum: number;
};

export type SubSeries = {
  subcategoryId: number;
  name: string;
  color: string;
  icon: string;
  monthly: number[]; // 12 wartości (1..12)
  total: number;
};

export type CategoryWithSubYearly = {
  id: number;
  name: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  sumsByMonth: number[];
  subcategories: SubCatYearly[];
}

export type SubCatYearly = {
  subcategoryId: number;
  name: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  sumsByMonth: number[];
}

export type YearBucket = {
  year: number;
  sumsByMonth: number[];           // 12 elementów
  subcategories?: SubCatYearly[];  // opcjonalnie dla danego roku
};

export type CategoryWithSubMulti = {
  id: number;
  name: string;
  color: string;
  icon: string;
  years: YearBucket[];   // posortowane malejąco (2025, 2024, …)
};

export type SubcategoryMulti = {
  subcategoryId: number;
  name: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  years: { year: number; sumsByMonth: number[] }[]; // 12 elem. w każdym
};


 export function groupBySubcategory(category: CategoryWithSubMulti): SubcategoryMulti[] {
    const yearOrder = category.years.map(y => y.year); // np. [2025, 2024, ...]
    const bySub = new Map<number, SubcategoryMulti>();

    // Zbierz wszystkie suby z definicji (z każdego roku), żeby mieć pełny zestaw
    for (const y of category.years) {
      const subs = y.subcategories ?? [];
      for (const s of subs) {
        if (!bySub.has(s.subcategoryId)) {
          bySub.set(s.subcategoryId, {
            subcategoryId: s.subcategoryId,
            name: s.name,
            color: s.color,
            icon: s.icon,
            years: [], // uzupełnimy niżej w pętli po yearOrder
          });
        } else {
          // ewentualna aktualizacja nazwy/koloru gdyby zmieniły się między latami
          const ref = bySub.get(s.subcategoryId)!;
          ref.name = s.name;
          ref.color = s.color;
          ref.icon = s.icon;
        }
      }
    }

    // Jeżeli w jakimś roku nie było subów (np. all zero), bySub może być puste.
    // W takim przypadku nic nie zrobimy — ale u Ciebie allYears już daje pełny zestaw subów.

    // Dla każdego suba uzupełnij lata w zadanej kolejności
    for (const sub of bySub.values()) {
      for (const year of yearOrder) {
        // spróbuj znaleźć sumsByMonth dla (sub, year)
        const yBucket = category.years.find(y => y.year === year);
        const match = yBucket?.subcategories?.find(s => s.subcategoryId === sub.subcategoryId);
        sub.years.push({
          year,
          sumsByMonth: match ? match.sumsByMonth.slice() : EMPTY_12(),
        });
      }
    }

    // posortuj suby po nazwie (opcjonalnie)
    return Array.from(bySub.values())
    // .sort((a, b) => a.name.localeCompare(b.name));
  }

export const getCategoryStatsLastNYears = async (
  catId: number,
  untilYear: number,
  n = 5,
  withSubBreakdown: 'none' | 'allYears' = 'none'
): Promise<CategoryWithSubMulti> => {
  const db = getDb();
  const startYear = untilYear - (n - 1);
  const start = toISO2(startYear, 1, 1);
  const end   = toISO2(untilYear, 12, 31);

  // --- meta kategorii
  const category = await db.getFirstAsync(
    `SELECT c.id, c.name, c.color, ai.name AS icon
       FROM categories c
       LEFT JOIN app_icons ai ON ai.id = c.iconId
      WHERE c.id = ?`,
    [catId]
  );
  if (!category) throw new Error(`Category ${catId} not found`);

  // --- sumy kategorii (bez depozytów do kopert i bez finansowanych)
  const rows = await db.getAllAsync(
    `
    SELECT 
      CAST(strftime('%Y', e.date) AS INTEGER) AS y,
      CAST(strftime('%m', e.date) AS INTEGER) AS m,
      SUM(e.amount) AS sum
    FROM entries e
    JOIN subcategories s ON s.id = e.subcategoryId
    WHERE s.categoryId = ?
      AND e.isArchived = 0
      AND e.financedEnvelopeId IS NULL
      AND e.date BETWEEN ? AND ?
    GROUP BY y, m
    `,
    [catId, start, end]
  ) as Array<{ y:number; m:number; sum:number }>;

  // --- wiadra po 12 miesięcy na każdy rok
  const byYear = new Map<number, number[]>();
  for (let y = startYear; y <= untilYear; y++) byYear.set(y, Array(12).fill(0));

  for (const r of rows) {
    if (r.y >= startYear && r.y <= untilYear && r.m >= 1 && r.m <= 12) {
      const arr = byYear.get(r.y)!;
      arr[r.m - 1] = Number(r.sum) || 0;
    }
  }

  const years: YearBucket[] = Array.from(byYear.entries())
    .sort((a,b) => b[0] - a[0]) // malejąco: 2025, 2024, …
    .map(([year, sumsByMonth]) => ({ year, sumsByMonth }));

  const model: CategoryWithSubMulti = {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon ?? 'dots-horizontal-circle-outline',
    years,
  };

  // --- opcjonalne rozbicie na subkategorie
  if (withSubBreakdown === 'allYears') {
    // 1) pełna lista subkategorii tej kategorii
    const allSubs = await db.getAllAsync(
      `
      SELECT s.id AS subcategoryId, s.name, s.color, ai.name AS icon
      FROM subcategories s
      LEFT JOIN app_icons ai ON ai.id = s.iconId
      WHERE s.categoryId = ?
      ORDER BY s.name
      `,
      [catId]
    ) as Array<{ subcategoryId:number; name:string; color:string; icon:string|null }>;

    // 2) sumy rzeczywiste z entries
    const subs = await db.getAllAsync(
      `
      SELECT 
        s.id AS subcategoryId, s.name, s.color, ai.name AS icon,
        CAST(strftime('%Y', e.date) AS INTEGER) AS y,
        CAST(strftime('%m', e.date) AS INTEGER) AS m,
        SUM(e.amount) AS sum
      FROM entries e
      JOIN subcategories s ON s.id = e.subcategoryId
      LEFT JOIN app_icons ai ON ai.id = s.iconId
      WHERE s.categoryId = ?
        AND e.isArchived = 0
        AND e.financedEnvelopeId IS NULL
        AND e.date BETWEEN ? AND ?
      GROUP BY s.id, y, m
      `,
      [catId, start, end]
    ) as Array<{
      subcategoryId:number; name:string; color:string; icon:string|null;
      y:number; m:number; sum:number
    }>;

    // 3) y -> (subId -> SubCatYearly) zainicjalizowane zerami
    const subsByYear = new Map<number, Map<number, SubCatYearly>>();
    for (let y = startYear; y <= untilYear; y++) {
      const mapForYear = new Map<number, SubCatYearly>();
      for (const s of allSubs) {
        mapForYear.set(s.subcategoryId, {
          subcategoryId: s.subcategoryId,
          name: s.name,
          color: s.color,
          icon: (s.icon ?? 'dots-horizontal-circle-outline') as any,
          sumsByMonth: Array(12).fill(0),
        });
      }
      subsByYear.set(y, mapForYear);
    }

    // 4) nadpisanie realnymi sumami
    for (const r of subs) {
      const { y, m, subcategoryId } = r;
      if (y < startYear || y > untilYear || m < 1 || m > 12) continue;
      const mapForYear = subsByYear.get(y)!;
      const ref = mapForYear.get(subcategoryId);
      if (ref) {
        ref.sumsByMonth[m - 1] = Number(r.sum) || 0;
      }
    }

    // 5) podczep subcategories do YearBucketów
    for (const yBucket of model.years) {
      const m = subsByYear.get(yBucket.year)!;
      yBucket.subcategories = Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return model;
};


export const getCategoryStatsByYear = async (catId: number, year: number): Promise<CategoryWithSubYearly> => {
  const db = getDb();

  const category = await db.getFirstAsync(categoryQuery, [catId]);
  if (!category) {
    throw new Error(`Category ${catId} not found`);
  }

  // --- KATEGORIA: sumy 1..12
  const catRows: { month: number; sum: number }[] =
    await db.getAllAsync(categorySumsQuery, [catId, String(year)]);

  const catSums = Array(12).fill(0);
  for (const r of catRows) {
    if (r?.month >= 1 && r.month <= 12) {
      catSums[r.month - 1] = Number(r.sum) || 0;
    }
  }

  // --- SUBKATEGORIE: grupujemy i wypełniamy 12 mies.
  const subRows: {
    subcategoryId: number;
    name: string;
    color: string;
    icon: string | null;
    month: number | null;
    sum: number | null;
  }[] = await db.getAllAsync(subcatsQuery, [String(year), catId]);

  // Mapowanie subId -> struktura z tablicą 12
  const subsMap = new Map<number, SubCatYearly>();

  for (const r of subRows) {
    const id = r.subcategoryId;
    if (!subsMap.has(id)) {
      subsMap.set(id, {
        subcategoryId: id,
        name: r.name,
        color: r.color,
        icon: (r.icon ?? 'help-circle-outline') as any, // fallback, dopasuj do swojej paczki ikon
        sumsByMonth: Array(12).fill(0),
      });
    }
    if (r.month && r.month >= 1 && r.month <= 12) {
      const ref = subsMap.get(id)!;
      ref.sumsByMonth[r.month - 1] = Number(r.sum) || 0;
    }
  }

  const model: CategoryWithSubYearly = {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: (category.icon ?? 'help-circle-outline') as any,
    sumsByMonth: catSums,
    subcategories: Array.from(subsMap.values()),
  };

  return model;
};

export const getCategoryWithSubsYear = async (
  year: number,
  categoryId: number,
  opts?: { includeFinanced?: boolean }
): Promise<{ catMonthly: number[]; subs: SubSeries[] }> => {
  const db = getDb();
  const includeFinanced = !!opts?.includeFinanced;
  const finFilter = includeFinanced ? '' : 'AND e.financedEnvelopeId IS NULL';
  const catRows = (await db.getAllAsync(
    `
    WITH months(m) AS (
      SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
      UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
    )
    SELECT months.m AS month, COALESCE(SUM(e.amount), 0) AS sum
    FROM months
    LEFT JOIN entries e
      ON substr(e.date, 1, 4) = ? AND CAST(substr(e.date, 6, 2) AS INTEGER) = months.m
    LEFT JOIN subcategories s ON s.id = e.subcategoryId
    LEFT JOIN categories c ON c.id = s.categoryId
    WHERE c.id = ?
      AND c.positive = 0
      ${finFilter}
    GROUP BY months.m
    ORDER BY months.m;
    `,
    [String(year), categoryId]
  )) as Array<{ month: number; sum: number }>;

  const catMonthly = Array(12).fill(0);
  for (const r of catRows) catMonthly[(r.month ?? 1) - 1] = Number(r.sum ?? 0);
  const subRows = (await db.getAllAsync(
    `
    SELECT 
      s.id   AS subcategoryId,
      s.name AS name,
      s.color AS color,
      ai.name AS icon,
      CAST(substr(e.date,6,2) AS INTEGER) AS month,
      SUM(e.amount) AS sum
    FROM entries e
    JOIN subcategories s ON s.id = e.subcategoryId
    JOIN categories c ON c.id = s.categoryId
    LEFT JOIN app_icons ai ON ai.id = s.iconId
    WHERE c.id = ?
      AND c.positive = 0
      AND substr(e.date,1,4) = ?
      ${finFilter}
    GROUP BY s.id, s.name, s.color, ai.name, month
    ORDER BY s.name, month;
    `,
    [categoryId, String(year)]
  )) as Array<{ subcategoryId: number; name: string; color: string; icon: string; month: number; sum: number }>;

  const map = new Map<number, SubSeries>();
  for (const row of subRows) {
    const id = row.subcategoryId;
    if (!map.has(id)) {
      map.set(id, {
        subcategoryId: id,
        name: row.name,
        color: row.color ?? '#9E9E9E',
        icon: row.icon ?? 'dots-horizontal-circle-outline',
        monthly: Array(12).fill(0),
        total: 0,
      });
    }
    const ss = map.get(id)!;
    const mIdx = Math.max(0, Math.min(11, (row.month ?? 1) - 1));
    const v = Number(row.sum ?? 0);
    ss.monthly[mIdx] = v;
    ss.total += v;
  }

  return { catMonthly, subs: Array.from(map.values()) };
};

export const getMonthLimits = async (year: number, month: number): Promise<LimitItem[]> => {
  const db = getDb();
  const { start, end } = monthRangeISO(year, month); // YYYY-MM-01 .. YYYY-MM-last

  const rows = await db.getAllAsync(MONTH_LIMITS_QUERY, [
    // wybór najlepszego limitu (kolejność zgodna z ORDER BY powyżej):
    year,
    month + 1, // exact Y+M
    month + 1, // monthly recurring (year NULL)
    year, // year-only
    year,
    month + 1, // exact Y+M
    month + 1, // monthly recurring (year NULL)
    year, // year-only
    // zakres miesiąca dla "used":
    start,
    end,
  ]);

  const mapped: LimitItem[] = (rows as any[]).map(r => {
    const used = Number(r.used ?? 0);
    const limit = Number(r.limit ?? 0);
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    return {
      id: r.id,
      name: r.name,
      icon: (r.icon ?? 'dots-horizontal-circle-outline') as keyof typeof MaterialCommunityIcons.glyphMap,
      color: r.color ?? '#9E9E9E',
      limit,
      used,
      percent: pct,
      left: limit - used,
    };
  });

  return mapped;
};

export const getYearSummary = async (year: number): Promise<YearMonthRow[]> => {
  const db = getDb();

  // 12-miesięczny szkielet + monthly_aggregates + suma depozytów z entries
  const rows = (await db.getAllAsync(GET_YEAR_SUMMARY_QUERY, [String(year), year])) as any[];

  return rows.map(mapToYearNow);
};

// Prosta lista kategorii WYDATKOWYCH (positive=0)
export const getExpenseCategoriesLite = async () => {
  const db = getDb();
  const rows = await db.getAllAsync(GET_EXPENSE_CATEGORIES_LITE_QUERY);
  return (rows as any[]).map(r => ({
    id: r.id as number,
    name: r.name as string,
    color: r.color as string,
    icon: (r.icon ?? 'dots-horizontal-circle-outline') as string,
  }));
};

/** Roczna seria (12 m-cy) dla WYBRANEJ kategorii (wydatkowej).
 *  Wyklucza: wpisy z depositEnvelopeId (depozyty), finansowane kopertą (financedEnvelopeId),
 *  oraz wpisy zarchiwizowane (isArchived=0 tylko).
 */
export const getCategoryYearSeries = async (year: number, categoryId: number): Promise<CatMonthRow[]> => {
  const db = getDb();
  // prosta „tabela” 1..12 bez generate_series
  const rows = await db.getAllAsync(GET_CATEGORY_YEAR_SERIES, [categoryId, String(year)]);
  return (rows as any[]).map(r => ({
    month: Number(r.month),
    sum: Number(r.sum ?? 0),
  }));
};

const mapToYearNow = (r: any): YearMonthRow => {
  const income = Number(r.income || 0);
  const expense = Number(r.expense || 0);
  const deposits = Number(r.deposits || 0);
  const cashSavings = Math.max(0, income - expense);
  const totalSavings = cashSavings + deposits;
  return {
    month: Number(r.month),
    income,
    expense,
    deposits,
    cashSavings,
    totalSavings,
  };
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toISO2 = (y:number,m:number,d:number) =>
  `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

const monthRangeISO = (year: number, month0: number) => {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  return { start: toISO(start), end: toISO(end) };
};

const GET_EXPENSE_CATEGORIES_LITE_QUERY = `SELECT c.id, c.name, c.color, ai.name AS icon
     FROM categories c
     LEFT JOIN app_icons ai ON ai.id = c.iconId
     WHERE c.positive = 0
     ORDER BY c.isDefault ASC, c.name ASC`;

const GET_CATEGORY_YEAR_SERIES = `
    WITH months(m) AS (
      SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
      UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
    ),
    sums AS (
      SELECT CAST(strftime('%m', e.date) AS INTEGER) AS m,
             SUM(e.amount) AS sum
      FROM entries e
      JOIN subcategories s ON s.id = e.subcategoryId
      JOIN categories c ON c.id = s.categoryId
      WHERE c.id = ?
        AND c.positive = 0
        AND e.isArchived = 0
        AND e.financedEnvelopeId IS NULL
        AND strftime('%Y', e.date) = ?
      GROUP BY m
    )
    SELECT months.m AS month, COALESCE(sums.sum, 0) AS sum
    FROM months
    LEFT JOIN sums ON sums.m = months.m
    ORDER BY months.m
    `;

const MONTH_LIMITS_QUERY = `
      WITH per_cat AS (
        SELECT
          c.id,
          c.name,
          ai.name AS icon,
          c.color,
          /* Najlepszy (priorytetowy) limit dla kategorii c.id */
          (
            SELECT cl."limit"
            FROM category_limits cl
            WHERE cl.categoryId = c.id
              AND (
                (cl.year = ? AND cl.month = ?) OR      -- dokładny rok+miesiąc
                (cl.year IS NULL AND cl.month = ?) OR  -- powtarzalny co rok w danym miesiącu
                (cl.year = ? AND cl.month IS NULL) OR  -- roczny
                (cl.year IS NULL AND cl.month IS NULL) -- globalny
              )
            ORDER BY
              CASE
                WHEN cl.year = ? AND cl.month = ? THEN 1
                WHEN cl.year IS NULL AND cl.month = ? THEN 2
                WHEN cl.year = ? AND cl.month IS NULL THEN 3
                WHEN cl.year IS NULL AND cl.month IS NULL THEN 4
                ELSE 99
              END,
              cl.id
            LIMIT 1
          ) AS "limit",
          /* Wydane w bieżącym miesiącu (bez kopert, tylko wydatki) */
          COALESCE((
            SELECT SUM(e.amount)
            FROM entries e
            JOIN subcategories s ON s.id = e.subcategoryId
            JOIN categories cc ON cc.id = s.categoryId
            WHERE s.categoryId = c.id
              AND cc.positive = 0
              AND e.isArchived = 0
              AND e.financedEnvelopeId IS NULL
              AND e.date BETWEEN ? AND ?
          ), 0) AS used
        FROM categories c
        LEFT JOIN app_icons ai ON ai.id = c.iconId
      )
      SELECT id, name, icon, color, "limit", used
      FROM per_cat
      WHERE "limit" IS NOT NULL
      ORDER BY (CASE WHEN "limit" = 0 THEN 1e9 ELSE used * 1.0 / "limit" END) DESC, name;
      `;

const GET_YEAR_SUMMARY_QUERY = `WITH months(n) AS (
      VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)
    ),
    dep AS (
      SELECT CAST(strftime('%m', e.date) AS INTEGER) AS m, SUM(e.amount) AS deposits
      FROM entries e
      WHERE e.depositEnvelopeId IS NOT NULL
        AND e.subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}
        AND strftime('%Y', e.date) = ?
      GROUP BY CAST(strftime('%m', e.date) AS INTEGER)
    )
    SELECT
      m.n        AS month,
      COALESCE(ma.income_total , 0) AS income,
      COALESCE(ma.expense_total, 0) AS expense,
      COALESCE(d.deposits      , 0) AS deposits
    FROM months m
    LEFT JOIN monthly_aggregates ma ON ma.year = ? AND ma.month = m.n
    LEFT JOIN dep d ON d.m = m.n
    ORDER BY m.n
    `;

    const categoryQuery = `
  SELECT c.id, c.name, c.color, ai.name AS icon
  FROM categories c
  LEFT JOIN app_icons ai ON ai.id = c.iconId
  WHERE c.id = ?
`;

// 2) Sumy miesięczne dla CAŁEJ kategorii (tylko wydatki -> positive=0; usuń warunek jeśli niepotrzebny)
const categorySumsQuery = `
  SELECT CAST(substr(e.date,6,2) AS INTEGER) AS month,
         SUM(e.amount) AS sum
  FROM entries e
  JOIN subcategories s ON s.id = e.subcategoryId
  JOIN categories c ON c.id = s.categoryId
  WHERE c.id = ?
    AND c.positive = 0
    AND substr(e.date,1,4) = ?
    AND e.isArchived = 0
    AND e.financedEnvelopeId IS NULL
  GROUP BY month
  ORDER BY month
`;

// 3) Sumy miesięczne per SUBKATEGORIA (LEFT JOIN, żeby dostać też puste)
const subcatsQuery = `
  SELECT s.id AS subcategoryId,
         s.name,
         s.color,
         ai.name AS icon,
         CAST(substr(e.date,6,2) AS INTEGER) AS month,
         SUM(e.amount) AS sum
  FROM subcategories s
  JOIN categories c ON c.id = s.categoryId
  LEFT JOIN app_icons ai ON ai.id = s.iconId
  LEFT JOIN entries e
    ON e.subcategoryId = s.id
   AND substr(e.date,1,4) = ?
   AND e.isArchived = 0
   AND e.financedEnvelopeId IS NULL
  WHERE c.id = ?
    AND c.positive = 0
  GROUP BY s.id, s.name, s.color, ai.name, month
  ORDER BY s.name, month
`;