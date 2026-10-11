/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Static Abuja reference data. Demo content (events/users/plans) lives in
 * scripts/seed-demo.mjs — the production app starts from an empty database.
 */

export const ABUJA_AREAS = [
  'Wuse II',
  'Maitama',
  'Garki',
  'Asokoro',
  'Gwarinpa',
  'Jabi',
  'Central Business District',
  'Utako',
  'Apo',
  'Lokogoma',
];

// Categories
export const EVENT_CATEGORIES = [
  'Music & Concerts',
  'Food & Drink',
  'Arts & Culture',
  'Tech & Business',
  'Sports & Fitness',
  'Nightlife & Parties',
  'Comedy & Theatre',
];

// Let's seed events.
// The current local date is 2026-07-08 (Wednesday).
// Today's events: 2026-07-08
// Tomorrow's events: 2026-07-09
// Weekend events: 2026-07-10 (Fri), 2026-07-11 (Sat), 2026-07-12 (Sun)
// Upcoming events: 2026-07-15 etc.
// Past event to test archive: 2026-07-06
