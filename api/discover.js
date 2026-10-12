/* Abuja Events — web discovery. "Near me" search over the open web.

   POST /api/discover { area } → { area, bucket, fetchedAt, cached, results[] }

   Engine: Serper.dev (Google SERP results; 2,500 free credits at signup,
   no credit card). Two complementary queries per area, deduped and shaped
   into mini-cards. No social-media API contracts, no scraping.

   Cost control: results are cached in Firestore per area + UTC-day bucket,
   so repeated clicks are instant and each area costs two queries at most
   per day — full 44-area coverage would burn ~88 credits/day, so the
   credits run is plenty for launch-scale traffic (top-up available in
   the Serper dashboard if ever needed). The cache lives through the
   service account; the browser never touches Firestore for discovery, so
   no rules changes were needed.

   Results are UNVERIFIED by definition — the client labels them as such
   and always renders them BELOW the in-house (verified) listings. */
import { getDoc, setDoc } from './_lib/firestore-rest.js';

const SERPER_URL = 'https://google.serper.dev/search';
const CACHE_COLLECTION = 'discoveries';
const MAX_RESULTS = 10;

const AREAS = [
  'Central Business District', 'Garki', 'Wuse', 'Wuse II', 'Maitama', 'Asokoro', 'Wuye', 'Utako',
  'Jabi', 'Gwarinpa', 'Mabushi', 'Katampe', 'Jahi', 'Kado', 'Life Camp', 'Karmo', 'Dawaki',
  'Idu Industrial', 'Durumi', 'Gudu', 'Galadimawa', 'Games Village', 'Gaduwa', 'Apo', 'Lokogoma',
  'Duboyi', 'Kabusa', 'Nyanya', 'Karu', 'Mararaba', 'Jikwoyi', 'Kurudu', 'Orozo', 'Karshi',
  'Kubwa', 'Dutse', 'Mpape', 'Lugbe', 'Zuba', 'Gwagwalada', 'Kuje', 'Bwari', 'Suleja', 'Dei-Dei'
];

/* Two complementary queries per discovery: an open events query and a
   ticketing-platform-weighted one. */
function buildQueries(area) {
  const now = new Date();
  const month = now.toLocaleString('en-NG', { month: 'long' });
  const year = now.getFullYear();
  return [
    `events in ${area} Abuja ${month} ${year}`,
    `${area} Abuja event tickets OR festival OR concert OR show upcoming`
  ];
}

function utcDayBucket() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeArea(raw) {
  const area = String(raw || '').trim().slice(0, 60);
  if (!area) return null;
  return area;
}

function cacheKeyFor(area) {
  const bucket = utcDayBucket();
  return `${area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}_${bucket}`;
}

function cleanTitle(title) {
  return String(title || '')
    .replace(/\s*[|\-–—]\s*(tix\.africa|nairabox|allevents\.in|concerts africa|concertsafrica).*$/i, '')
    .replace(/\s+[|\-–—]\s+.*?(event|ticket|party|show).*$/i, '')
    .trim()
    .slice(0, 140);
}

/* Serper organic results sometimes carry a "date" ("3 days ago", "12 Dec
   2026"). Read it when present, then heuristics from title/snippet.
   Empty when nothing convincing — the UI shows "Date not confirmed". */
function extractDate(item, text) {
  const raw = String(item?.date || '');
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const t = String(text || '');
  const months = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const patterns = [
    new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months})[a-z]*\\s+(\\d{4})`, 'i'),
    new RegExp(`(${months})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`, 'i'),
    new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months})[a-z]*`, 'i'),
    new RegExp(`(${months})[a-z]*\\s+(\\d{1,2})(?:st|nd|th)?`, 'i')
  ];
  for (const [i, p] of patterns.entries()) {
    const m = t.match(p);
    if (m) {
      const now = new Date();
      let day, monthIdx, year;
      if (i < 2) {
        year = Number(m[3]);
        if (i === 0) { day = Number(m[1]); monthIdx = monthMap[m[2].toLowerCase().slice(0, 3)]; }
        else { monthIdx = monthMap[m[1].toLowerCase().slice(0, 3)]; day = Number(m[2]); }
      } else {
        monthIdx = i === 2 ? monthMap[m[2].toLowerCase().slice(0, 3)] : monthMap[m[1].toLowerCase().slice(0, 3)];
        day = i === 2 ? Number(m[1]) : Number(m[2]);
        year = now.getFullYear();
        const candidate = new Date(year, monthIdx, day);
        if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) year += 1;
      }
      const d = new Date(year, monthIdx, day);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= now.getFullYear()) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
  }
  return '';
}

