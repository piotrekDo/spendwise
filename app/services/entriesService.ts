import { getDb } from '../database/db';
import { ENVELOPE_FUND_SUBCAT_ID, OTHER_INCOME_SUBCAT_ID } from '../config/constants';

export type Entry = {
  id: number;
  amount: number;
  description: string;
  date: string;
  subcategoryId: number;
  subcategoryName: string;
  subcategoryIcon: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
};

// --- helpers (wewnętrzne, nieeksportowane) ---

// pobierz positive (0/1) dla danej subkategorii
const getPositiveForSubcategory = async (subcategoryId: number): Promise<0 | 1> => {
  const db = getDb();
  const row = await db.getFirstAsync(
    `SELECT c.positive AS pos
     FROM subcategories s
     JOIN categories c ON c.id = s.categoryId
     WHERE s.id = ?`,
    [subcategoryId]
  );
  const pos = (row?.pos ?? 0) as number;
  return (pos === 1 ? 1 : 0) as 0 | 1;
};

// wyciągnij rok i miesiąc z daty 'YYYY-MM-DD' (bez strefy czasowej)
const yymmFromISO = (iso: string): { year: number; month: number } => {
  // zakładamy poprawny format YYYY-MM-DD
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return { year, month };
};

// UPSERT do monthly_aggregates z deltami inc/exp (jak w triggerach)
const upsertMonthlyAggregates = async (year: number, month: number, incDelta: number, expDelta: number) => {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO monthly_aggregates (year, month, income_total, expense_total)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET
       income_total  = income_total  + excluded.income_total,
       expense_total = expense_total + excluded.expense_total`,
    [year, month, incDelta, expDelta]
  );
};

// --- PUBLIC API ---

export const addEntry = async (subcategoryId: number, amount: number, description: string, date: string) => {
  const db = getDb();
  await db.execAsync('BEGIN');
  try {
    // 1) insert do entries (brak finansowania / depozytu w tej funkcji – zgodnie z obecnym API)
    const res = await db.runAsync(
      `INSERT INTO entries (amount, description, date, subcategoryId)
       VALUES (?, ?, ?, ?)`,
      [amount, description, date, subcategoryId]
    );

    // 2) przelicz agregaty miesięczne (jak trg_entries_ai)
    const { year, month } = yymmFromISO(date);
    const positive = await getPositiveForSubcategory(subcategoryId);

    // financedEnvelopeId jest NULL (nie przekazujemy go tu) → liczymy standardowo
    const incDelta = positive === 1 ? amount : 0;
    const expDelta = positive === 0 ? amount : 0;

    await upsertMonthlyAggregates(year, month, incDelta, expDelta);

    // Uwaga: triggery nie zwiększały salda koperty na INSERT (robi to logika „depositToEnvelope” w innym serwisie)
    await db.execAsync('COMMIT');
    return res.lastInsertRowId;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};

export const getSpendingsInRange = async (startDate: string, endDate: string): Promise<Entry[]> => {
  const db = getDb();

  const query = `
    SELECT 
      e.id, e.amount, e.description, e.date, 
      s.id AS subcategoryId, s.name AS subcategoryName, ai1.name AS subcategoryIcon,
      c.id AS categoryId, c.name AS categoryName, ai2.name AS categoryIcon
    FROM entries e
    JOIN subcategories s ON e.subcategoryId = s.id
    JOIN app_icons ai1 ON s.iconId = ai1.id
    JOIN categories c ON s.categoryId = c.id
    JOIN app_icons ai2 ON c.iconId = ai2.id
    WHERE e.date BETWEEN ? AND ?
    ORDER BY e.date DESC, e.id DESC
  `;

  const results = await db.getAllAsync(query, [startDate, endDate]);
  return results as Entry[];
};

export const getSelectedCategorySpendings = async (categoryId: number, startDate: string, endDate: string) => {
  const db = getDb();
  const query = `
    SELECT 
      e.id, e.amount, e.description, e.date, 
      s.id AS subcategoryId, s.name AS subcategoryName, ai1.name AS subcategoryIcon,
      c.id AS categoryId, c.name AS categoryName, ai2.name AS categoryIcon
    FROM entries e
    JOIN subcategories s ON e.subcategoryId = s.id
    JOIN app_icons ai1 ON s.iconId = ai1.id
    JOIN categories c ON s.categoryId = c.id
    JOIN app_icons ai2 ON c.iconId = ai2.id
    WHERE s.categoryId = ? AND e.date BETWEEN ? AND ?
    ORDER BY e.date DESC, e.id DESC
  `;

  const results = await db.getAllAsync(query, [categoryId, startDate, endDate]);
  return results as Entry[];
};

export const deleteEntry = async (id: number): Promise<void> => {
  const db = getDb();
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    const oldRow = await db.getFirstAsync(
      `SELECT id, date, amount, subcategoryId, financedEnvelopeId, depositEnvelopeId
       FROM entries
       WHERE id = ?`,
      [id]
    );
    if (!oldRow) {
      await db.execAsync('ROLLBACK');
      return;
    }

    const { date, amount, subcategoryId, financedEnvelopeId, depositEnvelopeId } = oldRow as {
      date: string; amount: number; subcategoryId: number;
      financedEnvelopeId?: number | null; depositEnvelopeId?: number | null;
    };

    const { year, month } = yymmFromISO(date);
    const ym = date.slice(0, 7);

    // --- A) USUNIĘCIE ZAKUPU FINANSOWANEGO KOPERTĄ ---
    if (financedEnvelopeId != null) {
      const envId = financedEnvelopeId;

      // Suma depozytów i zakupów PRZED usunięciem (do wyliczenia 'rest' i 'reduce')
      const depSumRow = await db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) AS s
           FROM entries
          WHERE depositEnvelopeId = ? AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}`,
        [envId]
      ) as { s?: number } | null;
      const buySumRow = await db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) AS s
           FROM entries
          WHERE financedEnvelopeId = ?`,
        [envId]
      ) as { s?: number } | null;

      const totalDepositsAll = Number(depSumRow?.s ?? 0);
      const totalPurchasesAll = Number(buySumRow?.s ?? 0); // zawiera TEN zakup
      const saldoBefore = totalDepositsAll - totalPurchasesAll;

      // 'rest' to nadwyżka salda po zakupie (przed korektami reszty/redukcji)
      const rest = Math.max(0, saldoBefore - amount);

      // 1) Usuń sam zakup (NIE wpływa na agregaty)
      await db.runAsync(`DELETE FROM entries WHERE id = ?`, [id]);

      // 2) Cofnij „resztę” z tego miesiąca (jeśli była) i skoryguj agregaty
      const restEntry = await db.getFirstAsync(
        `SELECT id, amount
           FROM entries
          WHERE subcategoryId = ${OTHER_INCOME_SUBCAT_ID}
            AND substr(date,1,7) = ?
            AND description LIKE ?
            AND depositEnvelopeId IS NULL
            AND financedEnvelopeId IS NULL
          LIMIT 1`,
        [ym, `Reszta z koperty #${envId}%`]
      ) as { id: number; amount: number } | undefined;

      const restLeft = Number(restEntry?.amount ?? 0);
      if (restEntry) {
        await db.runAsync(`DELETE FROM entries WHERE id = ?`, [restEntry.id]);
        const posIncome = await getPositiveForSubcategory(OTHER_INCOME_SUBCAT_ID);
        const incDelta = posIncome === 1 ? -restLeft : 0;
        const expDelta = posIncome === 0 ? -restLeft : 0;
        await upsertMonthlyAggregates(year, month, incDelta, expDelta);
      }

      // 3) Odtwórz miesięczny depozyt o 'reduce' (jeśli wcześniej był ucięty)
      const reduce = Math.max(0, rest - restLeft);
      if (reduce > 0) {
        const depEntry = await db.getFirstAsync(
          `SELECT id, amount
             FROM entries
            WHERE depositEnvelopeId = ?
              AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}
              AND substr(date,1,7) = ?
            LIMIT 1`,
          [envId, ym]
        ) as { id: number; amount: number } | undefined;

        if (depEntry) {
          const envNameRow = await db.getFirstAsync(`SELECT name FROM envelopes WHERE id = ?`, [envId]) as { name?: string } | null;
          const newAmt = Number(depEntry.amount) + reduce;
          const autoDesc = `Zasilenie koperty #${envId} ${envNameRow?.name ?? ''}`;

          await db.runAsync(
            `UPDATE entries SET amount = ?, description = ? WHERE id = ?`,
            [newAmt, autoDesc, depEntry.id]
          );

          const posDep = await getPositiveForSubcategory(ENVELOPE_FUND_SUBCAT_ID); // zwykle 0 (wydatek)
          const incDeltaDep = posDep === 1 ? reduce : 0;
          const expDeltaDep = posDep === 0 ? reduce : 0;
          await upsertMonthlyAggregates(year, month, incDeltaDep, expDeltaDep);
        }
      }

      // 4) Przelicz saldo po zmianach
      const depSum2 = await db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) AS s
           FROM entries
          WHERE depositEnvelopeId = ? AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}`,
        [envId]
      ) as { s?: number } | null;
      const buySum2 = await db.getFirstAsync(
        `SELECT COALESCE(SUM(amount),0) AS s
           FROM entries
          WHERE financedEnvelopeId = ?`,
        [envId]
      ) as { s?: number } | null;
      const newSaldo = Number(depSum2?.s ?? 0) - Number(buySum2?.s ?? 0);

      // 5) Otwórz kopertę, jeśli trzeba (poprawka: obsługa legacy bez entryId)
      const envState = await db.getFirstAsync(
        `SELECT entryId, finished FROM envelopes WHERE id = ?`,
        [envId]
      ) as { entryId?: number | null; finished?: string | null } | null;

      // policz ile pozostało zakupów finansowanych tą kopertą
      const finCntRow = await db.getFirstAsync(
        `SELECT COUNT(*) AS cnt FROM entries WHERE financedEnvelopeId = ?`,
        [envId]
      ) as { cnt?: number } | null;
      const finCountAfter = Number(finCntRow?.cnt ?? 0);

      const shouldReopen =
        (envState?.entryId ?? null) === id               // typowo: koperta wskazywała właśnie ten zakup
        || ((envState?.entryId ?? null) == null && finCountAfter === 0); // fallback: brak entryId, i nie ma innych zakupów

      if (shouldReopen) {
        await db.runAsync(
          `UPDATE envelopes
              SET saldo = ?, finished = NULL, entryId = NULL
            WHERE id = ?`,
          [newSaldo, envId]
        );
      } else {
        await db.runAsync(
          `UPDATE envelopes SET saldo = ? WHERE id = ?`,
          [newSaldo, envId]
        );
      }

      await db.execAsync('COMMIT');
      return;
    }

    // --- B) Zwykły wpis (nie finansowany kopertą) ---
    await db.runAsync(`DELETE FROM entries WHERE id = ?`, [id]);

    // Cofnij wpływ do agregatów
    const positive = await getPositiveForSubcategory(subcategoryId);
    const incDelta = positive === 1 ? -amount : 0;
    const expDelta = positive === 0 ? -amount : 0;
    await upsertMonthlyAggregates(year, month, incDelta, expDelta);

    // Jeżeli to była WPŁATA do koperty → obniż saldo koperty
    if (depositEnvelopeId != null && subcategoryId === ENVELOPE_FUND_SUBCAT_ID) {
      await db.runAsync(
        `UPDATE envelopes SET saldo = COALESCE(saldo, 0) - ? WHERE id = ?`,
        [amount, depositEnvelopeId]
      );
    }

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};

// 1:1 z trg_entries_au (AFTER UPDATE OF amount)
// Funkcja aktualizuje TYLKO kwotę; pozostałe pola pozostają bez zmian.
export const updateEntryAmount = async (id: number, newAmount: number): Promise<void> => {
  const db = getDb();
  await db.execAsync('BEGIN');
  try {
    // OLD
    const oldRow = await db.getFirstAsync(
      `SELECT id, date, amount, subcategoryId, financedEnvelopeId
       FROM entries
       WHERE id = ?`,
      [id]
    );
    if (!oldRow) {
      await db.execAsync('ROLLBACK');
      throw new Error('Entry not found');
    }

    const old = oldRow as {
      date: string; amount: number; subcategoryId: number; financedEnvelopeId?: number | null;
    };

    if (old.amount === newAmount) {
      await db.execAsync('COMMIT'); // nic do roboty
      return;
    }

    // 1) Odejmij stary wpływ (jak w triggerze)
    if (old.financedEnvelopeId == null) {
      const { year, month } = yymmFromISO(old.date);
      const positive = await getPositiveForSubcategory(old.subcategoryId);
      const incDelta = positive === 1 ? -old.amount : 0;
      const expDelta = positive === 0 ? -old.amount : 0;
      await upsertMonthlyAggregates(year, month, incDelta, expDelta);
    }

    // 2) Zapisz nową kwotę
    await db.runAsync(`UPDATE entries SET amount = ? WHERE id = ?`, [newAmount, id]);

    // 3) Dodaj nowy wpływ (jak w triggerze) – na podstawie NEW (data/subcategory się nie zmieniają)
    if (old.financedEnvelopeId == null) {
      const { year, month } = yymmFromISO(old.date);
      const positive = await getPositiveForSubcategory(old.subcategoryId);
      const incDelta = positive === 1 ? newAmount : 0;
      const expDelta = positive === 0 ? newAmount : 0;
      await upsertMonthlyAggregates(year, month, incDelta, expDelta);
    }

    // Uwaga: triggery nie zmieniały salda koperty przy UPDATE amount – my również nie zmieniamy.
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};
