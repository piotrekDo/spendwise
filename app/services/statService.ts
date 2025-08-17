import { ENVELOPE_FUND_SUBCAT_ID } from '../config/constants';
import { getDb } from '../database/db';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    AND e.depositEnvelopeId IS NULL
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
   AND e.depositEnvelopeId IS NULL
   AND e.financedEnvelopeId IS NULL
  WHERE c.id = ?
    AND c.positive = 0
  GROUP BY s.id, s.name, s.color, ai.name, month
  ORDER BY s.name, month
`;

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

  // Jeśli chcesz mieć subcategory bez żadnych wpisów w danym roku:
  // dołóż je z tabeli subcategories:
  // (tu już mamy LEFT JOIN na entries, więc przy braku wpisów i tak dostaniesz wiersz z month=NULL.
  // sumsByMonth zostało zainicjalizowane zerami, więc jest OK.)

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
      AND (e.depositEnvelopeId IS NULL)
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
      AND (e.depositEnvelopeId IS NULL)
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
        AND e.depositEnvelopeId IS NULL
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
              AND e.depositEnvelopeId IS NULL
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
