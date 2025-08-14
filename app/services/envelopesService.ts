// services/envelopesService.ts
import { ENVELOPE_FUND_SUBCAT_ID, OTHER_INCOME_SUBCAT_ID } from '../config/constants';
import { getDb } from '../database/db';

export type Envelope = {
  id: number;
  name: string;
  color: string;
  saldo: number | null;
  target: number | null;
  finished: string | null;
  closed: string | null;
  iconId: number | null;
  entryId: number | null;
};

type DepositOpts = {
  date?: string; // 'YYYY-MM-DD' — ma pierwszeństwo
  year?: number; // użyte tylko gdy nie ma 'date'
  month1?: number; // 1..12, użyte tylko gdy nie ma 'date'
  note?: string; // opcjonalny opis
};

// --- helpers (lokalne) ---
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const pickDateForMonth = (year?: number, month1?: number): string => {
  if (!year || !month1) return toISO(new Date());
  const today = new Date();
  const lastDay = new Date(year, month1, 0).getDate();
  const day = Math.min(today.getDate(), lastDay);
  return toISO(new Date(year, month1 - 1, day));
};

const yymmFromISO = (iso: string): { year: number; month: number } => {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return { year, month };
};

const getPositiveForSubcategory = async (subcategoryId: number): Promise<0 | 1> => {
  const db = getDb();
  const row = await db.getFirstAsync(
    `SELECT c.positive AS pos
     FROM subcategories s JOIN categories c ON c.id = s.categoryId
     WHERE s.id = ?`,
    [subcategoryId]
  );
  return (row?.pos === 1 ? 1 : 0) as 0 | 1;
};

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

export const depositToEnvelope = async (
  envelopeId: number,
  amount: number,
  opts: DepositOpts = {}
): Promise<number> => {
  if (!(amount > 0)) throw new Error('Kwota musi być > 0');
  const db = getDb();

  // data docelowa
  const when = opts.date ?? pickDateForMonth(opts.year, opts.month1);
  const ym = when.slice(0, 7); // 'YYYY-MM'

  // pobierz nazwę koperty do opisu
  const env = (await db.getFirstAsync(`SELECT name FROM envelopes WHERE id = ?`, [envelopeId])) as {
    name?: string;
  } | null;
  const envelopeName = env?.name ?? '';
  const autoDesc = `Zasilenie koperty #${envelopeId} ${envelopeName}`;

  await db.execAsync('BEGIN IMMEDIATE');
  try {
    // sprawdź istniejący wpis w tym miesiącu
    const existing = (await db.getFirstAsync(
      `SELECT id, amount
       FROM entries
       WHERE depositEnvelopeId = ?
         AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}
         AND substr(date,1,7) = ?
       ORDER BY id ASC
       LIMIT 1`,
      [envelopeId, ym]
    )) as { id: number; amount: number } | undefined;

    // przygotuj deltę do monthly_aggregates
    const { year, month } = yymmFromISO(when);
    const positive = await getPositiveForSubcategory(ENVELOPE_FUND_SUBCAT_ID);
    const incDelta = positive === 1 ? amount : 0;
    const expDelta = positive === 0 ? amount : 0;

    let entryId: number;

    if (existing) {
      // podbijamy kwotę istniejącego wpisu o deltę
      const newAmountTotal = Number(existing.amount) + amount;
      await db.runAsync(
        `UPDATE entries
           SET amount = ?, description = ?
         WHERE id = ?`,
        [newAmountTotal, autoDesc, existing.id]
      );
      entryId = existing.id;

      // agregaty – tylko delta
      await upsertMonthlyAggregates(year, month, incDelta, expDelta);
    } else {
      // nowy wpis w tym miesiącu
      const ins = await db.runAsync(
        `INSERT INTO entries
          (date, amount, subcategoryId, description, isArchived, depositEnvelopeId, financedEnvelopeId)
         VALUES
          (?,    ?,      ?,            ?,           0,          ?,                NULL)`,
        [when, amount, ENVELOPE_FUND_SUBCAT_ID, autoDesc, envelopeId]
      );
      entryId = ins.lastInsertRowId as number;

      // agregaty – standard po INSERT
      await upsertMonthlyAggregates(year, month, incDelta, expDelta);
    }

    // saldo koperty – podbij delta
    await db.runAsync(`UPDATE envelopes SET saldo = COALESCE(saldo, 0) + ? WHERE id = ?`, [amount, envelopeId]);

    await db.execAsync('COMMIT');
    return entryId;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};

export const getActiveEnvelopes = async (): Promise<Envelope[]> => {
  const db = getDb();
  const rows = (await db.getAllAsync(
    `SELECT * FROM envelopes
     WHERE finished IS NULL AND closed IS NULL
     ORDER BY name ASC`
  )) as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color,
    target: r.target ?? null,
    saldo: r.saldo ?? 0,
    finished: r.finished ?? null,
    closed: r.closed ?? null,
    iconId: r.iconId ?? null,
    entryId: r.entryId ?? null,
  }));
};

