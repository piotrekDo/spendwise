import * as SQLite from 'expo-sqlite';

let db = null;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('budget.db');
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    DROP TABLE IF EXISTS preset_subcategories;
    DROP TABLE IF EXISTS preset_categories;
    DROP TABLE IF EXISTS category_limits;
    DROP TABLE IF EXISTS monthly_aggregates;
    DROP TABLE IF EXISTS envelope_transfers;
    DROP TABLE IF EXISTS envelopes;
    DROP TABLE IF EXISTS entries;
    DROP TABLE IF EXISTS subcategories;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS category_limits;
    DROP TABLE IF EXISTS app_icons;
    DROP TABLE IF EXISTS config;
  `);

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


    CREATE TABLE IF NOT EXISTS entries (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT    NOT NULL, -- ISO YYYY-MM-DD
      amount         REAL    NOT NULL CHECK (amount >= 0),
      subcategoryId  INTEGER NOT NULL,
      description    TEXT,
      isArchived     INTEGER NOT NULL DEFAULT 0 CHECK (isArchived IN (0,1)),
      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
    CREATE INDEX IF NOT EXISTS idx_entries_subcategoryId ON entries(subcategoryId);
    CREATE INDEX IF NOT EXISTS idx_entries_archived ON entries(isArchived);

    ------------------------------
    -- Koperty (fundusze ciągłe)
    -- isBuffer=1 => specjalna koperta „Bufor operacyjny” (unikat)
    ------------------------------
    CREATE TABLE IF NOT EXISTS envelopes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL UNIQUE,
      iconId    INTEGER,
      color     TEXT NOT NULL DEFAULT '#4F7CAC',
      target    REAL,
      isBuffer  INTEGER NOT NULL DEFAULT 0 CHECK (isBuffer IN (0,1)),
      FOREIGN KEY (iconId) REFERENCES app_icons(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_envelopes_buffer ON envelopes(isBuffer) WHERE isBuffer=1;

    ------------------------------
    -- Transfery kopert
    -- NULL -> envelope     : zasilenie koperty z budżetu miesiąca (alokacja)
    -- envelope -> NULL     : wypłata z koperty „na świat” (np. pokrycie)
    -- envelope -> envelope : przesunięcie między kopertami
    ------------------------------
    CREATE TABLE IF NOT EXISTS envelope_transfers (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      date             TEXT    NOT NULL, -- ISO YYYY-MM-DD
      fromEnvelopeId   INTEGER,
      toEnvelopeId     INTEGER,
      amount           REAL    NOT NULL CHECK (amount > 0),
      note             TEXT,
      FOREIGN KEY (fromEnvelopeId) REFERENCES envelopes(id),
      FOREIGN KEY (toEnvelopeId)   REFERENCES envelopes(id),
      CHECK (NOT (fromEnvelopeId IS NULL AND toEnvelopeId IS NULL))
    );

    CREATE INDEX IF NOT EXISTS idx_transfers_date ON envelope_transfers(date);
    CREATE INDEX IF NOT EXISTS idx_transfers_from ON envelope_transfers(fromEnvelopeId, date);
    CREATE INDEX IF NOT EXISTS idx_transfers_to   ON envelope_transfers(toEnvelopeId, date);

    ------------------------------
    -- Miesięczne agregaty (aktualizowane triggerami)
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

  

  // --- TRIGGERS: ENTRIES ---
  // Zmiany w entries wpływają na income_total/expense_total przez JOIN do categories.positive
  await db.execAsync(`
