/// <reference types="vite/client" />

// In DEV: mock server-side calculations locally
// In PRODUCTION: call Vercel API routes (server-side, secure)

export const calculateOrderTotal = async (data: any) => {
    if (import.meta.env.DEV) {
        const { items, deliveryMode, plateCount: providedPlateCount } = data;
        let total = 0;

        items.forEach((item: any) => {
            let p = item.price || 0;
            if (item.isAddon && p < 1000) {
                p += 50;
            }
            total += p * (item.quantity || 1);
        });

        const plateCount = typeof providedPlateCount === 'number' ? providedPlateCount : 1;
        const deliveryFee = plateCount * 750;
        const takeawayFee = plateCount * 200;
        let discount = 0;

        if (deliveryMode === 'group' || deliveryMode === 'GROUP') {
            discount = (750 - 580) * plateCount;
        }

        const platformFee = 100;
        const processingFee = 200;

        const finalTotal = total + deliveryFee + takeawayFee + platformFee + processingFee - discount;

        return {
            data: {
                totalAmount: finalTotal,
                breakdown: { 
                    food: total, 
                    delivery: deliveryFee, 
                    takeaway: takeawayFee, 
                    platform: platformFee,
                    processing: processingFee,
                    discount 
                },
            }
        };
    }

    // PRODUCTION: Vercel API route
    const response = await fetch('/api/calculate-total', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return response.json();
};

export const verifyPayment = async (data: { reference: string; orderData: any }) => {
    if (import.meta.env.DEV) {
        return { data: { success: true, message: "Payment Verified (MOCK)" } };
    }

    const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Verification failed: ${response.status}`);
    }

    return response.json();
};

export const dispatchHostelOrders = async (data: { hostelId: string }, authToken?: string) => {
    if (import.meta.env.DEV) {
        return { data: { success: true, message: "Mock Dispatch Sent" } };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch('/api/dispatch-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Dispatch failed: ${response.status}`);
    }

    return response.json();
};