export const getEnvelopeById = async (id: number): Promise<Envelope | null> => {
  const db = getDb();
  const row = (await db.getFirstAsync(`SELECT * FROM envelopes WHERE id = ?`, [id])) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    target: row.target ?? null,
    saldo: row.saldo ?? 0,
    finished: row.finished ?? null,
    closed: row.closed ?? null,
    iconId: row.iconId ?? null,
    entryId: row.entryId ?? null,
  };
};

export const addEnvelope = async (name: string, color: string, target?: number | null): Promise<number> => {
  const db = getDb();
  const res = await db.runAsync(`INSERT INTO envelopes (name, color, target, saldo) VALUES (?, ?, ?, 0)`, [
    name,
    color,
    target ?? null,
  ]);
  return res.lastInsertRowId as number;
};

export const getEnvelopeDeposits = async (
  envelopeId: number
): Promise<Array<{ id: number; date: string; amount: number; note: string }>> => {
  const db = getDb();
  const rows = (await db.getAllAsync(
    `SELECT id, date, amount, description AS note
     FROM entries
     WHERE depositEnvelopeId = ?
       AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}
     ORDER BY date ASC, id ASC`,
    [envelopeId]
  )) as any[];

  return rows.map(r => ({
    id: r.id,
    date: r.date,
    amount: Number(r.amount),
    note: r.note ?? '',
  }));
};

