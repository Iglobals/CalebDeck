import { db } from './firebase';
import { doc, writeBatch } from 'firebase/firestore';

export const seedData = async () => {
    const batch = writeBatch(db);

    // 1. Hostels
    const hostels = [
        { id: 'deborah', name: 'Deborah Hall', gender: 'female', assignedRiderIds: [] },
        { id: 'mercy', name: 'Mercy Hall', gender: 'female', assignedRiderIds: [] },
        { id: 'mary', name: 'Mary Hall', gender: 'female', assignedRiderIds: [] },
        { id: 'esme', name: 'Esme Hall', gender: 'female', assignedRiderIds: [] },
        { id: 'rebecca', name: 'Rebecca Hall', gender: 'female', assignedRiderIds: [] },
        { id: 'sussana', name: 'Sussana Hall', gender: 'female', assignedRiderIds: [] },
        { id: 'levi', name: 'Levi Hall', gender: 'male', assignedRiderIds: [] },
        { id: 'integrity', name: 'Integrity Hall', gender: 'male', assignedRiderIds: [] },
        { id: 'elisha', name: 'Elisha Hall', gender: 'male', assignedRiderIds: [] },
        { id: 'joseph', name: 'Joseph Hall', gender: 'male', assignedRiderIds: [] },
        { id: 'joshua', name: 'Joshua Hall', gender: 'male', assignedRiderIds: [] },
    ];

    hostels.forEach((hostel) => {
        const ref = doc(db, 'hostels', hostel.id);
        batch.set(ref, { ...hostel, isActive: true }, { merge: true });
    });

    // Data Helpers
    const generateMenuForSection = (cafeteriaId: string, sectionId: 'front' | 'back', priceModifier = 1) => {
        const rawItems = [
            // Bases
            { baseId: 'jollof_rice', name: 'Jollof Rice', price: 600, category: 'base', unit: 'spoon' },
            { baseId: 'fried_rice', name: 'Fried Rice', price: 600, category: 'base', unit: 'spoon' },
            { baseId: 'white_rice', name: 'White Rice', price: 600, category: 'base', unit: 'spoon' },
            { baseId: 'jollof_spaghetti', name: 'Jollof Spaghetti', price: 600, category: 'base', unit: 'portion' },
            { baseId: 'rice_and_beans', name: 'Rice and Beans', price: 800, category: 'base', unit: 'portion' },
            { baseId: 'noodles', name: 'Noodles', price: 500, category: 'base', unit: 'portion' },
            // Proteins
            { baseId: 'meat', name: 'Meat', price: 500, category: 'protein', unit: 'piece' },
            { baseId: 'fish_tail', name: 'Fried Fish (Tail)', price: 800, category: 'protein', unit: 'piece' },
            { baseId: 'fish_middle', name: 'Fried Fish (Middle)', price: 500, category: 'protein', unit: 'piece' },
            { baseId: 'chicken_lg', name: 'Chicken (Large)', price: 2500, category: 'protein', unit: 'piece' },
            { baseId: 'chicken_md', name: 'Chicken (Medium)', price: 2000, category: 'protein', unit: 'piece' },
            { baseId: 'assorted_1000', name: 'Assorted Meat (1000)', price: 1000, category: 'protein', unit: 'piece' },
            { baseId: 'assorted_500', name: 'Assorted Meat (500)', price: 500, category: 'protein', unit: 'piece' },
            { baseId: 'fried_eggs', name: 'Fried Eggs', price: 200, category: 'protein', unit: 'piece' },
            // Swallows
            { baseId: 'semo', name: 'Semo', price: 200, category: 'swallow', unit: 'wrap' },
            { baseId: 'eba', name: 'Eba', price: 200, category: 'swallow', unit: 'wrap' },
            // Soups
            { baseId: 'oha_soup', name: 'Oha Soup', price: 500, category: 'soup', unit: 'portion' },
            { baseId: 'egusi_soup', name: 'Egusi Soup', price: 300, category: 'soup', unit: 'portion' },
            // Extras
            { baseId: 'moimoi_leaf', name: 'Moi-moi (Leaf)', price: 400, category: 'extra', unit: 'wrap' },
            { baseId: 'moimoi_plastic', name: 'Moi-moi (Plastic)', price: 300, category: 'extra', unit: 'cup' },
            { baseId: 'plantain', name: 'Plantain', price: 300, category: 'extra', unit: 'portion' },
            // Snacks
            { baseId: 'meat_pie', name: 'Meat Pie', price: 1200, category: 'snack', unit: 'piece' },
            { baseId: 'doughnuts', name: 'Doughnuts', price: 300, category: 'snack', unit: 'piece' },
            { baseId: 'egg_roll', name: 'Egg Roll', price: 500, category: 'snack', unit: 'piece' },
            { baseId: 'puff_puff', name: 'Puff Puff', price: 100, category: 'snack', unit: 'piece' },
            // Drinks
            { baseId: 'bottle_water', name: 'Bottle Water', price: 200, category: 'drink', unit: 'bottle' },
            { baseId: 'soft_drink', name: 'Bottle Soda', price: 500, category: 'drink', unit: 'bottle' },
            { baseId: 'can_drink', name: 'Can Drink', price: 600, category: 'drink', unit: 'can' },
            { baseId: 'chivita_exotic', name: 'Chivita Exotic', price: 850, category: 'drink', unit: 'pack' },
        ];

        return rawItems.map(item => {
            const id = `${cafeteriaId}_${sectionId}_${item.baseId}`;
            const imageBase = item.baseId.replace(/_/g, '-');
            return {
                id,
                name: item.name,
                price: Math.round(item.price * priceModifier),
                category: item.category,
                isAvailable: true,
                unit: item.unit,
                cafeteriaId,
                sectionId,
                image: `/food-images/${imageBase}.jpg`
            };
        });
    };

    // Generate for all combinations
    const allItems = [
        ...generateMenuForSection('old', 'front', 1),
        ...generateMenuForSection('old', 'back', 1.1),  // Back is slightly more expensive in old cafe example
        ...generateMenuForSection('new', 'front', 1.5), // New cafe is generally more expensive
        ...generateMenuForSection('new', 'back', 1.6),
    ];

    allItems.forEach((item) => {
        const ref = doc(db, 'menu_items', item.id);
        batch.set(ref, item, { merge: true });
    });

    console.log(`Seeding ${allItems.length} menu items across all sections...`);

    try {
        await batch.commit();
        console.log("Seeding complete.");
    } catch (error) {
        console.error("Error seeding data:", error);
    }
};
