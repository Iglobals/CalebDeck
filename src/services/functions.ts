/// <reference types="vite/client" />

// In DEV: we mock server-side calculations locally
// In PRODUCTION: we call Vercel API routes (server-side, secure)

export const calculateOrderTotal = async (data: any) => {
    if (import.meta.env.DEV) {
        console.log('[CalebDeck] DEV: Mocking server-side calculation');
        const { items, deliveryMode } = data;
        let total = 0;
        let plateCount = 0;

        items.forEach((item: any) => {
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

    // PRODUCTION: Call Vercel API route
    console.log('[CalebDeck] Calling /api/calculate-total...');
    try {
        const response = await fetch('/api/calculate-total', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[CalebDeck] /api/calculate-total failed:', response.status, errorData);
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log('[CalebDeck] Total calculated:', result.data?.totalAmount);
        return result;
    } catch (error: any) {
        console.error('[CalebDeck] calculateOrderTotal error:', error.message);
        throw error;
    }
};

export const verifyPayment = async (data: { reference: string; orderData: any }) => {
    if (import.meta.env.DEV) {
        console.log('[CalebDeck] DEV: Mocking payment verification for', data.reference);
        return { data: { success: true, message: "Payment Verified (MOCK)" } };
    }

    console.log('[CalebDeck] Calling /api/verify-payment...');
    try {
        const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[CalebDeck] /api/verify-payment failed:', response.status, errorData);
            throw new Error(errorData.error || `Verification failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('[CalebDeck] Payment verified:', result.data?.paystackRef);
        return result;
    } catch (error: any) {
        console.error('[CalebDeck] verifyPayment error:', error.message);
        throw error;
    }
};

export const dispatchHostelOrders = async (data: { hostelId: string }) => {
    if (import.meta.env.DEV) {
        console.log('[CalebDeck] DEV: Mocking dispatch for', data);
        return { data: { success: true, message: "Mock Dispatch Sent" } };
    }

    console.log('[CalebDeck] Calling /api/dispatch-orders...');
    try {
        const response = await fetch('/api/dispatch-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[CalebDeck] /api/dispatch-orders failed:', response.status, errorData);
            throw new Error(errorData.error || `Dispatch failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('[CalebDeck] Orders dispatched:', result.data?.count);
        return result;
    } catch (error: any) {
        console.error('[CalebDeck] dispatchHostelOrders error:', error.message);
        throw error;
    }
};
