/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client caller for POST /api/discover — the public web discovery
 * (Serper.dev Google SERP results, server-side cached per area + day).
 * Failures are non-fatal (in-house listings are unaffected).
 */
import { DiscoveredEvent } from '../types';

export class DiscoverError extends Error {}

export async function discoverWebEvents(area: string): Promise<DiscoveredEvent[]> {
  const res = await fetch('/api/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area }),
  });
  let json: { results?: DiscoveredEvent[]; configured?: boolean; error?: string } = {};
  try { json = await res.json(); } catch { /* non-JSON failure */ }
  if (!res.ok) {
    throw new DiscoverError(json.error || 'The web search is unavailable right now.');
  }
  return Array.isArray(json.results) ? json.results : [];
}
