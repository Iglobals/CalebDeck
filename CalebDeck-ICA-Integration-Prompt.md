# CalebDeck × ICA Integration — Agent Build Spec
### i-CON accounts, the signed-in experience, and CalebDeck Fashion

---

## 0. Read this before touching anything

CalebDeck is **live in production with real users right now**. Everything below is additive on top of a working system — not a rewrite, not a refactor pass. Treat every existing flow as load-bearing until proven otherwise.

**Non-negotiables:**
- Food ordering must keep working without login. Never force sign-in to order food.
- Guest checkout stays exactly as it is today.
- Do not break: CalebNet, CalebDeck Mart, payments, admin, rider dashboard, scheduled delivery, order tracking, or wallet.
- Food, Mart, and CalebNet keep their exact current pages, routes, and flows — no structural changes, no new features, no reorganizing what's there. Their **visual styling** does change for signed-in users specifically (see Section 4) — but only as an additive theme layered on top; guests must see today's design, unchanged, with zero exceptions.
- Say **"i-CON"** everywhere in UI copy — profile labels, buttons, empty states, everything. Never "iUser," never generic "account."

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
> "Get a better CalebDeck experience as an i-CON. Save your hostel, phone number, CalebNet number, order history and connect your activity across iGLOBALS products."
> Buttons: **Become an i-CON** · **Continue as guest**

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

**CalebDeck Fashion** *(new, mirrors the Mart pattern)*:
- Signed in → attach `iConId` to Fashion orders, add `"CalebDeck Fashion"` to `productsUsed`.
- Guest → same guest-checkout philosophy as the rest of the ecosystem, unless product wants Fashion to be i-CON-only — flagged as an open call for you to confirm, not assumed here.

---

## 4. Design direction — i-CON layer, CalebDeck Fashion, and the sitewide signed-in theme

**Confirmed scope:** Food, Mart, and CalebNet keep their exact current pages, routes, and flows — nothing about how they work changes. What changes, once someone's signed in, is how everything *looks*: the premium/native-app treatment described below applies sitewide, not just to the new Profile page and banner.

**Before writing more UI code, answer this — it determines the real size of the job:** does the codebase already have a centralized styling/token system (CSS custom properties, a Tailwind theme config, a styled-components/CSS-in-JS theme provider, etc.), or is styling hardcoded per component?
- **If centralized:** this is a contained job. Define a second "signed-in" token set (colors, radii, shadows, blur usage) and swap it in at the root based on auth state — a class or data-attribute on a top-level wrapper. Existing Food/Mart/CalebNet components that already consume those tokens re-skin automatically; no per-page rewrites needed.
- **If not centralized:** say so before starting. "Restyle everything" then becomes a page-by-page rewrite, not a theme swap — a much bigger job than what's scoped here, and the timeline needs to be renegotiated with that reality rather than silently absorbed into Phase 2.

**Sequencing:** build the theme foundation *before* finishing the Profile page and guest banner. Don't ship those with one-off custom styling and retrofit them into a sitewide system afterward — they should be the first two things built using the new token set, not built separately from it.

**Guests must never receive this theme.** Implement it as an additive override — new tokens layered on top when signed in — never a modification of the base styles guests currently see. With the signed-in class/attribute absent, a page must render byte-identical to how it does today. This is the same non-negotiable as everything else guest-facing in this doc.

**Navigation:** a floating pill-shaped tab bar, frosted glass background so content scrolls beneath it, five destinations — **Home** (Food, the default landing tab), **Mart**, **CalebNet**, **Fashion**, **i-CON** (profile). Active tab gets a filled icon, inactive tabs stay outlined — that fill/outline swap on selection is a core iOS-native detail, don't skip it. If Home should read as a hero action rather than a flat fifth icon, raise and slightly enlarge just that one tab — restrict that treatment to exactly one destination or it stops reading as an accent.

**This five-tab structure is complete as specified — don't add a sixth for CalebDeck Business.** Business is a new product on the roadmap, not yet built (see the note at the end of Section 5) — its customer-facing footprint, if any, isn't confirmed yet. Nothing about it should be designed or built until that's resolved.

