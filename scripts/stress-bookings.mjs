/* Abuja Events — booking stress test: the oversell race.

   Creates a fixture event + plan with TINY availability, then fires N
   CONCURRENT /api/book calls (the realistic retry-storm / double-click /
   fan-out pattern) and asserts the invariant that actually matters:

     - exactly `availability` bookings succeed
     - every other call is rejected with 409
     - final availability lands at exactly 0, never negative
     - no booking exists without a matching decrement

   Everything is cleaned up after (fixture docs, bookings, notifications,
   throwaway accounts). Exit 0 only when every invariant holds. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const BASE = (process.env.SMOKE_BASE || 'https://abuja-events-qefhkf0yr-hemabryt.vercel.app').replace(/\/$/, '');
const PROJECT_ID = 'iron-mint-announcements';
const API_KEY = 'AIzaSyDfrZZfqYWjE8dGTYbbpE-AK4lemIJlPYE';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/* Race shape: 5 tickets against 24 concurrent buyers. */
const AVAILABILITY = 5;
const CONCURRENCY = 24;

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: PROJECT_ID });
const adminAuth = getAuth();

const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ADMIN_UID = 'stress-admin-' + suffix;
const FIXTURE_EVENT = `stress-event-${suffix}`;
const FIXTURE_PLAN = `stress-plan-${suffix}`;
const buyerUids = [];
const buyerTokens = [];

let failures = 0;
function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures += 1;
}

const fsHeaders = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
const fsVal = (v) => {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsVal) } };
  if (v === null || v === undefined) return { nullValue: null };
  const fields = {};
  for (const [k, x] of Object.entries(v)) fields[k] = fsVal(x);
  return { mapValue: { fields } };
};
const fsFields = (obj) => {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = fsVal(v);
  return fields;
};
const readField = (v) => {
  if (!v || 'nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('mapValue' in v) {
    const out = {};
    for (const [k, x] of Object.entries(v.mapValue.fields || {})) out[k] = readField(x);
    return out;
  }
  return undefined;
};
const readDoc = (json) => {
  const out = {};
  for (const [k, v] of Object.entries(json.fields || {})) out[k] = readField(v);
  return out;
};
const patchDoc = async (path, raw, token) => {
  const res = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: fsHeaders(token), body: JSON.stringify({ fields: fsFields(raw) }) });
  return res.status;
};

