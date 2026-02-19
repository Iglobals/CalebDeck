/// <reference types="vite/client" />
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Mock implementations for development until Cloud Functions are deployed
export const calculateOrderTotal = async (data: any) => {
    // In a real app, this calls the backend. 
    // For now, we might need a temporary client-side calculation to unblock frontend dev
    // BUT the requirements said "Server-side mandatory".
    // So we will try to call the function, and if it fails (not deployed), we might fail or mock.

    if (import.meta.env.DEV) {
        console.log("Mocking server-side calculation for DEV");
        const { items, deliveryMode, hostelId } = data;
        let total = 0;
        let plateCount = 0;

        // Simple mock logic
        items.forEach((item: any) => {
            // item structure depends on PlateBuilder output
            // Assuming simplistic structure for mock
            plateCount += item.quantity || 1;
            total += (item.price || 0) * (item.quantity || 1);
        });

        const deliveryFee = plateCount * 700;
        const takeawayFee = plateCount * 200;
        let discount = 0;

        if (deliveryMode === 'group' || deliveryMode === 'GROUP') {
            discount = (700 - 560) * plateCount;
        }

        const finalTotal = total + deliveryFee + takeawayFee - discount;

        return {
            data: {
                totalAmount: finalTotal,
                breakdown: {
                    food: total,
                    delivery: deliveryFee,
                    takeaway: takeawayFee,
                    discount: discount
                },
                token: "mock-token-dev"
            }
        };
    }

    const fn = httpsCallable(functions, 'calculateOrderTotal');
    return fn(data);
};

export const dispatchHostelOrders = async (data: { hostelId: string }) => {
    if (import.meta.env.DEV) {
        console.log("Mocking dispatch for DEV", data);
        return { data: { success: true, message: "Mock Dispatch Sent" } };
    }
    const fn = httpsCallable(functions, 'dispatchHostelOrders');
    return fn(data);
};
