/* Minimal Firestore REST client with service-account auth and true
   transactions — deliberately dependency-free so Vercel's function runtime
   never has to require() an ESM-only chain (the firebase-admin lesson from
   the Tasara build).

   Credentials come from two env vars (set in the Vercel project settings):
     FIREBASE_ADMIN_CLIENT_EMAIL — the service account's email
     FIREBASE_ADMIN_PRIVATE_KEY  — the PEM private key (\n escapes allowed)

   runTransaction(reads, writeFn) begins a transaction, reads the requested
   documents inside it, hands their JS-shaped data to writeFn, expects back
   an array of REST writes, and commits. Aborted transactions (concurrent
   modification) retry from the beginning with backoff, like the SDKs. */
import { createSign } from 'node:crypto';

const PROJECT_ID = 'iron-mint-announcements';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
/* Commit/update writes name documents by RELATIVE resource path (no host). */
const BASE_PATH = `projects/${PROJECT_ID}/databases/(default)/documents`;
const SCOPE = 'https://www.googleapis.com/auth/datastore';

let tokenCache = { token: null, expires: 0 };

async function accessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) return tokenCache.token;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('service account env vars are not configured');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })).toString('base64url');
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(privateKey).toString('base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`
    })
  });
  if (!res.ok) throw new Error(`service account token exchange failed: ${res.status}`);
  const json = await res.json();
  tokenCache = { token: json.access_token, expires: Date.now() + (json.expires_in - 60) * 1000 };
  return tokenCache.token;
}

/* --------------------------- value shape conversion --------------------------- */

export function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  const fields = {};
  for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
  return { mapValue: { fields } };
}

export function fromFirestoreValue(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

export function fromFirestoreFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = fromFirestoreValue(v);
  return out;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

/* --------------------------------- documents --------------------------------- */

export async function getDoc(collectionName, docId) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/${collectionName}/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore get failed: ${res.status}`);
  const json = await res.json();
  return { name: json.name, fields: json.fields || {}, data: () => fromFirestoreFields(json.fields) };
}

/* ------------------------------- transactions -------------------------------- */

const MAX_ATTEMPTS = 10;

/* reads: array of ['collectionName', 'docId']. writeFn(snapshotMap, ctx)
   returns { writes: [...] } — REST write objects; helpers below build them.
   Under contention both the reads (409 = transaction already aborted) and
   the commit retry from the beginning, like the SDKs do. */
export async function runTransaction(reads, writeFn) {
  const token = await accessToken();
  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const beginRes = await fetch(`${BASE}:beginTransaction`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { readWrite: {} } })
    });
    if (!beginRes.ok) throw new Error(`beginTransaction failed: ${beginRes.status}`);
    const { transaction } = await beginRes.json();

    const snapshots = {};
    const readResults = await Promise.all(reads.map(async ([collectionName, docId]) => {
      const res = await fetch(`${BASE}/${collectionName}/${docId}?transaction=${encodeURIComponent(transaction)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 404) return { key: `${collectionName}/${docId}`, snap: null };
      if (res.ok) {
        const json = await res.json();
        return { key: `${collectionName}/${docId}`, snap: { name: json.name, fields: json.fields || {}, data: () => fromFirestoreFields(json.fields) } };
      }
      const body = await res.text().catch(() => '');
      return { key: `${collectionName}/${docId}`, error: { status: res.status, body } };
    }));
    const failedRead = readResults.find((r) => r.error);
    if (failedRead && (failedRead.error.status === 409 || /ABORTED/i.test(failedRead.error.body))) {
      /* Transaction died before the reads landed — start over. */
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1) + Math.floor(Math.random() * 50)));
      continue;
    }
    if (failedRead) throw new Error(`transactional read failed: ${failedRead.error.status}`);
    for (const r of readResults) snapshots[r.key] = r.snap;

    /* writeFn may hand back an { error: [message, status] } verdict instead
       of writes — surface it without committing anything. */
    const outcome = await writeFn(snapshots);
    if (outcome && outcome.error) return { error: outcome.error };
    const { writes } = outcome;

    const commitRes = await fetch(`${BASE}:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction, writes })
    });
    if (commitRes.ok) {
      const json = await commitRes.json();
      const { writes: _w, ...extra } = outcome;
      return { commitTime: json.commitTime, results: json.writeResults || [], ...extra };
    }
    const body = await commitRes.text();
    /* ABORTED (409) means a concurrent write won — retry the whole thing. */
    if (commitRes.status === 409 || /ABORTED/.test(body)) {
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1) + Math.floor(Math.random() * 50)));
      continue;
    }
    throw new Error(`transaction commit failed: ${commitRes.status} ${body.slice(0, 200)}`);
  }
  throw new Error(`transaction aborted ${MAX_ATTEMPTS} times (last: ${lastError || 'contention'})`);
}

/* REST write helpers (a Firestore REST update replaces the whole document,
   so updates must carry every field). */
export function updateWrite(docName, data) {
  return { update: { name: `${BASE_PATH}/${docName}`, fields: toFirestoreFields(data) } };
}

export function createWrite(collectionName, docId, data) {
  return {
    update: { name: `${BASE_PATH}/${collectionName}/${docId}`, fields: toFirestoreFields(data) },
    currentDocument: { exists: false }
  };
}

export function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