async function mintToken(email, password) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  if (!res.ok) throw new Error(`signup failed ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { uid: json.localId, token: json.idToken };
}

try {
  const adminCustom = await adminAuth.createCustomToken(ADMIN_UID, { admin: true });
  const adminEx = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminCustom, returnSecureToken: true })
  });
  const adminToken = (await adminEx.json()).idToken;

  /* Fixture + 24 throwaway buyers with profiles, all via the rules. */
  const evStatus = await patchDoc(`events/${FIXTURE_EVENT}`, {
    organizerId: ADMIN_UID, title: 'Stress Fixture', subtitle: '', description: 'Oversell race fixture',
    category: 'Music', tags: [], flyerUrl: '', organizerLogo: '', backgroundBanner: '',
    date: new Date().toISOString().slice(0, 10), openingTime: '18:00', closingTime: '23:00',
    timezone: 'WAT (UTC+1)', venueName: 'Nowhere', streetAddress: 'Nowhere', area: 'Wuse II',
    landmark: '', googleMapLink: '', organizerName: 'Stress', phone: '', email: '', website: '',
    instagram: '', facebook: '', whatsapp: '', gallery: [], faqs: [],
    ageRestriction: '', dressCode: '', parking: '', refundPolicy: '',
    status: 'Draft', isFeatured: false, interestedCount: 0, createdAt: new Date().toISOString()
  }, adminToken);
  await patchDoc(`events/${FIXTURE_EVENT}`, {
    organizerId: ADMIN_UID, title: 'Stress Fixture', subtitle: '', description: 'Oversell race fixture',
    category: 'Music', tags: [], flyerUrl: '', organizerLogo: '', backgroundBanner: '',
    date: new Date().toISOString().slice(0, 10), openingTime: '18:00', closingTime: '23:00',
    timezone: 'WAT (UTC+1)', venueName: 'Nowhere', streetAddress: 'Nowhere', area: 'Wuse II',
    landmark: '', googleMapLink: '', organizerName: 'Stress', phone: '', email: '', website: '',
    instagram: '', facebook: '', whatsapp: '', gallery: [], faqs: [],
    ageRestriction: '', dressCode: '', parking: '', refundPolicy: '',
    status: 'Ticketing Active', isFeatured: false, interestedCount: 0, createdAt: new Date().toISOString()
  }, adminToken);
  const planStatus = await patchDoc(`ticketPlans/${FIXTURE_PLAN}`, {
    eventId: FIXTURE_EVENT, name: 'Rush Class', price: 1000, availableQuantity: AVAILABILITY,
    maxPurchaseLimit: 1, description: '', color: '#000000', displayOrder: 1
  }, adminToken);
  report('fixture ready (availability ' + AVAILABILITY + ')', evStatus === 200 && planStatus === 200, `event ${evStatus}, plan ${planStatus}`);

  for (let i = 0; i < CONCURRENCY; i++) {
    const { uid, token } = await mintToken(`stress-${suffix}-${i}@example.com`, 'stress-Pass-' + i);
    buyerUids.push(uid);
    buyerTokens.push(token);
    await patchDoc(`users/${uid}`, {
      role: 'Buyer', email: `stress-${suffix}-${i}@example.com`, fullName: `Rusher ${i}`,
      phone: '+234 000 000 0000', createdAt: new Date().toISOString(), savedEventIds: []
    }, token);
  }
  report('buyers provisioned', buyerTokens.length === CONCURRENCY, `${buyerTokens.length} accounts`);

  /* THE RACE: every buyer fires at once. */
  const started = Date.now();
  const results = await Promise.all(buyerTokens.map((token) =>
    fetch(`${BASE}/api/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ eventId: FIXTURE_EVENT, ticketPlanId: FIXTURE_PLAN, quantity: 1 })
    }).then(async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) }))
  ));
  const elapsed = Date.now() - started;

  const won = results.filter((r) => r.status === 201);
  const lost = results.filter((r) => r.status === 409);
  const other = results.filter((r) => r.status !== 201 && r.status !== 409);

  report('exactly the available tickets were sold', won.length === AVAILABILITY, `${won.length}×201, ${lost.length}×409, ${other.length}×other (${elapsed}ms)`);
  report('losers got a clean sold-out rejection', lost.length === CONCURRENCY - AVAILABILITY && other.length === 0,
    other.length ? `unexpected statuses: ${other.map((o) => o.status).join(',')}` : 'all 409');

  const finalPlan = await fetch(`${FS}/ticketPlans/${FIXTURE_PLAN}`, { headers: fsHeaders(adminToken) });
  const finalQty = readDoc((await finalPlan.json())).availableQuantity;
  report('availability landed at zero, never negative', finalQty === 0, `final availability ${finalQty}`);

  const bookingsQ = await fetch(`${FS}:runQuery`, { method: 'POST', headers: fsHeaders(adminToken), body: JSON.stringify({
    structuredQuery: { from: [{ collectionId: 'bookings' }], where: { fieldFilter: { field: { fieldPath: 'eventId' }, op: 'EQUAL', value: { stringValue: FIXTURE_EVENT } } } }
  }) });
  const bookingDocs = (await bookingsQ.json()).filter((d) => d.document).map((d) => readDoc(d.document));
  const totalsOk = bookingDocs.length === AVAILABILITY && bookingDocs.every((b) => b.quantity === 1 && b.status === 'Pending' && b.bookingReference?.startsWith('AE-'));
  report('booking documents match the decrements', totalsOk, `${bookingDocs.length} bookings`);

  const refs = new Set(bookingDocs.map((b) => b.bookingReference));
  report('booking references unique', refs.size === bookingDocs.length, `${refs.size}/${bookingDocs.length} unique`);
} catch (error) {
  report('stress run completed without crash', false, error.message);
} finally {
  /* Cleanup: fixture, bookings, notifications, profiles, accounts. */
  try {
    const adminCustom = await adminAuth.createCustomToken(ADMIN_UID, { admin: true });
    const adminEx = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: adminCustom, returnSecureToken: true })
    });
    const adminToken = (await adminEx.json()).idToken;

    for (const p of [`ticketPlans/${FIXTURE_PLAN}`, `events/${FIXTURE_EVENT}`]) {
      await fetch(`${FS}/${p}`, { method: 'DELETE', headers: fsHeaders(adminToken) });
    }
    for (const col of ['bookings', 'notifications']) {
      const q = await fetch(`${FS}:runQuery`, { method: 'POST', headers: fsHeaders(adminToken), body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: col === 'bookings' ? 'eventId' : 'message' }, op: col === 'bookings' ? 'EQUAL' : 'GREATER_THAN_OR_EQUAL', value: { stringValue: col === 'bookings' ? FIXTURE_EVENT : '' } } } }
      }) });
      for (const d of (await q.json()).filter((x) => x.document) || []) {
        if (col === 'notifications' && !readDoc(d.document).message?.includes('Stress Fixture')) continue;
        await fetch(`${FS}/${col}/${d.document.name.split('/documents/')[1]}`, { method: 'DELETE', headers: fsHeaders(adminToken) });
      }
    }
    for (const uid of [...buyerUids, ADMIN_UID]) {
      await fetch(`${FS}/users/${uid}`, { method: 'DELETE', headers: fsHeaders(adminToken) }).catch(() => {});
    }
    while (buyerUids.length) {
      const batch = buyerUids.splice(0, 90);
      await adminAuth.deleteUsers(batch).catch((e) => console.log(`WARN account cleanup partial: ${e.message}`));
    }
    await adminAuth.deleteUsers([ADMIN_UID]).catch(() => {});
    console.log('cleanup done');
  } catch (error) {
    console.log(`WARN cleanup incomplete: ${error.message}`);
  }
}

console.log(failures === 0 ? 'STRESS TEST PASSED' : `STRESS TEST FAILED (${failures} check(s))`);
process.exit(failures === 0 ? 0 : 1);
