# Automated Rider Payout System

Automating payouts directly from the system's balance to riders' bank accounts is a giant leap towards a professional, scalable operation (like Uber or Bolt). Because CalebDeck already uses **Paystack**, the absolute best and most professional way to handle this is using **Paystack Transfers**.

## How Paystack Transfers Work
Instead of the Admin manually opening their banking app and typing in account numbers, your system can tell Paystack: *"Transfer ₦2,500 to Rider Samuel from my Paystack balance."* 

To do this, we need to implement three core steps:
1. **Account Resolution:** When a rider signs up or adds their bank details, CalebDeck pings Paystack to verify the account name matches the account number.
2. **Transfer Recipient:** Paystack generates a unique `Recipient Code` for that rider.
3. **The Transfer:** We trigger a Transfer API call sending money to that Recipient Code.

---

## User Review Required

We need to decide *when* and *how* the payments are triggered. There are two professional standards for this. **Please let me know which approach you prefer:**

> [!IMPORTANT]
> **Option A: Rider "Withdraw" Button (The Bolt/Uber Way)**
> Riders see their earnings on their dashboard. Once a week (or anytime depending on rules you set), they click "Withdraw". This triggers a Firebase Cloud Function that automatically transfers their available balance to their bank account in seconds. 
> *Pros:* Very low admin overhead. Riders feel in control.
> *Cons:* You must ensure your Paystack balance is always funded enough to cover spontaneous withdrawals.

> [!IMPORTANT]
> **Option B: Admin "Bulk Payout" (The Payroll Way)**
> Riders cannot withdraw themselves. Instead, inside your Admin Dashboard, you see a total of all pending Rider payouts. You click a single button: **"Process Weekly Payouts"**. The system loops through all riders, batches the payments, and Paystack sends the money to everyone simultaneously.
> *Pros:* Great financial control. You know exactly when money leaves the business. 
> *Cons:* Requires the Admin to press a button every week.

*(We can also do Option C: A completely automated hidden timer that runs every Friday night and just pays everyone).*

---

## Proposed Technical Changes (Phase 1)

### 1. Cloud Functions (`functions/index.js`)
We will create secure backend endpoints to handle the sensitive API keys required for transferring money.
- `[NEW]` **`verifyRiderBank`**: Verifies bank details and creates a Paystack Recipient Code.
- `[NEW]` **`initiatePayout`**: Triggers the actual transfer to the rider.
- `[NEW]` **`paystackWebhook`**: Listens for `transfer.success` and `transfer.failed` events from Paystack to mark the payment exactly in your database.

### 2. Frontend 
- `[MODIFY]` **`RiderManagement.tsx`**: Add the chosen option A or B payout trigger buttons. 
- `[MODIFY]` **`RiderDashboard.tsx`**: Add a "Withdraw" button (if Option A is chosen) or a clear "Next Payout Date" (if Option B is chosen).

### 3. Firestore Datastore
- `[MODIFY]` **`riders` collection**: Add `paystackRecipientCode` and `verifiedBankName`.
- `[NEW]` **`payouts` collection**: A ledger history of every transfer made, including the Paystack reference and status (`PENDING`, `SUCCESS`, `FAILED`).

---

## Open Questions

1. **Payout Strategy:** Do you prefer Option A (Rider taps withdraw), Option B (Admin taps bulk payout), or Option C (Automated weekly timer)?
2. **Transfer Fees:** Paystack charges a small fee per transfer (e.g. ₦10 - ₦50 depending on amount). Do you want this fee deducted from the rider's earnings, or will CalebDeck cover the transfer fee?
