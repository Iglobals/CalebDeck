import { seedCombos } from './db';

// This file contains the initial combo data used for seeding Firestore.
// Combos are managed by admins in Firestore after seeding.

export interface ComboItemSeed {
  name: string;
  quantity: number;
}

export interface ComboSeed {
  name: string;
  tagline: string;
  cafeteria: 'new' | 'old';
  section: 'all' | 'front' | 'back' | 'none';
  items: ComboItemSeed[];
  basePrice: number;
  imageName: string;
}

const initialCombos: ComboSeed[] = [
  // NEW CAFE
  {
    name: 'Levi Prime Bistro',
    tagline: 'The perfect rice & fish combo',
    cafeteria: 'new',
    section: 'all',
    basePrice: 3000,
    imageName: 'combo_rice_chicken',
    items: [
      { name: 'Rice (Jollof/Fried/Mixed) - 2 Portions', quantity: 1 },
      { name: 'Fish Tail', quantity: 1 },
      { name: 'Plastic Moi Moi', quantity: 1 },
      { name: 'Drink (Fanta/Coke/Pepsi)', quantity: 1 },
      { name: 'Takeaway Pack', quantity: 1 }
    ]
  },
  {
    name: 'Caleb Prime Bistro',
    tagline: 'Simple, satisfying, classic',
    cafeteria: 'new',
    section: 'all',
    basePrice: 2400,
    imageName: 'combo_rice_chicken',
    items: [
      { name: 'Rice (Jollof/Fried/Mixed) - 2 Portions', quantity: 1 },
      { name: 'Middle Fish/Meat', quantity: 1 },
      { name: 'Drink (Fanta/Coke/Pepsi)', quantity: 1 },
      { name: 'Takeaway Pack', quantity: 1 }
    ]
  },
  {
    name: 'Urban Prime Bistro',
    tagline: 'The ultimate feast',
    cafeteria: 'new',
    section: 'all',
    basePrice: 5900,
    imageName: 'combo_rice_chicken',
    items: [
      { name: 'Rice (Jollof/Fried/Mixed) - 2 Portions', quantity: 1 },
      { name: 'Chicken', quantity: 1 },
      { name: 'Plastic Moi Moi', quantity: 2 },
      { name: 'Drink (Fanta/Coke/Pepsi)', quantity: 1 },
      { name: 'Bottle Water', quantity: 1 },
      { name: 'Caleb Bread', quantity: 1 },
      { name: 'Takeaway Pack', quantity: 1 }
    ]
  },
  {
    name: 'Royal Deck Bistro',
    tagline: 'Eat like royalty',
    cafeteria: 'new',
    section: 'all',
    basePrice: 8900,
    imageName: 'combo_rice_chicken',
    items: [
      { name: 'Rice/Spaghetti/Basmati - 2 Portions', quantity: 1 },
      { name: 'Chicken', quantity: 1 },
      { name: 'Chivita Active (Big Size)', quantity: 1 },
      { name: 'Bottle Water', quantity: 1 },
      { name: 'Caleb Roll', quantity: 2 },
      { name: 'Takeaway Pack', quantity: 1 }
    ]
  },
  {
    name: 'Native Bistro (Swallow Special 1)',
    tagline: 'Authentic local flavors',
    cafeteria: 'new',
    section: 'back',
    basePrice: 3100,
    imageName: 'combo_swallow',
    items: [
      { name: 'Swallow (Eba/Semo) - 4 Wraps', quantity: 1 },
      { name: 'Egusi Soup - 2 Portions', quantity: 1 },
      { name: 'Assorted Meat', quantity: 1 },
      { name: 'Drink (Fanta/Coke)', quantity: 1 },
      { name: 'Takeaway Pack', quantity: 1 }
    ]
  },
  {
    name: 'Native Bistro (Swallow Special 2)',
    tagline: 'Rich & hearty swallow',
    cafeteria: 'new',
    section: 'back',
    basePrice: 3700,
    imageName: 'combo_swallow',
    items: [
      { name: 'Swallow (Eba/Semo/Amala) - 4 Wraps', quantity: 1 },
      { name: 'Efo/Oha Soup - 2 Portions', quantity: 1 },
      { name: 'Assorted Meat', quantity: 1 },
      { name: 'Drink (Fanta/Coke/Pepsi)', quantity: 1 },
      { name: 'Bottle Water', quantity: 1 },
      { name: 'Takeaway Pack', quantity: 1 }
    ]
  },
  {
    name: 'Quickdeck Specials',
    tagline: 'Snack time perfection',
    cafeteria: 'new',
    section: 'all',
    basePrice: 2900,
    imageName: 'combo_snacks',
    items: [
      { name: 'Veggies Roll or 4 Doughnuts', quantity: 1 },
      { name: 'Caleb Roll', quantity: 2 },
      { name: 'Drink (Fanta/Coke/Pepsi)', quantity: 1 }
    ]
  },
  {
    name: 'Snackdeck Specials',
    tagline: 'Sweet and savory mix',
    cafeteria: 'new',
    section: 'all',
    basePrice: 2600,
    imageName: 'combo_snacks',
    items: [
      { name: 'Caleb Roll', quantity: 2 },
      { name: 'Doughnuts', quantity: 3 },
      { name: 'Drink (Fanta/Coke/Pepsi)', quantity: 1 }
    ]
  },
  {
    name: 'Captain Grill Bistro',
    tagline: 'Chicken, chips & everything nice',
    cafeteria: 'new',
    section: 'all',
    basePrice: 6200,
    imageName: 'combo_rice_chicken',
    items: [
      { name: 'Chicken & Chips Box + Ketchup', quantity: 1 },
      { name: 'Extra Ketchup', quantity: 1 },
      { name: 'Extra Chips', quantity: 1 },
      { name: 'Chivita Exotic (Big Size)', quantity: 1 }
    ]
  },
  
  // OLD CAFE
  {
    name: 'Daily Delight',
    tagline: 'Start your day right',
    cafeteria: 'old',
    section: 'none',
    basePrice: 2700,
    imageName: 'combo_basic',
    items: [
      { name: 'Ewa Agoyin Beans - 2 Portions', quantity: 1 },
      { name: 'Egg', quantity: 1 },
      { name: 'Bread', quantity: 1 },
      { name: 'Takeaway Pack', quantity: 1 }
    ]
  },
  {
    name: 'Sussana Comfort Box',
    tagline: 'Feel at home',
    cafeteria: 'old',
    section: 'none',
    basePrice: 2800,
    imageName: 'combo_basic',
    items: [
      { name: 'White Rice - 2 Portions', quantity: 1 },
      { name: 'Plastic Moi Moi', quantity: 2 },
      { name: 'Tail Fish', quantity: 1 },
      { name: 'Takeaway Plate', quantity: 1 },
      { name: 'Bottle Water', quantity: 1 }
    ]
  }
];

/**
 * Seeds the Firestore combo_packs collection with initial data.
 * Only runs if the collection is empty.
 * Returns the number of combos seeded.
 */
export const seedInitialCombos = async (): Promise<number> => {
  return await seedCombos(initialCombos);
};