function guessArea(text, fallback) {
  const t = String(text || '').toLowerCase();
  for (const a of AREAS) {
    if (t.includes(a.toLowerCase())) return a;
  }
  if (t.includes('abuja')) return 'Central Business District';
  return fallback;
}

function normalizeOrganic(organic, fallbackArea) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(organic) ? organic : []) {
    const link = typeof item?.link === 'string' ? item.link : '';
    const title = cleanTitle(item?.title);
    if (!link.startsWith('http') || !title) continue;
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    const blob = `${item?.title || ''} ${item?.snippet || ''}`;
    out.push({
      id: `disc-${Math.abs([...key].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)).toString(36)}`,
      title,
      date: extractDate(item, blob),
      venue: '',
      area: guessArea(blob, fallbackArea),
      description: String(item?.snippet || '').trim().slice(0, 240),
      sourceUrl: link.slice(0, 500),
      sourceName: String(item?.displayLink || new URL(link).hostname || '').replace(/^www\./, '').slice(0, 60),
      isDiscovered: true
    });
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}

async function webSearch(area) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('discovery is not configured (missing Serper key)');

  const merged = [];
  let okQueries = 0;
  for (const q of buildQueries(area)) {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, gl: 'ng', hl: 'en', num: 10 })
    });
    /* A failed query must not sink the whole discovery — take whatever
       the other query returned instead. */
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`serper query ${res.status} (${q}): ${body.slice(0, 200)}`);
      continue;
    }
    okQueries += 1;
    const json = await res.json();
    merged.push(...(json.organic || []));
  }
  return { events: normalizeOrganic(merged, area), okQueries };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  let area = '';
  if (req.method === 'POST') {
    const chunks = [];
    let size = 0;
    await new Promise((resolve) => {
      req.on('data', (c) => { size += c.length; if (size < 32 * 1024) chunks.push(c); });
      req.on('end', resolve);
      req.on('error', resolve);
    });
    try { area = sanitizeArea(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}').area); } catch { area = null; }
  } else {
    area = sanitizeArea(new URL(req.url, 'http://localhost').searchParams.get('area'));
  }
  if (!area) {
    res.status(400).json({ error: 'A valid area is required.' });
    return;
  }

  const bucket = utcDayBucket();
  const key = cacheKeyFor(area);
  const served = { area, bucket, results: [], cached: true, fetchedAt: '' };

  /* Engine not wired yet (no Serper key in the environment): answer with an
     empty, honest result instead of a 502 — the verified in-house listings
     are the product and must never look broken. */
  if (!process.env.SERPER_API_KEY) {
    res.status(200).json({ ...served, cached: false, configured: false, note: 'The public web search is being connected. Verified in-house listings above are fully active.' });
    return;
  }

  try {
    const cache = await getDoc(CACHE_COLLECTION, key);
    if (cache && cache.data()?.bucket === bucket) {
      served.results = cache.data().results || [];
      served.fetchedAt = cache.data().fetchedAt || '';
      res.status(200).json(served);
      return;
    }

    served.cached = false;
    const { events, okQueries } = await webSearch(area);
    served.results = events;
    served.fetchedAt = new Date().toISOString();
    /* Only cache a result when at least one query actually succeeded —
       an all-failed fetch (bad key, quota) must not poison the day's
       cache with an empty answer. */
    if (okQueries > 0) {
      await setDoc(CACHE_COLLECTION, key, {
        area, bucket, fetchedAt: served.fetchedAt, results: served.results
      }).catch((e) => console.error('discover cache write failed:', e.message));
    }
    res.status(200).json(served);
  } catch (error) {
    console.error('discover failed:', error.message);
    res.status(502).json({ error: 'The web search could not be completed right now. In-house listings are unaffected.' });
  }
}
