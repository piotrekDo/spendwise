import { getDb } from './db';

export const addEntry = async (subcategoryId, amount, description, date) => {
  const db = getDb();
  await db.runAsync(`INSERT INTO entries (amount, description, date, subcategoryId) VALUES (?, ?, ?, ?)`, [
    amount,
    description,
    date,
    subcategoryId,
  ]);
};

export const getEntriesForSubcategory = (subcategoryId, callback) => {
  const db = getDb();
  db.transaction(tx => {
    tx.executeSql(
      `SELECT * FROM entries WHERE subcategoryId = ? ORDER BY date DESC`,
      [subcategoryId],
      (_, { rows }) => {
        callback(rows._array);
      }
    );
  });
};

export const deleteEntry = entryId => {
  const db = getDb();
  db.transaction(tx => {
    tx.executeSql(`DELETE FROM entries WHERE id = ?`, [entryId]);
  });
};

export const updateEntry = (entryId, amount, description, date) => {
  const db = getDb();
  db.transaction(tx => {
    tx.executeSql(`UPDATE entries SET amount = ?, description = ?, date = ? WHERE id = ?`, [
      amount,
      description,
      date,
      entryId,
    ]);
  });
};
