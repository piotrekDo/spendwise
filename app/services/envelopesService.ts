import { ENVELOPE_FUND_SUBCAT_ID } from '../config/constants';
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
};

type DepositOpts = {
  date?: string;       // np. '2025-03-12' — ma pierwszeństwo
  year?: number;       // użyte tylko gdy nie ma 'date'
  month1?: number;     // 1..12, użyte tylko gdy nie ma 'date'
  note?: string;       // opcjonalny opis do entries.description
};

// pomocniczo: data w formacie YYYY-MM-DD
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// jeżeli podasz year & month1 -> zwróci "dzisiejszy dzień" w tym miesiącu (przycięty do końca miesiąca)
const pickDateForMonth = (year?: number, month1?: number): string => {
  if (!year || !month1) return toISO(new Date());
  const today = new Date();
  const lastDay = new Date(year, month1, 0).getDate();
  const day = Math.min(today.getDate(), lastDay);
  return toISO(new Date(year, month1 - 1, day));
};

/**
 * Dodaje wpłatę do koperty:
 * - INSERT do entries (subcategory: Zasilenia kopert, depositEnvelopeId=envelopeId)
 * - UPDATE envelopes.saldo += amount
 * Zwraca id utworzonego wpisu.
 */
export const depositToEnvelope = async (
  envelopeId: number,
  amount: number,
  opts: DepositOpts = {}
): Promise<number> => {
  if (!(amount > 0)) throw new Error("Kwota musi być > 0");
  const db = getDb();

  const when = opts.date ?? pickDateForMonth(opts.year, opts.month1);
  const desc = opts.note ?? "Zasilenie koperty";

  await db.execAsync("BEGIN IMMEDIATE");
  try {
    const insert = await db.runAsync(
      `INSERT INTO entries
        (date, amount, subcategoryId, description, isArchived, depositEnvelopeId, financedEnvelopeId)
       VALUES
        (?,    ?,      ?,            ?,           0,          ?,                NULL)`,
      [when, amount, ENVELOPE_FUND_SUBCAT_ID, desc, envelopeId]
    );

    await db.runAsync(
      `UPDATE envelopes SET saldo = COALESCE(saldo, 0) + ? WHERE id = ?`,
      [amount, envelopeId]
    );

    await db.execAsync("COMMIT");
    return insert.lastInsertRowId as number;
  } catch (e) {
    await db.execAsync("ROLLBACK");
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
  return rows.map(
    r =>
      ({
        id: r.id,
        name: r.name,
        color: r.color,
        target: r.target ?? null,
        saldo: r.saldo ?? 0,
        finished: r.finished ?? null,
        closed: r.closed ?? null,
        iconId: r.iconId ?? null,
      } as Envelope)
  );
};

export const getEnvelopeById = async (id: number): Promise<Envelope | null> => {
  const db = getDb();
  const row = await db.getFirstAsync(
    `SELECT * FROM envelopes WHERE id = ?`,
    [id]
  ) as any;
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
  };
};

export const addEnvelope = async (
  name: string,
  color: string,
  target?: number | null
): Promise<number> => {
  const db = getDb();
  const res = await db.runAsync(
    `INSERT INTO envelopes (name, color, target, saldo) VALUES (?, ?, ?, 0)`,
    [name, color, target ?? null]
  );
  return res.lastInsertRowId as number;
};

