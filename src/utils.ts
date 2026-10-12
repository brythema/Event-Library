/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AbujaEvent, EventStatus, User } from './types';

/* Statuses visible to the general public in listings. Drafts, submissions
   awaiting review, and archived events stay private to owner and admin. */
export const PUBLIC_STATUSES: EventStatus[] = [
  EventStatus.Approved,
  EventStatus.TicketingActive,
  EventStatus.Live,
  EventStatus.Ended,
];

/* The WhatsApp number buyers are redirected to for payment confirmation.
   Configurable until the owner locks in the business number. */
export const ADMIN_WHATSAPP = '+2348012345678';

/* Neutral placeholder shown wherever an event has no flyer yet. */
export const FALLBACK_FLYER = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800';

/* Date helpers on the real clock (no simulated "today" in production). */
export function isToday(dateStr: string): boolean {
  return dateStr === localDateString(new Date());
}

export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === localDateString(tomorrow);
}

export function isThisWeekend(dateStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay(); // 5 Friday, 6 Saturday, 0 Sunday
  if (day !== 5 && day !== 6 && day !== 0) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  // The upcoming weekend: Friday through Sunday within the next week, plus today if it IS the weekend.
  return diffDays >= 0 && diffDays <= 6;
}

export function isUpcoming(dateStr: string): boolean {
  return dateStr >= localDateString(new Date());
}

/* Local-time YYYY-MM-DD (toISOString would shift by timezone). */
export function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* Display-level lifecycle: the stored status stays admin-controlled; the UI
   derives Live/Ended from the real date so listings never need a cron. */
export function effectiveStatus(event: AbujaEvent, now: Date = new Date()): EventStatus {
  const status = event.status;
  if (
    status !== EventStatus.Approved &&
    status !== EventStatus.TicketingActive &&
    status !== EventStatus.Live &&
    status !== EventStatus.Ended
  ) {
    return status;
  }
  const today = localDateString(now);
  if (event.date === today) return EventStatus.Live;
  if (event.date < today) {
    const diffMs = now.getTime() - new Date(`${event.date}T23:59:59`).getTime();
    return diffMs >= 24 * 60 * 60 * 1000 ? EventStatus.Archived : EventStatus.Ended;
  }
  return status === EventStatus.Ended ? EventStatus.Ended : status;
}

// Countdown timer calculator
export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOver: boolean;
}

export function calculateCountdown(eventDate: string, openingTime: string): Countdown {
  const targetDate = new Date(`${eventDate}T${openingTime || '00:00'}:00`);
  const difference = targetDate.getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / 1000 / 60) % 60);
  const seconds = Math.floor((difference / 1000) % 60);

  return { days, hours, minutes, seconds, isOver: false };
}

// WhatsApp pre-filled payment confirmation message
export function generateWhatsAppLink(
  whatsappNumber: string,
  eventName: string,
  ticketType: string,
  quantity: number,
  totalAmount: number,
  customerName: string,
  phone: string,
  email: string
): string {
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const message = `Hello Abuja Events Admin,\n\nI have made payment for tickets!\n\n*Event Name:* ${eventName}\n*Ticket Type:* ${ticketType}\n*Quantity:* ${quantity}\n*Total Amount:* ₦${totalAmount.toLocaleString()}\n\n*Customer Name:* ${customerName}\n*Phone:* ${phone}\n*Email:* ${email}\n\nPlease verify my booking. Thank you!`;
  return `https://wa.me/${cleanNumber || '2348012345678'}?text=${encodeURIComponent(message)}`;
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

/* Approximate district-centre coordinates for "near me" distance sorting.
   Covers the whole FCT plus the Greater-Abuja satellite towns. */
export const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Central Business District': { lat: 9.0556, lng: 7.4917 },
  'Garki': { lat: 9.0333, lng: 7.4833 },
  'Wuse': { lat: 9.0789, lng: 7.4722 },
  'Wuse II': { lat: 9.0778, lng: 7.4786 },
  'Maitama': { lat: 9.0882, lng: 7.4952 },
  'Asokoro': { lat: 9.0392, lng: 7.5194 },
  'Wuye': { lat: 9.0810, lng: 7.4570 },
  'Utako': { lat: 9.0667, lng: 7.4444 },
  'Jabi': { lat: 9.0733, lng: 7.4261 },
  'Gwarinpa': { lat: 9.1128, lng: 7.4069 },
  'Mabushi': { lat: 9.0833, lng: 7.4667 },
  'Katampe': { lat: 9.0917, lng: 7.4250 },
  'Jahi': { lat: 9.0967, lng: 7.4389 },
  'Kado': { lat: 9.1033, lng: 7.4233 },
  'Life Camp': { lat: 9.1000, lng: 7.4333 },
  'Karmo': { lat: 9.1300, lng: 7.3833 },
  'Dawaki': { lat: 9.1250, lng: 7.3667 },
  'Idu Industrial': { lat: 9.0600, lng: 7.3833 },
  'Durumi': { lat: 9.0100, lng: 7.4600 },
  'Gudu': { lat: 9.0000, lng: 7.4444 },
  'Galadimawa': { lat: 8.9833, lng: 7.4333 },
  'Games Village': { lat: 9.0000, lng: 7.4778 },
  'Gaduwa': { lat: 8.9933, lng: 7.4600 },
  'Apo': { lat: 9.0061, lng: 7.4878 },
  'Lokogoma': { lat: 8.9753, lng: 7.4258 },
  'Duboyi': { lat: 8.9867, lng: 7.4467 },
  'Kabusa': { lat: 8.9533, lng: 7.5000 },
  'Nyanya': { lat: 8.9894, lng: 7.5694 },
  'Karu': { lat: 8.9889, lng: 7.5833 },
  'Mararaba': { lat: 8.9667, lng: 7.6000 },
  'Jikwoyi': { lat: 9.0000, lng: 7.5500 },
  'Kurudu': { lat: 9.0167, lng: 7.5833 },
  'Orozo': { lat: 9.0500, lng: 7.6167 },
  'Karshi': { lat: 9.0333, lng: 7.6333 },
  'Kubwa': { lat: 9.1167, lng: 7.3333 },
  'Dutse': { lat: 9.1400, lng: 7.3483 },
  'Mpape': { lat: 9.1333, lng: 7.4333 },
  'Lugbe': { lat: 8.9833, lng: 7.3833 },
  'Zuba': { lat: 9.1333, lng: 7.2333 },
  'Gwagwalada': { lat: 8.9500, lng: 7.0833 },
  'Kuje': { lat: 8.9000, lng: 7.1667 },
  'Bwari': { lat: 9.3167, lng: 7.3667 },
  'Suleja': { lat: 9.2000, lng: 7.1833 },
  'Dei-Dei': { lat: 9.1667, lng: 7.2833 },
};

export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/* Resolve coordinates to the closest known area. Anything beyond ~25 km from
   every district centre (e.g. a visitor from another state) falls back to
   the capital-wide search. */
export function nearestArea(lat: number, lng: number): { area: string; distanceKm: number } {
  let best = { area: 'Central Business District', distanceKm: Infinity };
  for (const [area, coords] of Object.entries(AREA_COORDINATES)) {
    const distanceKm = getDistanceInKm(lat, lng, coords.lat, coords.lng);
    if (distanceKm < best.distanceKm) best = { area, distanceKm };
  }
  return best;
}

/* The organizer-visible display name for a user, falling back gracefully. */
export function organizerDisplayName(user: User | null): string {
  return user?.businessName || user?.fullName || 'Organizer';
}
