import * as SQLite from 'expo-sqlite';
import { ENVELOPE_FUND_SUBCAT_ID, OTHER_INCOME_SUBCAT_ID, OTHER_EXPENSES_SUBCAT_ID } from '../config/constants';

let db = null;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('budget.db');
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  // await db.execAsync(`
  //   DROP TABLE IF EXISTS preset_subcategories;
  //   DROP TABLE IF EXISTS preset_categories;
  //   DROP TABLE IF EXISTS category_limits;
  //   DROP TABLE IF EXISTS monthly_aggregates;
  //   DROP TABLE IF EXISTS envelope_transfers;
  //   DROP TABLE IF EXISTS entries;
  //   DROP TABLE IF EXISTS envelopes;
  //   DROP TABLE IF EXISTS subcategories;
  //   DROP TABLE IF EXISTS categories;
  //   DROP TABLE IF EXISTS app_icons;
  //   DROP TABLE IF EXISTS config;
  // `);

  await db.execAsync(`
    ------------------------------
    -- Konfiguracja
    ------------------------------
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    ------------------------------
    -- Ikony (UI)
    ------------------------------
    CREATE TABLE IF NOT EXISTS app_icons (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    ------------------------------
    -- Kategorie / Podkategorie
    -- positive: 1=dochód, 0=wydatek
    -- isDefault: narzucona systemowo
    ------------------------------
    CREATE TABLE IF NOT EXISTS categories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      iconId    INTEGER,
      color     TEXT NOT NULL DEFAULT '#9E9E9E',
      positive  INTEGER NOT NULL DEFAULT 0 CHECK (positive IN (0,1)),
      isDefault INTEGER NOT NULL DEFAULT 0 CHECK (isDefault IN (0,1)),
      FOREIGN KEY (iconId) REFERENCES app_icons(id)
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      iconId      INTEGER,
      color       TEXT NOT NULL DEFAULT '#9E9E9E',
      categoryId  INTEGER NOT NULL,
      isDefault   INTEGER NOT NULL DEFAULT 0 CHECK (isDefault IN (0,1)),
      FOREIGN KEY (iconId) REFERENCES app_icons(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_subcategories_categoryId ON subcategories(categoryId);

    ------------------------------
    -- Limity kategorii
    ------------------------------
    CREATE TABLE IF NOT EXISTS category_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL,
      year INTEGER,
      month INTEGER,
      "limit" REAL NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_cat_limits_global
      ON category_limits(categoryId)
      WHERE year IS NULL AND month IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS ux_cat_limits_year
      ON category_limits(categoryId, year)
      WHERE month IS NULL AND year IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS ux_cat_limits_month
      ON category_limits(categoryId, year, month)
      WHERE month IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_category_limits_cat_year_month
      ON category_limits(categoryId, year, month);


    ------------------------------
    -- Entries (z obsługą kopert)
    ------------------------------
    CREATE TABLE IF NOT EXISTS entries (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      date               TEXT    NOT NULL, -- ISO YYYY-MM-DD
      amount             REAL    NOT NULL CHECK (amount >= 0),
      subcategoryId      INTEGER NOT NULL,
      description        TEXT,
      isArchived         INTEGER NOT NULL DEFAULT 0 CHECK (isArchived IN (0,1)),
      depositEnvelopeId  INTEGER REFERENCES envelopes(id) ON DELETE RESTRICT,
      financedEnvelopeId INTEGER REFERENCES envelopes(id) ON DELETE RESTRICT,

      -- nie można mieć jednocześnie wpłaty i finansowania
      CHECK (NOT (depositEnvelopeId IS NOT NULL AND financedEnvelopeId IS NOT NULL)),

      -- jeżeli to wpłata do koperty, to subkategoria musi być „Zasilenia kopert”
      CHECK (depositEnvelopeId IS NULL OR subcategoryId = ${ENVELOPE_FUND_SUBCAT_ID}),

      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date          ON entries(date);
    CREATE INDEX IF NOT EXISTS idx_entries_subcategoryId ON entries(subcategoryId);
    CREATE INDEX IF NOT EXISTS idx_entries_archived      ON entries(isArchived);
    CREATE INDEX IF NOT EXISTS idx_entries_dep_env       ON entries(depositEnvelopeId);
    CREATE INDEX IF NOT EXISTS idx_entries_fin_env       ON entries(financedEnvelopeId);

    ------------------------------
    -- Koperty
    ------------------------------
    CREATE TABLE IF NOT EXISTS envelopes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL UNIQUE,
    iconId    INTEGER,
    color     TEXT NOT NULL DEFAULT '#4F7CAC',
    target    REAL,
    saldo     REAL,
    finished  TEXT DEFAULT NULL, -- ISO YYYY-MM-DD (cel osiągnięty)
    closed    TEXT DEFAULT NULL, -- rozwiązana bez realizacji celu
    entryId   INTEGER DEFAULT NULL REFERENCES entries(id) ON DELETE SET NULL,
    FOREIGN KEY (iconId) REFERENCES app_icons(id)
    );

    ------------------------------
    -- Miesięczne agregaty
    ------------------------------
    CREATE TABLE IF NOT EXISTS monthly_aggregates (
      year                    INTEGER NOT NULL,
      month                   INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      income_total            REAL NOT NULL DEFAULT 0,
      expense_total           REAL NOT NULL DEFAULT 0,
      fund_in_total           REAL NOT NULL DEFAULT 0,
      fund_out_total          REAL NOT NULL DEFAULT 0,
      covered_from_buffer     REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (year, month)
    );

    ------------------------------
    -- Presety
    ------------------------------
    CREATE TABLE IF NOT EXISTS preset_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      iconId INTEGER NOT NULL,
      color TEXT NOT NULL,
      positive INTEGER NOT NULL DEFAULT 0,
      isDefault INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (iconId) REFERENCES app_icons(id)
    );

    CREATE TABLE IF NOT EXISTS preset_subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      iconId INTEGER NOT NULL,
      color TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (iconId) REFERENCES app_icons(id)
    );
  `);

  await insertInitialData();
  await checAndInsertPresetData();
};


