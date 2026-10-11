/* One-off: enable the email/password provider on the Firebase project using
   the firebase CLI's own stored refresh token and its public OAuth client.
   Prints each step's result; exits 0 only when the provider is enabled. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT = 'iron-mint-announcements';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const configstore = JSON.parse(readFileSync(join(homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const refreshToken = configstore.refresh_token || configstore.tokens?.refresh_token;
if (!refreshToken) { console.error('FAIL no refresh token in firebase-tools.json'); process.exit(1); }

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })
});
if (!tokenRes.ok) { console.error('FAIL token exchange:', tokenRes.status, await tokenRes.text()); process.exit(1); }
const { access_token, scope } = await tokenRes.json();
console.log('token ok. scopes:', scope);

const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };

/* Make sure the Identity Toolkit service is enabled before reading its config. */
const svcRes = await fetch(
  `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services/identitytoolkit.googleapis.com:enable`,
  { method: 'POST', headers }
);
console.log('identitytoolkit service:', svcRes.ok ? 'enabled/already on' : `${svcRes.status} ${await svcRes.text()}`);

/* Current config first — the PATCH needs the existing delegated project number.
   Service enablement is async: poll the config read for up to 60 seconds. */
let config = null;
for (let attempt = 0; attempt < 12; attempt++) {
  const getRes = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`, { headers });
  if (getRes.ok) { config = await getRes.json(); break; }
  const body = await getRes.text();
  if (!/CONFIGURATION_NOT_FOUND|404/.test(body) || attempt === 11) {
    console.error('FAIL config read:', getRes.status, body.slice(0, 300)); process.exit(1);
  }
  await new Promise(r => setTimeout(r, 5000));
}
console.log('current signIn:', JSON.stringify(config.signIn?.email || null));

if (config.signIn?.email?.enabled) {
  console.log('PASS email/password provider already enabled');
  process.exit(0);
}

const patchRes = await fetch(
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=signIn.email`,
  { method: 'PATCH', headers, body: JSON.stringify({ signIn: { email: { enabled: true, requireEmail: true } } }) }
);
if (!patchRes.ok) { console.error('FAIL config patch:', patchRes.status, await patchRes.text()); process.exit(1); }
const patched = await patchRes.json();
console.log('patched signIn.email:', JSON.stringify(patched.signIn?.email));
console.log(patched.signIn?.email?.enabled ? 'PASS email/password provider enabled' : 'FAIL provider still disabled');
process.exit(patched.signIn?.email?.enabled ? 0 : 1);
