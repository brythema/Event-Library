/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EventStatus {
  Draft = 'Draft',
  Published = 'Published',
  PendingReview = 'Pending Review',
  Approved = 'Approved',
  TicketingActive = 'Ticketing Active',
  Live = 'Live',
  Ended = 'Ended',
  Archived = 'Archived',
}

export type Role = 'Buyer' | 'Organizer' | 'Admin';

export interface FAQ {
  question: string;
  answer: string;
}

export interface AbujaEvent {
  id: string;
  organizerId: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  tags: string[];
  flyerUrl: string;
  organizerLogo: string;
  backgroundBanner: string;
  date: string; // YYYY-MM-DD
  openingTime: string;
  closingTime: string;
  timezone: string;
  venueName: string;
  streetAddress: string;
  area: string;
  landmark: string;
  googleMapLink: string;
  organizerName: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  gallery: string[];
  faqs: FAQ[];
  ageRestriction: string;
  dressCode: string;
  parking: string;
  refundPolicy: string;
  status: EventStatus;
  isFeatured: boolean;
  interestedCount: number;
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

export interface TicketPlan {
  id: string;
  eventId: string;
  name: string;
  price: number;
  availableQuantity: number;
  maxPurchaseLimit: number;
  description: string;
  color: string;
  displayOrder: number;
}

export interface Booking {
  id: string;
  eventId: string;
  buyerId: string;
  ticketPlanId: string;
  quantity: number;
  totalAmount: number;
  status: 'Pending' | 'Confirmed';
  bookingReference: string;
  createdAt: string;
  customerDetails: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export interface Notification {
  id: string;
  userId: string; // 'admin' or a uid
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  createdAt: string;
  isRead: boolean;
}

export interface User {
  id: string; // Firebase uid
  role: Role;
  email: string;
  fullName: string;
  phone: string;
  savedEventIds?: string[]; // bookmarks, lives on the profile document
  // Organizer specific
  businessName?: string;
  brandLogo?: string;
  businessAddress?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface AppData {
  events: AbujaEvent[];
  users: User[];
  ticketPlans: TicketPlan[];
  bookings: Booking[];
  notifications: Notification[];
}

/* Web-discovered event — comes from /api/discover (Gemini + Google Search),
   never from the in-house database. Always rendered as UNVERIFIED and
   below verified in-house listings. */
export interface DiscoveredEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or ''
  venue: string;
  area: string;
  description: string;
  sourceUrl: string;
  sourceName: string;
  isDiscovered: true;
}
