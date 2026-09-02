# CalebDeck × ICA Integration — Agent Build Spec
### i-CON accounts, the signed-in experience, and CalebDeck Fashion

---

## Status as of this update — check this before planning anything

- **Auth backend (ICA ↔ Firebase):** done and confirmed live — real users have signed in via ICA in production. Do not rebuild login/callback routes, PKCE, token exchange, or Firebase user resolution.
- **Signed-in i-CON experience** (banner, profile, checkout auto-fill, theme, 5-tab nav, Home screen): built, through multiple rounds of review fixes. Wallet is live in Mart's checkout; Food and Fashion are being wired in next.
- **CalebDeck Fashion:** foundations are live (catalog, PDP, admin inventory) — currently being refined, not started from scratch. As of this update, Fashion's real operating model (weekly batch fulfillment, not instant delivery) is now specced in Section 5 — this is a genuine addition to what's already built, not a redo.
- **CalebDeck Coins and Ambassadors:** confirmed on the roadmap, explicitly later-phase — not started, not this sprint.
- **This summary is a guide, not a guarantee.** If anything here conflicts with what the actual codebase shows, trust the codebase. Before starting any work session, verify against the live code what's already implemented — don't treat this document as an undone todo list just because it describes the full target state. A fresh read of this doc is not a substitute for checking what's already shipped.

---

## 0. Read this before touching anything

CalebDeck is **live in production with real users right now**. Everything below is additive on top of a working system — not a rewrite, not a refactor pass. Treat every existing flow as load-bearing until proven otherwise.

**Non-negotiables:**
- Food ordering must keep working without login. Never force sign-in to order food.
- Guest checkout stays exactly as it is today.
- Do not break: CalebNet, CalebDeck Mart, payments, admin, rider dashboard, scheduled delivery, order tracking, or wallet.
- Food, Mart, and CalebNet keep their exact current pages, routes, and flows — no structural changes, no new features, no reorganizing what's there. Their **visual styling** does change for signed-in users specifically (see Section 4) — but only as an additive theme layered on top; guests must see today's design, unchanged, with zero exceptions.
- Say **"i-CON"** everywhere in UI copy — profile labels, buttons, empty states, everything. Never "iUser," never generic "account."
- **`icaSub` on the user doc is the *only* signal for whether someone gets the signed-in i-CON experience anywhere in the app — never "does a Firebase session exist."** CalebNet had its own login before any of this started, so someone can have a valid Firebase session there without ever having become an i-CON. That person gets the exact same nav, landing page, and "Become an i-CON" prompt as a true guest, everywhere in the app — no third, in-between state invented for them. The one and only place their pre-existing CalebNet session matters is CalebNet's own page, where it should keep working exactly as it always did (their original self-contained wallet modal, untouched). Session presence and i-CON status are two different questions — don't let the first answer the second.

**Process rules:**
- Work in a feature branch. Nothing here touches the production branch until Phase 1 is tested end-to-end.
- Before writing code, inspect the actual codebase: find the current login/signup flow, the current Firestore collections and security rules, and the existing CalebDeck Mart implementation — it's the closest existing analog to Fashion. Build on what's actually there; don't assume a structure that isn't confirmed.
- No drive-by refactors. Touch only what a given step requires.
- Stop at each checkpoint below and confirm before moving to the next phase.

---

## 1. What's changing, architecturally

CalebDeck's frontend is a React SPA (not Next.js) on Vercel. Its backend is Firebase — Firestore for data, Firebase Authentication for identity. **Neither of those changes.**

What's new is **iGlobals Central Auth (ICA)**, a separate OAuth 2.0 + OIDC identity provider, becoming the front door for signing in. Because Firestore security rules and the rest of the app only understand Firebase Auth sessions, ICA doesn't replace Firebase Auth — it feeds it, using Firebase's sign-in-with-a-custom-system pattern:

```
Browser (React SPA)
  │  1. tap "Become an i-CON" / "Sign in"
  ▼
ICA login (redirect, PKCE + state)
  │  2. redirect back with `code`
  ▼
Server-side function (new)         ← holds ICA_CLIENT_SECRET + Firebase service account
  - exchanges code for ICA tokens (icaClient.exchangeCode)
  - verifies the ID token (icaClient.verifyToken — does the JWKS lookup for you)
  - reads the verified `email` + `sub` claims
  - looks up that email in Firebase Auth:
        existing user → reuse their UID
        no match      → create a new Firebase user
  - mints a Firebase custom token for that UID
  ▼
Browser (React SPA)
  - signInWithCustomToken(auth, token)
  - same auth.currentUser, same UID, same Firestore data as always
```

Because the end state is a normal Firebase Auth session, nothing downstream — security rules, existing reads/writes, wallet, order history — has to change. The only new surface is the path that gets someone *to* that session.

The server-side function can be a Vercel serverless function (same deploy as the frontend, no new hosting needed) using `firebase-admin`. If Cloud Functions are already in use for other backend work, that's a fine home too — match whatever's already established in the repo.

---

## 2. Phase 1 — Auth backend

**Prerequisite — confirm before writing any code:** `calebdeck-prod` must already exist as a registered OAuth client in ICA, with its redirect URI set to *exactly* the callback URL you'll use below — trailing slash and http/https both have to match, character for character, or every login attempt fails with a redirect URI mismatch. The env values already in hand suggest this registration exists, but confirm with the CTO rather than assume — and confirm whether you need one registered redirect URI or two (local dev vs. production).

Install the SDK:
```
npm install @iglobals/auth-client
```

