import { DisplayCategory } from "../model/Spendings";

export const mockCategories: DisplayCategory[] = [
  {
    id: 1,
    name: 'Przychód',
    icon: 'cash-plus',
    sum: 5000,
    subcategories: [
      { id: 1, name: 'Wynagrodzenie', icon: 'cash-multiple', sum: 4500 },
      { id: 2, name: 'Inne', icon: 'gift-outline', sum: 500 },
    ],
  },
  {
    id: 2,
    name: 'Rachunki i opłaty stałe',
    icon: 'file-document-outline',
    sum: 800,
    subcategories: [
      { id: 1, name: 'Czynsz', icon: 'home-city-outline', sum: 300 },
      { id: 2, name: 'Prąd', icon: 'flash-outline', sum: 100 },
      { id: 3, name: 'Gaz', icon: 'fire', sum: 80 },
      { id: 4, name: 'Woda', icon: 'water-outline', sum: 60 },
      { id: 5, name: 'Telefon', icon: 'cellphone', sum: 100 },
      { id: 6, name: 'Internet', icon: 'wifi', sum: 60 },
      { id: 7, name: 'Kredyt', icon: 'bank-outline', sum: 100 },
    ],
  },
  {
    id: 3,
    name: 'Żywność i przekąski',
    icon: 'cart-outline',
    sum: 1000,
    subcategories: [
      { id: 1, name: 'Żywność', icon: 'food-apple-outline', sum: 800 },
      { id: 2, name: 'Przekąski', icon: 'cookie-outline', sum: 200 },
    ],
  },
  {
    id: 4,
    name: 'Jedzenie na wynos / dostawa',
    icon: 'food-outline',
    sum: 400,
    subcategories: [
      { id: 1, name: 'Glovo', icon: 'motorbike', sum: 150 },
      { id: 2, name: 'Pyszne', icon: 'silverware-fork-knife', sum: 150 },
      { id: 3, name: 'Restauracja', icon: 'silverware', sum: 100 },
    ],
  },
  {
    id: 5,
    name: 'Rozrywka',
    icon: 'gamepad-variant-outline',
    sum: 300,
    subcategories: [
      { id: 1, name: 'Kino', icon: 'filmstrip', sum: 100 },
      { id: 2, name: 'Gry', icon: 'gamepad-variant-outline', sum: 50 },
      { id: 3, name: 'Koncerty', icon: 'music-circle-outline', sum: 50 },
      { id: 4, name: 'Subskrypcje', icon: 'play-circle-outline', sum: 100 },
    ],
  },
  {
    id: 6,
    name: 'Alkohol',
    icon: 'beer-outline',
    sum: 200,
    subcategories: [
      { id: 1, name: 'Sklep', icon: 'cart-outline', sum: 120 },
      { id: 2, name: 'Na mieście', icon: 'glass-cocktail', sum: 80 },
    ],
  },
  {
    id: 7,
    name: 'Dom i mieszkanie',
    icon: 'home-outline',
    sum: 500,
    subcategories: [
      { id: 1, name: 'Środki czystości', icon: 'broom', sum: 100 },
      { id: 2, name: 'Meble', icon: 'sofa', sum: 200 },
      { id: 3, name: 'Dekoracje', icon: 'flower-outline', sum: 100 },
      { id: 4, name: 'Sprzęty domowe', icon: 'washing-machine', sum: 100 },
    ],
  },
  {
    id: 8,
    name: 'Transport',
    icon: 'car-outline',
    sum: 600,
    subcategories: [
      { id: 1, name: 'Paliwo moto', icon: 'motorbike', sum: 100 },
      { id: 2, name: 'Paliwo auto', icon: 'gas-station', sum: 200 },
      { id: 3, name: 'Naprawa moto', icon: 'wrench-outline', sum: 50 },
      { id: 4, name: 'Naprawa auto', icon: 'car-wrench', sum: 50 },
      { id: 5, name: 'Ubezpieczenie moto', icon: 'shield-outline', sum: 50 },
      { id: 6, name: 'Ubezpieczenie auto', icon: 'shield-car', sum: 50 },
      { id: 7, name: 'Taxi', icon: 'taxi', sum: 50 },
      { id: 8, name: 'Bilety', icon: 'ticket-outline', sum: 50 },
    ],
  },
  {
    id: 9,
    name: 'Zdrowie i higiena',
    icon: 'medical-bag',
    sum: 350,
    subcategories: [
      { id: 1, name: 'Leki', icon: 'pill', sum: 100 },
      { id: 2, name: 'Lekarz', icon: 'stethoscope', sum: 100 },
      { id: 3, name: 'Kosmetyki', icon: 'lipstick', sum: 50 },
      { id: 4, name: 'Fryzjer', icon: 'content-cut', sum: 50 },
      { id: 5, name: 'Siłownia', icon: 'dumbbell', sum: 50 },
    ],
  },
  {
    id: 10,
    name: 'Ubrania i obuwie',
    icon: 'tshirt-crew-outline',
    sum: 300,
    subcategories: [
      { id: 1, name: 'Ubrania', icon: 'tshirt-crew-outline', sum: 200 },
      { id: 2, name: 'Obuwie', icon: 'shoe-sneaker', sum: 80 },
      { id: 3, name: 'Akcesoria', icon: 'watch-variant', sum: 20 },
    ],
  },
  {
    id: 11,
    name: 'Edukacja / rozwój',
    icon: 'school-outline',
    sum: 200,
    subcategories: [
      { id: 1, name: 'Książki', icon: 'book-outline', sum: 50 },
      { id: 2, name: 'Kurs online', icon: 'laptop', sum: 50 },
      { id: 3, name: 'Szkolenie', icon: 'account-tie-outline', sum: 50 },
      { id: 4, name: 'Materiały edukacyjne', icon: 'notebook-outline', sum: 25 },
      { id: 5, name: 'Subskrypcje', icon: 'play-circle-outline', sum: 25 },
    ],
  },
  {
    id: 12,
    name: 'Inne',
    icon: 'dots-horizontal-circle-outline',
    sum: 100,
    subcategories: [
      { id: 1, name: 'Inne zakupy', icon: 'basket-outline', sum: 50 },
      { id: 2, name: 'Niespodziewane wydatki', icon: 'alert-circle-outline', sum: 50 },
    ],
  }
];
