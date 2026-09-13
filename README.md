# CalebDeck

Multi-vertical campus delivery platform for Nigerian university students: **Food** (plate-builder + combo packs from campus cafeterias), **CalebDeck Mart** (groceries), **CalebDeck Fashion** (weekly batch-fulfilled apparel), and **CalebNet** (data & airtime top-ups) — all funded and spent through a shared **i-CON Wallet**.

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TailwindCSS, react-router (route table in `src/app/routes.tsx`) |
| Data | Cloud Firestore (client SDK on web, Firebase Admin SDK server-side) |
| Payments | Paystack (popup checkout + webhooks); wallet debits via Firestore transactions |
| Backend | Vercel serverless functions in `api/` (Node/TS), shared server modules in `server/` |
| Auth | Firebase Auth; roles on the `users` doc (`STUDENT` / `RIDER` / `ADMIN`) |

```
src/
  app/pages/student/   Food, Mart, Fashion, CalebNet, Wallet, MyOrders, OrderSuccess
  app/pages/admin/     Orders, Analytics, Settings, Rider/Batch management
  app/pages/rider/     Batches, delivery flow, earnings
  services/            Firestore access, vertical resolution, fee/earning math, funding
server/                Shared serverless modules (wallet, order totals, rate limiting, admin SDK init)
api/                   Vercel functions: payment verification, webhooks, wallet, CalebNet, push
firestore.rules        Security rules (default-deny)
```

### Order type discipline (read this before touching order UI)

Every order document carries `type` (`plate` | `combo` | `mart` | `fashion`) **and** `orderType` (`FOOD` | `MART` | `FASHION`), stamped by **every** write path (`api/pre-save-order.ts`, `api/verify-payment.ts`, `api/paystack-webhook.ts`, `api/wallet/[action].ts`). Any code that reads an order must classify it through `resolveOrderVertical()` in `src/services/orderVertical.ts` — never `order.type === 'food'`-style guessing. Food-only concepts (plates, takeaway fee, solo/group delivery, cafeteria) apply **only** to `FOOD`; Mart and Fashion are flat-fee verticals.

All delivery/rider rates come from **Platform Settings** (`settings/platform` in Firestore, editable at Admin → Platform Settings) through `src/services/orderFees.ts`: `resolveDeliveryFee()` for charges, `riderEarningForOrder()` for rider payouts. Hardcoding `1250` / `750` / `1500` anywhere is a bug.

### Money flow

1. **Paystack checkout** — client pre-saves the order (`/api/pre-save-order`, status `PENDING_PAYMENT`, reserves batch slots) → Paystack popup → `/api/verify-payment` re-verifies server-side with the Paystack API and writes the full order (`PAID`, `source: 'verified'`) → `api/paystack-webhook.ts` reconciles anything the browser missed (HMAC-signature verified).
2. **Wallet checkout** — client pre-saves (Food) then calls `/api/wallet/pay-order`, which debits and writes the order in **one Firestore transaction** (atomic; verified against a real concurrent test — see `scripts/wallet-concurrency-test.ts`).
3. **Wallet funding** — client records a funding intent (`/api/wallet/funding-intent`: what the user *asked* to fund) → Paystack charge → `/api/wallet/verify-funding` (client) and/or the webhook credits the wallet. The credited amount is the **intent amount**, never whatever Paystack reports as charged, so surcharges can't leak in. Crediting is idempotent per reference.

There is no platform/service/processing fee anywhere: totals are items + delivery (Food adds per-plate takeaway). Admin KPIs, receipts, and analytics reflect the same.

### Rider fulfillment

Admin dispatches per hostel (`dispatchBatch` — one transaction assigns a batch doc + all orders to a rider). Fashion orders become dispatchable only after the batch pipeline reaches `READY_FOR_DELIVERY`. Riders see **order items and destination only** — no prices or fees. Rider earnings are recorded per delivery into `riderEarnings/{riderId}/daily/{date}`.

## Getting started

```bash
npm install
cp .env.example .env      # fill in Firebase + Paystack + Clubkonnect credentials
npm run dev               # Vite dev server (client)
npm run build             # production client build
npx tsx scripts/wallet-concurrency-test.ts   # real concurrent wallet test (uses throwaway Firestore docs)
```

Serverless functions run on Vercel; set `FB_SA_*`, `PAYSTACK_SECRET_KEY`, `CLUBKONNECT_*`, `INTERNAL_API_KEY`, and `ALLOWED_ORIGIN` in the Vercel project settings. Secrets live only in `.env`/Vercel env vars (gitignored) — anything prefixed `VITE_` is public by definition.

## Conventions

- **No dead paths**: vertical checks go through `src/services/orderVertical.ts`; fees through `src/services/orderFees.ts`; wallet funding through `src/services/walletFunding.ts` (one implementation shared by WalletPage and CalebNet).
- **Server-side verification always**: payment status is never trusted from the client; webhooks verify the Paystack signature; public endpoints are rate-limited (`server/rate-limit.ts`).
- **Fashion batch pipeline**: `PAID → CONSOLIDATING → PROCUREMENT → ARRIVING_AT_CAMPUS → READY_FOR_DELIVERY`, then the standard rider flow (`OUT_FOR_DELIVERY → ON_THE_WAY → DELIVERED`). The customer tracker always shows the same four stages (Received → Out for Delivery → On The Way → Delivered) with batch info as supplementary detail.