Initialize it — server-side only, never in anything that ships to the browser:
```ts
import { ICAClient } from '@iglobals/auth-client';

const icaClient = new ICAClient({
  baseUrl: process.env.ICA_BASE_URL!,
  clientId: process.env.ICA_CLIENT_ID!,
  clientSecret: process.env.ICA_CLIENT_SECRET!,
  redirectUri: process.env.ICA_REDIRECT_URI!,
  scopes: ['openid', 'profile', 'email'],
});
```

**Login route** (e.g. `/api/auth/login`):
```ts
const { codeVerifier, codeChallenge } = icaClient.generatePKCE();
const state = crypto.randomUUID();

// store codeVerifier + state server-side — httpOnly cookie or session,
// short-lived — you need both again in the callback

const authUrl = icaClient.getAuthorizationUrl(state, codeChallenge);
// redirect the browser to authUrl
```

**Callback route** (e.g. `/api/auth/callback` — must match `ICA_REDIRECT_URI` exactly):
```ts
// 1. read `code` and `state` from the query string
// 2. compare `state` to what was stored at login — reject on any mismatch (CSRF protection)

const tokens = await icaClient.exchangeCode(code, storedCodeVerifier);
// tokens: { access_token, token_type, expires_in, refresh_token, id_token, scope }

// 3. verify the ID token and pull claims — the SDK does the JWKS lookup here,
//    don't hand-roll JWT verification:
const claims = await icaClient.verifyToken(tokens.id_token);
// claims.sub, claims.email, claims.email_verified

if (!claims.email_verified) {
  // reject — never use an unverified email to match an existing account
}
```
Then run user resolution below, mint the Firebase custom token, and return it to the client.

**User resolution** — via the Firebase Admin SDK, keyed off `claims.email`:
- Match found → reuse that Firebase UID. This is the step that matters most: get it wrong and an existing i-CON's order history, wallet, and saved defaults appear to vanish even though the data underneath is untouched.
- No match → create a new Firebase user; store `claims.sub` on their user doc (e.g. an `icaSub` field) so future lookups don't depend on email staying stable.
- `admin.auth().createCustomToken(uid)` → return that token to the client.

**Client-side** — call `signInWithCustomToken(auth, token)` once the token comes back. The existing `onAuthStateChanged` listener, and everything hanging off it, works unmodified.

**Session upkeep — the docs' actual token lifetimes, build for these numbers specifically:**
- Access tokens expire in 15 minutes, refresh tokens in 30 days. Authorization codes expire in 10 minutes and are single-use — don't write retry logic that reuses a `code`.
- To refresh: `icaClient.refreshAccessToken(refreshToken)`.
- On sign-out, call `icaClient.revokeToken(refreshToken)` *before* clearing local session state — the docs' own security checklist calls this out explicitly ("revoke tokens on logout"), and it's easy to skip since clearing cookies alone looks like it worked.

**Why not `ICAMiddleware` everywhere the docs mention it?** That middleware protects routes by verifying ICA-issued JWTs directly. Skip it for CalebDeck's own routes — once a user is bridged to a Firebase custom token, Firebase Auth is CalebDeck's real authorization layer, same as today, and checking both systems in parallel is redundant and a likely bug source. It only belongs on a route that needs to verify a raw ICA token, which nothing in this design does.

**Security requirements, non-negotiable:**
- `ICA_CLIENT_SECRET` and the Firebase service account credentials live only in Vercel's environment variables — never in a committed file, never sent to the client.
- `email_verified` must be `true` before an email is trusted for account matching.
- Rate-limit the callback route.
- If `calebdeck-prod`'s client secret has been shared anywhere outside a secrets manager up to this point, get it rotated in the ICA admin portal before go-live — separate from this build, but blocking for production use.

**Env vars needed (names only — get real values from the CTO / ICA admin portal, never hardcode them):**
```
ICA_BASE_URL
ICA_CLIENT_ID
ICA_CLIENT_SECRET
ICA_REDIRECT_URI
ICA_SCOPES
FIREBASE_SERVICE_ACCOUNT_KEY   (or however the existing Firebase Admin setup already handles this)
```

**Debugging tip:** if something breaks, isolate before assuming it's the integration code. The docs' raw Postman flow — `GET /api/oauth/authorize` → `POST /api/oauth/token` → `GET /api/oauth/userinfo` — exercises ICA directly with no CalebDeck code involved. If that works and the app doesn't, the bug is in the integration; if that doesn't work either, it's on the ICA side.

**✅ Checkpoint before Phase 2** — test against real conditions, not just fresh accounts:
1. An existing CalebDeck user with real order history signs in via ICA → same UID, same Firestore data, same wallet balance.
2. A brand-new email signs in via ICA → clean new user created correctly.
3. Guest checkout, untouched, still works with zero auth involvement.
4. The current login path still works, live in parallel — don't cut it over yet. Keep it as a fallback through this transition window in case anything above needs more debugging post-launch.

---

## 3. Phase 2 — The i-CON signed-in experience

> Build the theme foundation in Section 4 first. The banner and profile area below should be the first two things built using that token system, not styled one-off and retrofitted later.

**Guest banner (dismissible, non-blocking):**
> "Unlock CalebDeck Fashion, save your hostel and phone number, and see your order history across every CalebDeck product — become an i-CON."
> Buttons: **Become an i-CON** · **Continue as guest**

Fashion is i-CON-only (see Section 5), which makes it the strongest hook available here — lead with it rather than burying it under the practical stuff.

Must never disturb or gate checkout. Guests can dismiss and never see it again this session.

**Premium account/profile area** (signed-in users only), containing:
- i-CON profile card
- Profile settings
- Default hostel
- Default phone number
- Default CalebNet number
- Saved delivery notes
- Order history
- CalebNet history
- CalebDeck Mart history, if available
- **CalebDeck Fashion history, once that product exists** *(new — the original spec predates Fashion)*
- Connected products
- Newsletter/announcement preference
- Sign-out button

