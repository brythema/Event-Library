/* Abuja Events media store: Vercel Blob public store (replaces Firebase
   Storage, which needs a Blaze/card upgrade). Organizers upload flyers,
   logos and banners here; the endpoint stores them in the project's Blob
   store and reports the public URL that event documents hold.

   PRODUCTION hardening (Tasara tdoc-upload pattern): the caller must present
   a valid Firebase ID token (Bearer header) whose UID matches the media path,
   so the endpoint can never serve as an anonymous file sink.

   Upload cap is 4 MB: Vercel serverless function request bodies are capped at
   about 4.5 MB, and compressed event imagery fits comfortably. The client
   (src/services/media.ts) enforces the same cap before sending. */
import { put } from '@vercel/blob';
import { mediaOwnerUid, verifyRequestToken } from './_lib/auth.js';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/* Only our own media paths may be written. This keeps the endpoint from
   becoming a general file sink. */
const MEDIA_PATH = /^media\/[A-Za-z0-9_-]{6,128}\/[a-z]+-\d+\.(?:jpg|jpeg|png|webp)$/;

/* Content types are derived from the (validated) file extension, never from
   request headers — the header can be normalized away before the function
   sees it. */
const EXTENSION_CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
};

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES + 512 * 1024) {
        reject(new Error('payload-too-large'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const claims = await verifyRequestToken(req);
    const path = new URL(req.url, 'http://localhost').searchParams.get('path') || '';
    if (!MEDIA_PATH.test(path)) {
      res.status(400).json({ error: 'A valid media path is required.' });
      return;
    }
    if (!claims || claims.uid !== mediaOwnerUid(path)) {
      res.status(claims ? 403 : 401).json({ error: 'Sign in as the media owner to upload it.' });
      return;
    }

    const body = await readRawBody(req);
    if (body.length === 0) {
      res.status(400).json({ error: 'The uploaded file is empty.' });
      return;
    }
    if (body.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'The file exceeds the 4 MB limit.' });
      return;
    }

    /* The extension is already validated by MEDIA_PATH, so mapping it to a
       content type is safe and independent of the (unreliable) request
       Content-Type header, which Blob/undici bodies can override. */
    const extension = path.split('.').pop();
    const contentType = EXTENSION_CONTENT_TYPES[extension] || 'application/octet-stream';
    const blob = await put(path, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false
    });

    res.status(201).json({ path: blob.pathname, url: blob.url });
  } catch (error) {
    if (error && error.message === 'payload-too-large') {
      res.status(413).json({ error: 'The file exceeds the 4 MB limit.' });
      return;
    }
    console.error('media-upload failed:', error && error.message);
    res.status(500).json({ error: 'The media upload did not complete.' });
  }
}
