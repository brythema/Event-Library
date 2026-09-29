/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AbujaEvent, EventStatus, TicketPlan, Booking, Notification, User } from './types';
import { INITIAL_EVENTS, INITIAL_USERS, INITIAL_TICKET_PLANS, INITIAL_BOOKINGS, INITIAL_NOTIFICATIONS } from './initialData';

// Fixed simulated current date to ensure seeded data works beautifully
export const SIMULATED_TODAY = '2026-07-08';

export function getTodayDate(): Date {
  return new Date(SIMULATED_TODAY);
}

// Helpers for date checking
export function isToday(dateStr: string): boolean {
  return dateStr === SIMULATED_TODAY;
}

export function isTomorrow(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date(SIMULATED_TODAY);
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

export function isThisWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  
  // Let's check if the date is within Friday, Saturday, or Sunday of the current simulated week.
  // Today is 2026-07-08 (Wednesday). The upcoming weekend is July 10 (Fri), July 11 (Sat), July 12 (Sun).
  const today = new Date(SIMULATED_TODAY);
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // DiffDays to Friday is 2, Saturday is 3, Sunday is 4
  return diffDays >= 2 && diffDays <= 4;
}

export function isUpcoming(dateStr: string): boolean {
  return dateStr > SIMULATED_TODAY;
}

/**
 * Automatically update event statuses based on the simulated current date.
 * Lifecycle: Draft -> Published -> Pending Review -> Approved -> Ticketing Active -> Live (on event day) -> Ended -> Archived (24 hours later)
 */
export function updateEventLifecycles(events: AbujaEvent[]): AbujaEvent[] {
  return events.map((event) => {
    // We only auto-advance if the event was already Approved or TicketingActive
    if (
      event.status === EventStatus.Approved ||
      event.status === EventStatus.TicketingActive ||
      event.status === EventStatus.Live ||
      event.status === EventStatus.Ended
    ) {
      if (event.date === SIMULATED_TODAY) {
        return { ...event, status: EventStatus.Live };
      }
      
      const eventTime = new Date(event.date).getTime();
      const todayTime = new Date(SIMULATED_TODAY).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const diffMs = todayTime - eventTime;
      
      if (diffMs >= oneDayMs) {
        // More than 24 hours after the event date
        return { ...event, status: EventStatus.Archived };
      } else if (diffMs > 0) {
        // Less than 24 hours past the event, but date is prior to today
        return { ...event, status: EventStatus.Ended };
      }
    }
    return event;
  });
}

// Local Storage helpers
export function loadState() {
  const eventsRaw = localStorage.getItem('abuja_events_events');
  const usersRaw = localStorage.getItem('abuja_events_users');
  const plansRaw = localStorage.getItem('abuja_events_plans');
  const bookingsRaw = localStorage.getItem('abuja_events_bookings');
  const notificationsRaw = localStorage.getItem('abuja_events_notifications');
  const currentUserRaw = localStorage.getItem('abuja_events_current_user');

  let events: AbujaEvent[] = eventsRaw ? JSON.parse(eventsRaw) : INITIAL_EVENTS;
  const users: User[] = usersRaw ? JSON.parse(usersRaw) : INITIAL_USERS;
  const ticketPlans: TicketPlan[] = plansRaw ? JSON.parse(plansRaw) : INITIAL_TICKET_PLANS;
  const bookings: Booking[] = bookingsRaw ? JSON.parse(bookingsRaw) : INITIAL_BOOKINGS;
  const notifications: Notification[] = notificationsRaw ? JSON.parse(notificationsRaw) : INITIAL_NOTIFICATIONS;
  const currentUser: User | null = currentUserRaw ? JSON.parse(currentUserRaw) : null;

  // Run lifecycle updates
  events = updateEventLifecycles(events);

  return { events, users, ticketPlans, bookings, notifications, currentUser };
}

export function saveState(state: {
  events: AbujaEvent[];
  users: User[];
  ticketPlans: TicketPlan[];
  bookings: Booking[];
  notifications: Notification[];
  currentUser: User | null;
}) {
  localStorage.setItem('abuja_events_events', JSON.stringify(state.events));
  localStorage.setItem('abuja_events_users', JSON.stringify(state.users));
  localStorage.setItem('abuja_events_plans', JSON.stringify(state.ticketPlans));
  localStorage.setItem('abuja_events_bookings', JSON.stringify(state.bookings));
  localStorage.setItem('abuja_events_notifications', JSON.stringify(state.notifications));
  localStorage.setItem('abuja_events_current_user', JSON.stringify(state.currentUser));
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
  const targetStr = `${eventDate}T${openingTime || '00:00'}:00`;
  const targetDate = new Date(targetStr);
  const now = new Date(`${SIMULATED_TODAY}T15:54:44`); // Anchoring now near local simulated time
  
  const difference = targetDate.getTime() - now.getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
  }
  
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / 1000 / 60) % 60);
  const seconds = Math.floor((difference / 1000) % 60);
  
  return { days, hours, minutes, seconds, isOver: false };
}

// WhatsApp pre-filled message generator
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