-- AFTER INSERT
CREATE TRIGGER IF NOT EXISTS trg_entries_ai
AFTER INSERT ON entries
BEGIN
  INSERT INTO monthly_aggregates(year, month, income_total, expense_total)
  VALUES (
    CAST(strftime('%Y', NEW.date) AS INTEGER),
    CAST(strftime('%m', NEW.date) AS INTEGER),
    CASE WHEN (SELECT c.positive
               FROM subcategories s JOIN categories c ON c.id = s.categoryId
               WHERE s.id = NEW.subcategoryId) = 1 THEN NEW.amount ELSE 0 END,
    CASE WHEN (SELECT c.positive
               FROM subcategories s JOIN categories c ON c.id = s.categoryId
               WHERE s.id = NEW.subcategoryId) = 0 THEN NEW.amount ELSE 0 END
  )
  ON CONFLICT(year, month) DO UPDATE SET
    income_total  = income_total  + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = NEW.subcategoryId) = 1 THEN NEW.amount ELSE 0 END,
    expense_total = expense_total + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = NEW.subcategoryId) = 0 THEN NEW.amount ELSE 0 END;
END;


-- AFTER DELETE
CREATE TRIGGER IF NOT EXISTS trg_entries_ad
AFTER DELETE ON entries
BEGIN
  INSERT INTO monthly_aggregates(year, month, income_total, expense_total)
  VALUES (
    CAST(strftime('%Y', OLD.date) AS INTEGER),
    CAST(strftime('%m', OLD.date) AS INTEGER),
    CASE WHEN (SELECT c.positive
               FROM subcategories s JOIN categories c ON c.id = s.categoryId
               WHERE s.id = OLD.subcategoryId) = 1 THEN -OLD.amount ELSE 0 END,
    CASE WHEN (SELECT c.positive
               FROM subcategories s JOIN categories c ON c.id = s.categoryId
               WHERE s.id = OLD.subcategoryId) = 0 THEN -OLD.amount ELSE 0 END
  )
  ON CONFLICT(year, month) DO UPDATE SET
    income_total  = income_total  + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = OLD.subcategoryId) = 1 THEN -OLD.amount ELSE 0 END,
    expense_total = expense_total + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = OLD.subcategoryId) = 0 THEN -OLD.amount ELSE 0 END;
END;


-- AFTER UPDATE — tylko gdy zmienia się amount
CREATE TRIGGER IF NOT EXISTS trg_entries_au
AFTER UPDATE OF amount ON entries
WHEN OLD.amount != NEW.amount
BEGIN
  -- Odejmij stary wpływ
  INSERT INTO monthly_aggregates(year, month, income_total, expense_total)
  VALUES (
    CAST(strftime('%Y', OLD.date) AS INTEGER),
    CAST(strftime('%m', OLD.date) AS INTEGER),
    CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = OLD.subcategoryId) = 1 THEN -OLD.amount ELSE 0 END,
    CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = OLD.subcategoryId) = 0 THEN -OLD.amount ELSE 0 END
  )
  ON CONFLICT(year, month) DO UPDATE SET
    income_total  = income_total  + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = OLD.subcategoryId) = 1 THEN -OLD.amount ELSE 0 END,
    expense_total = expense_total + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = OLD.subcategoryId) = 0 THEN -OLD.amount ELSE 0 END;

  -- Dodaj nowy wpływ
  INSERT INTO monthly_aggregates(year, month, income_total, expense_total)
  VALUES (
    CAST(strftime('%Y', NEW.date) AS INTEGER),
    CAST(strftime('%m', NEW.date) AS INTEGER),
    CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = NEW.subcategoryId) = 1 THEN NEW.amount ELSE 0 END,
    CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = NEW.subcategoryId) = 0 THEN NEW.amount ELSE 0 END
  )
  ON CONFLICT(year, month) DO UPDATE SET
    income_total  = income_total  + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = NEW.subcategoryId) = 1 THEN NEW.amount ELSE 0 END,
    expense_total = expense_total + CASE WHEN (SELECT c.positive FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = NEW.subcategoryId) = 0 THEN NEW.amount ELSE 0 END;
