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
    const mapToFirebaseItem = (cafeteriaId: string, sectionId: 'front' | 'back' | 'none', item: any) => {
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

    // Old Cafe menu — no front/back, no snacks, no swallow/soup
    const oldCafeRaw = [
        // Bases
        { baseId: 'jollof_rice', name: 'Jollof Rice', price: 500, category: 'base', unit: 'portion' },
        { baseId: 'fried_rice', name: 'Fried Rice', price: 500, category: 'base', unit: 'portion' },
        { baseId: 'white_rice', name: 'White Rice', price: 500, category: 'base', unit: 'portion' },
        { baseId: 'white_spaghetti', name: 'White Spaghetti', price: 500, category: 'base', unit: 'portion' },
        { baseId: 'jollof_spaghetti', name: 'Jollof Spaghetti', price: 500, category: 'base', unit: 'portion' },
        { baseId: 'porridge_beans', name: 'Porridge Beans', price: 400, category: 'base', unit: 'portion' },
        { baseId: 'white_beans', name: 'White Beans', price: 400, category: 'base', unit: 'portion' },
        { baseId: 'ewa_agoyin', name: 'Ewa Agoyin', price: 500, category: 'base', unit: 'portion' },

        // Proteins & Sides
        { baseId: 'moi_moi', name: 'Moi Moi', price: 400, category: 'protein', unit: 'wrap' },
        { baseId: 'beef_meat', name: 'Beef (Meat)', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'egg', name: 'Egg', price: 300, category: 'protein', unit: 'piece' },
        { baseId: 'round_fish_sm', name: 'Round Fish (Small)', price: 500, category: 'protein', unit: 'piece' },
        { baseId: 'round_fish_md', name: 'Round Fish (Medium)', price: 700, category: 'protein', unit: 'piece' },
        { baseId: 'round_fish_lg', name: 'Round Fish (Large)', price: 1000, category: 'protein', unit: 'piece' },
        { baseId: 'titus_fish', name: 'Titus Fish', price: 100, category: 'protein', unit: 'piece' },
        { baseId: 'chicken_sm', name: 'Chicken (Small)', price: 2000, category: 'protein', unit: 'piece' },
        { baseId: 'chicken_md', name: 'Chicken (Medium)', price: 2500, category: 'protein', unit: 'piece' },
        { baseId: 'chicken_lg', name: 'Chicken (Large)', price: 3000, category: 'protein', unit: 'piece' },
        { baseId: 'plantain', name: 'Plantain', price: 300, category: 'protein', unit: 'portion' },

        // Beverages (same as New Cafe)
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
        ...oldCafeRaw.map(item => mapToFirebaseItem('old', 'none', item)),
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

export const seedMartItems = async () => {
    const batch = writeBatch(db);
    
    const martItems = [
        // Breakfast & Cereals
        { name: 'Milk (1 roll)', price: 2000, category: 'Breakfast & Cereals' },
        { name: 'Milo (1 roll)', price: 2000, category: 'Breakfast & Cereals' },
        { name: 'Cornflakes Sachet (1 roll)', price: 2000, category: 'Breakfast & Cereals' },
        { name: 'Carton Cornflakes (Nasco)', price: 4000, category: 'Breakfast & Cereals' },
        { name: 'Golden Morn (Medium)', price: 4000, category: 'Breakfast & Cereals' },
        { name: 'Golden Morn (Big)', price: 5500, category: 'Breakfast & Cereals' },
        { name: 'Golden Morn Sachet (1 roll)', price: 3000, category: 'Breakfast & Cereals' },
        { name: 'Coco Pops', price: 4000, category: 'Breakfast & Cereals' },
        { name: 'Rice Crispy', price: 4000, category: 'Breakfast & Cereals' },

        // Spreads & Snacks
        { name: 'Pringles', price: 3000, category: 'Spreads & Snacks' },
        { name: 'Nutella', price: 7500, category: 'Spreads & Snacks' },
        { name: 'Peanut Butter', price: 3000, category: 'Spreads & Snacks' },

        // Sugar & Beverages
        { name: 'Dangote Sugar (Small)', price: 700, category: 'Sugar & Beverages' },
        { name: 'Dangote Sugar (Medium)', price: 1500, category: 'Sugar & Beverages' },
        { name: 'Dangote Sugar (Big)', price: 2500, category: 'Sugar & Beverages' },

        // Perfumes
        { name: 'Riggs Perfume', price: 4000, category: 'Perfumes' },
        { name: 'Mosuf (Small)', price: 5000, category: 'Perfumes' },
        { name: '24k Perfume', price: 7000, category: 'Perfumes' },

        // Personal Care
        { name: 'Dudu Osun Soap', price: 300, category: 'Personal Care' },
        { name: 'Toothpaste (Big)', price: 2000, category: 'Personal Care' },
        { name: 'Small Toothpaste', price: 700, category: 'Personal Care' },
        { name: 'Air Freshener (Big)', price: 2000, category: 'Personal Care' },
        { name: 'Small Air Freshener', price: 1200, category: 'Personal Care' },
        { name: 'Liquid Black Polish', price: 2000, category: 'Personal Care' },

        // Clothing & Accessories
        { name: 'White Corporate Shirt', price: 8000, category: 'Clothing & Accessories' },
        { name: 'Black Corporate Shirt', price: 8000, category: 'Clothing & Accessories' },
        { name: 'Yellow Corporate Shirt', price: 8000, category: 'Clothing & Accessories' },
        { name: 'Pink Corporate Shirt', price: 8000, category: 'Clothing & Accessories' },
        { name: 'Black Tie', price: 1500, category: 'Clothing & Accessories' },
        { name: 'Red Tie', price: 1500, category: 'Clothing & Accessories' },
        { name: 'Clips', price: 2000, category: 'Clothing & Accessories' },
        { name: 'Hanger', price: 2500, category: 'Clothing & Accessories' },
        { name: 'Slippers', price: 1000, category: 'Clothing & Accessories' },

        // Home & Living
        { name: 'Pillow', price: 7500, category: 'Home & Living' },
        { name: '5 in one Big Note', price: 2500, category: 'Home & Living' },
        { name: 'Cloth Dryer', price: 18000, category: 'Home & Living' }
    ];

    try {
        const existingItemsSnap = await getDocs(collection(db, 'mart_items'));
        existingItemsSnap.forEach((docSnap) => {
            batch.delete(docSnap.ref);
        });

        martItems.forEach((item) => {
            const ref = doc(collection(db, 'mart_items'));
            batch.set(ref, {
                ...item,
                imageUrl: '',
                inStock: true,
                createdAt: Date.now()
            });
        });

        await batch.commit();
        console.log("Mart items seeded successfully.");
    } catch (error) {
        console.error("Error seeding mart items:", error);
    }
};
