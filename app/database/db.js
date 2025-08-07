import * as SQLite from 'expo-sqlite';

let db = null;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('budget.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      subcategoryId INTEGER NOT NULL,
      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id)
    );
  `);

  await insertInitialData();
};

const insertInitialData = async () => {
  if (!db) return;

  const categories = [
    { id: 1, name: 'Przychód', icon: 'cash-plus' },
    { id: 2, name: 'Rachunki i opłaty stałe', icon: 'file-document-outline' },
    { id: 3, name: 'Żywność i przekąski', icon: 'cart-outline' },
    { id: 4, name: 'Jedzenie na wynos / dostawa', icon: 'food-outline' },
    { id: 5, name: 'Rozrywka', icon: 'gamepad-variant-outline' },
    { id: 6, name: 'Alkohol', icon: 'beer-outline' },
    { id: 7, name: 'Dom i mieszkanie', icon: 'home-outline' },
    { id: 8, name: 'Transport', icon: 'car-outline' },
    { id: 9, name: 'Zdrowie i higiena', icon: 'medical-bag' },
    { id: 10, name: 'Ubrania i obuwie', icon: 'tshirt-crew-outline' },
    { id: 11, name: 'Edukacja / rozwój', icon: 'school-outline' },
    { id: 12, name: 'Inne', icon: 'dots-horizontal-circle-outline' },
  ];

  const subcategories = [
    { id: 1, name: 'Wynagrodzenie', icon: 'cash-multiple', categoryId: 1 },
    { id: 2, name: 'Inne', icon: 'gift-outline', categoryId: 1 },
    { id: 3, name: 'Czynsz', icon: 'home-city-outline', categoryId: 2 },
    { id: 4, name: 'Prąd', icon: 'flash-outline', categoryId: 2 },
    { id: 5, name: 'Gaz', icon: 'fire', categoryId: 2 },
    { id: 6, name: 'Woda', icon: 'water-outline', categoryId: 2 },
    { id: 7, name: 'Telefon', icon: 'cellphone', categoryId: 2 },
    { id: 8, name: 'Internet', icon: 'wifi', categoryId: 2 },
    { id: 9, name: 'Kredyt', icon: 'bank-outline', categoryId: 2 },
    { id: 10, name: 'Żywność', icon: 'food-apple-outline', categoryId: 3 },
    { id: 11, name: 'Przekąski', icon: 'cookie-outline', categoryId: 3 },
    { id: 12, name: 'Glovo', icon: 'motorbike', categoryId: 4 },
    { id: 13, name: 'Pyszne', icon: 'silverware-fork-knife', categoryId: 4 },
    { id: 14, name: 'Restauracja', icon: 'silverware', categoryId: 4 },
    { id: 15, name: 'Kino', icon: 'filmstrip', categoryId: 5 },
    { id: 16, name: 'Gry', icon: 'gamepad-variant-outline', categoryId: 5 },
    { id: 17, name: 'Gry planszowe', icon: 'chess-queen', categoryId: 5 },
    { id: 18, name: 'Koncerty', icon: 'music-circle-outline', categoryId: 5 },
    { id: 19, name: 'Subskrypcje', icon: 'play-circle-outline', categoryId: 5 },
    { id: 20, name: 'Sklep', icon: 'cart-outline', categoryId: 6 },
    { id: 21, name: 'Na mieście', icon: 'glass-cocktail', categoryId: 6 },
    { id: 22, name: 'Środki czystości', icon: 'broom', categoryId: 7 },
    { id: 23, name: 'Meble', icon: 'sofa', categoryId: 7 },
    { id: 24, name: 'Dekoracje', icon: 'flower-outline', categoryId: 7 },
    { id: 25, name: 'Sprzęty domowe', icon: 'washing-machine', categoryId: 7 },
    { id: 26, name: 'Paliwo moto', icon: 'motorbike', categoryId: 8 },
    { id: 27, name: 'Paliwo auto', icon: 'gas-station', categoryId: 8 },
    { id: 28, name: 'Naprawa moto', icon: 'wrench-outline', categoryId: 8 },
    { id: 29, name: 'Naprawa auto', icon: 'car-wrench', categoryId: 8 },
    { id: 30, name: 'Ubezpieczenie moto', icon: 'shield-outline', categoryId: 8 },
    { id: 31, name: 'Ubezpieczenie auto', icon: 'shield-car', categoryId: 8 },
    { id: 32, name: 'Taxi', icon: 'taxi', categoryId: 8 },
    { id: 33, name: 'Bilety', icon: 'ticket-outline', categoryId: 8 },
    { id: 34, name: 'Leki', icon: 'pill', categoryId: 9 },
    { id: 35, name: 'Lekarz', icon: 'stethoscope', categoryId: 9 },
    { id: 36, name: 'Kosmetyki', icon: 'lipstick', categoryId: 9 },
    { id: 37, name: 'Fryzjer', icon: 'content-cut', categoryId: 9 },
    { id: 38, name: 'Siłownia', icon: 'dumbbell', categoryId: 9 },
    { id: 39, name: 'Ubrania', icon: 'tshirt-crew-outline', categoryId: 10 },
    { id: 40, name: 'Obuwie', icon: 'shoe-sneaker', categoryId: 10 },
    { id: 41, name: 'Akcesoria', icon: 'watch-variant', categoryId: 10 },
    { id: 42, name: 'Książki', icon: 'book-outline', categoryId: 11 },
    { id: 43, name: 'Kurs online', icon: 'laptop', categoryId: 11 },
    { id: 44, name: 'Szkolenie', icon: 'account-tie-outline', categoryId: 11 },
    { id: 45, name: 'Materiały edukacyjne', icon: 'notebook-outline', categoryId: 11 },
    { id: 46, name: 'Subskrypcje', icon: 'play-circle-outline', categoryId: 11 },
    { id: 47, name: 'Inne zakupy', icon: 'basket-outline', categoryId: 12 },
    { id: 48, name: 'Niespodziewane wydatki', icon: 'alert-circle-outline', categoryId: 12 },
  ];

  for (const cat of categories) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, icon) VALUES (?, ?, ?)`,
      [cat.id, cat.name, cat.icon]
    );
  }

  for (const sub of subcategories) {
    await db.runAsync(
      `INSERT OR IGNORE INTO subcategories (id, name, icon, categoryId) VALUES (?, ?, ?, ?)`,
      [sub.id, sub.name, sub.icon, sub.categoryId]
    );
  }
};

export const getDb = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