END;
  `);

  // --- TRIGGERS: ENVELOPE TRANSFERS ---
  // NULL->env => fund_in_total+, env->NULL => fund_out_total+, a jeśli from isBuffer=1 => covered_from_buffer+
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_transfers_ai
    AFTER INSERT ON envelope_transfers
    BEGIN
      -- Alokacja do koperty
      INSERT INTO monthly_aggregates(year, month, fund_in_total)
      SELECT CAST(strftime('%Y', NEW.date) AS INTEGER), CAST(strftime('%m', NEW.date) AS INTEGER), NEW.amount
      WHERE NEW.fromEnvelopeId IS NULL AND NEW.toEnvelopeId IS NOT NULL
      ON CONFLICT(year, month) DO UPDATE SET fund_in_total = fund_in_total + NEW.amount;

      -- Wypłata z koperty
      INSERT INTO monthly_aggregates(year, month, fund_out_total, covered_from_buffer)
      SELECT
        CAST(strftime('%Y', NEW.date) AS INTEGER),
        CAST(strftime('%m', NEW.date) AS INTEGER),
        NEW.amount,
        CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=NEW.fromEnvelopeId)=1 THEN NEW.amount ELSE 0 END
      WHERE NEW.fromEnvelopeId IS NOT NULL AND NEW.toEnvelopeId IS NULL
      ON CONFLICT(year, month) DO UPDATE SET
        fund_out_total = fund_out_total + NEW.amount,
        covered_from_buffer = covered_from_buffer + CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=NEW.fromEnvelopeId)=1 THEN NEW.amount ELSE 0 END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_transfers_ad
    AFTER DELETE ON envelope_transfers
    BEGIN
      -- Rewers alokacji
      INSERT INTO monthly_aggregates(year, month, fund_in_total)
      SELECT CAST(strftime('%Y', OLD.date) AS INTEGER), CAST(strftime('%m', OLD.date) AS INTEGER), -OLD.amount
      WHERE OLD.fromEnvelopeId IS NULL AND OLD.toEnvelopeId IS NOT NULL
      ON CONFLICT(year, month) DO UPDATE SET fund_in_total = fund_in_total - OLD.amount;

      -- Rewers wypłaty
      INSERT INTO monthly_aggregates(year, month, fund_out_total, covered_from_buffer)
      SELECT
        CAST(strftime('%Y', OLD.date) AS INTEGER),
        CAST(strftime('%m', OLD.date) AS INTEGER),
        -OLD.amount,
        CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=OLD.fromEnvelopeId)=1 THEN -OLD.amount ELSE 0 END
      WHERE OLD.fromEnvelopeId IS NOT NULL AND OLD.toEnvelopeId IS NULL
      ON CONFLICT(year, month) DO UPDATE SET
        fund_out_total = fund_out_total - OLD.amount,
        covered_from_buffer = covered_from_buffer + CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=OLD.fromEnvelopeId)=1 THEN -OLD.amount ELSE 0 END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_transfers_au
    AFTER UPDATE OF date, fromEnvelopeId, toEnvelopeId, amount ON envelope_transfers
    BEGIN
      -- odejmij stary wpływ
      INSERT INTO monthly_aggregates(year, month, fund_in_total)
      SELECT CAST(strftime('%Y', OLD.date) AS INTEGER), CAST(strftime('%m', OLD.date) AS INTEGER), -OLD.amount
      WHERE OLD.fromEnvelopeId IS NULL AND OLD.toEnvelopeId IS NOT NULL
      ON CONFLICT(year, month) DO UPDATE SET fund_in_total = fund_in_total - OLD.amount;

      INSERT INTO monthly_aggregates(year, month, fund_out_total, covered_from_buffer)
      SELECT
        CAST(strftime('%Y', OLD.date) AS INTEGER),
        CAST(strftime('%m', OLD.date) AS INTEGER),
        -OLD.amount,
        CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=OLD.fromEnvelopeId)=1 THEN -OLD.amount ELSE 0 END
      WHERE OLD.fromEnvelopeId IS NOT NULL AND OLD.toEnvelopeId IS NULL
      ON CONFLICT(year, month) DO UPDATE SET
        fund_out_total = fund_out_total - OLD.amount,
        covered_from_buffer = covered_from_buffer + CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=OLD.fromEnvelopeId)=1 THEN -OLD.amount ELSE 0 END;

      -- dodaj nowy wpływ
      INSERT INTO monthly_aggregates(year, month, fund_in_total)
      SELECT CAST(strftime('%Y', NEW.date) AS INTEGER), CAST(strftime('%m', NEW.date) AS INTEGER), NEW.amount
      WHERE NEW.fromEnvelopeId IS NULL AND NEW.toEnvelopeId IS NOT NULL
      ON CONFLICT(year, month) DO UPDATE SET fund_in_total = fund_in_total + NEW.amount;

      INSERT INTO monthly_aggregates(year, month, fund_out_total, covered_from_buffer)
      SELECT
        CAST(strftime('%Y', NEW.date) AS INTEGER),
        CAST(strftime('%m', NEW.date) AS INTEGER),
        NEW.amount,
        CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=NEW.fromEnvelopeId)=1 THEN NEW.amount ELSE 0 END
      WHERE NEW.fromEnvelopeId IS NOT NULL AND NEW.toEnvelopeId IS NULL
      ON CONFLICT(year, month) DO UPDATE SET
        fund_out_total = fund_out_total + NEW.amount,
        covered_from_buffer = covered_from_buffer + CASE WHEN (SELECT isBuffer FROM envelopes WHERE id=NEW.fromEnvelopeId)=1 THEN NEW.amount ELSE 0 END;
    END;
  `);
  await insertInitialData();
  await checAndInsertPresetData();
};