**Responsive behavior — this is how "native iOS feel" and "works on every device" reconcile, not conflict.** The visual *language* (glass, squircle corners, single accent color, spring motion, typography) stays constant at every size. What changes is the *navigation pattern* — and there's an authentically Apple-native precedent for exactly this: iPhone apps use a bottom tab bar; the same apps on iPad commonly switch to a persistent sidebar instead. That's Apple's own convention, not an invented one.
- **Phone / narrow viewport:** bottom pill tab bar as above, single-column content.
- **Tablet / wider viewport:** the same five destinations move into a persistent left sidebar (still glass, same icons), freeing the bottom of the screen. Content grids gain columns.
- **Desktop:** sidebar persists, content gets a max-width container so cards and text don't stretch edge-to-edge on ultra-wide screens, grids go to 4-5 columns.
- One shared breakpoint system, not a separate design per device — it should read as the same product at every size.

**Home screen, top to bottom** — a signed-in i-CON's first screen, before they touch settings:
1. Greeting header — "Good afternoon, [name]" with a small tappable avatar.
2. An "at a glance" row — CalebNet wallet balance, and if there's a live order, its status inline (e.g. "Jollof + drinks · arriving in 12 min"). This is the single highest-value thing on the screen — surfacing it immediately instead of making someone dig for it.
3. Search, full-width, rounded.
4. Promo/hero banner.
5. Cross-product row — small cards linking to Mart, CalebNet, and Fashion. Home is Food, but the other three products still need a visible door here, not just their own tab.
6. Vendor/food grid, same card language as everything else.

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

**Rollout care:** this now touches the styling of the highest-traffic pages in the app — Food ordering specifically. A visual bug here costs an order the same way a broken checkout does. Treat it with the same discipline as Phase 1: feature-flag the theme switch, test broadly across real devices before real signed-in users see it, and keep a fast fallback to "no theme" (today's appearance) if something's visually broken post-launch.

Apply all of this to the i-CON account area, CalebDeck Fashion, and — once the theme foundation exists — Food, Mart, and CalebNet's existing pages.

---

## 5. Phase 3 — CalebDeck Fashion (new product)

Fashion doesn't exist yet — this is a from-scratch build, styled using the same signed-in token system as Section 4 (not a separate one-off style pass), functionally consistent with the rest of the ecosystem.

- **Data model:** inspect CalebDeck Mart's existing Firestore schema and reuse its patterns for products, cart, and orders wherever it fits, adjusted for fashion-specific attributes (size, color/variant). Don't invent a parallel system where Mart's already solved the same problem.
- **Pages:**
  - Catalog/home — category filters, a promo/hero block, product grid (image, wishlist heart, price, sale/new badge where relevant).
  - Product detail — hero image with thumbnail strip, category label, title, rating if applicable, expandable description, color and size selectors, sticky bottom bar with price and primary CTA.
  - Cart/checkout — reuse CalebDeck's existing cart/checkout infrastructure if it can cleanly extend to a new product type; if it can't, flag that back rather than silently building a second, parallel checkout system.
- **Sign-in behavior:** default to the same "enhanced, not required" philosophy as Food — guests can browse and check out, i-CONs get the saved-defaults and history benefits. Flag this back if Fashion should actually be i-CON-only.
- Ties into Phase 2's `productsUsed`, connected-products list, and order history exactly like Mart does.

**Also on the roadmap, not yet scoped: CalebDeck Business.** A vendor-application product — businesses apply, and once approved, their products display somewhere in CalebDeck. Same status as Fashion here (new, doesn't exist yet), but there isn't enough confirmed to spec it the way Fashion is specced above. Open before it can be built: is it customer-facing (people browse a vendor directory) or vendor/admin-facing only (an application + approval flow, with approved products folding into Food/Mart/Fashion rather than getting their own space)? Hold off entirely until that's answered — this doc gets a real Business section once it is.

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
