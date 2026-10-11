/* Abuja Events ticket booking — the ONLY way a booking is created.

   Why a server endpoint instead of a client-side Firestore transaction:
   security rules cannot make a client's decrement conditional on a booking
   being written, so a rogue client could burn inventory or fabricate orders.
   Here the whole booking — availability decrement, booking document, admin
   notification — is one service-account transaction, atomic against
   concurrent buyers, with every business rule checked server-side.

   Request: POST /api/book, JSON body { eventId, ticketPlanId, quantity },
   Firebase ID token as Bearer header.
   Response: 201 { booking } or 4xx { error }. */
import { verifyRequestToken } from './_lib/auth.js';
import { createWrite, fromFirestoreFields, randomId, runTransaction, updateWrite } from './_lib/firestore-rest.js';

function badRequest(res, error, status = 400) {
  res.status(status).json({ error });
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) { resolve(null); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    badRequest(res, 'Method not allowed.', 405);
    return;
  }

  const claims = await verifyRequestToken(req);
  if (!claims) {
    badRequest(res, 'Sign in to book tickets.', 401);
    return;
  }

  const body = await readJsonBody(req);
  const eventId = body && typeof body.eventId === 'string' ? body.eventId : '';
  const ticketPlanId = body && typeof body.ticketPlanId === 'string' ? body.ticketPlanId : '';
  const quantity = body && Number.isInteger(body.quantity) ? body.quantity : 0;
  if (!eventId || !ticketPlanId || quantity < 1 || quantity > 20) {
    badRequest(res, 'A valid event, ticket plan and quantity are required.');
    return;
  }

  try {
    const result = await runTransaction(
      [['events', eventId], ['ticketPlans', ticketPlanId], ['users', claims.uid]],
      (snapshots) => {
        const eventSnap = snapshots[`events/${eventId}`];
        const planSnap = snapshots[`ticketPlans/${ticketPlanId}`];
        const userSnap = snapshots[`users/${claims.uid}`];

        if (!eventSnap || !planSnap || !userSnap) {
          return { error: ['That event or ticket plan no longer exists.', 404] };
        }
        const event = eventSnap.data();
        const plan = planSnap.data();
        const user = userSnap.data();

        if (plan.eventId !== eventId) {
          return { error: ['That ticket plan does not belong to this event.', 400] };
        }
        if (!['Approved', 'Ticketing Active', 'Live'].includes(event.status)) {
          return { error: ['Ticketing is not open for this event.', 409] };
        }
        if (quantity > (plan.maxPurchaseLimit || 10)) {
          return { error: [`You can buy at most ${plan.maxPurchaseLimit || 10} tickets of this class per order.`, 409] };
        }
        if (plan.availableQuantity < quantity) {
          return { error: [`Only ${plan.availableQuantity} ticket(s) of this class remain.`, 409] };
        }

        const bookingId = `bk-${randomId()}`;
        const reference = `AE-${String(event.title || 'EV').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'EV'}-${Math.floor(10000 + Math.random() * 90000)}`;
        const booking = {
          eventId,
          buyerId: claims.uid,
          ticketPlanId,
          quantity,
          totalAmount: plan.price * quantity,
          status: 'Pending',
          bookingReference: reference,
          createdAt: new Date().toISOString(),
          customerDetails: {
            fullName: user.fullName || 'Customer',
            email: user.email || '',
            phone: user.phone || ''
          }
        };
        const adminNotification = {
          userId: 'admin',
          title: 'Ticket Allocation Request',
          message: `Buyer "${booking.customerDetails.fullName}" requested ${quantity} × "${plan.name}" for "${event.title}" (${reference}). Transfer confirmation pending on WhatsApp.`,
          type: 'info',
          createdAt: booking.createdAt,
          isRead: false
        };

        return {
          writes: [
            /* Decrement availability — the whole point of the transaction. */
            updateWrite(`ticketPlans/${ticketPlanId}`, { ...plan, availableQuantity: plan.availableQuantity - quantity }),
            createWrite('bookings', bookingId, booking),
            createWrite('notifications', `notif-${randomId()}`, adminNotification)
          ],
          booking: { id: bookingId, ...booking }
        };
      }
    );

    if (result.error) {
      badRequest(res, result.error[0], result.error[1]);
      return;
    }
    res.status(201).json({ booking: result.booking });
  } catch (error) {
    console.error('booking failed:', error && error.message);
    badRequest(res, 'The booking could not be completed. Please try again.', 500);
  }
}
