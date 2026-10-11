/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Firestore data service. All reads are live subscriptions; all writes are
 * validated by firestore.rules (role-gated) and go through these helpers so
 * the shape stays consistent. Booking creation is NOT here — it is a
 * server-side transaction via POST /api/book.
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AbujaEvent, Booking, EventStatus, Notification, TicketPlan, User } from '../types';
import { PUBLIC_STATUSES } from '../utils';

function mapDoc<T>(snapDocs: { id: string; data: () => Record<string, unknown> }[]): T[] {
  return snapDocs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
}

/* ------------------------------ subscriptions ----------------------------- */

export function subscribeEvents(user: User | null, onData: (events: AbujaEvent[]) => void, onError: (e: Error) => void): Unsubscribe {
  if (!user) {
    /* Signed-out visitors see the public statuses only. */
    return onSnapshot(
      query(collection(db, 'events'), where('status', 'in', PUBLIC_STATUSES)),
      (snap) => onData(mapDoc<AbujaEvent>(snap.docs)),
      (e) => onError(e)
    );
  }
  if (user.role === 'Admin') {
    return onSnapshot(collection(db, 'events'), (snap) => onData(mapDoc<AbujaEvent>(snap.docs)), (e) => onError(e));
  }
  /* Everyone else: public list + their own events (organizer drafts). */
  const publicQ = query(collection(db, 'events'), where('status', 'in', PUBLIC_STATUSES));
  const ownQ = query(collection(db, 'events'), where('organizerId', '==', user.id));
  const events = new Map<string, AbujaEvent>();
  const emit = () => onData([...events.values()]);
  const unsubA = onSnapshot(publicQ, (snap) => {
    snap.docs.forEach((d) => events.set(d.id, { id: d.id, ...(d.data() as object) } as AbujaEvent));
    emit();
  }, onError);
  const unsubB = onSnapshot(ownQ, (snap) => {
    snap.docs.forEach((d) => events.set(d.id, { id: d.id, ...(d.data() as object) } as AbujaEvent));
    emit();
  }, onError);
  return () => { unsubA(); unsubB(); };
}

export function subscribeTicketPlans(onData: (plans: TicketPlan[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, 'ticketPlans'), (snap) => onData(mapDoc<TicketPlan>(snap.docs)), (e) => onError(e));
}

export function subscribeBookings(user: User | null, onData: (bookings: Booking[]) => void, onError: (e: Error) => void): Unsubscribe {
  if (!user) {
    onData([]);
    return () => {};
  }
  const q = user.role === 'Admin'
    ? collection(db, 'bookings')
    : query(collection(db, 'bookings'), where('buyerId', '==', user.id));
  return onSnapshot(q, (snap) => onData(mapDoc<Booking>(snap.docs)), (e) => onError(e));
}

export function subscribeNotifications(user: User | null, onData: (items: Notification[]) => void, onError: (e: Error) => void): Unsubscribe {
  if (!user) {
    onData([]);
    return () => {};
  }
  /* Rules: users read their own inbox; only the admin claim reads the
     'admin' inbox — so the queries must match exactly that split. */
  const q = user.role === 'Admin'
    ? query(collection(db, 'notifications'), where('userId', '==', 'admin'))
    : query(collection(db, 'notifications'), where('userId', '==', user.id));
  return onSnapshot(q, (snap) => onData(mapDoc<Notification>(snap.docs)), (e) => onError(e));
}

/* Admin user directory (rules: only the admin claim lists users). */
export function subscribeUsers(user: User | null, onData: (items: User[]) => void, onError: (e: Error) => void): Unsubscribe {
  if (!user || user.role !== 'Admin') {
    onData([]);
    return () => {};
  }
  return onSnapshot(collection(db, 'users'), (snap) => onData(mapDoc<User>(snap.docs)), (e) => onError(e));
}

/* -------------------------------- mutations ------------------------------- */

async function currentUid(): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in.');
  return uid;
}

function makeNotification(partial: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
    ...partial,
  };
}

/* Organizer saves a new event (wizard) or an admin/organizer edits one. */
export async function saveEvent(
  event: AbujaEvent,
  isNew: boolean
): Promise<void> {
  const uid = await currentUid();
  const { id, ...data } = event;
  const batch = writeBatch(db);
  batch.set(doc(db, 'events', id), { ...data, organizerId: uid }, { merge: !isNew });

  if (isNew) {
    const adminNotif = makeNotification({
      userId: 'admin',
      title: 'New Event Submission',
      message: `Organizer "${event.organizerName}" created event "${event.title}" pending review.`,
      type: 'warning',
    });
    const orgNotif = makeNotification({
      userId: uid,
      title: event.status === EventStatus.Draft ? 'Draft Saved' : 'Review Submitted',
      message: event.status === EventStatus.Draft
        ? `Your event "${event.title}" is saved as draft.`
        : `Your event "${event.title}" is pending admin verification.`,
      type: 'success',
    });
    batch.set(doc(db, 'notifications', adminNotif.id), adminNotif);
    batch.set(doc(db, 'notifications', orgNotif.id), orgNotif);
  }
  await batch.commit();
}

