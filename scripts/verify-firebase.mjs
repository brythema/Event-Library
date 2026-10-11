/* Firebase setup verification: proves the service account can reach Auth and
   Firestore on the reused project. No secrets printed. Exits 0 on success. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: key.project_id });
const auth = getAuth();
const db = getFirestore();

/* Auth reachable: list users (empty is fine, the call itself is the proof). */
const { users } = await auth.listUsers(1);
console.log('auth ok, existing users:', users.length);

/* Firestore reachable: write + read + delete a probe doc. */
const probe = db.collection('_meta').doc('setup-probe');
await probe.set({ at: new Date() });
const back = await probe.get();
await probe.delete();
console.log('firestore ok, probe round-trip:', back.exists);

/* Auth provider config reachable: try creating + deleting a throwaway user. */
const u = await auth.createUser({ email: `probe-${Date.now()}@example.com`, password: 'x'.repeat(20) });
await auth.deleteUser(u.uid);
console.log('auth user create/delete ok');

console.log('FIREBASE SETUP VERIFIED');
