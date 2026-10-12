/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client caller for POST /api/discover — the public web discovery
 * (Serper.dev Google SERP results, server-side cached per area + day).
 * One automatic retry covers the two ways the first call can lose: a
 * network-level failure ("Failed to fetch" — e.g. the serverless function
 * cold start raced the timeout) or a 5xx (engine hiccup). Repeat clicks
 * after that are instant cache hits, so the retry is cheap insurance.
 */
import { DiscoveredEvent } from '../types';

export class DiscoverError extends Error {}

const RETRY_DELAY_MS = 900;

async function callOnce(area: string): Promise<DiscoveredEvent[]> {
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

export async function discoverWebEvents(area: string): Promise<DiscoveredEvent[]> {
  try {
    return await callOnce(area);
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return callOnce(area);
  }
}
