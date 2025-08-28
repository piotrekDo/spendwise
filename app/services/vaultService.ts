import { getDb } from '../database/db';

export interface MonthSummary {
  year: number;      // -1 dla "older"
  month1: number;    // -1 dla "older"
  incomeTotal: number;
  expenseTotal: number;
}

export type YM = { year: number; month1: number };

export interface DepLink {
  from: YM;      // źródło (sponsor)
  to: YM;        // odbiorca
  value: number; // kwota transferu
}

export interface MonthWithDeps extends MonthSummary {
  depIn: DepLink[];
  depOut: DepLink[];
  depTotal: number;     // + otrzymał, - oddał
  saldo: number;        // income - expense
  saldoAfterDep: number;// saldo + depTotal
  isOlder?: boolean;    // true dla (-1,-1)
}

const ymKey = (y: number, m1: number) => y * 12 + m1; // do sortu / porównań

const QUERY = `
  WITH RECURSIVE months(i, y, m) AS (
    SELECT 0, ?, ?
    UNION ALL
    SELECT i+1,
          CASE WHEN m=1 THEN y-1 ELSE y END,
          CASE WHEN m=1 THEN 12  ELSE m-1 END
    FROM months
    WHERE i < 11
  ),
  base AS ( -- 12 ostatnich miesięcy (nawet jeśli w tabeli brak wiersza)
    SELECT
      y AS year,
      m AS month,
      COALESCE(a.income_total,        0) AS income_total,
      COALESCE(a.expense_total,       0) AS expense_total,
      COALESCE(a.fund_in_total,       0) AS fund_in_total,
      COALESCE(a.fund_out_total,      0) AS fund_out_total,
      COALESCE(a.covered_from_buffer, 0) AS covered_from_buffer
    FROM months
    LEFT JOIN monthly_aggregates a ON a.year = y AND a.month = m
  ),
  threshold AS ( -- najstarszy ym w oknie 12 mies.
    SELECT MIN(year * 12 + month) AS min_ym FROM base
  ),
  older AS ( -- suma wszystkiego sprzed okna (STRICTLY starsze)
    SELECT
      -1 AS year,
      -1 AS month,
      COALESCE(SUM(a.income_total),        0) AS income_total,
      COALESCE(SUM(a.expense_total),       0) AS expense_total,
      COALESCE(SUM(a.fund_in_total),       0) AS fund_in_total,
      COALESCE(SUM(a.fund_out_total),      0) AS fund_out_total,
      COALESCE(SUM(a.covered_from_buffer), 0) AS covered_from_buffer,
      1 AS is_total
    FROM monthly_aggregates a
    WHERE (a.year * 12 + a.month) < (SELECT min_ym FROM threshold)
  ),
  last12 AS (
    SELECT year, month, income_total, expense_total,
          fund_in_total, fund_out_total, covered_from_buffer,
          0 AS is_total
    FROM base
  )
  SELECT year, month, income_total, expense_total, fund_in_total, fund_out_total, covered_from_buffer
  FROM (
    SELECT * FROM last12
    UNION ALL
    SELECT year, month, income_total, expense_total, fund_in_total, fund_out_total, covered_from_buffer, is_total
    FROM older
  )
  ORDER BY is_total, (year * 12 + month) DESC;
    `;

export const getFullLast12Months = async (year: number, month1: number) => {
  const months = await getLast12Months(year, month1);
  return attachMonthDependencies(months);
};

export const getLast12Months = async (year: number, month1: number): Promise<Array<MonthSummary>> => {
  const db = getDb();
  const rows = await db.getAllAsync(QUERY, [year, month1]);

  const rawData: MonthSummary[] = rows.map((r: any) => ({
    year: r.year,
    month1: r.month,
    incomeTotal: r.income_total,
    expenseTotal: r.expense_total,
    saldo: r.income_total - r.expense_total,
  }));

  return rawData;
};

/**
 * months: 12 mies. + ewentualny 13-ty "older" (year=-1, month1=-1)
 * Zwraca: wzbogacone rekordy, posortowane OD NAJNOWSZYCH.
 */
