/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Image uploads: files go to /api/media-upload (token-verified Vercel Blob
 * endpoint). Mirrors the server's 4 MB cap and allowed types.
 */
import { auth } from '../firebase';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type UploadKind = 'flyer' | 'logo' | 'banner' | 'gallery' | 'avatar';

export class MediaError extends Error {}

export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES[file.type]) {
    throw new MediaError('Only JPG, PNG or WebP images are allowed.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MediaError('That image is larger than 4 MB — please compress it first.');
  }
}

function extensionFor(type: string): string {
  return ALLOWED_TYPES[type] || 'jpg';
}

/* Uploads one image and returns its public blob URL. */
export async function uploadMedia(file: File, uid: string, kind: UploadKind): Promise<string> {
  validateImageFile(file);
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new MediaError('You must be signed in to upload.');

  const safeKind = kind.replace(/[^a-z]/g, '');
  const path = `media/${uid}/${safeKind}-${Date.now()}.${extensionFor(file.type)}`;
  const res = await fetch(`/api/media-upload?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    let detail = `upload failed (${res.status})`;
    try { detail = (await res.json()).error || detail; } catch { /* keep status detail */ }
    throw new MediaError(detail);
  }
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new MediaError('The upload did not return a URL.');
  return json.url;
}
