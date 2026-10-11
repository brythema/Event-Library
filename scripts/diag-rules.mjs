import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'iron-mint-announcements';
const API_KEY = 'AIzaSyDfrZZfqYWjE8dGTYbbpE-AK4lemIJlPYE';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: PROJECT_ID });
const auth = getAuth();

const suffix = 'diag' + Date.now().toString(36);
// buyer token
const su = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `diag-${suffix}@example.com`, password: 'diag-Pass-123', returnSecureToken: true })
});
const suj = await su.json();
const buyerToken = suj.idToken;
const buyerUid = suj.localId;

// admin token
const custom = await auth.createCustomToken('diag-admin-' + suffix, { admin: true });
const ex = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: custom, returnSecureToken: true })
});
const exj = await ex.json();
const adminToken = exj.idToken;

const fsVal = (v) => (typeof v === 'string' ? { stringValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : v === false ? { booleanValue: false } : undefined);
const fields = {
  role: { stringValue: 'Buyer' }, email: { stringValue: `diag-${suffix}@example.com` },
  fullName: { stringValue: 'Diag' }, phone: { stringValue: '' },
  createdAt: { stringValue: new Date().toISOString() }, savedEventIds: { arrayValue: { values: [] } }
};

console.log('--- buyer PATCH users/{uid} (create) ---');
let r = await fetch(`${FS}/users/${buyerUid}`, { method: 'PATCH', headers: { Authorization: `Bearer ${buyerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
console.log(r.status, (await r.text()).slice(0, 300));

console.log('--- admin PATCH ticketPlans/{id} (create) ---');
r = await fetch(`${FS}/ticketPlans/diag-plan-${suffix}`, { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {
  eventId: { stringValue: 'demo-event-1' }, name: { stringValue: 'Diag' }, price: { integerValue: '0' },
  availableQuantity: { integerValue: '1' }, maxPurchaseLimit: { integerValue: '5' },
  description: { stringValue: '' }, color: { stringValue: '#000' }, displayOrder: { integerValue: '1' }
} }) });
console.log(r.status, (await r.text()).slice(0, 300));

console.log('--- admin LIST notifications ---');
r = await fetch(`${FS}/notifications?pageSize=5`, { headers: { Authorization: `Bearer ${adminToken}` } });
const j = await r.json();
console.log(r.status, 'docs:', (j.documents || []).length, j.error?.message || '');

console.log('--- cleanup ---');
const del1 = await fetch(`${FS}/users/${buyerUid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
console.log('delete profile:', del1.status);
const del2 = await fetch(`${FS}/ticketPlans/diag-plan-${suffix}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
console.log('delete plan:', del2.status);
await auth.deleteUsers([buyerUid, 'diag-admin-' + suffix]);
console.log('users deleted');
