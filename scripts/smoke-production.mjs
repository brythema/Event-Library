/* Abuja Events — end-to-end production smoke over plain HTTP against a BASE
   url (default: the current preview deployment).

   Creates throwaway Firebase identities (buyer via public Identity Toolkit
   signup, admin via a service-account custom token) plus a tiny fixture
   event + plan written through the rules as admin, exercises the auth walls,
   the security-rules boundaries, a real booking through /api/book,
   availability accounting, and admin verification — then deletes everything.

   Proves:
     1. anonymous booking and upload are refused (401)
     2. a buyer can create their own profile (rules) and read public events,
        but not other users' profiles
     3. a buyer CANNOT write ticket plans, event statuses, bookings, or the
        admin inbox (rules) — overselling through the client is impossible
     4. media upload: foreign-owner path 403, malformed path 400, owner
        upload 201 and the blob URL is publicly readable
     5. /api/book: booking created, availability decremented atomically,
        admin notification written, response carries the booking
     6. /api/book: >20-quantity rejected (shape), exhausted availability
        rejected (409), plan/event mismatch rejected (400)
     7. admin verifies the booking; the buyer cannot self-confirm (rules)
     8. /api/discover: validates the area, degrades gracefully while the
        search-engine key is not configured, and (once configured) returns
        shaped, cached web results
     9. cleanup removes every trace (docs, fixture, accounts)

   Exit code 0 only when every step passes. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const BASE = (process.env.SMOKE_BASE || 'https://abuja-events-83bho8ffq-hemabryt.vercel.app').replace(/\/$/, '');
const PROJECT_ID = 'iron-mint-announcements';
const API_KEY = 'AIzaSyDfrZZfqYWjE8dGTYbbpE-AK4lemIJlPYE';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: PROJECT_ID });
const adminAuth = getAuth();

const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const BUYER_EMAIL = `smoke-buyer-${suffix}@example.com`;
const BUYER_PASSWORD = 'smoke-Pass-' + suffix;
const FIXTURE_EVENT = `smoke-event-${suffix}`;
const FIXTURE_PLAN = `smoke-plan-${suffix}`;
let BUYER_UID = '';
const createdPaths = new Set(); // blob URLs to delete via CLI afterwards

let failures = 0;
function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures += 1;
}

const fsHeaders = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

/* Firestore document value builders (REST shape). */
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
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(readField);
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

const getDoc = async (path, token) => {
  const res = await fetch(`${FS}/${path}`, { headers: fsHeaders(token || '') });
  if (res.status === 404) return { exists: false, status: res.status, data: null };
  const json = await res.json().catch(() => ({}));
  return { exists: res.ok, status: res.status, data: res.ok ? readDoc(json) : null };
};
/* patchDoc accepts RAW JS values and wraps them into Firestore field shape
   exactly once. Callers must pass plain values, never fsVal/fsFields output. */
const patchDoc = async (path, raw, token, mask) => {
  const q = mask ? `?updateMask.fieldPaths=${mask.join('&updateMask.fieldPaths=')}` : '';
  const res = await fetch(`${FS}/${path}${q}`, { method: 'PATCH', headers: fsHeaders(token), body: JSON.stringify({ fields: fsFields(raw) }) });
  if (!res.ok) console.log(`      [${res.status}] ${path}: ${(await res.text()).slice(0, 220)}`);
  return { status: res.status };
};
const deleteDoc = async (path, token) => {
  let res = await fetch(`${FS}/${path}`, { method: 'DELETE', headers: fsHeaders(token || '') });
  if (res.status === 409) {
    await new Promise((r) => setTimeout(r, 300));
    res = await fetch(`${FS}/${path}`, { method: 'DELETE', headers: fsHeaders(token || '') });
  }
  if (!res.ok && res.status !== 404) console.log(`      [delete ${res.status}] ${path}: ${(await res.text()).slice(0, 160)}`);
  return res.status;
};