export const getDb = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};


export const insertInitialData = async () => {
  db = await getDb();
  if (!db) return;

  const result = await db.getFirstAsync(`SELECT value FROM config WHERE key = ?`, ['base_iniciated']);

  if (result?.value === 'true') {
    console.log('Base already populated, skipping...');
    return;
  }

  const icons = [
    'cash-plus',
    'file-document-outline',
    'cart-outline',
    'food-outline',
    'gamepad-variant-outline',
    'beer-outline',
    'home-outline',
    'car-outline',
    'medical-bag',
    'tshirt-crew-outline',
    'school-outline',
    'dots-horizontal-circle-outline',
    'cash-multiple',
    'gift-outline',
    'home-city-outline',
    'flash-outline',
    'fire',
    'water-outline',
    'cellphone',
    'wifi',
    'bank-outline',
    'food-apple-outline',
    'cookie-outline',
    'motorbike',
    'silverware-fork-knife',
    'silverware',
    'filmstrip',
    'chess-queen',
    'music-circle-outline',
    'play-circle-outline',
    'glass-cocktail',
    'broom',
    'sofa',
    'flower-outline',
    'washing-machine',
    'gas-station',
    'wrench-outline',
    'car-wrench',
    'shield-outline',
    'shield-car',
    'taxi',
    'ticket-outline',
    'pill',
    'stethoscope',
    'lipstick',
    'content-cut',
    'dumbbell',
    'shoe-sneaker',
    'watch-variant',
    'book-outline',
    'laptop',
    'account-tie-outline',
    'notebook-outline',
    'basket-outline',
    'alert-circle-outline',
    'email-plus-outline',
    'email-outline',
  ];

  for (const name of icons) {
    await db.runAsync(`INSERT OR IGNORE INTO app_icons (name) VALUES (?)`, [name]);
  }

  await db.runAsync(
    `INSERT INTO categories (id, name, iconId, color, positive, isDefault) VALUES (1, 'Dochód', 1, '#4CAF50', 1, 1)`
  );
  await db.runAsync(
    `INSERT INTO categories (id, name, iconId, color, positive, isDefault) VALUES (2, 'Pozostałe', 12, '#9E9E9E', 0, 1)`
  );

  await db.runAsync(
    `INSERT INTO subcategories (id, name, iconId, color, categoryId, isDefault) VALUES (${OTHER_INCOME_SUBCAT_ID}, 'Pozostałe dochody', 14, '#9E9E9E', 1, 1)`
  );
  await db.runAsync(
    `INSERT INTO subcategories (id, name, iconId, color, categoryId, isDefault) VALUES (${ENVELOPE_FUND_SUBCAT_ID}, 'Zasilenia kopert', 56, '#9E9E9E', 2, 1)`
  );
  await db.runAsync(
    `INSERT INTO subcategories (id, name, iconId, color, categoryId, isDefault) VALUES (${OTHER_EXPENSES_SUBCAT_ID}, 'Inne zakupy', 54, '#9E9E9E', 2, 1)`
  );
  await db.runAsync(
    `INSERT INTO subcategories (id, name, iconId, color, categoryId, isDefault) VALUES (4, 'Niespodziewane wydatki', 55, '#9E9E9E', 2, 1)`
  );

  const preset_categories = [
    { name: 'Rachunki i opłaty stałe', iconId: 2, color: '#FF9800' }, // START OD ID 4
    { name: 'Żywność i przekąski', iconId: 3, color: '#FFC107' }, // 5
    { name: 'Jedzenie na wynos / dostawa', iconId: 4, color: '#FF5722' }, // 6
    { name: 'Rozrywka', iconId: 5, color: '#9C27B0' }, // 7
    { name: 'Alkohol', iconId: 6, color: '#795548' }, // 8
    { name: 'Dom i mieszkanie', iconId: 7, color: '#3F51B5' }, // 9
    { name: 'Transport', iconId: 8, color: '#2196F3' }, // 10
    { name: 'Zdrowie i higiena', iconId: 9, color: '#E91E63' }, // 11
    { name: 'Ubrania i obuwie', iconId: 10, color: '#00BCD4' }, // 12
    { name: 'Edukacja / rozwój', iconId: 11, color: '#009688' }, // 13
  ];

  for (const cat of preset_categories) {
    await db.runAsync(`INSERT INTO preset_categories (name, iconId, color) VALUES (?, ?, ?)`, [
      cat.name,
      cat.iconId,
      cat.color,
    ]);
  }

  const preset_subcategories = [
    { id: 5, name: 'Wynagrodzenie', iconId: 13, categoryId: 1 },
    { id: 6, name: 'Czynsz', iconId: 15, categoryId: 3 },
    { id: 7, name: 'Prąd', iconId: 16, categoryId: 3 },
    { id: 8, name: 'Gaz', iconId: 17, categoryId: 3 },
    { id: 9, name: 'Woda', iconId: 18, categoryId: 3 },
    { id: 10, name: 'Telefon', iconId: 19, categoryId: 3 },
    { id: 11, name: 'Internet', iconId: 20, categoryId: 3 },
    { id: 12, name: 'Kredyt', iconId: 21, categoryId: 3 },
    { id: 13, name: 'Żywność', iconId: 22, categoryId: 4 },
    { id: 14, name: 'Przekąski', iconId: 23, categoryId: 4 },
    { id: 15, name: 'Glovo', iconId: 24, categoryId: 5 },
    { id: 16, name: 'Pyszne', iconId: 25, categoryId: 5 },
    { id: 17, name: 'Restauracja', iconId: 26, categoryId: 5 },
    { id: 18, name: 'Kino', iconId: 27, categoryId: 6 },
    { id: 19, name: 'Gry', iconId: 5, categoryId: 6 },
    { id: 20, name: 'Gry planszowe', iconId: 28, categoryId: 6 },
    { id: 21, name: 'Koncerty', iconId: 29, categoryId: 6 },
    { id: 22, name: 'Subskrypcje', iconId: 30, categoryId: 6 },
    { id: 23, name: 'Sklep', iconId: 3, categoryId: 7 },
    { id: 24, name: 'Na mieście', iconId: 31, categoryId: 7 },
    { id: 25, name: 'Środki czystości', iconId: 32, categoryId: 8 },
    { id: 26, name: 'Meble', iconId: 33, categoryId: 8 },
    { id: 27, name: 'Dekoracje', iconId: 34, categoryId: 8 },
    { id: 28, name: 'Sprzęty domowe', iconId: 35, categoryId: 8 },
    { id: 29, name: 'Paliwo moto', iconId: 24, categoryId: 9 },
    { id: 30, name: 'Paliwo auto', iconId: 36, categoryId: 9 },
    { id: 31, name: 'Naprawa moto', iconId: 37, categoryId: 9 },
    { id: 32, name: 'Naprawa auto', iconId: 38, categoryId: 9 },
    { id: 33, name: 'Ubezpieczenie moto', iconId: 39, categoryId: 9 },
    { id: 34, name: 'Ubezpieczenie auto', iconId: 40, categoryId: 9 },
    { id: 35, name: 'Taxi', iconId: 41, categoryId: 9 },
    { id: 36, name: 'Bilety', iconId: 42, categoryId: 9 },
    { id: 37, name: 'Leki', iconId: 43, categoryId: 10 },
    { id: 38, name: 'Lekarz', iconId: 44, categoryId: 10 },
    { id: 39, name: 'Kosmetyki', iconId: 45, categoryId: 10 },
    { id: 40, name: 'Fryzjer', iconId: 46, categoryId: 10 },
    { id: 41, name: 'Siłownia', iconId: 47, categoryId: 10 },
    { id: 42, name: 'Ubrania', iconId: 10, categoryId: 11 },
    { id: 43, name: 'Obuwie', iconId: 48, categoryId: 11 },
    { id: 44, name: 'Akcesoria', iconId: 49, categoryId: 11 },
    { id: 45, name: 'Książki', iconId: 50, categoryId: 12 },
    { id: 46, name: 'Kurs online', iconId: 51, categoryId: 12 },
    { id: 47, name: 'Szkolenie', iconId: 52, categoryId: 12 },
    { id: 48, name: 'Materiały edukacyjne', iconId: 53, categoryId: 12 },
    { id: 49, name: 'Subskrypcje', iconId: 30, categoryId: 12 },
  ];

  for (const sub of preset_subcategories) {
    await db.runAsync(`INSERT INTO preset_subcategories (id, name, iconId, categoryId, color) VALUES (?, ?, ?, ?, ?)`, [
      sub.id,
      sub.name,
      sub.iconId,
      sub.categoryId,
      '#ccc',
    ]);
  }

  await db.runAsync(`INSERT INTO config (key, value) VALUES ('base_iniciated', 'true')`);
  await db.runAsync(`INSERT INTO config (key, value) VALUES ('preset_inserted', 'false')`);
  console.log('Database successfuly populated.');
};

