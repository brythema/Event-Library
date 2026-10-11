/* Provision an admin account: creates (or updates) the Firebase Auth user,
   sets the { admin: true, role: 'admin' } custom claim, and upserts the
   profile document. Run from the work folder:

     node scripts/provision-admin.mjs admin@example.com "StrongPassword" "Admin Name"

   Default (no args) provisions the owner account brythema@gmail.com with the
   demo password — rotate before public launch. The service account key stays
   in the gitignored service-account.json. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [emailArg, passwordArg, ...nameParts] = process.argv.slice(2);
const EMAIL = (emailArg || 'brythema@gmail.com').trim().toLowerCase();
const PASSWORD = passwordArg || 'ChangeMe-AbujaEvents-2026!';
const NAME = nameParts.join(' ').trim() || 'Abuja Events Admin';

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: key.project_id });
const auth = getAuth();
const db = getFirestore();

let user;
try {
  user = await auth.getUserByEmail(EMAIL);
  console.log(`existing user found: ${user.uid}`);
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error;
  user = await auth.createUser({ email: EMAIL, password: PASSWORD, displayName: NAME });
  console.log(`user created: ${user.uid}`);
}

if (PASSWORD && !user.uid.startsWith('seeded')) {
  // Keep the provided password in sync on repeat runs.
  await auth.updateUser(user.uid, { password: PASSWORD });
}

await auth.setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
await db.collection('users').doc(user.uid).set({
  role: 'admin',
  email: EMAIL,
  fullName: NAME,
  phone: user.phoneNumber || '',
  savedEventIds: [],
  updatedAt: new Date().toISOString(),
}, { merge: true });

console.log(JSON.stringify({ uid: user.uid, email: EMAIL, role: 'admin', passwordSet: Boolean(PASSWORD) }, null, 2));
console.log('Admin claim set. Sign out/in on the client to refresh the token.');