export const updateEnvelope = async (
  envelopeId: number,
  data: { name: string; color: string; target: number | null }
): Promise<void> => {
  const db = getDb();

  await db.execAsync('BEGIN IMMEDIATE');
  try {
    const row = (await db.getFirstAsync('SELECT name FROM envelopes WHERE id = ?', [envelopeId])) as {
      name?: string;
    } | null;
    const oldName = row?.name ?? null;

    await db.runAsync(`UPDATE envelopes SET name = ?, color = ?, target = ? WHERE id = ?`, [
      data.name.trim(),
      data.color,
      data.target,
      envelopeId,
    ]);

    if (oldName !== data.name.trim()) {
      const newDesc = `Zasilenie koperty #${envelopeId} ${data.name.trim()}`;

      await db.runAsync(
        `UPDATE entries
           SET description = ?
         WHERE depositEnvelopeId = ?
           AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}
          `,
        [newDesc, envelopeId]
      );
    }

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};

export const deleteEnvelope = async (
  envelopeId: number
): Promise<Array<{ id: number; date: string; amount: number; note: string }>> => {
  const db = getDb();
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    // 0) Strażnicy: finished i entryId
    const envRow = await db.getFirstAsync(`SELECT finished, entryId FROM envelopes WHERE id = ?`, [envelopeId]);
    if (!envRow) throw new Error('Koperta nie istnieje.');

    if (envRow.finished != null) {
      throw new Error('Nie można usunąć: koperta jest zakończona (finished).');
    }
    if (envRow.entryId != null) {
      throw new Error('Nie można usunąć: koperta powiązana z zakupem (entryId).');
    }

    // 1) (opcjonalnie) brak wydatków finansowanych z koperty
    const finRow = await db.getFirstAsync(`SELECT COUNT(*) AS cnt FROM entries WHERE financedEnvelopeId = ?`, [
      envelopeId,
    ]);
    if (Number(finRow?.cnt ?? 0) > 0) {
      throw new Error('Najpierw usuń wpisy finansowane z tej koperty.');
    }

    // 2) Weź wszystkie depozyty (wpłaty do koperty)
    const deposits = (await db.getAllAsync(
      `SELECT id, date, amount, description AS note
       FROM entries
       WHERE depositEnvelopeId = ?
         AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}
       ORDER BY date ASC, id ASC`,
      [envelopeId]
    )) as Array<{ id: number; date: string; amount: number; note?: string }>;

    // 3) Cofnij wpływ do monthly_aggregates (grupujemy per (year,month))
    const pos = await getPositiveForSubcategory(ENVELOPE_FUND_SUBCAT_ID); // 0/1
    const perMonth = new Map<string, { year: number; month: number; sum: number }>();
    let total = 0;

    for (const d of deposits) {
      const amt = Number(d.amount) || 0;
      total += amt;
      const { year, month } = yymmFromISO(d.date);
      const key = `${year}-${month}`;
      const agg = perMonth.get(key) || { year, month, sum: 0 };
      agg.sum += amt;
      perMonth.set(key, agg);
    }

    for (const { year, month, sum } of perMonth.values()) {
      const incDelta = pos === 1 ? -sum : 0;
      const expDelta = pos === 0 ? -sum : 0;
      await upsertMonthlyAggregates(year, month, incDelta, expDelta);
    }

    // 4) Korekta salda koperty
    if (total > 0) {
      await db.runAsync(`UPDATE envelopes SET saldo = COALESCE(saldo, 0) - ? WHERE id = ?`, [total, envelopeId]);
    }

    // 5) Usuń wpisy depozytów
    for (const d of deposits) {
      await db.runAsync(`DELETE FROM entries WHERE id = ?`, [d.id]);
    }

    // 6) Usuń kopertę
    await db.runAsync(`DELETE FROM envelopes WHERE id = ?`, [envelopeId]);

    await db.execAsync('COMMIT');

    // 7) Zwracamy listę usuniętych depozytów
    return deposits.map(d => ({
      id: d.id,
      date: d.date,
      amount: Number(d.amount),
      note: d.note ?? '',
    }));
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};


/**
 * Finansuje WYDATEK z koperty.
 * - Tworzy wpis zakupu z financedEnvelopeId = envelopeId (NIE dotyka monthly_aggregates!)
 * - Zmniejsza saldo koperty o kwotę zakupu
 * - Logika "reszty" (a/b/c) w BIEŻĄCYM miesiącu:
 *    a) jeśli jest depozyt w tym miesiącu -> pomniejsza go (i cofa jego wpływ w agregatach)
 *    b) jeśli nie ma depozytu -> dopisuje OTHER_INCOME (i liczy go do agregatów)
 *    c) jeśli depozyt < reszta -> reszta po pomniejszeniu depozytu trafia do OTHER_INCOME
 * - Ustawia envelopes.entryId = id zakupu i finished = date (zamyka kopertę)
 * - Kończy z saldo = 0 (zaokrąglenia w dół do 0)
 */

export const spendFromEnvelope = async (args: {
  envelopeId: number;
  subcategoryId: number; // WYDATEK
  amount: number;
  date: string;          // 'YYYY-MM-DD'
  description?: string;
}): Promise<number> => {
  const { envelopeId, subcategoryId, amount, date, description } = args;
  if (!(amount > 0)) throw new Error('Kwota musi być > 0');

  const db = getDb();
  const ym = date.slice(0, 7);
  const purchaseDesc = description?.trim() || `Zakup finansowany kopertą #${envelopeId}`;

  await db.execAsync('BEGIN IMMEDIATE');
  try {
    // 0) Strażniki + dane koperty
    const env = await db.getFirstAsync(
      `SELECT name, COALESCE(saldo,0) AS saldo, finished, closed
         FROM envelopes WHERE id = ?`,
      [envelopeId]
    ) as { name?: string; saldo: number; finished?: string | null; closed?: string | null } | null;

    if (!env) throw new Error('Koperta nie istnieje.');
    if (env.finished != null || env.closed != null) {
      throw new Error('Koperta jest już zamknięta.');
    }

    const saldoBefore = Number(env.saldo || 0);
    if (saldoBefore < amount) {
      throw new Error('Brak środków w kopercie na ten zakup.');
    }

    // 1) Wpis zakupu FINANSOWANY kopertą – NIE liczymy do monthly_aggregates
    const ins = await db.runAsync(
      `INSERT INTO entries
        (date, amount, subcategoryId, description, isArchived, depositEnvelopeId, financedEnvelopeId)
       VALUES
        (?,    ?,      ?,            ?,           0,          NULL,              ?)`,
      [date, amount, subcategoryId, purchaseDesc, envelopeId]
    );
    const purchaseId = ins.lastInsertRowId as number;

    // 2) saldo -= amount
    await db.runAsync(
      `UPDATE envelopes SET saldo = COALESCE(saldo,0) - ? WHERE id = ?`,
      [amount, envelopeId]
    );

    // 3) RESZTA = saldoBefore - amount (może być 0)
    let rest = saldoBefore - amount;

    if (rest > 0) {
      // 3a) sprawdź miesięczny depozyt do tej koperty
      const monthlyDeposit = await db.getFirstAsync(
        `SELECT id, amount
           FROM entries
          WHERE depositEnvelopeId = ?
            AND subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}
            AND substr(date,1,7) = ?
          LIMIT 1`,
        [envelopeId, ym]
      ) as { id: number; amount: number } | undefined;

      const { year, month } = yymmFromISO(date);
      const posDeposit = await getPositiveForSubcategory(ENVELOPE_FUND_SUBCAT_ID); // zwykle 0 = wydatek
      const posIncome  = await getPositiveForSubcategory(OTHER_INCOME_SUBCAT_ID);  // 1 = dochód

      // krok a/c – redukcja depozytu
      if (monthlyDeposit) {
        const reduce = Math.min(rest, Number(monthlyDeposit.amount));
        if (reduce > 0) {
          const newAmt = Number(monthlyDeposit.amount) - reduce;
          const autoDesc = `Zasilenie koperty #${envelopeId} ${env.name ?? ''}`;

          if (newAmt > 0) {
            await db.runAsync(
              `UPDATE entries SET amount = ?, description = ? WHERE id = ?`,
              [newAmt, autoDesc, monthlyDeposit.id]
            );
          } else {
            await db.runAsync(`DELETE FROM entries WHERE id = ?`, [monthlyDeposit.id]);
          }

          // agregaty: cofamy wpływ depozytu o "reduce"
          const incDeltaDep = posDeposit === 1 ? -reduce : 0;
          const expDeltaDep = posDeposit === 0 ? -reduce : 0;
          await upsertMonthlyAggregates(year, month, incDeltaDep, expDeltaDep);

          // saldo koperty też schodzi o "reduce"
          await db.runAsync(
            `UPDATE envelopes SET saldo = COALESCE(saldo,0) - ? WHERE id = ?`,
            [reduce, envelopeId]
          );

          rest -= reduce;
        }
      }

      // krok b/c – jeśli coś zostało, dopisujemy OTHER_INCOME
      if (rest > 0) {
        const incomeDesc = `Reszta z koperty #${envelopeId} ${env.name ?? ''}`;
        await db.runAsync(
          `INSERT INTO entries
            (date, amount, subcategoryId, description, isArchived, depositEnvelopeId, financedEnvelopeId)
           VALUES
            (?,    ?,      ?,            ?,           0,          NULL,              NULL)`,
          [date, rest, OTHER_INCOME_SUBCAT_ID, incomeDesc]
        );

        // agregaty: dochód +rest
        const incDeltaInc = posIncome === 1 ? rest : 0;
        const expDeltaInc = posIncome === 0 ? rest : 0; // powinno zostać 0
        await upsertMonthlyAggregates(year, month, incDeltaInc, expDeltaInc);

        // saldo koperty schodzi o pozostałą resztę
        await db.runAsync(
          `UPDATE envelopes SET saldo = COALESCE(saldo,0) - ? WHERE id = ?`,
          [rest, envelopeId]
        );

        rest = 0;
      }
    }

    // 4) domknięcie koperty: wpis zakupowy + data zakończenia
    await db.runAsync(
      `UPDATE envelopes
          SET entryId  = ?,
              finished = ?
        WHERE id = ?`,
      [purchaseId, date, envelopeId]
    );

    // 5) sanity: ustaw saldo na 0 (eliminuje szumy zaokrągleń)
    await db.runAsync(
      `UPDATE envelopes SET saldo = 0 WHERE id = ?`,
      [envelopeId]
    );

    await db.execAsync('COMMIT');
    return purchaseId;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};