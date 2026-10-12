/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Static Abuja reference data. Demo content (events/users/plans) lives in
 * scripts/seed-demo.mjs — the production app starts from an empty database.
 *
 * Areas cover the whole FCT plus the Greater-Abuja satellite towns across
 * the boundaries (Nyanya/Karu/Mararaba in Nasarawa, Suleja in Niger, Zuba
 * and the rest of the FCT outskirts). Coordinates are approximate district
 * centres — good enough for "near me" distance sorting and discovery.
 */

export const ABUJA_AREAS = [
  // Core districts
  'Central Business District',
  'Garki',
  'Wuse',
  'Wuse II',
  'Maitama',
  'Asokoro',
  'Wuye',
  'Utako',
  'Jabi',
  'Gwarinpa',
  'Mabushi',
  'Katampe',
  'Jahi',
  'Kado',
  'Life Camp',
  'Karmo',
  'Dawaki',
  'Idu Industrial',
  'Durumi',
  'Gudu',
  'Galadimawa',
  'Games Village',
  'Gaduwa',
  'Apo',
  'Lokogoma',
  'Duboyi',
  'Kabusa',
  // Outskirts & satellite towns (Greater Abuja)
  'Nyanya',
  'Karu',
  'Mararaba',
  'Jikwoyi',
  'Kurudu',
  'Orozo',
  'Karshi',
  'Kubwa',
  'Dutse',
  'Mpape',
  'Lugbe',
  'Zuba',
  'Gwagwalada',
  'Kuje',
  'Bwari',
  'Suleja',
  'Dei-Dei',
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