export const checAndInsertPresetData = async () => {
  db = await getDb();
  if (!db) return;

  const result = await db.getFirstAsync(`SELECT value FROM config WHERE key = ?`, ['preset_inserted']);

  if (result?.value === 'true') {
    console.log('Preset data already copied to prod, skipping...');
    return;
  }

  const presetCategories = await db.getAllAsync(`SELECT * FROM preset_categories`);
  const categoryIdMap = {};
  for (const cat of presetCategories) {
    const res = await db.runAsync(
      `INSERT INTO categories (name, iconId, color, positive, isDefault) VALUES (?, ?, ?, ?, ?)`,
      [cat.name, cat.iconId, cat.color, 0, 0]
    );
    categoryIdMap[cat.name] = res.lastInsertRowId;
  }

  const presetSubcategories = await db.getAllAsync(`SELECT * FROM preset_subcategories`);

  for (const sub of presetSubcategories) {
    const { name, iconId, color, categoryId } = sub;
    await db.runAsync(`INSERT INTO subcategories (name, iconId, color, categoryId, isDefault) VALUES (?, ?, ?, ?, ?)`, [
      name,
      iconId,
      color,
      categoryId,
      0,
    ]);
  }

  await db.runAsync(`UPDATE config SET value = ? WHERE key = ?`, ['true', 'preset_inserted']);

  console.log('Preset data copied and config updated.');
};