async function mintBuyerToken() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: BUYER_EMAIL, password: BUYER_PASSWORD, returnSecureToken: true })
  });
  if (!res.ok) throw new Error(`buyer signup failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  BUYER_UID = json.localId;
  return json.idToken;
}

async function mintAdminToken() {
  const custom = await adminAuth.createCustomToken('smoke-admin-' + suffix, { admin: true });
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: custom, returnSecureToken: true })
  });
  if (!res.ok) throw new Error(`admin token exchange failed: ${res.status}`);
  return (await res.json()).idToken;
}

/* A genuine 1x1 JPEG. */
const JPEG_1PX = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/' +
  'wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64'
);

const post = async (url, body, headers = {}) => {
  const res = await fetch(url, { method: 'POST', body, headers });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, json, text };
};

let buyerToken = '';
let adminToken = '';
let booking = null;
try {
  buyerToken = await mintBuyerToken();
  adminToken = await mintAdminToken();
  report('throwaway identities minted', Boolean(buyerToken && adminToken), `buyer ${BUYER_UID}`);

  /* Fixture: a minimal event + plan written through the rules as admin —
     tiny availability so the smoke can genuinely exhaust it. */
  {
    const ev = await patchDoc(`events/${FIXTURE_EVENT}`, {
      organizerId: 'smoke-admin-' + suffix, title: 'Smoke Fixture', subtitle: '',
      description: 'Fixture for the smoke test', category: 'Music', tags: [],
      flyerUrl: '', organizerLogo: '', backgroundBanner: '',
      date: new Date().toISOString().slice(0, 10), openingTime: '18:00', closingTime: '23:00',
      timezone: 'WAT (UTC+1)', venueName: 'Nowhere', streetAddress: 'Nowhere',
      area: 'Wuse II', landmark: '', googleMapLink: '',
      organizerName: 'Smoke', phone: '', email: '', website: '',
      instagram: '', facebook: '', whatsapp: '', gallery: [], faqs: [],
      ageRestriction: '', dressCode: '', parking: '', refundPolicy: '',
      status: 'Draft', isFeatured: false, interestedCount: 0,
      createdAt: new Date().toISOString()
    }, adminToken);
    if (ev.status === 200) {
      /* Admin flips the fixture live with a FULL patch (organizerId intact). */
      const live = await patchDoc(`events/${FIXTURE_EVENT}`, {
        organizerId: 'smoke-admin-' + suffix, title: 'Smoke Fixture', subtitle: '',
        description: 'Fixture for the smoke test', category: 'Music', tags: [],
        flyerUrl: '', organizerLogo: '', backgroundBanner: '',
        date: new Date().toISOString().slice(0, 10), openingTime: '18:00', closingTime: '23:00',
        timezone: 'WAT (UTC+1)', venueName: 'Nowhere', streetAddress: 'Nowhere',
        area: 'Wuse II', landmark: '', googleMapLink: '',
        organizerName: 'Smoke', phone: '', email: '', website: '',
        instagram: '', facebook: '', whatsapp: '', gallery: [], faqs: [],
        ageRestriction: '', dressCode: '', parking: '', refundPolicy: '',
        status: 'Ticketing Active', isFeatured: false, interestedCount: 0,
        createdAt: new Date().toISOString()
      }, adminToken);
      report('admin opens ticketing on the fixture', live.status === 200, `status ${live.status}`);
    }
    const plan = await patchDoc(`ticketPlans/${FIXTURE_PLAN}`, {
      eventId: FIXTURE_EVENT, name: 'Smoke Class', price: 1500,
      availableQuantity: 2, maxPurchaseLimit: 5, description: '',
      color: '#000000', displayOrder: 1
    }, adminToken);
    report('admin-written fixture (event + plan)', ev.status === 200 && plan.status === 200, `event ${ev.status}, plan ${plan.status}`);
  }

  /* 1 — anonymous walls. */
  {
    const book = await post(`${BASE}/api/book`, JSON.stringify({ eventId: FIXTURE_EVENT, ticketPlanId: FIXTURE_PLAN, quantity: 1 }), { 'Content-Type': 'application/json' });
    report('anonymous booking refused', book.status === 401, `status ${book.status}`);
    const up = await post(`${BASE}/api/media-upload?path=media/${BUYER_UID}/flyer-1.jpg`, JPEG_1PX, { 'Content-Type': 'image/jpeg' });
    report('anonymous upload refused', up.status === 401, `status ${up.status}`);
  }

  /* 2 — buyer profile self-create via rules (PATCH creating the uid doc). */
  {
    const created = await patchDoc(`users/${BUYER_UID}`, {
      role: 'Buyer', email: BUYER_EMAIL, fullName: 'Smoke Buyer',
      phone: '+234 000 000 0000', createdAt: new Date().toISOString(), savedEventIds: []
    }, buyerToken);
    report('buyer profile self-create allowed', created.status === 200, `status ${created.status}`);

    const ev = await getDoc('events/demo-event-1', buyerToken);
    report('buyer reads a public event', ev.exists && ev.data?.status === 'Ticketing Active', `status ${ev.status}`);

    const other = await getDoc('users/smoke-admin-' + suffix, buyerToken);
    report('buyer cannot read another user profile', other.status === 403, `status ${other.status}`);
  }

  /* 3 — rules walls around plans, events, bookings, admin inbox. */
  {
    const plan = await patchDoc(`ticketPlans/${FIXTURE_PLAN}`, { availableQuantity: 999999 }, buyerToken, ['availableQuantity']);
    report('buyer cannot rewrite plan availability', plan.status === 403, `status ${plan.status}`);

    const evt = await patchDoc('events/demo-event-1', { status: 'Approved' }, buyerToken, ['status']);
    report('buyer cannot change event status', evt.status === 403, `status ${evt.status}`);

    const fake = await patchDoc(`bookings/fake-${suffix}`, {
      eventId: FIXTURE_EVENT, buyerId: BUYER_UID, ticketPlanId: FIXTURE_PLAN,
      quantity: 1, totalAmount: 0, status: 'Confirmed',
      bookingReference: 'FAKE', createdAt: new Date().toISOString(),
      customerDetails: { fullName: 'x', email: 'x', phone: 'x' }
    }, buyerToken);
    report('buyer cannot fabricate bookings', fake.status === 403, `status ${fake.status}`);

    const inbox = await getDoc('notifications/demo-notif-welcome', buyerToken);
    report('buyer cannot read the admin inbox', inbox.status === 403, `status ${inbox.status}`);
  }

  /* 4 — media upload path-lock + real upload. */
  {
    const foreign = await post(`${BASE}/api/media-upload?path=media/NOTMYUID123/flyer-1.jpg`, JPEG_1PX, { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${buyerToken}` });
    report('foreign-owner media path refused', foreign.status === 403, `status ${foreign.status}`);

    const badPath = await post(`${BASE}/api/media-upload?path=anything/else.jpg`, JPEG_1PX, { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${buyerToken}` });
    report('malformed media path refused', badPath.status === 400, `status ${badPath.status}`);

    const ok = await post(`${BASE}/api/media-upload?path=${encodeURIComponent(`media/${BUYER_UID}/flyer-${Date.now()}.jpg`)}`, JPEG_1PX, { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${buyerToken}` });
    const url = ok.json?.url || '';
    if (url) createdPaths.add(url);
    const publicOk = url ? await fetch(url) : { status: 0 };
    report('owner upload lands and is publicly readable', ok.status === 201 && publicOk.status === 200, `upload ${ok.status}, blob ${publicOk.status}`);
  }

  /* 5 — the booking loop through /api/book. */
  {
    const res = await post(`${BASE}/api/book`, JSON.stringify({ eventId: FIXTURE_EVENT, ticketPlanId: FIXTURE_PLAN, quantity: 1 }), { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` });
    booking = res.json?.booking || null;
    const after = await getDoc(`ticketPlans/${FIXTURE_PLAN}`, adminToken);
    report(
      'booking created with atomic decrement (2 -> 1)',
      res.status === 201 && booking && booking.bookingReference?.startsWith('AE-') && after.data?.availableQuantity === 1,
      `status ${res.status}, availability now ${after.data?.availableQuantity}`
    );

    const stored = booking ? await getDoc(`bookings/${booking.id}`, adminToken) : { exists: false };
    report('booking document stored server-side', stored.exists && stored.data?.status === 'Pending' && stored.data?.buyerId === BUYER_UID, `status ${stored.status}`);

    /* Rules: the admin inbox is only readable with a userId filter —
       unconstrained notification queries are (correctly) rejected. */
    const inbox = await fetch(`${FS}:runQuery`, { method: 'POST', headers: fsHeaders(adminToken), body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: 'notifications' }], where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: 'admin' } } }, limit: 20 }
    }) });
    const inboxJson = await inbox.json();
    const docs = (Array.isArray(inboxJson) ? inboxJson : []).filter((d) => d.document).map((d) => readDoc(d.document));
    report('admin notified of the order', docs.some((n) => n.userId === 'admin' && n.message?.includes(booking?.bookingReference || '###')), `${docs.length} inbox docs scanned`);
  }

  /* 6 — business-rule rejections. */
  {
    const oversized = await post(`${BASE}/api/book`, JSON.stringify({ eventId: FIXTURE_EVENT, ticketPlanId: FIXTURE_PLAN, quantity: 999 }), { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` });
    report('absurd quantity rejected at the shape gate', oversized.status === 400, `status ${oversized.status}`);

    /* Keep buying the last tickets; the order AFTER stock hits zero 409s. */
    let exhausted = null;
    let extraSales = 0;
    for (let i = 0; i < 5; i++) {
      exhausted = await post(`${BASE}/api/book`, JSON.stringify({ eventId: FIXTURE_EVENT, ticketPlanId: FIXTURE_PLAN, quantity: 1 }), { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` });
      if (exhausted.status !== 201) break;
      extraSales += 1;
    }
    const finalAvail = await getDoc(`ticketPlans/${FIXTURE_PLAN}`, adminToken);
    report(
      'booking beyond availability rejected (409)',
      exhausted.status === 409 && extraSales === 1 && finalAvail.data?.availableQuantity === 0,
      `final status ${exhausted.status}, extra sales ${extraSales}, availability ${finalAvail.data?.availableQuantity}`
    );

    const mismatch = await post(`${BASE}/api/book`, JSON.stringify({ eventId: 'demo-event-2', ticketPlanId: FIXTURE_PLAN, quantity: 1 }), { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` });
    report('plan/event mismatch rejected', mismatch.status === 400, `status ${mismatch.status}, ${mismatch.json?.error || ''}`);

    const overLimit = await post(`${BASE}/api/book`, JSON.stringify({ eventId: 'demo-event-1', ticketPlanId: 'demo-plan-1b', quantity: 5 }), { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` });
    report('quantity beyond maxPurchaseLimit rejected', overLimit.status === 409, `status ${overLimit.status}, ${overLimit.json?.error || ''}`);
  }

  /* 7 — admin verifies; buyer cannot self-confirm. */
  {
    const selfConfirm = await patchDoc(`bookings/${booking?.id}`, { status: 'Confirmed' }, buyerToken, ['status']);
    report('buyer cannot self-confirm a booking', selfConfirm.status === 403, `status ${selfConfirm.status}`);

    const adminConfirm = await patchDoc(`bookings/${booking?.id}`, { status: 'Confirmed' }, adminToken, ['status']);
    report('admin verifies the payment', adminConfirm.status === 200, `status ${adminConfirm.status}`);
  }

  /* 8 — web discovery endpoint: area validation, graceful no-key state,
     and (once the Serper key is configured) shaped web results. */
  {
    const noArea = await post(`${BASE}/api/discover`, JSON.stringify({}), { 'Content-Type': 'application/json' });
    report('discover rejects a missing area', noArea.status === 400, `status ${noArea.status}`);

    const r = await post(`${BASE}/api/discover`, JSON.stringify({ area: 'Gwarinpa' }), { 'Content-Type': 'application/json' });
    if (r.status === 200 && r.json?.configured === false) {
      report('discover degrades gracefully while the engine is unconfigured', Array.isArray(r.json.results) && r.json.results.length === 0, `${r.json.note || 'no results'}`);
    } else {
      const ok = r.status === 200 && Array.isArray(r.json?.results) && r.json.results.every((x) => x && typeof x.title === 'string' && typeof x.sourceUrl === 'string' && x.isDiscovered === true);
      report('discover returns shaped web results (engine configured)', ok, `status ${r.status}, ${r.json?.results?.length ?? 0} results, cached=${r.json?.cached ?? '-'}`);
      if (ok) {
        const again = await post(`${BASE}/api/discover`, JSON.stringify({ area: 'Gwarinpa' }), { 'Content-Type': 'application/json' });
        report('discover serves repeat calls from the cache', again.status === 200 && again.json?.cached === true, `cached=${again.json?.cached ?? '-'}`);
      }
    }
  }
} catch (error) {
  report('smoke run completed without crash', false, error.message);
} finally {
  /* Cleanup by SCAN (not remembered paths): every smoke-owned document —
     fixture event/plan by id prefix, bookings by buyer, notifications and
     the profile by reference — plus the throwaway auth accounts. */
  try {
    if (adminToken) {
      /* Unfiltered admin scans + client-side matching — REST __name__
         equality with a bare id does not match, so never rely on it. */
      const scan = async (col) => {
        const r = await fetch(`${FS}/${col}?pageSize=300`, { headers: fsHeaders(adminToken) });
        const json = await r.json();
        if (!json.documents) console.log(`      [scan ${col}] status ${r.status}: ${JSON.stringify(json).slice(0, 160)}`);
        return (json.documents || []).map((d) => ({
          id: d.name.split('/').pop(),
          data: readDoc(d)
        }));
      };
      for (const d of await scan('events')) {
        if (d.id.startsWith('smoke-event-')) await deleteDoc(`events/${d.id}`, adminToken);
      }
      for (const d of await scan('ticketPlans')) {
        if (d.id.startsWith('smoke-plan-')) await deleteDoc(`ticketPlans/${d.id}`, adminToken);
      }
      for (const d of await scan('bookings')) {
        if (d.data.buyerId === BUYER_UID || String(d.data.eventId || '').startsWith('smoke-event-')) {
          await deleteDoc(`bookings/${d.id}`, adminToken);
        }
      }
      /* Notifications: rules reject unfiltered lists, so query the admin
         inbox with the userId filter the rules require. */
      const nq = await fetch(`${FS}:runQuery`, { method: 'POST', headers: fsHeaders(adminToken), body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'notifications' }], where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: 'admin' } } }, limit: 50 }
      }) });
      const njson = await nq.json().catch(() => []);
      for (const d of (Array.isArray(njson) ? njson : []).filter((x) => x.document) || []) {
        if (String(readDoc(d.document).message || '').includes('Smoke Fixture')) {
          await deleteDoc(`notifications/${d.document.name.split('/').pop()}`, adminToken);
        }
      }
      if (BUYER_UID) await deleteDoc(`users/${BUYER_UID}`, adminToken);
    }
    const uids = [BUYER_UID, 'smoke-admin-' + suffix].filter(Boolean);
    if (uids.length) await adminAuth.deleteUsers(uids);
    if (createdPaths.size) console.log(`UPLOADED_BLOBS ${[...createdPaths].join(' ')}`);
    console.log('cleanup done');
  } catch (error) {
    console.log(`WARN cleanup incomplete: ${error.message} — run scripts/purge-test-fixtures.mjs`);
  }
}

console.log(failures === 0 ? 'SMOKE TEST PASSED' : `SMOKE TEST FAILED (${failures} step(s))`);
process.exit(failures === 0 ? 0 : 1);
