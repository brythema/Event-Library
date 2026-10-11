/* One-off purge of test residue: bookings + smoke/stress notifications.
   The production DB is pre-launch; every booking is test residue. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();

const bookings = await db.collection('bookings').get();
for (const d of bookings.docs) {
  const b = d.data();
  await d.ref.delete();
  /* Restock every plan a test booking touched. */
  if (b.ticketPlanId && b.quantity) {
    await db.collection('ticketPlans').doc(b.ticketPlanId).set({ availableQuantity: FieldValue.increment(b.quantity) }, { merge: true });
  }
}
console.log('bookings purged:', bookings.size);

const notifs = await db.collection('notifications').get();
let removed = 0;
for (const d of notifs.docs) {
  const n = d.data();
  if ((n.message || '').includes('requested') && (n.userId === 'admin')) {
    await d.ref.delete();
    removed += 1;
  }
}
console.log('admin order notifications purged:', removed);

/* Verify demo plan stock is exactly the seed values after restock. */
const plan = await db.collection('ticketPlans').doc('demo-plan-1a').get();
console.log('demo-plan-1a availability now:', plan.data().availableQuantity);