export function attachMonthDependencies(input: MonthSummary[]): MonthWithDeps[] {
  if (!input?.length) return [];

  // Wyodrębnij "older" (może nie istnieć)
  const olderIdxRaw = input.findIndex(x => x.year === -1 && x.month1 === -1);
  const olderRaw = olderIdxRaw >= 0 ? input[olderIdxRaw] : null;

  const months12raw = input.filter(x => !(x.year === -1 && x.month1 === -1));

  // Roboczo sortujemy ASC (najstarszy -> najnowszy)
  const asc = [...months12raw].sort((a, b) => ymKey(a.year, a.month1) - ymKey(b.year, b.month1));

  // Zbuduj obiekty wyjściowe (bez older)
  const list: MonthWithDeps[] = asc.map(m => {
    const saldo = m.incomeTotal - m.expenseTotal;
    return {
      ...m,
      depIn: [],
      depOut: [],
      depTotal: 0,
      saldo,
      saldoAfterDep: saldo,
      isOlder: false,
    };
  });

  // Dodaj "older" rekord do output (na razie na końcu; po obliczeniach posortujemy)
  let olderRec: MonthWithDeps | null = null;
  if (olderRaw) {
    const saldo = olderRaw.incomeTotal - olderRaw.expenseTotal;
    olderRec = {
      ...olderRaw,
      depIn: [],
      depOut: [],
      depTotal: 0,
      saldo,
      saldoAfterDep: saldo,
      isOlder: true,
    };
  }

  // Kolejka dostawców (tylko zwykłe miesiące z saldem > 0), FIFO
  type Supplier = { idx: number; available: number };
  const suppliers: Supplier[] = [];

  // Ile mamy dostępne w "older" (pierwszy do konsumpcji, tylko jeśli dodatni)
  let olderAvailable = olderRec && olderRec.saldo > 0 ? olderRec.saldo : 0;

  // Główna pętla po miesiącach (ASC)
  for (let i = 0; i < list.length; i++) {
    const m = list[i];

    if (m.saldo > 0) {
      // dodatni: staje się dostawcą
      suppliers.push({ idx: i, available: m.saldo });
      continue;
    }
    if (m.saldo === 0) continue;

    // ujemny: musimy pokryć deficyt
    let need = -m.saldo;

    // 1) NAJPIERW próbujemy "older"
    if (need > 0 && olderAvailable > 0) {
      const take = Math.min(need, olderAvailable);
      linkFromOlder(olderRec!, m, take);
      olderAvailable -= take;
      need -= take;
    }

    // 2) Potem konsumujemy zwykłych dostawców FIFO
    while (need > 0 && suppliers.length > 0) {
      const s = suppliers[0];
      const take = Math.min(need, s.available);
      if (take > 0) {
        link(list, s.idx, i, take);
        s.available -= take;
        need -= take;
      }
      if (s.available <= 0) suppliers.shift();
    }

    // 3) jeśli need > 0 — nie mamy już z czego; zostawiamy niepokryte (zgodnie z założeniem)
  }

  // Złóż wynik: 12 miesięcy + ewentualnie older
  const result: MonthWithDeps[] = olderRec ? [...list, olderRec] : [...list];

  // Zwracamy OD NAJNOWSZYCH; "older" ma być na końcu
  result.sort((a, b) => {
    if (a.isOlder && !b.isOlder) return 1;
    if (!a.isOlder && b.isOlder) return -1;
    if (a.isOlder && b.isOlder) return 0;
    return ymKey(b.year, b.month1) - ymKey(a.year, a.month1);
  });

  return result;
}

/** Link: zwykły dostawca -> odbiorca */
function link(arr: MonthWithDeps[], supplierIdx: number, consumerIdx: number, value: number) {
  const s = arr[supplierIdx];
  const c = arr[consumerIdx];
  const fromYM: YM = { year: s.year, month1: s.month1 };
  const toYM: YM   = { year: c.year, month1: c.month1 };

  s.depOut.push({ from: fromYM, to: toYM, value });
  c.depIn.push({ from: fromYM, to: toYM, value });

  // depTotal: + gdy dostaję, - gdy oddaję
  s.depTotal -= value;
  c.depTotal += value;

  s.saldoAfterDep = s.saldo + s.depTotal;
  c.saldoAfterDep = c.saldo + c.depTotal;
}

/** Link: "older" -> odbiorca */
function linkFromOlder(older: MonthWithDeps, consumer: MonthWithDeps, value: number) {
  const fromYM: YM = { year: -1, month1: -1 };
  const toYM: YM   = { year: consumer.year, month1: consumer.month1 };

  older.depOut.push({ from: fromYM, to: toYM, value });
  consumer.depIn.push({ from: fromYM, to: toYM, value });

  // aktualizuj depTotal (older sponsoruje = ujemne, konsument = dodatnie)
  older.depTotal -= value;
  consumer.depTotal += value;

  older.saldoAfterDep = older.saldo + older.depTotal;
  consumer.saldoAfterDep = consumer.saldo + consumer.depTotal;
}