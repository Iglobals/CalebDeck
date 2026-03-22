import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Fallback to console logging if the key isn't provided (for local dev without env variables)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://calebdeck.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { studentName, studentEmail, orderId, items } = req.body;

    if (!studentEmail || !studentName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build items HTML list
    const itemsHtml = items && items.length > 0
        ? items.map((i: any) => `<li><strong>${i.name}</strong> x ${i.quantity || 1}</li>`).join('')
        : '<li>Your delicious hostel meal</li>';

    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #7C3AED; margin: 0;">Order Delivered! 🚀</h1>
            </div>
            
            <p style="font-size: 16px;">Hi <strong>${studentName}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.5;">
                Great news! Your CalebDeck rider has just arrived at your hostel and successfully delivered your food. 
                Please ensure you have collected your order.
            </p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #555;">Order Details</h3>
                <p style="margin: 0; color: #777; font-size: 14px;">Order ID: #${orderId || 'Recent'}</p>
                <ul style="margin-top: 10px;">
                    ${itemsHtml}
                </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 40px;">
                Enjoy your meal! 🍽️<br/>
                <em>The CalebDeck Team</em>
            </p>
        </div>
    `;

    try {
        if (!resend) {
            console.warn('[RESEND MOCK] Would have sent email to:', studentEmail);
            console.log('[HTML TEMPLATE]:\n', htmlTemplate);
            return res.status(200).json({ success: true, mocked: true });
        }

        const data = await resend.emails.send({
            from: 'CalebDeck Updates <orders@calebdeck.com>', // MUST BE verified domain or onboarding address
            to: [studentEmail],
            subject: 'Your CalebDeck Order has Arrived! 🚀🍽️',
            html: htmlTemplate,
        });

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Failed to send email:', error);
        return res.status(500).json({ error: 'Failed to send email notification' });
    }
}
