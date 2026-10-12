/* Idempotent demo seed for the production Firestore. Creates the three demo
   accounts (real Firebase Auth users) and four events with dates relative to
   today so the homepage sections (Today / Tomorrow / Weekend / Upcoming) all
   have content. Deterministic document ids make re-runs safe.

     node scripts/seed-demo.mjs

   Demo credentials (owner-only knowledge, NOT in the app UI):
     admin@abujaevents.com   / admin123      (admin claim)
     events@capitalcreatives.com / organizer123
     hello@abujatechhub.ng   / organizer123
     buyer@gmail.com         / buyer123
*/
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const key = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(key), projectId: key.project_id });
const auth = getAuth();
const db = getFirestore();

function dayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const DEMO_USERS = [
  { email: 'admin@abujaevents.com', password: 'admin123', name: 'Abuja Events Admin', role: 'admin' },
  { email: 'events@capitalcreatives.com', password: 'organizer123', name: 'Chidi Okafor', role: 'Organizer',
    businessName: 'Capital Creatives Agency', businessAddress: '12 Aminu Kano Crescent, Wuse II, Abuja',
    instagram: '@capitalcreatives', facebook: 'facebook.com/capitalcreatives', website: 'capitalcreatives.com' },
  { email: 'hello@abujatechhub.ng', password: 'organizer123', name: 'Fatima Bello', role: 'Organizer',
    businessName: 'Abuja Tech Hub', businessAddress: '45 Constitution Ave, Central Business District, Abuja',
    instagram: '@abujatechhub', facebook: 'facebook.com/abujatechhub', website: 'abujatechhub.ng' },
  { email: 'buyer@gmail.com', password: 'buyer123', name: 'Tunde Johnson', role: 'Buyer' },
];

