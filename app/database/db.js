import * as SQLite from 'expo-sqlite';

let db = null;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('budget.db');

  // Jednorazowe DROP-y - UWAGA: usuną WSZYSTKIE dane!
  // await db.execAsync(`
  //   DROP TABLE IF EXISTS config;
  //   DROP TABLE IF EXISTS entries;
  //   DROP TABLE IF EXISTS subcategories;
  //   DROP TABLE IF EXISTS categories;
  //   DROP TABLE IF EXISTS preset_subcategories;
  //   DROP TABLE IF EXISTS preset_categories;
  //   DROP TABLE IF EXISTS app_icons;
  // `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_icons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      iconId INTEGER NOT NULL,
      color TEXT NOT NULL,
      "limit" REAL, 
      FOREIGN KEY (iconId) REFERENCES app_icons(id)
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      iconId INTEGER NOT NULL,
      color TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      FOREIGN KEY (iconId) REFERENCES app_icons(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      subcategoryId INTEGER NOT NULL,
      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id)
    );

    CREATE TABLE IF NOT EXISTS preset_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      iconId INTEGER NOT NULL,
      color TEXT NOT NULL,
      "limit" REAL, 
      FOREIGN KEY (iconId) REFERENCES app_icons(id)
    );

    CREATE TABLE IF NOT EXISTS preset_subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      iconId INTEGER NOT NULL,
      color TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      FOREIGN KEY (iconId) REFERENCES app_icons(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );
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
    const { name, iconId, color, limit } = cat;
    const result = await db.runAsync(`INSERT INTO categories (name, iconId, color, "limit") VALUES (?, ?, ?, ?)`, [
      name,
      iconId,
      color,
      limit,
    ]);

    const newId = result.lastInsertRowId;
    categoryIdMap[cat.id] = newId;
  }

  const presetSubcategories = await db.getAllAsync(`SELECT * FROM preset_subcategories`);

  for (const sub of presetSubcategories) {
    const { name, iconId, color, categoryId } = sub;
    const mappedCategoryId = categoryIdMap[categoryId];

    if (!mappedCategoryId) {
      console.warn(`Brak zmapowanego categoryId dla preset_subcategory ${name}`);
      continue;
    }

    await db.runAsync(`INSERT INTO subcategories (name, iconId, color, categoryId) VALUES (?, ?, ?, ?)`, [
      name,
      iconId,
      color,
      mappedCategoryId,
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

  // Pobrane ID-ki ikon do mapowania (ikonki muszą już istnieć)
  const iconIdMap = {};
  const rows = await db.getAllAsync(`SELECT id, name FROM app_icons`);
  rows.forEach(row => {
    iconIdMap[row.name] = row.id;
  });

  const preset_categories = [
    { name: 'Przychód', iconId: 1, color: '#4CAF50' },
    { name: 'Rachunki i opłaty stałe', iconId: 2, color: '#FF9800' },
    { name: 'Żywność i przekąski', iconId: 3, color: '#FFC107' },
    { name: 'Jedzenie na wynos / dostawa', iconId: 4, color: '#FF5722' },
    { name: 'Rozrywka', iconId: 5, color: '#9C27B0' },
    { name: 'Alkohol', iconId: 6, color: '#795548' },
    { name: 'Dom i mieszkanie', iconId: 7, color: '#3F51B5' },
    { name: 'Transport', iconId: 8, color: '#2196F3' },
    { name: 'Zdrowie i higiena', iconId: 9, color: '#E91E63' },
    { name: 'Ubrania i obuwie', iconId: 10, color: '#00BCD4' },
    { name: 'Edukacja / rozwój', iconId: 11, color: '#009688' },
    { name: 'Inne', iconId: 12, color: '#9E9E9E' },
  ];

  for (const cat of preset_categories) {
    await db.runAsync(`INSERT INTO preset_categories (name, iconId, color, "limit") VALUES (?, ?, ?, ?)`, [
      cat.name,
      cat.iconId,
      cat.color,
      null,
    ]);
  }

  const preset_subcategories = [
    { id: 1, name: 'Wynagrodzenie', iconId: 13, categoryId: 1 },
    { id: 2, name: 'Inne', iconId: 14, categoryId: 1 },
    { id: 3, name: 'Czynsz', iconId: 15, categoryId: 2 },
    { id: 4, name: 'Prąd', iconId: 16, categoryId: 2 },
    { id: 5, name: 'Gaz', iconId: 17, categoryId: 2 },
    { id: 6, name: 'Woda', iconId: 18, categoryId: 2 },
    { id: 7, name: 'Telefon', iconId: 19, categoryId: 2 },
    { id: 8, name: 'Internet', iconId: 20, categoryId: 2 },
    { id: 9, name: 'Kredyt', iconId: 21, categoryId: 2 },
    { id: 10, name: 'Żywność', iconId: 22, categoryId: 3 },
    { id: 11, name: 'Przekąski', iconId: 23, categoryId: 3 },
    { id: 12, name: 'Glovo', iconId: 24, categoryId: 4 },
    { id: 13, name: 'Pyszne', iconId: 25, categoryId: 4 },
    { id: 14, name: 'Restauracja', iconId: 26, categoryId: 4 },
    { id: 15, name: 'Kino', iconId: 27, categoryId: 5 },
    { id: 16, name: 'Gry', iconId: 5, categoryId: 5 },
    { id: 17, name: 'Gry planszowe', iconId: 28, categoryId: 5 },
    { id: 18, name: 'Koncerty', iconId: 29, categoryId: 5 },
    { id: 19, name: 'Subskrypcje', iconId: 30, categoryId: 5 },
    { id: 20, name: 'Sklep', iconId: 3, categoryId: 6 },
    { id: 21, name: 'Na mieście', iconId: 31, categoryId: 6 },
    { id: 22, name: 'Środki czystości', iconId: 32, categoryId: 7 },
    { id: 23, name: 'Meble', iconId: 33, categoryId: 7 },
    { id: 24, name: 'Dekoracje', iconId: 34, categoryId: 7 },
    { id: 25, name: 'Sprzęty domowe', iconId: 35, categoryId: 7 },
    { id: 26, name: 'Paliwo moto', iconId: 24, categoryId: 8 },
    { id: 27, name: 'Paliwo auto', iconId: 33, categoryId: 8 },
    { id: 28, name: 'Naprawa moto', iconId: 34, categoryId: 8 },
    { id: 29, name: 'Naprawa auto', iconId: 35, categoryId: 8 },
    { id: 30, name: 'Ubezpieczenie moto', iconId: 39, categoryId: 8 },
    { id: 31, name: 'Ubezpieczenie auto', iconId: 40, categoryId: 8 },
    { id: 32, name: 'Taxi', iconId: 41, categoryId: 8 },
    { id: 33, name: 'Bilety', iconId: 42, categoryId: 8 },
    { id: 34, name: 'Leki', iconId: 43, categoryId: 9 },
    { id: 35, name: 'Lekarz', iconId: 44, categoryId: 9 },
    { id: 36, name: 'Kosmetyki', iconId: 45, categoryId: 9 },
    { id: 37, name: 'Fryzjer', iconId: 46, categoryId: 9 },
    { id: 38, name: 'Siłownia', iconId: 47, categoryId: 9 },
    { id: 39, name: 'Ubrania', iconId: 10, categoryId: 10 },
    { id: 40, name: 'Obuwie', iconId: 48, categoryId: 10 },
    { id: 41, name: 'Akcesoria', iconId: 49, categoryId: 10 },
    { id: 42, name: 'Książki', iconId: 50, categoryId: 11 },
    { id: 43, name: 'Kurs online', iconId: 51, categoryId: 11 },
    { id: 44, name: 'Szkolenie', iconId: 52, categoryId: 11 },
    { id: 45, name: 'Materiały edukacyjne', iconId: 53, categoryId: 11 },
    { id: 46, name: 'Subskrypcje', iconId: 30, categoryId: 11 },
    { id: 47, name: 'Inne zakupy', iconId: 54, categoryId: 12 },
    { id: 48, name: 'Niespodziewane wydatki', iconId: 55, categoryId: 12 },
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