**Checkout improvements, signed-in users only:**
- Auto-fill name/email if available
- Auto-fill default hostel
- Auto-fill default phone number
- Let the user update those defaults from checkout itself
- Attach `uid`/`iConId` to the order
- Add `"CalebDeck"` to `productsUsed`

Guests: existing checkout flow, completely unchanged.

**Order history:**
- Signed-in users: fetch from Firestore by `iConId`/`uid` — food orders, batch orders, instant orders, CalebNet orders, Mart orders, and **Fashion orders** where available.
- Guests: keep the current localStorage fallback exactly as it works today.

**CalebNet** (already login-required, unchanged):
- Wallet stays tied to `uid`.
- Default CalebNet number can be saved to the profile.
- CalebNet purchases add `"CalebNet"` to `productsUsed`.

**CalebDeck Mart:**
- Signed in → attach `iConId` to Mart orders, add `"CalebDeck Mart"` to `productsUsed`.
- Guest → preserve the existing flow untouched.

**CalebDeck Fashion** *(new, i-CON-only — confirmed, not a default)*:
- Fashion requires sign-in to browse or buy at all, unlike every other product in this doc. Deliberate — it's the concrete incentive to actually become an i-CON, not an oversight.
- Signed in → attach `iConId` to Fashion orders, add `"CalebDeck Fashion"` to `productsUsed`.
- No guest path exists here — don't build one, and don't reuse Mart's guest-fallback branching in its payment selector, since every Fashion checkout is by definition a signed-in i-CON.

**Admin — dedicated i-CON directory (new, additive):** before ICA, CalebNet was the only product on Firebase Auth, so admin's user list is currently scoped to CalebNet specifically. Now that every product shares the same i-CON identity, admin needs a new, ecosystem-wide directory alongside the existing CalebNet view — not replacing it. Same underlying Firebase user data, no new backend: name, email, join date, connected products (`productsUsed`), wallet balance at a glance. This is additive to admin, not a violation of the do-not-touch list — the existing CalebNet-scoped view stays exactly as it is.

**Wallet — generalized across the ecosystem:** the wallet becomes a valid payment method for any product, with Paystack as the fallback when the balance is short — except CalebNet, which stays wallet-exclusive.

Non-negotiable for anything touching this:
- **Server-side balance authority only.** No client ever writes `walletBalance` directly via Firestore — every deduction and top-up goes through a server function.
- **Every spend is an atomic Firestore transaction** — read balance, check sufficiency, deduct, all as one atomic operation. Never a check followed by a separate write; that's how two fast purchases push a balance negative.
- **One shared payment-method policy, not five reimplementations.** A single function/hook (e.g. `canUseWallet(product, amount)`) that every checkout calls, rather than Food, Mart, and Fashion each rolling their own version of "check wallet, fall back to card."
- **Record `paymentMethod` on every order.** Refunds need to know whether to credit the wallet back or go through Paystack — without this stored per order, refunds have no way to route correctly.

UI/UX:
- Everywhere except CalebNet: a payment method selector — Wallet and Card. If the balance is short, show it as insufficient rather than hiding it (e.g. "Wallet: ₦500 — short by ₦300"), defaulting toward card without pretending wallet wasn't an option.
- CalebNet specifically: only Wallet is ever shown. If short, the button reads "Top Up Wallet," not "Pay Now" — ideally pre-filled with the exact shortfall — and the purchase is blocked until it clears. No card option here, ever, by design.