/* 1x1 transparent PNG placeholder art via a neutral unsplash photo. */
const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=${w}`;

const U = new Map(); // email -> uid
for (const u of DEMO_USERS) {
  let fbUser;
  try {
    fbUser = await auth.getUserByEmail(u.email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    fbUser = await auth.createUser({ email: u.email, password: u.password, displayName: u.name });
    console.log(`created auth user ${u.email} -> ${fbUser.uid}`);
  }
  await auth.updateUser(fbUser.uid, { password: u.password });
  if (u.role === 'admin') await auth.setCustomUserClaims(fbUser.uid, { admin: true, role: 'admin' });
  await db.collection('users').doc(fbUser.uid).set({
    role: u.role === 'admin' ? 'admin' : u.role,
    email: u.email,
    fullName: u.name,
    phone: '+234 800 000 0000',
    savedEventIds: [],
    ...(u.role === 'Organizer' ? {
      businessName: u.businessName,
      businessAddress: u.businessAddress,
      instagram: u.instagram,
      facebook: u.facebook,
      website: u.website,
    } : {}),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  U.set(u.email, fbUser.uid);
}
const org1 = U.get('events@capitalcreatives.com');
const org2 = U.get('hello@abujatechhub.ng');

const EVENTS = [
  {
    id: 'demo-event-1', organizerId: org1, organizerName: 'Capital Creatives Agency',
    title: 'Abuja Jazz & Sunset Night', subtitle: 'An evening of smooth classics',
    description: 'Live jazz ensembles, curated cocktails and a golden-hour rooftop session overlooking Central Business District. Doors open 18:00, first set 19:15.',
    category: 'Music', tags: ['jazz', 'live music', 'rooftop'],
    flyerUrl: img('1511671782779-c97d3d27a1d4'), organizerLogo: img('1516035069371-29a1b244cc32', 200), backgroundBanner: img('1501281668745-f7f57925c3b4', 1200),
    date: dayOffset(0), openingTime: '18:00', closingTime: '23:00', timezone: 'WAT (UTC+1)',
    venueName: 'The Rooftop at Ceddi Plaza', streetAddress: '26 Tafawa Balewa Way', area: 'Central Business District',
    landmark: 'Ceddi Plaza Car Park', googleMapLink: 'https://maps.google.com/?q=Ceddi+Plaza+Abuja',
    phone: '+234 809 111 2222', email: 'events@capitalcreatives.com', website: 'capitalcreatives.com',
    instagram: '@capitalcreatives', facebook: 'facebook.com/capitalcreatives', whatsapp: '+234 809 111 2222',
    gallery: [img('1470229722913-7c0e2dbbafd3'), img('1493225457124-a3eb161ffa5f')], faqs: [
      { question: 'Is there dress code?', answer: 'Smart casual — come comfortable, come stylish.' },
    ],
    ageRestriction: '18+', dressCode: 'Smart Casual', parking: 'Available & Secured',
    refundPolicy: 'Tickets are non-refundable but transferable.',
    status: 'Ticketing Active', isFeatured: true, interestedCount: 12,
    latitude: 9.0556, longitude: 7.4917,
  },
  {
    id: 'demo-event-2', organizerId: org2, organizerName: 'Abuja Tech Hub',
    title: 'Founders Breakfast: AI in Abuja', subtitle: 'Monthly founder circle',
    description: 'A morning of honest conversations with builders shipping AI products in Abuja. Lightning demos, hiring board and plenty of coffee.',
    category: 'Tech', tags: ['startups', 'ai', 'networking'],
    flyerUrl: img('1505373877841-8d25f7d46678'), organizerLogo: img('1560179707-f14e90ef3623', 200), backgroundBanner: img('1531482615713-2afd69097998', 1200),
    date: dayOffset(1), openingTime: '09:00', closingTime: '13:00', timezone: 'WAT (UTC+1)',
    venueName: 'Abuja Tech Hub Auditorium', streetAddress: '45 Constitution Ave', area: 'Central Business District',
    landmark: 'Opposite NNPC Towers', googleMapLink: 'https://maps.google.com/?q=Constitution+Ave+Abuja',
    phone: '+234 803 333 4444', email: 'hello@abujatechhub.ng', website: 'abujatechhub.ng',
    instagram: '@abujatechhub', facebook: 'facebook.com/abujatechhub', whatsapp: '+234 803 333 4444',
    gallery: [], faqs: [],
    ageRestriction: 'All Ages', dressCode: 'Casual', parking: 'Available & Secured',
    refundPolicy: 'Free event — booking is binding, please cancel if you cannot attend.',
    status: 'Approved', isFeatured: false, interestedCount: 8,
    latitude: 9.0556, longitude: 7.4917,
  },
  {
    id: 'demo-event-3', organizerId: org1, organizerName: 'Capital Creatives Agency',
    title: 'Wuse II Food & Grill Festival', subtitle: 'The weekend edition',
    description: 'Twenty grill masters, suya championships, family lawn games and a live highlife band. Bring the whole crew.',
    category: 'Food', tags: ['food', 'festival', 'family'],
    flyerUrl: img('1555939594-58d7cb561ad1'), organizerLogo: img('1516035069371-29a1b244cc32', 200), backgroundBanner: img('1555244162-803a646e3542', 1200),
    date: dayOffset(5), openingTime: '14:00', closingTime: '22:00', timezone: 'WAT (UTC+1)',
    venueName: 'Jabi Lake Grounds', streetAddress: 'Jabi Lake Mall environs', area: 'Jabi',
    landmark: 'Jabi Lake', googleMapLink: 'https://maps.google.com/?q=Jabi+Lake+Abuja',
    phone: '+234 809 111 2222', email: 'events@capitalcreatives.com', website: 'capitalcreatives.com',
    instagram: '@capitalcreatives', facebook: 'facebook.com/capitalcreatives', whatsapp: '+234 809 111 2222',
    gallery: [img('1529193591184-b1d58069ecdd')], faqs: [],
    ageRestriction: 'All Ages', dressCode: 'Casual', parking: 'Available & Secured',
    refundPolicy: 'Tickets are non-refundable.',
    status: 'Ticketing Active', isFeatured: true, interestedCount: 23,
    latitude: 9.0733, longitude: 7.4261,
  },
  {
    id: 'demo-event-4', organizerId: org2, organizerName: 'Abuja Tech Hub',
    title: 'Gwarinpa Coders Bootcamp', subtitle: 'Two-day intensive',
    description: 'Hands-on web development bootcamp for beginners — HTML to deployed project in two days. Laptops required.',
    category: 'Education', tags: ['coding', 'bootcamp', 'beginners'],
    flyerUrl: img('1517694712202-14dd9538aa97'), organizerLogo: img('1560179707-f14e90ef3623', 200), backgroundBanner: img('1517245386807-bb43f82c33c4', 1200),
    date: dayOffset(12), openingTime: '10:00', closingTime: '16:00', timezone: 'WAT (UTC+1)',
    venueName: 'Gwarinpa Learning Centre', streetAddress: '3rd Avenue, Gwarinpa', area: 'Gwarinpa',
    landmark: 'Next to Gwarinpa General Hospital', googleMapLink: 'https://maps.google.com/?q=Gwarinpa+Abuja',
    phone: '+234 803 333 4444', email: 'hello@abujatechhub.ng', website: 'abujatechhub.ng',
    instagram: '@abujatechhub', facebook: 'facebook.com/abujatechhub', whatsapp: '+234 803 333 4444',
    gallery: [], faqs: [{ question: 'Do I need experience?', answer: 'None — this is for absolute beginners.' }],
    ageRestriction: 'All Ages', dressCode: 'Casual', parking: 'Street Parking',
    refundPolicy: 'Full refund up to 48 hours before the bootcamp.',
    status: 'Ticketing Active', isFeatured: false, interestedCount: 5,
    latitude: 9.1128, longitude: 7.4069,
  },
];

const PLANS = [
  { id: 'demo-plan-1a', eventId: 'demo-event-1', name: 'Regular', price: 5000, availableQuantity: 120, maxPurchaseLimit: 6, description: 'General admission with rooftop access', color: '#48d8ff', displayOrder: 1 },
  { id: 'demo-plan-1b', eventId: 'demo-event-1', name: 'VIP Table', price: 25000, availableQuantity: 15, maxPurchaseLimit: 4, description: 'Reserved table for four, one bottle included', color: '#65f4c3', displayOrder: 2 },
  { id: 'demo-plan-2a', eventId: 'demo-event-2', name: 'Free Seat', price: 0, availableQuantity: 80, maxPurchaseLimit: 2, description: 'First-come seating, coffee included', color: '#9b8cff', displayOrder: 1 },
  { id: 'demo-plan-3a', eventId: 'demo-event-3', name: 'Adult', price: 3000, availableQuantity: 300, maxPurchaseLimit: 10, description: 'Single entry, all lawn activities', color: '#48d8ff', displayOrder: 1 },
  { id: 'demo-plan-3c', eventId: 'demo-event-3', name: 'Family of 4', price: 10000, availableQuantity: 50, maxPurchaseLimit: 2, description: 'Two adults, two children', color: '#ff6f91', displayOrder: 2 },
  { id: 'demo-plan-4a', eventId: 'demo-event-4', name: 'Bootcamp Pass', price: 15000, availableQuantity: 40, maxPurchaseLimit: 3, description: 'Both days, lunch and certificate', color: '#38bdf8', displayOrder: 1 },
];

for (const ev of EVENTS) {
  const { id, ...data } = ev;
  await db.collection('events').doc(id).set({ ...data, createdAt: new Date().toISOString() }, { merge: true });
}
for (const plan of PLANS) {
  const { id, ...data } = plan;
  await db.collection('ticketPlans').doc(id).set(data, { merge: true });
}

const adminUid = U.get('admin@abujaevents.com');
const inbox = await db.collection('notifications').where('userId', '==', 'admin').limit(1).get();
if (inbox.empty) {
  await db.collection('notifications').doc('demo-notif-welcome').set({
    userId: 'admin',
    title: 'Welcome to Abuja Events',
    message: 'Demo data seeded. Approve, feature or archive events from this dashboard.',
    type: 'info',
    createdAt: new Date().toISOString(),
    isRead: false,
  });
  await db.collection('notifications').doc('demo-notif-org').set({
    userId: org1,
    title: 'Ticketing Active!',
    message: 'Admin has launched ticket class "Regular" for "Abuja Jazz & Sunset Night".',
    type: 'success',
    createdAt: new Date().toISOString(),
    isRead: false,
  });
}

console.log('SEED COMPLETE — 4 events, 6 plans, 4 demo accounts (ids deterministic, re-runs safe).');
