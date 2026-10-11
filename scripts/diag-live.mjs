import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: 'iron-mint-announcements' });
const auth = getAuth();
const custom = await auth.createCustomToken('diag-admin-x1', { admin: true });
const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyDfrZZfqYWjE8dGTYbbpE-AK4lemIJlPYE', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: custom, returnSecureToken: true })
});
const { idToken } = await res.json();
const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
console.log('admin claims:', JSON.stringify(payload.admin), '| uid:', payload.sub);

const FS = 'https://firestore.googleapis.com/v1/projects/iron-mint-announcements/databases/(default)/documents';
for (const p of ['ticketPlans/demo-plan-1a', 'ticketPlans/demo-plan-3a']) {
  const r = await fetch(`${FS}/${p}`, { headers: { Authorization: `Bearer ${idToken}` } });
  const j = await r.json();
  console.log(p, 'availableQuantity:', j.fields?.availableQuantity, '| status', r.status);
}
const bookings = await fetch(`${FS}/bookings?pageSize=20`, { headers: { Authorization: `Bearer ${idToken}` } });
const bj = await bookings.json();
console.log('bookings:', (bj.documents || []).length, '| list status', bookings.status, bj.error?.message || '');