**One dedicated Wallet page, not wallet UI scattered per product.** CalebNet currently has its own "Profile & Wallet" modal (avatar picker, display name, phone number, wallet balance, fund/refresh wallet, sign out) that now duplicates what exists at the app level — name and avatar are already on the Home greeting, wallet balance is already in the Home "at a glance" row, name/phone editing already lives in i-CON Profile's Preferences, and Sign Out already lives in i-CON Profile per the earlier fix. Strip the CalebNet modal down to nothing but what's genuinely CalebNet-specific (its default number, if that's distinct from the general phone field) — everything else in it is now dead weight sitting in two places at once.
- Fund Wallet (preset amount pills, custom input, Fund button) and Refresh Wallet move into a single dedicated Wallet page — not inline on the Home card itself, which should stay a quick-glance summary, not an action panel.
- Both the Home screen's wallet card and the i-CON Profile's wallet row link to this same page. Rename that Profile row from "CalebNet Wallet" to just "Wallet" — it isn't CalebNet-specific anymore, and the label saying otherwise is actively misleading now.
- The avatar picker (currently buried in CalebNet's modal too) belongs in i-CON Profile's settings, alongside the other editable fields — not CalebNet.

**Build this on Mart first, not across every product at once.** Prove the atomic-transaction logic works correctly somewhere with lower order volume than Food before extending it further.

---

## 4. Design direction — i-CON layer, CalebDeck Fashion, and the sitewide signed-in theme

**Confirmed scope:** Food, Mart, and CalebNet keep their exact current pages, routes, and flows — nothing about how they work changes. What changes, once someone's signed in, is how everything *looks*: the premium/native-app treatment described below applies sitewide, not just to the new Profile page and banner.

**Before writing more UI code, answer this — it determines the real size of the job:** does the codebase already have a centralized styling/token system (CSS custom properties, a Tailwind theme config, a styled-components/CSS-in-JS theme provider, etc.), or is styling hardcoded per component?
- **If centralized:** this is a contained job. Define a second "signed-in" token set (colors, radii, shadows, blur usage) and swap it in at the root based on auth state — a class or data-attribute on a top-level wrapper. Existing Food/Mart/CalebNet components that already consume those tokens re-skin automatically; no per-page rewrites needed.
- **If not centralized:** say so before starting. "Restyle everything" then becomes a page-by-page rewrite, not a theme swap — a much bigger job than what's scoped here, and the timeline needs to be renegotiated with that reality rather than silently absorbed into Phase 2.

**Sequencing:** build the theme foundation *before* finishing the Profile page and guest banner. Don't ship those with one-off custom styling and retrofit them into a sitewide system afterward — they should be the first two things built using the new token set, not built separately from it.

**Guests must never receive this theme.** Implement it as an additive override — new tokens layered on top when signed in — never a modification of the base styles guests currently see. With the signed-in class/attribute absent, a page must render byte-identical to how it does today. This is the same non-negotiable as everything else guest-facing in this doc.

**Navigation:** a floating pill-shaped tab bar, frosted glass background so content scrolls beneath it, five destinations — **Home** (renamed from Food — same content, house icon, still the default landing tab), **Mart**, **CalebNet**, **Fashion**, **i-CON** (profile). Active tab gets a filled icon, inactive tabs stay outlined — that fill/outline swap on selection is a core iOS-native detail, don't skip it. Home is the elevated hero action — raised and slightly enlarged above the other four, restricted to exactly this one destination so it reads as an accent, not noise. This wasn't in the first build; confirm it lands in this pass.

**Cart:** a shared cart across Mart, Fashion, and (later) Gadgets — not one product's cart. Lives as a persistent icon in the top bar with an item-count badge, not a 6th tab. Adding a sixth destination to the bottom nav breaks the 5-tab ceiling this was deliberately designed around; don't do it even though a cart icon feels like it belongs in the nav at first glance.
- **Scope it to shoppable surfaces only** — Home, Mart, Fashion, and later Gadgets. It has no reason to appear on CalebNet or i-CON/Wallet, and needs to be pulled from the Wallet page specifically, where it's currently showing — that's a fix against what's actually built, not new guidance.
- On Home, it sits well-aligned beside the avatar in the header — that placement isn't landing correctly in the current build, confirm it's actually fixed rather than just moved.
- **Every cart item needs to carry which product it belongs to** (`productType: 'mart' | 'fashion' | 'gadgets'`), and checkout eligibility needs to check *that specific item's* product state — not one blanket rule. Right now the cart applies Mart's open/closed hours to the entire cart regardless of contents, so a Fashion item becomes unpurchasable whenever Mart happens to be closed. This is a real bug, not an edge case — fix the data model (tag on add-to-cart) and the checkout gate (evaluate per line item, block only the items actually affected) together.

**Safe area / notch handling — real device bug, not cosmetic.** Screenshots on an iPhone 13 show the back button and cart icon colliding with the status bar/notch area on the PDP specifically, while the same elements render cleanly on Android. This is the standard PWA safe-area problem: add `viewport-fit=cover` to the viewport meta tag if it's not already there, and use `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` (with a sensible fallback, e.g. `max(1rem, env(safe-area-inset-top))`) on anything positioned relative to the viewport edges — especially floating icons over full-bleed images like the PDP hero, which are the most likely spot to have hardcoded offsets that skip this. Audit beyond just the one page that happened to get screenshotted; anywhere else uses the same absolute-positioning pattern will have the same bug.

**This five-tab structure is complete as specified — don't add a sixth for CalebDeck Business.** Business is a new product on the roadmap, not yet built (see the note at the end of Section 5) — its customer-facing footprint, if any, isn't confirmed yet. Nothing about it should be designed or built until that's resolved.

**Responsive behavior — this is how "native iOS feel" and "works on every device" reconcile, not conflict.** The visual *language* (glass, squircle corners, single accent color, spring motion, typography) stays constant at every size. What changes is the *navigation pattern* — and there's an authentically Apple-native precedent for exactly this: iPhone apps use a bottom tab bar; the same apps on iPad commonly switch to a persistent sidebar instead. That's Apple's own convention, not an invented one.
- **Phone / narrow viewport:** bottom pill tab bar as above, single-column content.
- **Tablet / wider viewport:** the same five destinations move into a persistent left sidebar (still glass, same icons), freeing the bottom of the screen. Content grids gain columns.
- **Desktop:** sidebar persists, content gets a max-width container so cards and text don't stretch edge-to-edge on ultra-wide screens, grids go to 4-5 columns.
- One shared breakpoint system, not a separate design per device — it should read as the same product at every size.

**Home screen, top to bottom** — a signed-in i-CON's first screen, before they touch settings:
1. Greeting header — "Good afternoon, [name]" with a small tappable avatar. Must compute morning/afternoon/evening from the actual current time, not render statically — this was wrong in the first build.
2. An "at a glance" row — CalebNet wallet balance, and if there's a live order, its status inline (e.g. "Jollof + drinks · arriving in 12 min"). This is the single highest-value thing on the screen — surfacing it immediately instead of making someone dig for it.
3. Search, full-width, rounded.
4. Promo/hero banner — a **carousel** across CalebDeck Mart, Fashion, and Business (Gadgets joins once it exists). Each slide: a solid brand-color gradient filling the left side, fading to transparent toward the right, with that product's logo sitting on the right so it reads as emerging *from* the color rather than placed on top of it. This needs a transparent-background version of each logo — the ones on hand are on black backgrounds — composited under a gradient overlay that's opaque color on the left and fully transparent by the time it reaches the logo.
   - **Colors:** Mart keeps whatever it already uses. Fashion leans purple, its primary. Business leans orange instead, even though it shares the same two-color palette as Fashion — inverting the emphasis is what keeps the two slides from reading as near-duplicates back to back in the same carousel.
   - **Admin-configurable, not hardcoded.** A settings page to add, edit, and remove slides — product, color, logo, and a description/tagline per slide — the same pattern as inventory management elsewhere. Nothing here should be baked into the code.
5. Real preview cards for Mart and Fashion — actual products with real images, not nav-icon links. Home is still Food-first, but the other products need genuine discovery here, not just a door to their own tab.
6. Food vendor grid. Tapping a vendor card routes straight into that vendor's page — no intermediate "see all" list in between. This was a real UX bug in the first build, not a preference.
7. Once CalebDeck Business has approved listings: real cards under a "Campus Brand" section — photo, description, vendor name. These are non-competing categories only (perfume, jewelry, accessories, and similar — never food, fashion, or gadgets, since CalebDeck already operates those itself), and they never distribute into Home's food grid, Fashion's catalog, or Gadgets — Campus Brand is their only home, full detail in Section 5.

**Visual language:**
- **Foundation, not a new brand.** Pull CalebDeck's existing color tokens and logo treatment as the base — this should feel like CalebDeck leveling up, not a different product bolted on.
- **Squircle corners, not plain rounded rectangles.** Apple's continuous-corner curve reads as noticeably smoother than a standard CSS `border-radius` — approximate it with a squircle utility/clip-path. Small detail, large part of whether this reads as "Apple-designed" versus "generically rounded."
- **Frosted glass for elevation, not drop shadows** (`backdrop-filter: blur` on translucent surfaces), reserved for the nav bar, modals, and the i-CON profile card specifically. Applying it everywhere reads as busy, not premium.
- **Large, collapsing titles.** Screen names render big and bold at the top, shrinking into a slim header on scroll.
- **One accent color, used sparingly.** Neutral base (true white or true dark, not gray-on-gray), accent reserved for interactive/active states only.
- **Structural patterns:** rounded, elevated cards for product/list items; pill-shaped category and filter chips; a product-detail layout of hero image → thumbnail strip → variant selectors → sticky price-and-CTA bar.
- **Spring-based motion,** not linear easing, for transitions and taps.
- **Typography:** SF Pro is licensed by Apple for apps on Apple's own platforms, not something to embed on a public website. **Inter** is the standard substitute, built for exactly this gap.
- **Icon consistency:** one icon set (Lucide or Phosphor), one stroke weight, throughout.
- **Copy:** active voice, named by what the person does ("Save changes," not "Submit"). Keep "i-CON" consistent everywhere it appears.
- **Quality floor at every size:** thumb-reachable primary actions on phone, visible keyboard focus states everywhere, respect `prefers-reduced-motion`, real touch target sizes.

**Fixes against the first build — these are corrections, not new scope:**
- **Dark/light toggle** was floating loose as its own FAB. It belongs inside i-CON settings, not floating anywhere on screen.
- **Back button** must be hidden on all five tab roots — Home, Mart, CalebNet, Fashion, and i-CON included (Profile was missed in the first pass) — and kept only on genuine sub-pages beneath them (a specific vendor, a specific product, checkout).
- **Sign Out** doesn't belong in the header as a bordered, colored pill — too much visual weight for something tapped once in a long while. Move it into the Preferences list as a plain red-text row, no border or fill, the way Apple's own Settings handles it. Once the back button and Sign Out are both out of the header, it simplifies down to just the large "i-CON Profile" title.
- **Desktop/wide-viewport profile card** currently just stretches without redistributing its content — avatar and name stay bunched on the left with a dead void on the right. Either cap the card's width and center it, or actually redesign its internal layout to use the space; don't just let it stretch.
- **Color system needs real discipline.** The first build has purple, yellow, green, blue, and lavender all doing unrelated jobs across one flow (buttons, toggles, badges, category tiles) — that's the single most "generic/AI-built" tell there is, and it works directly against "premium." One true accent color, used consistently for actions and active states; category tiles either drop their competing background colors or unify to something quiet once their icons are doing the visual-interest work instead.
- **Category icons** ("Explore CalebDeck" tiles) move from generic line icons to distinctive, photographic/3D-style icons — pull real assets from a source like Iconscout or UI8 rather than generating abstract placeholders.
- **Navigation must be client-side, full stop.** Pages are currently hard-reloading on every nav change instead of routing client-side — the single biggest thing undermining "feels native" in this entire doc, since a real native app never reloads between tabs. Audit every internal link/nav action for a raw `<a href>` or `window.location` call that should be the router's `Link`/`navigate()` instead.
- **The i-CON page loads slowly on every visit, reload or not.** Almost certainly re-fetching the same user/order/wallet data from Firestore on every mount instead of reading data already loaded elsewhere in the app (an auth/user context, for instance). Fix the underlying re-fetch, and add a real loading skeleton for whatever genuinely needs a fresh fetch — slow *and* silent reads as broken, not slow.
- **Avatar picker** moves from the current emoji-reaction set (Smile/Cool/Nerd/etc.) to a curated set of Memoji-style illustrated avatars — sourced real assets, same reasoning as the icon packs above, not the coding agent generating its own. Selectable and changeable from i-CON Profile → Preferences.
- **"Local Businesses" section label → "Campus Brand."**

**Rollout care:** this now touches the styling of the highest-traffic pages in the app — Food ordering specifically. A visual bug here costs an order the same way a broken checkout does. Treat it with the same discipline as Phase 1: feature-flag the theme switch, test broadly across real devices before real signed-in users see it, and keep a fast fallback to "no theme" (today's appearance) if something's visually broken post-launch.

Apply all of this to the i-CON account area, CalebDeck Fashion, and — once the theme foundation exists — Food, Mart, and CalebNet's existing pages.

---

## 5. Phase 3 — CalebDeck Fashion (new product)

Fashion doesn't exist yet as a full system — the catalog/PDP/admin shell is built; this phase layers in how it actually operates. **i-CON-only** — no guest browsing or buying here, see Section 3 for why.

**The operating model is fundamentally different from Mart — this changes more than it looks like at first.** Fashion is not instant/on-demand. Vendors submit inventory through WhatsApp for Calebdeck's manual review and approval — they never self-list — and approved products fulfil on a **weekly batch**, not on-demand delivery:
- **Order window:** Monday through Thursday.
- **Batch close:** Thursday.
- **Procurement/consolidation:** after close, Calebdeck coordinates sourcing from vendors for the whole week's orders at once, rather than moving each order individually.
- **Campus arrival:** Friday.
- **Customer delivery:** Friday through Saturday.

This is a deliberate cost/logistics decision, not a limitation to hide — the UI needs to *communicate* it clearly rather than let someone assume Fashion behaves like Mart.

**Brand identity:** purple as primary (main CTAs, active states, price emphasis), orange as secondary (badges, an active wishlist heart, sale tags, and batch-status accents). Two colors with clearly separated jobs, not competing for the same one.

**Confirmed: Fashion is a genuine multi-brand marketplace, not a single CalebDeck-owned catalog.** Partner vendors sell fashion items through it the same way Business vendors do for their own categories — brand tags and per-vendor accent colors are correct as specced, keep them exactly as built.

**Per-vendor brand color:** Fashion's shell — nav, catalog, filters, PDP structure — stays exactly as speced everywhere, purple/orange baseline, never changes per vendor. A specific brand's own color shows up in exactly one contained place when browsing their storefront — a header banner or a "Shop [Brand]" button — never the price text, never every button, never the background. No brand color set → falls back to purple/orange.

**CalebDeck Originals — the one real gap.** This is CalebDeck's own house line within Fashion (jerseys, hoodies, tracksuits, etc. — CalebDeck's own product, not a partner's), and it needs to exist as a first-class brand in the same tagging system every partner vendor uses — a "CalebDeck Originals" tag on its products, same as any other brand tag. Two differences from a partner brand: it's managed directly by admin, not through the WhatsApp submission and approval pipeline external vendors go through, and its "brand color" is simply Fashion's own purple/orange baseline rather than a distinct accent — it's the house brand, not a guest, so it doesn't need special-casing beyond making sure it's actually tagged and browsable like everything else.

**Batch countdown — designed, not just functional:**
- Lives on the catalog page, below the search/filter row, above the product grid — a dedicated card, not a popup or an interruption.
- Large day:hour:minute digits (skip seconds — a ticking counter causes constant re-renders and reads as anxious, not premium), same squircle/elevation treatment as everything else, purple accent.
- Plain-language line underneath: "Order by Thursday to join this week's batch." Once closed: "This week's batch is closed — next batch opens Monday."
- **Avoid the generic e-commerce urgency cliché** — no red digits, no flashing. This is information, communicated calmly, not a pressure tactic.

**Batch-aware product states — reuse existing visual patterns, don't invent new ones:**
- **Available:** normal card, full color, Add to Cart/Buy Now active.
- **Batch closing soon:** small amber badge, same slot as an existing sale/new badge — still orderable.
- **Batch closed / Next batch:** reuse the exact dimmed-card-plus-status-label treatment already built for closed food vendors ("Old Cafeteria — Closed") — same pattern, different label, not a new visual language.
- **Sold out:** reuse whatever Mart's inventory system already does for this.

**Order status, end to end:** Order Placed → Batch Active → Batch Closed → Order Consolidated → Procurement in Progress → Arriving at Caleb University → Ready for Delivery → Out for Delivery → Delivered. Shown as a vertical stepper on the order detail view within Order History — accent-filled for completed stages, muted for upcoming, same icon/squircle language as the rest of the app. This is a Fashion-specific addition to Order History, not a redesign of how Food or Mart orders display there.

**Order-success page — a receipt printing out of a machine, not a generic confirmation card.** The current build (a plain white card stack: ticket number, order receipt header, item list, delivery info) is the wrong direction entirely — no receipt visual, no animation, doesn't match what was actually asked for. The reference is specific: a dark "device" element at the top (small logo, order name, total, a success checkmark — the one place a universal green reads better than forcing purple/orange onto it), and *emerging downward from it, animated*, a white paper receipt — torn/zigzag edges (top where it meets the device, bottom where it "tears off"), a slightly condensed/monospace lean to the itemized section specifically for authenticity, order/ticket number, itemized list, subtotal/fees/total, delivery info, expected arrival + batch, and a decorative barcode graphic at the very bottom (purely visual, it doesn't need to encode or scan to anything real).
- **Page background goes dark for this one page specifically** — black or near-black, a deliberate exception — it's what makes the white receipt actually read as paper, the way the reference shows it. This is contained to this single page, not a sitewide dark-mode change.
- **The receipt animates into view on mount** — starts collapsed at the device, slides/grows downward like it's being printed, settling with the same spring-based motion already established sitewide, not a linear fade.
- Scoped to Fashion for now — this is not a retroactive redesign of Food, Mart, or CalebNet's existing (already-working) success pages.
- **Separate bug in the current build, fix regardless of the redesign:** the item price row shows a struck-through price next to a different total — that reads as a discount that doesn't exist. Confirm there's no real discount being dropped, and if not, remove the strikethrough entirely.

**Delivery timing must be stated plainly at the point of purchase**, not left implicit. Near Add to Cart/Buy Now on the PDP: a short line like "Joins this week's batch — arrives [date]." Getting this wrong is a trust problem, not a UI nitpick — someone expecting Mart-speed delivery and getting a week-later batch delivery instead is a support ticket waiting to happen.

- **Data model:** inspect CalebDeck Mart's existing Firestore schema and reuse its patterns for products, cart, and orders wherever it fits, adjusted for fashion-specific attributes (size, color/variant, brand, and now batch/order-status fields). Don't invent a parallel system where Mart's already solved the same problem.
- **Admin:** beyond add/edit/mark sold out, Fashion's admin now also needs batch schedule configuration (which days the window runs, when it closes — not a simple daily-hours toggle, since the cycle is weekly) and the ability to advance an order through the status pipeline as procurement actually happens. No hardcoded placeholder data — seed via the same admin flow using Unsplash URLs for now.
- **Product photos need actual background removal**, not just placement on a colored card — see the transparent-PNG requirement already in this doc; applies here regardless of the batch system.
- **Catalog page** — no greeting header, redundant with Home. Search bar + Filter, price-range filter, category pills, the countdown card described above, then the product grid: photo, wishlist heart, name, price, brand tag on every card (Fashion displays other people's brands, this isn't optional), batch-state badge where relevant. Header zone through the search bar carries the purple-gradient-plus-faded-logo watermark, kept subtle enough that the controls on top stay fully legible.
- **Product page:** hero image with thumbnail strip, brand name near the title (tappable through to more from that brand), quantity stepper, color/size selectors, expandable description, the delivery-timing line, bottom bar split into Add to Cart / Buy Now.
  - Image area and info panel are two visually separate fixed containers with their own meeting rounded corners — not one shared surface, not a draggable sheet. Only the info panel's content scrolls internally.
- **Add to cart:** lightweight slide-up preview drawer, feeding the *same* shared cart as Mart/Gadgets — not a second cart.
- **Checkout:** shared cart/checkout infrastructure. Every Fashion customer is signed in by definition, so the payment selector always shows Wallet/Card, no guest-fallback branching. Paystack-only until wallet extends past Mart.
- Ties into `productsUsed`, connected-products, and order history like Mart does — plus the batch-status stepper above, which is Fashion-specific.

**CalebDeck Business — corrected: connection-only, non-competing categories, no CalebDeck payment.**

Business exists specifically for categories CalebDeck doesn't already operate in — not food (that's the core product), not fashion/clothing (its own vertical), not gadgets/electronics (same). Realistically: perfume, watches, jewelry, press-on nails, and similar small campus businesses. Vendors submit through WhatsApp — no in-app application form for the submission itself, only a form that hands off to WhatsApp. On approval, a vendor gets a permanent Vendor ID (`CBDK-V-000001`), each approved product its own Product ID (`CBDK-P-000001`).

**CalebDeck never touches the transaction.** Products never distribute into Home, Fashion, or Gadgets — they live only in the Campus Brand section. Tapping a product opens a dedicated Business product page (photo, description, vendor info) with a single **"Chat with Vendor"** button in place of any cart/checkout — no Add to Cart, no price-driven interaction beyond what helps the customer describe what they want. That button opens WhatsApp to the *vendor's own number* (from their contact info, not CalebDeck's), with the product and a starting order message pre-filled. CalebDeck is the connector, not the payment processor, here — this also simplifies the build: no wiring into the shared cart, wallet, or Paystack for Business at all.