export async function deleteEvent(eventId: string): Promise<void> {
  await currentUid();
  await deleteDoc(doc(db, 'events', eventId));
}

/* Admin approval / rejection + notifications. */
export async function setEventStatus(
  eventId: string,
  status: EventStatus,
  notify?: { userId: string; title: string; message: string; type: Notification['type'] }
): Promise<void> {
  await currentUid();
  const batch = writeBatch(db);
  batch.set(doc(db, 'events', eventId), { status }, { merge: true });
  if (notify) {
    const notif = makeNotification(notify);
    batch.set(doc(db, 'notifications', notif.id), notif);
  }
  await batch.commit();
}

export async function notifyUser(userId: string, title: string, message: string, type: Notification['type']): Promise<void> {
  await currentUid();
  const notif = makeNotification({ userId, title, message, type });
  await setDoc(doc(db, 'notifications', notif.id), notif);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await currentUid();
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
}

export async function setEventFeatured(eventId: string, isFeatured: boolean): Promise<void> {
  await currentUid();
  await updateDoc(doc(db, 'events', eventId), { isFeatured });
}

export async function addTicketPlan(plan: Omit<TicketPlan, 'id'>, event: AbujaEvent): Promise<void> {
  await currentUid();
  const batch = writeBatch(db);
  const planRef = doc(collection(db, 'ticketPlans'));
  batch.set(planRef, plan);
  const notif = makeNotification({
    userId: event.organizerId,
    title: 'Ticketing Active!',
    message: `Admin has launched ticket class "${plan.name}" priced at ₦${plan.price.toLocaleString()} for "${event.title}".`,
    type: 'success',
  });
  batch.set(doc(db, 'notifications', notif.id), notif);
  await batch.commit();
}

export async function deleteTicketPlan(planId: string): Promise<void> {
  await currentUid();
  await deleteDoc(doc(db, 'ticketPlans', planId));
}

/* Admin verifies or declines a payment. Declining restocks the tickets. */
export async function confirmBooking(booking: Booking, plan?: TicketPlan): Promise<void> {
  await currentUid();
  const batch = writeBatch(db);
  batch.set(doc(db, 'bookings', booking.id), { status: 'Confirmed' }, { merge: true });
  const notif = makeNotification({
    userId: booking.buyerId,
    title: 'Pass Verified & Active! 🎟️',
    message: `Your payment for order reference "${booking.bookingReference}" was confirmed! Open your portal to view your QR access pass.`,
    type: 'success',
  });
  batch.set(doc(db, 'notifications', notif.id), notif);
  await batch.commit();
}

export async function cancelBooking(booking: Booking, plan?: TicketPlan): Promise<void> {
  await currentUid();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'bookings', booking.id));
  if (plan) {
    batch.set(doc(db, 'ticketPlans', plan.id), { availableQuantity: increment(booking.quantity) }, { merge: true });
  }
  const notif = makeNotification({
    userId: booking.buyerId,
    title: `Order ${booking.bookingReference} declined`,
    message: `Your payment for "${booking.bookingReference}" could not be verified. Please contact support.`,
    type: 'warning',
  });
  batch.set(doc(db, 'notifications', notif.id), notif);
  await batch.commit();
}

/* Profile updates (self). The role and email are immutable here. */
export async function updateProfile(user: User): Promise<void> {
  await currentUid();
  const data: Record<string, unknown> = {
    fullName: user.fullName,
    phone: user.phone,
    instagram: user.instagram || '',
    facebook: user.facebook || '',
    updatedAt: new Date().toISOString(),
  };
  if (user.role === 'Organizer') {
    data.businessName = user.businessName || '';
    data.businessAddress = user.businessAddress || '';
    data.website = user.website || '';
    if (user.brandLogo) data.brandLogo = user.brandLogo;
  }
  await setDoc(doc(db, 'users', user.id), data, { merge: true });
}

/* Bookmark toggle: profile array + a denormalized interest counter. */
export async function toggleBookmark(eventId: string, isSaved: boolean): Promise<void> {
  const uid = await currentUid();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), {
    savedEventIds: isSaved ? arrayRemove(eventId) : arrayUnion(eventId),
  }, { merge: true });
  batch.set(doc(db, 'events', eventId), { interestedCount: increment(isSaved ? -1 : 1) }, { merge: true });
  await batch.commit();
}

export async function markAllRead(ids: string[]): Promise<void> {
  await currentUid();
  const batch = writeBatch(db);
  ids.forEach((id) => batch.set(doc(db, 'notifications', id), { isRead: true }, { merge: true }));
  await batch.commit();
}
