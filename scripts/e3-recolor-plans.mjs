/* One-off: recolor the live demo ticket plans to the E³ palette so the
   public landing pages match the reskinned UI. Idempotent: sets color +
   a updatedAt stamp on each known demo plan id. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();

const RECOLOR = {
  'demo-plan-1a': '#48d8ff', /* Regular — neon blue */
  'demo-plan-1b': '#65f4c3', /* VIP Table — neon mint */
  'demo-plan-2a': '#9b8cff', /* Free Seat — E³ purple */
  'demo-plan-3a': '#48d8ff', /* Adult — neon blue */
  'demo-plan-3c': '#ff6f91', /* Family of 4 — E³ danger */
  'demo-plan-4a': '#38bdf8' /* Bootcamp Pass — sky */
};

let updated = 0;
for (const [id, color] of Object.entries(RECOLOR)) {
  const ref = db.collection('ticketPlans').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`skip ${id} (not found)`);
    continue;
  }
  await ref.update({ color, e3RecoloredAt: new Date() });
  updated += 1;
  console.log(`recolor ${id} -> ${color}`);
}
console.log(`done: ${updated}/${Object.keys(RECOLOR).length} plans recolored`);