**Metrics, since CalebDeck can't see the actual sale:** the one thing CalebDeck's own system *can* reliably measure is how many people were referred to a vendor — log every "Chat with Vendor" tap as an event (vendor, product, timestamp, and the i-CON if signed in) before the WhatsApp handoff fires. This becomes two things: an aggregate view for admin (how much value CalebDeck is actually driving for vendors — useful for the subscription pitch itself), and a count on each vendor's own dashboard ("X people reached out this month") — which gives vendors a concrete reason to see the subscription as worth renewing, not just a number they take on faith.

**Business is subscription-based, monthly, and paid — not just onboarded.** No access code exists until payment clears: a vendor is created with `status: PENDING_PAYMENT` and no code, admin (or the vendor) gets a unique per-vendor activation link, payment happens through that link via Paystack, and only a *server-verified* successful payment flips the vendor to `ACTIVE`, sets the subscription dates, and generates the code.

**The activation link must be single-use, enforced server-side, not just hidden in the UI.** Once a vendor's status is `ACTIVE`, that link must refuse to process another payment — no re-charging the same vendor, no second party reusing a leaked link, no accidental double-submission creating a duplicate transaction. This has to be checked inside the payment-verification endpoint itself before it processes anything, not just by hiding a "Pay" button once the frontend happens to know the vendor is already active — a repeated or replayed request must be rejected at the server regardless of what the UI shows. The one case this should *not* block: a vendor whose first attempt failed or was abandoned and is still `PENDING_PAYMENT` needs the same link to keep working for a legitimate retry — the restriction is specifically against re-paying after a *successful* activation, not against retrying before one.

