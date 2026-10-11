/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client caller for POST /api/book — the only booking path. The server
 * (api/book.js) owns every business rule: availability, purchase limits,
 * lifecycle, atomic decrement.
 */
import { auth } from '../firebase';
import { Booking } from '../types';

export class BookingError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function bookTickets(eventId: string, ticketPlanId: string, quantity: number): Promise<Booking> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new BookingError('You must be signed in to book tickets.', 401);

  const res = await fetch('/api/book', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, ticketPlanId, quantity }),
  });

  let json: { booking?: Booking; error?: string } = {};
  try { json = await res.json(); } catch { /* non-JSON failure */ }

  if (!res.ok || !json.booking) {
    throw new BookingError(json.error || 'The booking could not be completed.', res.status);
  }
  return json.booking;
}