const checAndInsertPresetData = async () => {
  if (!db) return;

  const result = await db.getFirstAsync(`SELECT value FROM config WHERE key = ?`, ['preset_inserted']);

  if (result?.value === 'true') {
    console.log('Preset data already copied to prod, skipping...');
    return;
  }

  const presetCategories = await db.getAllAsync(`SELECT * FROM preset_categories`);
  const categoryIdMap = {};
  for (const cat of presetCategories) {
    const result = await db.runAsync(
      `INSERT INTO categories (name, iconId, color, positive, isDefault) VALUES (?, ?, ?, ?, ?)`,
      [cat.name, cat.iconId, cat.color, 0, 0]
    );
    categoryIdMap[cat.name] = result.lastInsertRowId;
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

const insertInitialData = async () => {
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
    `INSERT INTO subcategories (id, name, iconId, color, categoryId, isDefault) VALUES (1, 'Pozostałe dochody', 14, '#9E9E9E', 1, 1)`
  );
  await db.runAsync(
    `INSERT INTO subcategories (id, name, iconId, color, categoryId, isDefault) VALUES (2, 'Inne zakupy', 54, '#9E9E9E', 2, 1)`
  );
  await db.runAsync(
    `INSERT INTO subcategories (id, name, iconId, color, categoryId, isDefault) VALUES (3, 'Niespodziewane wydatki', 55, '#9E9E9E', 2, 1)`
  );

  const preset_categories = [
    { name: 'Rachunki i opłaty stałe', iconId: 2, color: '#FF9800' }, // START OD ID 3
    { name: 'Żywność i przekąski', iconId: 3, color: '#FFC107' }, // 4
    { name: 'Jedzenie na wynos / dostawa', iconId: 4, color: '#FF5722' }, // 5
    { name: 'Rozrywka', iconId: 5, color: '#9C27B0' }, //6
    { name: 'Alkohol', iconId: 6, color: '#795548' }, //7
    { name: 'Dom i mieszkanie', iconId: 7, color: '#3F51B5' }, //8
    { name: 'Transport', iconId: 8, color: '#2196F3' }, //9
    { name: 'Zdrowie i higiena', iconId: 9, color: '#E91E63' }, //10
    { name: 'Ubrania i obuwie', iconId: 10, color: '#00BCD4' }, //11
    { name: 'Edukacja / rozwój', iconId: 11, color: '#009688' }, //12
  ];

  for (const cat of preset_categories) {
    await db.runAsync(`INSERT INTO preset_categories (name, iconId, color) VALUES (?, ?, ?)`, [
      cat.name,
      cat.iconId,
      cat.color,
    ]);
  }

  const preset_subcategories = [
    { id: 4, name: 'Wynagrodzenie', iconId: 13, categoryId: 1 },
    { id: 5, name: 'Czynsz', iconId: 15, categoryId: 3 },
    { id: 6, name: 'Prąd', iconId: 16, categoryId: 3 },
    { id: 7, name: 'Gaz', iconId: 17, categoryId: 3 },
    { id: 8, name: 'Woda', iconId: 18, categoryId: 3 },
    { id: 9, name: 'Telefon', iconId: 19, categoryId: 3 },
    { id: 10, name: 'Internet', iconId: 20, categoryId: 3 },
    { id: 11, name: 'Kredyt', iconId: 21, categoryId: 3 },
    { id: 12, name: 'Żywność', iconId: 22, categoryId: 4 },
    { id: 13, name: 'Przekąski', iconId: 23, categoryId: 4 },
    { id: 14, name: 'Glovo', iconId: 24, categoryId: 5 },
    { id: 15, name: 'Pyszne', iconId: 25, categoryId: 5 },
    { id: 16, name: 'Restauracja', iconId: 26, categoryId: 5 },
    { id: 17, name: 'Kino', iconId: 27, categoryId: 6 },
    { id: 18, name: 'Gry', iconId: 5, categoryId: 6 },
    { id: 19, name: 'Gry planszowe', iconId: 28, categoryId: 6 },
    { id: 20, name: 'Koncerty', iconId: 29, categoryId: 6 },
    { id: 21, name: 'Subskrypcje', iconId: 30, categoryId: 6 },
    { id: 22, name: 'Sklep', iconId: 3, categoryId: 7 },
    { id: 23, name: 'Na mieście', iconId: 31, categoryId: 7 },
    { id: 24, name: 'Środki czystości', iconId: 32, categoryId: 8 },
    { id: 25, name: 'Meble', iconId: 33, categoryId: 8 },
    { id: 26, name: 'Dekoracje', iconId: 34, categoryId: 8 },
    { id: 27, name: 'Sprzęty domowe', iconId: 35, categoryId: 8 },
    { id: 28, name: 'Paliwo moto', iconId: 24, categoryId: 9 },
    { id: 29, name: 'Paliwo auto', iconId: 36, categoryId: 9 },
    { id: 30, name: 'Naprawa moto', iconId: 37, categoryId: 9 },
    { id: 31, name: 'Naprawa auto', iconId: 38, categoryId: 9 },
    { id: 32, name: 'Ubezpieczenie moto', iconId: 39, categoryId: 9 },
    { id: 33, name: 'Ubezpieczenie auto', iconId: 40, categoryId: 9 },
    { id: 34, name: 'Taxi', iconId: 41, categoryId: 9 },
    { id: 35, name: 'Bilety', iconId: 42, categoryId: 9 },
    { id: 36, name: 'Leki', iconId: 43, categoryId: 10 },
    { id: 37, name: 'Lekarz', iconId: 44, categoryId: 10 },
    { id: 38, name: 'Kosmetyki', iconId: 45, categoryId: 10 },
    { id: 39, name: 'Fryzjer', iconId: 46, categoryId: 10 },
    { id: 40, name: 'Siłownia', iconId: 47, categoryId: 10 },
    { id: 41, name: 'Ubrania', iconId: 10, categoryId: 11 },
    { id: 42, name: 'Obuwie', iconId: 48, categoryId: 11 },
    { id: 43, name: 'Akcesoria', iconId: 49, categoryId: 11 },
    { id: 44, name: 'Książki', iconId: 50, categoryId: 12 },
    { id: 45, name: 'Kurs online', iconId: 51, categoryId: 12 },
    { id: 46, name: 'Szkolenie', iconId: 52, categoryId: 12 },
    { id: 47, name: 'Materiały edukacyjne', iconId: 53, categoryId: 12 },
    { id: 48, name: 'Subskrypcje', iconId: 30, categoryId: 12 },
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

export const getDb = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};
