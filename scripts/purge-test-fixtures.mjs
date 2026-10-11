/* One-off purge: removes every smoke/stress fixture event + plan, then
   prints what public-listing state remains. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();

let removed = { events: 0, plans: 0 };
for (const col of ['events', 'ticketPlans']) {
  const snap = await db.collection(col).get();
  for (const d of snap.docs) {
    if (/^(smoke|stress)-/.test(d.id)) {
      await d.ref.delete();
      removed[col] += 1;
    }
  }
}
console.log('fixtures removed:', JSON.stringify(removed));

const events = await db.collection('events').get();
console.log('events remaining:', events.docs.map((d) => `${d.id} (${d.data().status})`).join(', '));
const plans = await db.collection('ticketPlans').get();
console.log('plans remaining:', plans.size);
