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

export const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Wuse II': { lat: 9.0778, lng: 7.4786 },
  'Maitama': { lat: 9.0882, lng: 7.4952 },
  'Garki': { lat: 9.0333, lng: 7.4833 },
  'Asokoro': { lat: 9.0392, lng: 7.5194 },
  'Gwarinpa': { lat: 9.1128, lng: 7.4069 },
  'Jabi': { lat: 9.0733, lng: 7.4261 },
  'Central Business District': { lat: 9.0556, lng: 7.4917 },
  'Utako': { lat: 9.0667, lng: 7.4444 },
  'Apo': { lat: 9.0061, lng: 7.4878 },
  'Lokogoma': { lat: 8.9753, lng: 7.4258 },
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

/* The organizer-visible display name for a user, falling back gracefully. */
export function organizerDisplayName(user: User | null): string {
  return user?.businessName || user?.fullName || 'Organizer';
}
