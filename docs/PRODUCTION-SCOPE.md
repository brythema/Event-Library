# Abuja Events (Event Hub) — Production Build Scope

Date: 2026-10-11 · Repo: brythema/Event-Library · Work folder: `Event-Library/`

## Goal

Take the AI Studio prototype (100% client-side, localStorage, simulated clock,
simulated auth) to production level: real accounts, real database, real file
storage, server-verified ticket booking — without turning it into a different
product.

## Architecture decisions

| Concern | Decision | Why |
|---|---|---|
| Auth | Firebase Auth (email/password), client SDK | Owner directive. Free on Spark. |
| Roles | `users/{uid}.role` = Buyer \| Organizer; Admin via custom claim `{admin:true, role:'admin'}` | Tasara's claims-based admin model, proven in production. |
| Database | Firestore (client SDK for reads/writes under strict rules) | Free on Spark; same stack as Tasara/Realto/E-Results. |
| File storage | Vercel Blob via `/api/media-upload` (token-verified), **public** access | Firebase Storage needs Blaze (card) — the Tasara workaround. Flyers/logos are public content, so unlike Tasara's private ID store there is no read proxy. |
| Booking | `POST /api/book` server endpoint: jose ID-token verification + service-account Firestore transaction (decrement + booking + notification atomically) | Oversell protection is the one thing rules alone cannot guarantee; Tasara pattern (server endpoint, no firebase-admin on Vercel). |
| Payments | KEEP WhatsApp bank-transfer verification (admin confirms in dashboard) | Market research: bank transfer is the norm for Nigerian organizers; adding Paystack/Flutterwave = webhook/reconciliation/compliance scope = the overbuild to avoid. |
| Clock | Real `Date.now()` everywhere; simulated 2026-07-08 removed | Production must show real "Today". |
| Lifecycle | DB status stays admin-controlled; UI derives an `effectiveStatus` (Live/Ended) from date + time for display/filtering | Avoids a cron dependency; admin still archives manually. |
| Hosting | Vercel (team hemabryt), SPA + `/api/*` functions | Workspace standard. |
| Firebase project | Reuse `iron-mint-announcements` (empty AI Studio leftover: 0 apps, 0 data), renamed "Abuja Events" | Account is at project-creation quota (verified: `projects:create` fails with quota error). Reuse is non-destructive and reversible; nothing to delete. |
| Seeds | Idempotent seed script (demo events with dates relative to today, demo accounts via Admin SDK) | The owner can preview a populated app; can be cleared later. |

## Firestore collections

- `users/{uid}` — profile (role, email, fullName, phone, business fields, savedEventIds). Read: self/admin. Self-create only as Buyer|Organizer with validated fields; role immutable.
- `events/{id}` — event docs. Public list limited to visible statuses (Approved, Ticketing Active, Live, Ended); organizers read own; admin reads all. Create: owner-organizer as Draft|Published. Update: owner (content fields while Draft/declined) or admin (status/feature/archive). Delete: owner/admin.
- `ticketPlans/{id}` — public read. Create: admin (with initial availableQuantity). Update: admin, `availableQuantity` excluded (server endpoint is the only writer).
- `bookings/{id}` — read: buyer-own/admin; status update + delete: admin. Client create: **never** (server endpoint only).
- `notifications/{id}` — read: recipient (or admin claim for `userId:'admin'`); create: signed-in with validated fields; update: recipient marks read.

## API endpoints (Vercel functions, jose verification — no firebase-admin)

- `POST /api/media-upload?path=media/{uid}/{kind}-{ts}.{ext}` — Bearer ID token; path must embed caller's UID; ≤4 MB; jpg/jpeg/png/webp/gif. Public blob store (project env `BLOB_READ_WRITE_TOKEN`).
- `POST /api/book` — JSON body `{eventId, ticketPlanId, quantity}`; Bearer ID token. Server: event must be Ticketing Active (or Approved), plan must belong to event, quantity ≥ 1 and ≤ maxPurchaseLimit, availability sufficient. Transaction: decrement `availableQuantity`, create booking (server-generated reference + server timestamp), write admin notification. Returns booking.

## Testing

- **Rules unit tests** — `@firebase/rules-unit-testing` against the Firestore emulator (Tasara pattern).
- **Smoke test** — self-contained HTTP script against the deployed preview: creates throwaway Firebase accounts via Identity Toolkit REST, exercises auth walls, media upload path-lock, full booking loop (decrement, oversell rejection, admin confirm), deletes everything after (Tasara smoke pattern).
- **Stress test** — N concurrent `/api/book` calls racing a plan with fewer tickets than callers: exactly the available count must succeed, availability must land at 0, never negative.

## Explicitly NOT built (overbuild guard)

Online payments (Paystack/Flutterwave), email/SMS sending, QR scanner/check-in
validation, refunds/cancellations with restock, seat maps, multi-city support,
admin analytics dashboards, image CDN transforms, rate limiting beyond
Firestore defaults, PWA/offline.

## Cleanup (dead code)

`@google/genai`, `express`, `dotenv`, `tsx`, `esbuild`, `autoprefixer` deps;
`metadata.json`, `assets/.aistudio`; `SIMULATED_TODAY` machinery and
localStorage state layer; AuthModal demo-login box and the landing page's
inline plaintext-password registration; unused util exports and the `clean`
npm script that references a nonexistent `server.js`.

## Open items for the owner

- Demo accounts (admin/organizer/buyer) are seeded with the prototype's weak
  passwords for preview purposes — delete or rotate before public launch.
- Admin: `brythema@gmail.com` provisioned with the admin claim.
- WhatsApp number for payment verification is hardcoded `+2348012345678` in
  the prototype — kept as a configurable constant; owner should set the real one.
