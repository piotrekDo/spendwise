import { getDb } from '../database/db';

export interface MonthSummary {
  year: number;
  month1: number;
  incomeTotal: number;
  expenseTotal: number;
}

export const getLast12Months = async (year: number, month1: number): Promise<Array<MonthSummary>> => {
  const db = getDb();
  const rows = await db.getAllAsync(
    `
        WITH RECURSIVE months(i, y, m) AS (
        SELECT 0, ?, ?          -- start: np. 2025, 8
        UNION ALL
        SELECT i+1,
                CASE WHEN m=1 THEN y-1 ELSE y END,
                CASE WHEN m=1 THEN 12  ELSE m-1 END
        FROM months
        WHERE i < 11                      -- łącznie 12 pozycji
        )
        SELECT
        y   AS year,
        m   AS month,
        COALESCE(a.income_total,        0) AS income_total,
        COALESCE(a.expense_total,       0) AS expense_total,
        COALESCE(a.fund_in_total,       0) AS fund_in_total,
        COALESCE(a.fund_out_total,      0) AS fund_out_total,
        COALESCE(a.covered_from_buffer, 0) AS covered_from_buffer
        FROM months
        LEFT JOIN monthly_aggregates a
        ON a.year = y AND a.month = m
        ORDER BY (y * 12 + m) DESC;
    `,
    [year, month1]
  );

  return rows.map((r: any) => ({
    year: r.year,
    month1: r.month,
    incomeTotal: r.income_total,
    expenseTotal: r.expense_total,
  }));
};
