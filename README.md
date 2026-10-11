# Abuja Events (Event Hub)

Production event-discovery + ticketing platform for Abuja.
**Live: https://abuja-events.vercel.app** · Repo: brythema/Event-Library ·
Firebase project: `iron-mint-announcements` (reused empty AI Studio leftover —
the account is at project-creation quota) · Vercel project: `abuja-events`
(team hemabryt) · Blob store: `abuja-events-media` (public).

## Architecture

- **Auth**: Firebase Auth (email/password). Roles live in `users/{uid}.role`
  (Buyer | Organizer); Admin is a custom claim (`{admin:true}`), never
  self-registered. One email = one identity.
- **Database**: Firestore. Reads are live subscriptions role-scoped by
  `src/services/db.ts`; writes are validated by `firestore.rules`
  (deployed). Bookings can NEVER be created from the browser.
- **Booking**: `POST /api/book` — jose-verified ID token + atomic
  Firestore REST transaction (decrement availability + booking + admin
  notification). Zero dependencies beyond `jose`; firebase-admin is banned
  from Vercel functions (ESM/require crash, Tasara lesson).
- **Files**: `POST /api/media-upload` → Vercel Blob (public store), 4 MB cap,
  path must embed the caller's UID. Firebase Storage was skipped
  deliberately: it requires the Blaze plan (card).
- **Payments**: WhatsApp bank-transfer verification (admin confirms in the
  dashboard; declining restocks tickets). Paystack/Flutterwave deliberately
  out of scope — see docs/PRODUCTION-SCOPE.md.

## Environment (Vercel project, all 3 environments)

- `BLOB_READ_WRITE_TOKEN` (auto, from the blob store)
- `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (service
  account; the local key is the gitignored `service-account.json`)

## Commands

```bash
npm run lint          # typecheck
npm run build         # production build
npm run dev           # local dev on :3000

# Firebase (one-time, already done)
firebase deploy --only firestore:rules --project iron-mint-announcements
node scripts/provision-admin.mjs admin@example.com "StrongPassword" "Name"
node scripts/seed-demo.mjs       # idempotent demo data, dates relative to today

# Verification (SMOKE_BASE defaults to the current preview; override for prod)
SMOKE_BASE=https://abuja-events.vercel.app node scripts/smoke-production.mjs   # 24 checks, self-cleaning*
SMOKE_BASE=https://abuja-events.vercel.app node scripts/stress-bookings.mjs    # 24-way oversell race
node scripts/purge-test-data.mjs      # bookings + order notifications residue
node scripts/purge-test-fixtures.mjs  # smoke/stress fixture events+plans (REST DELETE can 409)
```

\* smoke self-cleans bookings/notifications/profiles/accounts; the fixture
event+plan occasionally survives a REST 409 — run the two purge scripts
after test rounds until launch data is real.

## Demo accounts (owner knowledge — NOT shown in the app)

| Account | Password | Role |
|---|---|---|
| brythema@gmail.com | (owner-set via provision) | Admin |
| admin@abujaevents.com | admin123 | Admin (demo) |
| events@capitalcreatives.com | organizer123 | Organizer |
| hello@abujatechhub.ng | organizer123 | Organizer |
| buyer@gmail.com | buyer123 | Buyer |

Rotate/delete before public launch.

## Known limits (overbuild guard)

WhatsApp number is the placeholder `+2348012345678` (`ADMIN_WHATSAPP` in
`src/utils.ts`). No email sending, QR check-in, refunds/restock-on-cancel,
multi-city, or analytics. Bundle is ~540 KB minified (Firebase SDK) — code
splitting is the first optimization if it ever matters.