**When a vendor's subscription lapses, their products stop appearing automatically** — not manually toggled off by admin each time. Implement this as a query-time check (filter out any vendor whose subscription end date has passed whenever fetching products for display) rather than relying solely on a scheduled job — a query-time check can't silently fail to run the way a cron job can. **Hide expired vendors' products, don't delete them** — if they renew, everything comes back without redoing the upload. The same principle applies if a vendor is deleted outright: keep their historical referral records rather than deleting them — that data is CalebDeck's own record of value delivered over time, and it just won't surface for a vendor no longer in the current roster.

**The Business page itself:**
1. **Info page** — what CalebDeck Business is, in plain marketing language.
2. **"Get Started" button** → a form: vendor/business name, what they sell (freeform, or a light category/tag like perfume/jewelry/accessories — for filtering *within* Campus Brand, not for routing anywhere else), contact info, subscription plan they're choosing. Plan names/pricing aren't finalized yet — build the form with a generic plan selector for now, populated from whatever admin configures, not hardcoded names.
3. **Submit hands off to WhatsApp, not a server.** Build a `wa.me` link with the form's contents pre-filled as the message text, pointed at +234 807 255 0635 (CalebDeck's own number, for onboarding — distinct from each vendor's own number used later for Chat with Vendor), and redirect there on submit.
4. **A separate "Access your vendor dashboard" button**, below Get Started — for already-approved vendors. They enter a code, generated by admin when the vendor's account is created after WhatsApp approval, to reach their dashboard.
5. **Vendor dashboard:** subscription status, their referral count (see Metrics above), and which of their products are currently live on CalebDeck — a read view into the same data admin manages, not a separate vendor-editable copy.

