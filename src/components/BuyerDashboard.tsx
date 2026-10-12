/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Ticket, Calendar, MapPin, Heart, Bell, User as UserIcon, 
  Check, QrCode, AlertCircle, Clock, CheckCircle, Smartphone 
} from 'lucide-react';
import { Booking, AbujaEvent, TicketPlan, User, Notification } from '../types';
import { formatCurrency, FALLBACK_FLYER } from '../utils';

interface BuyerDashboardProps {
  buyer: User;
  bookings: Booking[];
  events: AbujaEvent[];
  ticketPlans: TicketPlan[];
  notifications: Notification[];
  savedEventIds: string[];
  onSelectEvent: (eventId: string) => void;
  onToggleInterest: (eventId: string) => void;
  onUpdateProfile: (updated: User) => void;
}

export default function BuyerDashboard({
  buyer,
  bookings,
  events,
  ticketPlans,
  notifications,
  savedEventIds,
  onSelectEvent,
  onToggleInterest,
  onUpdateProfile,
}: BuyerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'saved' | 'notifs' | 'profile'>('tickets');
  
  // Profile form state
  const [fullName, setFullName] = useState(buyer.fullName);
  const [phone, setPhone] = useState(buyer.phone);
  const [instagram, setInstagram] = useState(buyer.instagram || '');
  const [facebook, setFacebook] = useState(buyer.facebook || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filter bookings for this buyer
  const buyerBookings = bookings.filter((b) => b.buyerId === buyer.id);
  const upcomingTickets = buyerBookings.filter((b) => {
    const associatedEvent = events.find((e) => e.id === b.eventId);
    if (!associatedEvent) return false;
    // Event date >= simulated current date (2026-07-08)
    return associatedEvent.date >= '2026-07-08';
  });

  const previousTickets = buyerBookings.filter((b) => {
    const associatedEvent = events.find((e) => e.id === b.eventId);
    if (!associatedEvent) return false;
    return associatedEvent.date < '2026-07-08';
  });

  // Filter saved events
  const savedEvents = events.filter((e) => savedEventIds.includes(e.id));

  // Filter notifications
  const buyerNotifs = notifications.filter((n) => n.userId === buyer.id || n.userId === 'all');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...buyer,
      fullName,
      phone,
      instagram,
      facebook,
    };
    onUpdateProfile(updatedUser);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Welcome header banner */}
      <div className="bg-panel border border-edge p-6 rounded-3xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-sans font-black text-2xl text-ink">
            My Buyer Portal
          </h2>
          <p className="text-xs text-mut mt-1">
            Welcome back, <strong className="text-ink">{buyer.fullName}</strong> • Track your passes and saved experiences
          </p>
        </div>
        
        {/* Ticket counter chip */}
        <div className="bg-neon2/10 border border-neon2/30 text-neon2 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
          <Ticket size={15} />
          <span>{buyerBookings.filter(b => b.status === 'Confirmed').length} Active Passes</span>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-edge">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3.5 px-6 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'tickets' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          🎟️ My Passes ({buyerBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3.5 px-6 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'saved' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          ❤️ Saved Events ({savedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('notifs')}
          className={`pb-3.5 px-6 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'notifs' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          🔔 Updates ({buyerNotifs.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3.5 px-6 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'profile' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          👤 Edit Profile
        </button>
      </div>

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* Upcoming Section */}
          <div className="space-y-4">
            <h3 className="font-sans font-bold text-sm text-mut2 uppercase tracking-wider">
              Upcoming Event Tickets ({upcomingTickets.length})
            </h3>

            {upcomingTickets.length === 0 ? (
              <div className="text-center py-12 bg-panel rounded-2xl border border-edge text-xs text-mut2">
                You do not have any upcoming tickets yet. Browse events and secure yours today!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingTickets.map((b) => {
                  const event = events.find((e) => e.id === b.eventId);
                  const plan = ticketPlans.find((p) => p.id === b.ticketPlanId);
                  
                  if (!event) return null;

                  return (
                    <div
                      key={b.id}
                      className="bg-panel rounded-3xl border border-edge shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col sm:flex-row"
                    >
                      {/* Ticket Left Side: Flyer & Details */}
                      <div className="p-5 flex-1 space-y-4">
                        <span className="text-[10px] bg-neon/15 border border-neon/30 text-neon px-2.5 py-1 rounded-full font-extrabold uppercase">
                          {event.category}
                        </span>

                        <div>
                          <h4 className="font-sans font-bold text-base text-ink leading-tight truncate">
                            {event.title}
                          </h4>
                          <p className="text-xs text-mut mt-1">{event.subtitle || event.description}</p>
                        </div>

                        <div className="space-y-2 text-xs text-mut pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-mut2" />
                            <span>{formatDate(event.date)} at {event.openingTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-mut2" />
                            <span className="truncate">{event.venueName} ({event.area})</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t flex justify-between items-center text-xs">
                          <div>
                            <strong className="text-ink block font-sans">{plan?.name || 'Gate Admission'}</strong>
                            <span className="text-[10px] text-mut2 block">Qty: {b.quantity} Tickets</span>
                          </div>
                          <span className="font-black text-neon2">
                            {formatCurrency(b.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Ticket Right Side: Tear-off Stub with Reference & QR code */}
                      <div className="bg-abyss2/70 border-t sm:border-t-0 sm:border-l border-dashed border-edge p-5 flex flex-col justify-between items-center text-center sm:w-44 shrink-0">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-mut2 uppercase tracking-wider block">Reference Code</span>
                          <strong className="text-xs font-mono bg-abyss text-ink py-1 px-2 rounded-lg font-black block tracking-wider">
                            {b.bookingReference}
                          </strong>
                        </div>

                        {/* Status badge */}
                        <div className="my-4">
                          {b.status === 'Confirmed' ? (
                            <div className="flex flex-col items-center gap-1">
                              {/* Vector QR code mock */}
                              <div className="w-16 h-16 bg-panel border p-1 rounded-lg shadow-xs flex items-center justify-center">
                                <QrCode size={48} className="text-ink" />
                              </div>
                              <span className="text-[9px] font-bold text-neon2 flex items-center gap-0.5 mt-1.5">
                                <CheckCircle size={10} /> Paid & Confirmed
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-16 h-16 bg-panel border p-1 rounded-lg flex items-center justify-center opacity-40">
                                <Clock size={32} className="text-mut2" />
                              </div>
                              <span className="text-[9px] font-bold text-neon flex items-center gap-0.5 mt-1.5 animate-pulse">
                                <Clock size={10} /> Pending Verification
                              </span>
                              <span className="text-[8px] text-mut2 leading-none">Receipt sent on WhatsApp</span>
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] text-mut2 font-bold uppercase tracking-wider">Abuja Events Pass</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Previous Section */}
          {previousTickets.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-edge">
              <h3 className="font-sans font-bold text-sm text-mut2 uppercase tracking-wider">
                Previous Ticket History ({previousTickets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previousTickets.map((b) => {
                  const event = events.find((e) => e.id === b.eventId);
                  if (!event) return null;

                  return (
                    <div key={b.id} className="bg-abyss2/50 rounded-2xl p-4 border flex justify-between gap-4 items-center opacity-75">
                      <div>
                        <strong className="text-xs text-ink font-bold block truncate">{event.title}</strong>
                        <p className="text-[10px] text-mut2 mt-1">{formatDate(event.date)} • Ref: {b.bookingReference}</p>
                      </div>
                      <span className="text-xs font-bold text-mut bg-panel px-2.5 py-1 rounded-lg">Ended</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SAVED EVENTS TAB */}
      {activeTab === 'saved' && (
        <div className="bg-panel border border-edge rounded-2xl p-6 space-y-6">
          <div className="pb-3 border-b border-edge/50">
            <h4 className="font-sans font-bold text-base text-ink">Saved Events & Bookmarks</h4>
            <p className="text-xs text-mut mt-0.5">Quickly discover details for items you flagged "Interested"</p>
          </div>

          {savedEvents.length === 0 ? (
            <div className="text-center py-16 text-xs text-mut2 space-y-4">
              <span className="text-3xl block">❤️</span>
              <p>No saved events. Flag events as "Interested" to keep them here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {savedEvents.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onSelectEvent(e.id)}
                  className="group bg-abyss2/40 hover:bg-panel rounded-2xl border border-edge hover:border-edge overflow-hidden cursor-pointer transition-all"
                >
                  <div className="aspect-video relative overflow-hidden bg-panel">
                    <img src={e.flyerUrl || FALLBACK_FLYER} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-4 space-y-1.5">
                    <strong className="text-xs text-ink font-bold truncate block group-hover:text-neon transition-colors">{e.title}</strong>
                    <p className="text-[10px] text-mut2">{formatDate(e.date)} • {e.area}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleInterest(e.currentTarget.id);
                      }}
                      id={e.id}
                      className="text-[10px] text-danger font-bold pt-2 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      Remove Bookmark
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NOTIFS TAB */}
      {activeTab === 'notifs' && (
        <div className="bg-panel border border-edge rounded-2xl p-6 space-y-6">
          <div className="pb-3 border-b border-edge/50">
            <h4 className="font-sans font-bold text-base text-ink">Platform Activity Updates</h4>
            <p className="text-xs text-mut mt-0.5">Live status details regarding your purchases, ticket releases, and reminders</p>
          </div>

          {buyerNotifs.length === 0 ? (
            <div className="text-center py-12 text-xs text-mut2">
              No recent notifications.
            </div>
          ) : (
            <div className="space-y-3">
              {buyerNotifs.map((n) => (
                <div key={n.id} className="p-4 bg-abyss2/50 border border-edge rounded-2xl flex gap-3.5 items-start">
                  <span className="text-lg mt-0.5">🔔</span>
                  <div>
                    <h5 className="font-bold text-xs text-ink">{n.title}</h5>
                    <p className="text-xs text-mut mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[9px] text-mut2 mt-1.5 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT PROFILE TAB */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-panel border border-edge rounded-2xl p-6 space-y-5">
          <div className="pb-3 border-b border-edge/50">
            <h4 className="font-sans font-bold text-base text-ink">Personal Information Settings</h4>
            <p className="text-xs text-mut mt-0.5">Keep your details updated to expedite ticket purchases</p>
          </div>

          {saveSuccess && (
            <div className="bg-neon2/10 border border-neon2/30 text-neon2 text-xs rounded-xl p-3 font-bold">
              Profile settings updated successfully!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">Primary phone number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">Instagram Handle</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username"
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1">Facebook Handle</label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="fb.com/username"
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-navy hover:bg-navy text-ink font-semibold py-3 px-5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer mt-2"
          >
            Save Account Settings
          </button>
        </form>
      )}

    </div>
  );
}
