import { db } from './firebase';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';

export const seedData = async () => {
    const batch = writeBatch(db);

    // 2. Riders
    const riders = [
        { id: 'rider_samuel', name: 'Samuel Alabi', phone: '08012345678', dept: 'Engineering', status: 'available', assignedHostelIds: ['deborah', 'mercy', 'mary'] },
        { id: 'rider_daniel', name: 'Daniel Okon', phone: '08123456789', dept: 'Physical Sciences', status: 'busy', assignedHostelIds: ['levi', 'integrity', 'elisha'] },
        { id: 'rider_favour', name: 'Favour Adeeye', phone: '09034567890', dept: 'Arts', status: 'available', assignedHostelIds: ['sussana', 'rebecca', 'esme'] },
    ];

    riders.forEach((rider) => {
        const ref = doc(db, 'riders', rider.id);
        batch.set(ref, rider, { merge: true });
    });

    // Update Hostels with Rider IDs
    const hostelsWithRiders = [
        { id: 'deborah', name: 'Deborah Hall', gender: 'female', assignedRiderIds: ['rider_samuel'] },
        { id: 'mercy', name: 'Mercy Hall', gender: 'female', assignedRiderIds: ['rider_samuel'] },
        { id: 'mary', name: 'Mary Hall', gender: 'female', assignedRiderIds: ['rider_samuel'] },
        { id: 'esme', name: 'Esme Hall', gender: 'female', assignedRiderIds: ['rider_favour'] },
        { id: 'rebecca', name: 'Rebecca Hall', gender: 'female', assignedRiderIds: ['rider_favour'] },
        { id: 'sussana', name: 'Sussana Hall', gender: 'female', assignedRiderIds: ['rider_favour'] },
        { id: 'levi', name: 'Levi Hall', gender: 'male', assignedRiderIds: ['rider_daniel'] },
        { id: 'integrity', name: 'Integrity Hall', gender: 'male', assignedRiderIds: ['rider_daniel'] },
        { id: 'elisha', name: 'Elisha Hall', gender: 'male', assignedRiderIds: ['rider_daniel'] },
        { id: 'joseph', name: 'Joseph Hall', gender: 'male', assignedRiderIds: ['rider_daniel'] },
        { id: 'joshua', name: 'Joshua Hall', gender: 'male', assignedRiderIds: ['rider_daniel'] },
    ];

    hostelsWithRiders.forEach((hostel) => {
        const ref = doc(db, 'hostels', hostel.id);
        batch.set(ref, { ...hostel, isActive: true }, { merge: true });
    });

    // 3. Menu Items
    const mapToFirebaseItem = (cafeteriaId: string, sectionId: 'front' | 'back', item: any) => {
        const id = `${cafeteriaId}_${sectionId}_${item.baseId}`;
        const imageBase = item.baseId.replace(/_/g, '-');
        return {
            id,
            name: item.name,
            price: item.price,
            category: item.category,
            isAvailable: true,
            unit: item.unit,
            cafeteriaId,
            sectionId,
            image: `/food-images/${imageBase}.jpg`
        };
    };

    // Keep Old Cafe generator for now
    const generateOldMenu = (sectionId: 'front' | 'back', priceModifier = 1) => {
        const rawItems = [
            { baseId: 'jollof_rice', name: 'Jollof Rice', price: 600, category: 'base', unit: 'portion' },
            { baseId: 'fried_rice', name: 'Fried Rice', price: 600, category: 'base', unit: 'portion' },
            { baseId: 'white_rice', name: 'White Rice', price: 600, category: 'base', unit: 'portion' },
            { baseId: 'jollof_spaghetti', name: 'Jollof Spaghetti', price: 600, category: 'base', unit: 'portion' },
            { baseId: 'rice_and_beans', name: 'Rice and Beans', price: 800, category: 'base', unit: 'portion' },
            { baseId: 'noodles', name: 'Noodles', price: 500, category: 'base', unit: 'pack' },
            { baseId: 'meat', name: 'Meat', price: 500, category: 'protein', unit: 'piece' },
            { baseId: 'fish_tail', name: 'Fried Fish (Tail)', price: 800, category: 'protein', unit: 'piece' },
            { baseId: 'fish_middle', name: 'Fried Fish (Middle)', price: 500, category: 'protein', unit: 'piece' },
            { baseId: 'chicken_lg', name: 'Chicken (Large)', price: 2500, category: 'protein', unit: 'piece' },
            { baseId: 'chicken_md', name: 'Chicken (Medium)', price: 2000, category: 'protein', unit: 'piece' },
            { baseId: 'assorted_1000', name: 'Assorted Meat (1000)', price: 1000, category: 'protein', unit: 'piece' },
            { baseId: 'assorted_500', name: 'Assorted Meat (500)', price: 500, category: 'protein', unit: 'piece' },
            { baseId: 'fried_eggs', name: 'Fried Eggs', price: 200, category: 'protein', unit: 'piece' },
            { baseId: 'semo', name: 'Semo', price: 200, category: 'swallow', unit: 'wrap' },
            { baseId: 'eba', name: 'Eba', price: 200, category: 'swallow', unit: 'wrap' },
            { baseId: 'oha_soup', name: 'Oha Soup', price: 500, category: 'soup', unit: 'portion' },
            { baseId: 'egusi_soup', name: 'Egusi Soup', price: 300, category: 'soup', unit: 'portion' },
            { baseId: 'moimoi_leaf', name: 'Moi-moi (Leaf)', price: 400, category: 'protein', unit: 'wrap' },
            { baseId: 'moimoi_plastic', name: 'Moi-moi (Plastic)', price: 300, category: 'protein', unit: 'cup' },
            { baseId: 'plantain', name: 'Plantain', price: 300, category: 'protein', unit: 'portion' },
            { baseId: 'meat_pie', name: 'Meat Pie', price: 1200, category: 'snack', unit: 'piece' },
            { baseId: 'doughnuts', name: 'Doughnuts', price: 300, category: 'snack', unit: 'piece' },
            { baseId: 'egg_roll', name: 'Egg Roll', price: 500, category: 'snack', unit: 'piece' },
            { baseId: 'puff_puff', name: 'Puff Puff', price: 100, category: 'snack', unit: 'piece' },
            { baseId: 'bottle_water', name: 'Bottle Water', price: 200, category: 'drink', unit: 'bottle' },
            { baseId: 'soft_drink', name: 'Bottle Soda', price: 500, category: 'drink', unit: 'bottle' },
            { baseId: 'can_drink', name: 'Can Drink', price: 600, category: 'drink', unit: 'can' },
            { baseId: 'chivita_exotic', name: 'Chivita Exotic', price: 850, category: 'drink', unit: 'pack' },
        ].map(item => ({ ...item, price: Math.round(item.price * priceModifier) }));
        
        return rawItems.map(item => mapToFirebaseItem('old', sectionId, item));
    };

    const newFrontRaw = [
        // Bases
        { baseId: 'jollof_rice', name: 'Jollof Rice', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'fried_rice', name: 'Fried Rice', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'white_rice', name: 'White Rice', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'rice_and_beans', name: 'Rice & Beans', price: 800, category: 'base', unit: 'portion' },
        { baseId: 'chicken_and_chips', name: 'Chicken & Chips', price: 3000, category: 'base', unit: 'portion' },
        { baseId: 'jollof_spaghetti', name: 'Jollof Spaghetti', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'white_spaghetti', name: 'White Spaghetti', price: 800, category: 'base', unit: 'portion' },
        { baseId: 'toast_bread_and_egg', name: 'Toast Bread & Egg', price: 800, category: 'base', unit: 'portion' },
        { baseId: 'noodles', name: 'Noodles', price: 500, category: 'base', unit: 'pack' },
        
        // Proteins & Sides
        { baseId: 'moimoi_leaf', name: 'Moi Moi (Leaf)', price: 400, category: 'protein', unit: 'wrap' },
        { baseId: 'moimoi_plastic', name: 'Moi Moi (Plastic)', price: 300, category: 'protein', unit: 'cup' },
        { baseId: 'fish_tail', name: 'Fried Fish (Titus Tail)', price: 800, category: 'protein', unit: 'piece' },
        { baseId: 'fish_middle', name: 'Fried Fish (Titus Middle)', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'meat', name: 'Meat', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'chicken_lg', name: 'Chicken (Large)', price: 2500, category: 'protein', unit: 'piece' },
        { baseId: 'chicken_md', name: 'Chicken (Medium)', price: 2000, category: 'protein', unit: 'piece' },
        { baseId: 'assorted_lg', name: 'Assorted Meat (Large)', price: 1000, category: 'protein', unit: 'piece' },
        { baseId: 'assorted_sm', name: 'Assorted Meat (Small)', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'plantain', name: 'Plantain', price: 300, category: 'protein', unit: 'portion' },
        { baseId: 'fried_eggs', name: 'Fried Eggs', price: 200, category: 'protein', unit: 'piece' },
        { baseId: 'extra_chips', name: 'Extra Chips', price: 1200, category: 'protein', unit: 'portion' },
        { baseId: 'suya', name: 'Suya', price: 1000, category: 'protein', unit: 'portion' },
        { baseId: 'ketchup', name: 'Ketchup', price: 200, category: 'protein', unit: 'portion' },

        // Snacks & Pastries
        { baseId: 'meat_pie', name: 'Meat Pie', price: 1200, category: 'snack', unit: 'piece' },
        { baseId: 'veggy_roll', name: 'Veggy Roll', price: 1200, category: 'snack', unit: 'piece' },
        { baseId: 'caleb_roll', name: 'Caleb Roll', price: 600, category: 'snack', unit: 'piece' },
        { baseId: 'egg_roll', name: 'Egg Roll', price: 500, category: 'snack', unit: 'piece' },
        { baseId: 'doughnuts', name: 'Doughnuts', price: 300, category: 'snack', unit: 'piece' },
        { baseId: 'puff_puff', name: 'Puff Puff', price: 100, category: 'snack', unit: 'piece' },
        { baseId: 'unsliced_bread', name: 'Unsliced Bread (Big)', price: 1200, category: 'snack', unit: 'loaf' },
        { baseId: 'shawarma', name: 'Shawarma', price: 2000, category: 'snack', unit: 'wrap' },

        // Beverages
        { baseId: 'bottle_water', name: 'Bottle Water', price: 200, category: 'drink', unit: 'bottle' },
        { baseId: 'pepsi_family', name: 'Pepsi / Mirinda / 7up / Teem', price: 500, category: 'drink', unit: 'bottle' },
        { baseId: 'coke_family', name: 'Coke / Fanta / Limca / Schweppes', price: 500, category: 'drink', unit: 'bottle' },
        { baseId: 'aoao_can', name: 'Aoao Can', price: 600, category: 'drink', unit: 'can' },
        { baseId: 'chivita_exotic_sm', name: 'Chivita Exotic (Small)', price: 700, category: 'drink', unit: 'pack' },
        { baseId: 'chivita_exotic_md', name: 'Chivita Exotic (Medium)', price: 850, category: 'drink', unit: 'pack' },
        { baseId: 'chivita_exotic_bg', name: 'Chivita Exotic (Big)', price: 1800, category: 'drink', unit: 'pack' },
        { baseId: 'ice_tea_sm', name: 'Ice Tea (Small)', price: 700, category: 'drink', unit: 'bottle' },
        { baseId: 'ice_tea_bg', name: 'Ice Tea (Big)', price: 1200, category: 'drink', unit: 'bottle' },
        { baseId: 'five_alive', name: '5 Alive', price: 1500, category: 'drink', unit: 'pack' },
        { baseId: 'nutri_milk', name: 'Nutri Milk', price: 600, category: 'drink', unit: 'bottle' },
        { baseId: 'dudu_drink', name: 'Dudu Drink', price: 600, category: 'drink', unit: 'bottle' },
        { baseId: 'nutri_choco', name: 'Nutri Choco', price: 900, category: 'drink', unit: 'bottle' },
        { baseId: 'viju_chocolate', name: 'Viju Chocolate', price: 1100, category: 'drink', unit: 'bottle' },
        { baseId: 'sosa_sm', name: 'Sosa (Small)', price: 450, category: 'drink', unit: 'bottle' },
        { baseId: 'sosa_bg', name: 'Sosa (Big)', price: 1000, category: 'drink', unit: 'bottle' },
    ];

    const newBackRaw = [
        // Bases
        { baseId: 'jollof_rice', name: 'Jollof Rice', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'fried_rice', name: 'Fried Rice', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'white_rice', name: 'White Rice', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'rice_and_beans', name: 'Rice & Beans', price: 800, category: 'base', unit: 'portion' },
        { baseId: 'basmati_rice', name: 'Basmati Rice', price: 1500, category: 'base', unit: 'portion' },
        { baseId: 'ofada_rice', name: 'Ofada Rice', price: 1300, category: 'base', unit: 'portion' },
        { baseId: 'waakye_rice', name: 'Waakye Rice', price: 800, category: 'base', unit: 'portion' },
        { baseId: 'asun_jollof_rice', name: 'Asun Jollof Rice', price: 1500, category: 'base', unit: 'portion' },
        { baseId: 'asun_fried_rice', name: 'Asun Fried Rice', price: 1500, category: 'base', unit: 'portion' },
        { baseId: 'jollof_spaghetti', name: 'Jollof Spaghetti', price: 600, category: 'base', unit: 'portion' },
        { baseId: 'asun_spaghetti', name: 'Asun Spaghetti', price: 1500, category: 'base', unit: 'portion' },
        { baseId: 'white_spaghetti', name: 'White Spaghetti', price: 800, category: 'base', unit: 'portion' },
        { baseId: 'chicken_and_chips', name: 'Chicken & Chips', price: 3000, category: 'base', unit: 'portion' },
        { baseId: 'toast_bread_and_egg', name: 'Toast Bread & Egg', price: 800, category: 'base', unit: 'portion' },
        { baseId: 'noodles', name: 'Noodles', price: 500, category: 'base', unit: 'pack' },

        // Soups
        { baseId: 'egusi_soup', name: 'Egusi Soup', price: 300, category: 'soup', unit: 'portion' },
        { baseId: 'oha_soup', name: 'Oha Soup', price: 500, category: 'soup', unit: 'portion' },
        { baseId: 'afang_soup', name: 'Afang Soup', price: 500, category: 'soup', unit: 'portion' },
        { baseId: 'efo_soup', name: 'Efo Soup', price: 500, category: 'soup', unit: 'portion' },
        { baseId: 'edikaikong_soup', name: 'Edikaikong Soup', price: 500, category: 'soup', unit: 'portion' },

        // Swallows
        { baseId: 'semo', name: 'Semo', price: 200, category: 'swallow', unit: 'wrap' },
        { baseId: 'eba', name: 'Eba', price: 200, category: 'swallow', unit: 'wrap' },

        // Proteins & Sides
        { baseId: 'moimoi_leaf', name: 'Moi Moi (Leaf)', price: 400, category: 'protein', unit: 'wrap' },
        { baseId: 'moimoi_plastic', name: 'Moi Moi (Plastic)', price: 300, category: 'protein', unit: 'cup' },
        { baseId: 'fish_tail', name: 'Fried Fish (Titus Tail)', price: 800, category: 'protein', unit: 'piece' },
        { baseId: 'fish_middle', name: 'Fried Fish (Titus Middle)', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'meat', name: 'Meat', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'chicken_lg', name: 'Chicken (Large)', price: 2500, category: 'protein', unit: 'piece' },
        { baseId: 'chicken_md', name: 'Chicken (Medium)', price: 2000, category: 'protein', unit: 'piece' },
        { baseId: 'assorted_lg', name: 'Assorted Meat (Large)', price: 1000, category: 'protein', unit: 'piece' },
        { baseId: 'assorted_sm', name: 'Assorted Meat (Small)', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'plantain', name: 'Plantain', price: 300, category: 'protein', unit: 'portion' },
        { baseId: 'fried_eggs', name: 'Fried Eggs', price: 200, category: 'protein', unit: 'piece' },
        { baseId: 'extra_chips', name: 'Extra Chips', price: 1200, category: 'protein', unit: 'portion' },
        { baseId: 'suya', name: 'Suya', price: 1000, category: 'protein', unit: 'portion' },
        { baseId: 'ketchup', name: 'Ketchup', price: 200, category: 'protein', unit: 'portion' },

        // Snacks & Pastries
        { baseId: 'meat_pie', name: 'Meat Pie', price: 1200, category: 'snack', unit: 'piece' },
        { baseId: 'veggy_roll', name: 'Veggy Roll', price: 1200, category: 'snack', unit: 'piece' },
        { baseId: 'caleb_roll', name: 'Caleb Roll', price: 600, category: 'snack', unit: 'piece' },
        { baseId: 'egg_roll', name: 'Egg Roll', price: 500, category: 'snack', unit: 'piece' },
        { baseId: 'doughnuts', name: 'Doughnuts', price: 300, category: 'snack', unit: 'piece' },
        { baseId: 'puff_puff', name: 'Puff Puff', price: 100, category: 'snack', unit: 'piece' },
        { baseId: 'unsliced_bread', name: 'Unsliced Bread (Big)', price: 1200, category: 'snack', unit: 'loaf' },
        { baseId: 'shawarma', name: 'Shawarma', price: 2000, category: 'snack', unit: 'wrap' },

        // Beverages
        { baseId: 'bottle_water', name: 'Bottle Water', price: 200, category: 'drink', unit: 'bottle' },
        { baseId: 'pepsi_family', name: 'Pepsi / Mirinda / 7up / Teem', price: 500, category: 'drink', unit: 'bottle' },
        { baseId: 'coke_family', name: 'Coke / Fanta / Limca / Schweppes', price: 500, category: 'drink', unit: 'bottle' },
        { baseId: 'aoao_can', name: 'Aoao Can', price: 600, category: 'drink', unit: 'can' },
        { baseId: 'chivita_exotic_sm', name: 'Chivita Exotic (Small)', price: 700, category: 'drink', unit: 'pack' },
        { baseId: 'chivita_exotic_md', name: 'Chivita Exotic (Medium)', price: 850, category: 'drink', unit: 'pack' },
        { baseId: 'chivita_exotic_bg', name: 'Chivita Exotic (Big)', price: 1800, category: 'drink', unit: 'pack' },
        { baseId: 'ice_tea_sm', name: 'Ice Tea (Small)', price: 700, category: 'drink', unit: 'bottle' },
        { baseId: 'ice_tea_bg', name: 'Ice Tea (Big)', price: 1200, category: 'drink', unit: 'bottle' },
        { baseId: 'five_alive', name: '5 Alive', price: 1500, category: 'drink', unit: 'pack' },
        { baseId: 'nutri_milk', name: 'Nutri Milk', price: 600, category: 'drink', unit: 'bottle' },
        { baseId: 'dudu_drink', name: 'Dudu Drink', price: 600, category: 'drink', unit: 'bottle' },
        { baseId: 'nutri_choco', name: 'Nutri Choco', price: 900, category: 'drink', unit: 'bottle' },
        { baseId: 'viju_chocolate', name: 'Viju Chocolate', price: 1100, category: 'drink', unit: 'bottle' },
        { baseId: 'sosa_sm', name: 'Sosa (Small)', price: 450, category: 'drink', unit: 'bottle' },
        { baseId: 'sosa_bg', name: 'Sosa (Big)', price: 1000, category: 'drink', unit: 'bottle' },
    ];

    const allItems = [
        ...generateOldMenu('front', 1),
        ...generateOldMenu('back', 1.1),
        ...newFrontRaw.map(item => mapToFirebaseItem('new', 'front', item)),
        ...newBackRaw.map(item => mapToFirebaseItem('new', 'back', item)),
    ];

    console.log(`Clearing existing menu items and seeding ${allItems.length} new items across all sections...`);

    try {
        const existingItemsSnap = await getDocs(collection(db, 'menu_items'));
        existingItemsSnap.forEach((docSnap) => {
            batch.delete(docSnap.ref);
        });

        allItems.forEach((item) => {
            const ref = doc(db, 'menu_items', item.id);
            batch.set(ref, item, { merge: true });
        });

        await batch.commit();
        console.log("Seeding complete.");
    } catch (error) {
        console.error("Error seeding data:", error);
    }
};