**Vendor dashboard access is a separate, lightweight auth mechanism from i-CON/ICA — vendors aren't students, don't force them through that system.** The access code should still be treated like a real credential: long enough to not be guessable, validated server-side, rate-limited on attempts — not a client-side string match. Admin should be able to regenerate a vendor's code if they lose it.

**Admin needs, to make the whole loop work:**
- Onboard a vendor manually (after WhatsApp approval) — assigns the Vendor ID, sets the subscription plan/dates, generates the access code, records their own WhatsApp number for the Chat with Vendor button.
- Add/edit/remove a vendor's products, assigning Product IDs — and **this must be a real, connected data flow**: the moment admin adds a product, it appears in Campus Brand; the moment admin removes one, it disappears. Not two disconnected lists that happen to usually agree.
- See vendor status (active/expired) and referral counts at a glance.

**Entry point on the customer-facing side:** Campus Brand stays on Home — not because it's food-adjacent (it isn't, by design), but because Home is the highest-traffic page and this deserves real visibility as its own distinct, ecosystem-wide feature rather than a sub-section attached to any one vertical. The promo carousel can still carry a slide too, just not as the only touchpoint — a sliding carousel is easy to miss.

**Worth adding, not explicitly asked for but a natural gap:** a notification when a vendor's subscription is approaching expiry, so it doesn't just silently vanish on them one day — matches the tone of the other Business notifications already speced. Renewal itself, for now, is presumably the same WhatsApp-plus-admin-manual-update process as everything else here, since there's no in-app payment flow described for this anywhere — flag it back if an automated renewal flow is actually wanted instead.

