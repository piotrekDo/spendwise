import { getDb } from '../database/db';

export const getBalancesForMonth = async (
  year: number,
  month1to12: number
): Promise<{ month: number; vault: number; total: number }> => {
  const db = getDb();

  // saldo miesiąca
  const m = await db.getFirstAsync(
    `
      SELECT COALESCE(SUM(income_total - expense_total), 0) AS saldo
      FROM monthly_aggregates
      WHERE year = ? AND month = ?
    `,
    [year, month1to12]
  );
  const month = m?.saldo || 0;

  // bufor = suma wcześniejszych miesięcy
  const v = await db.getFirstAsync(
    `
      SELECT COALESCE(SUM(income_total - expense_total), 0) AS saldo
      FROM monthly_aggregates
      WHERE (year < ?) OR (year = ? AND month < ?)
    `,
    [year, year, month1to12]
  );
  const vault = v?.saldo || 0;

  return { month, vault, total: month + vault };
};

// Rozbicie bufora: listuje wcześniejsze miesiące i ich miesięczne saldo (domyślnie 12 ostatnich)
export const getVaultBreakdown = async (
  year: number,
  month1to12: number,
  limit = 12
): Promise<Array<{ year: number; month: number; label: string; balance: number }>> => {
  const db = getDb();

  const rows = await db.getAllAsync(
    `
      SELECT year, month,
             (income_total - expense_total) AS balance
      FROM monthly_aggregates
      WHERE (year < ?) OR (year = ? AND month < ?)
      ORDER BY year DESC, month DESC
      LIMIT ?
    `,
    [year, year, month1to12, limit]
  );

  const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

  return (rows || []).map((r: any) => ({
    year: r.year,
    month: r.month,
    label: `${MONTHS[r.month - 1]} ${r.year}`,
    balance: r.balance ?? 0,
  }));
};