**Entry point on the customer-facing side:** put it in the same section that already displays approved vendor products ("Campus Brand" and wherever else Business products surface), not only in the promo carousel — a sliding carousel slide is easy to miss; sitting right next to other vendors' products, in context, is the deliberate version of the same idea. The carousel slide can still exist as one more touchpoint, just not the only one.

**Worth adding, not explicitly asked for but a natural gap:** a notification when a vendor's subscription is approaching expiry, so it doesn't just silently vanish on them one day — matches the tone of the other Business notifications already speced. Renewal itself, for now, is presumably the same WhatsApp-plus-admin-manual-update process as everything else here, since there's no in-app payment flow described for this anywhere — flag it back if an automated renewal flow is actually wanted instead.

**Also on the roadmap, confirmed but not this phase: Calebdeck Coins and Calebdeck Ambassadors.** Coins is a separate rewards/loyalty currency — earned through activity, redeemable across products — and must never be conflated with the Wallet already built (Wallet is real money via Paystack; Coins is earned points, a different system entirely). Ambassadors is a student referral/distribution program with trackable referral codes. Both are explicitly later-phase per the product roadmap (Fashion, then Business, then Coins, then Ambassadors) — don't start building either until they get their own dedicated design pass.

**CalebDeck Gadgets** — still not designed, and its navigation placement is genuinely undecided (it can't be a 6th tab any more than Business can). It still needs to exist on the landing page and in SEO content now regardless of build status — see below.

**Landing page & SEO — represent the whole ecosystem.** Anywhere the landing page currently mentions CalebDeck Mart or CalebNet, it needs to mention **CalebDeck Fashion** and **CalebDeck Gadgets** too — same visibility, not an afterthought. Applies to meta tags, page titles, and structured data (JSON-LD, Open Graph) as well as visible copy — someone searching "CalebDeck" should see Fashion and Gadgets surface the same way Mart and CalebNet already do. This can go out now, ahead of Fashion's full build — pre-listing an upcoming product in SEO metadata is normal practice, it doesn't need to wait for the shopping experience to be finished. CalebDeck Business belongs here too, framed for what it actually is — vendor visibility/advertising, not a fourth shopping vertical.

---

## 6. Explicit do-not-touch list

- CalebDeck Food's, Mart's, and CalebNet's page structure, routing, and business logic — layouts and functionality don't change. (Their styling for signed-in users is explicitly in scope — see Section 4 — but only via the additive theme, never a rewrite of the shared/guest styles.)
- Guest *appearance* — guests must render pixel-identical to today, since they never receive the signed-in theme
- Guest checkout logic
- Payments, admin, rider dashboard, scheduled delivery, order tracking, wallet
- Firestore security rules (should not need to change at all under this design)

---

## 7. Testing & rollout

- Feature branch → staging → production, in that order. No direct-to-production changes.
- Test cases before any real-user rollout: existing user retains UID/history through ICA login; new user account creates cleanly; guest flow is provably untouched; CalebNet wallet and Mart order history are unaffected; security rules behave identically to today.
- Keep the current login path live in parallel through the transition (per the Phase 1 checkpoint) rather than an immediate cutover.
- Rollback plan: since the old path stays live, disabling the new "Become an i-CON" entry point is a simple UI-level toggle if something needs more time.