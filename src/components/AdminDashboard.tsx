/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Calendar, CheckSquare, Plus, Trash2, Heart, Shield, 
  DollarSign, Clock, Check, X, Star, Settings, FileText, PlusCircle, Bookmark, Eye 
} from 'lucide-react';
import { AbujaEvent, EventStatus, TicketPlan, User, Booking, Notification } from '../types';
import { formatCurrency, FALLBACK_FLYER } from '../utils';

interface AdminDashboardProps {
  events: AbujaEvent[];
  users: User[];
  ticketPlans: TicketPlan[];
  bookings: Booking[];
  onApproveEvent: (eventId: string) => void;
  onRejectEvent: (eventId: string) => void;
  onToggleFeatureEvent: (eventId: string) => void;
  onToggleArchiveEvent: (eventId: string) => void;
  onAddTicketPlan: (plan: TicketPlan) => void;
  onDeleteTicketPlan: (planId: string) => void;
  onConfirmBooking: (bookingId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onUpdateEventStatus: (eventId: string, status: EventStatus) => void;
}

export default function AdminDashboard({
  events,
  users,
  ticketPlans,
  bookings,
  onApproveEvent,
  onRejectEvent,
  onToggleFeatureEvent,
  onToggleArchiveEvent,
  onAddTicketPlan,
  onDeleteTicketPlan,
  onConfirmBooking,
  onCancelBooking,
  onSelectEvent,
  onUpdateEventStatus,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'events' | 'ticketing' | 'bookings' | 'users'>('stats');

  // Selected Event for ticket plan setup
  const [ticketSetupEventId, setTicketSetupEventId] = useState<string>(events[0]?.id || '');
  
  // New ticket plan form state
  const [planName, setPlanName] = useState('Regular Entrance');
  const [planPrice, setPlanPrice] = useState(5000);
  const [planQty, setPlanQty] = useState(100);
  const [planLimit, setPlanLimit] = useState(5);
  const [planDesc, setPlanDesc] = useState('General Admission with free access to stalls.');
  const [planColor, setPlanColor] = useState('#48d8ff');

  // Computed metrics
  const organizers = users.filter((u) => u.role === 'Organizer');
  const buyers = users.filter((u) => u.role === 'Buyer');
  const activeEvents = events.filter((e) => e.status !== EventStatus.Draft && e.status !== EventStatus.Archived);
  const pendingApprovals = events.filter((e) => e.status === EventStatus.PendingReview);
  
  const totalSales = bookings
    .filter((b) => b.status === 'Confirmed')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const pendingPaymentsCount = bookings.filter((b) => b.status === 'Pending').length;

  const handleCreateTicketPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSetupEventId) return;

    const newPlan: TicketPlan = {
      id: `plan-${Date.now()}`,
      eventId: ticketSetupEventId,
      name: planName,
      price: planPrice,
      availableQuantity: planQty,
      maxPurchaseLimit: planLimit,
      description: planDesc,
      color: planColor,
      displayOrder: 1,
    };

    onAddTicketPlan(newPlan);
    
    // Automatically set event ticketing status to active!
    onUpdateEventStatus(ticketSetupEventId, EventStatus.TicketingActive);

    // Reset Form
    setPlanName('VIP Entrance');
    setPlanPrice(15000);
    setPlanDesc('Includes special seating and 1 free drink.');
    setPlanColor('#65f4c3');
  };

  const selectedEventPlans = ticketPlans.filter((p) => p.eventId === ticketSetupEventId);
  const targetEvent = events.find((e) => e.id === ticketSetupEventId);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Admin Title badge */}
      <div className="bg-abyss text-ink p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-neon text-ink text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            SYSTEM CONTROL CENTER
          </span>
          <h2 className="font-sans font-black text-2xl text-ink mt-2">
            Administrator Console
          </h2>
          <p className="text-xs text-mut mt-1">
            Abuja Events Platform Central Authority
          </p>
        </div>
        
        {/* Status indicator */}
        <div className="bg-abyss2 border border-edge px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 text-mut">
          <span className="w-2.5 h-2.5 rounded-full bg-neon2 animate-ping"></span>
          <span>System Active • Live Database Connected</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-edge">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stats' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          📈 Stats & Analytics
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'events' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          📂 Event Approvals {pendingApprovals.length > 0 && (
            <span className="bg-neon/15 text-neon text-[9px] px-2 py-0.5 rounded-full font-extrabold">{pendingApprovals.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ticketing')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'ticketing' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          🎟️ Ticket Activations
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'bookings' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          🏦 Payment Verifications {pendingPaymentsCount > 0 && (
            <span className="bg-danger/15 text-danger text-[9px] px-2 py-0.5 rounded-full font-extrabold">{pendingPaymentsCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          👥 User Directories
        </button>
      </div>

      {/* STATS PANEL */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-panel border border-edge p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-mut2 block uppercase tracking-wider mb-1">Total Sales</span>
              <strong className="text-ink text-2xl font-black font-mono">{formatCurrency(totalSales)}</strong>
            </div>
            <div className="bg-panel border border-edge p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-mut2 block uppercase tracking-wider mb-1">Registered Buyers</span>
              <strong className="text-ink text-2xl font-black font-mono">{buyers.length} Users</strong>
            </div>
            <div className="bg-panel border border-edge p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-mut2 block uppercase tracking-wider mb-1">Active Organizers</span>
              <strong className="text-ink text-2xl font-black font-mono">{organizers.length} Orgs</strong>
            </div>
            <div className="bg-panel border border-edge p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-mut2 block uppercase tracking-wider mb-1">Active Events</span>
              <strong className="text-ink text-2xl font-black font-mono">{activeEvents.length} listings</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick Action Alerts */}
            <div className="bg-panel border border-edge rounded-2xl p-5 space-y-4">
              <h3 className="font-sans font-bold text-sm text-ink pb-2 border-b border-edge/50">
                ⚠️ Platform Action Required
              </h3>

              <div className="space-y-3 text-xs">
                {pendingApprovals.length > 0 ? (
                  <div className="p-3 bg-neon/10 border border-neon/30 text-neon rounded-xl flex justify-between items-center">
                    <span><strong>{pendingApprovals.length} Event listings</strong> awaiting visual approval.</span>
                    <button onClick={() => setActiveTab('events')} className="bg-panel px-2.5 py-1 rounded-lg border font-bold text-[10px] hover:bg-neon/15 transition-colors">Review Now</button>
                  </div>
                ) : (
                  <div className="p-3 bg-neon2/10 text-neon2 rounded-xl">
                    ✓ All event submissions are reviewed and up to date.
                  </div>
                )}

                {pendingPaymentsCount > 0 ? (
                  <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded-xl flex justify-between items-center">
                    <span><strong>{pendingPaymentsCount} Ticket transfers</strong> awaiting bank verification.</span>
                    <button onClick={() => setActiveTab('bookings')} className="bg-panel px-2.5 py-1 rounded-lg border font-bold text-[10px] hover:bg-danger/15 transition-colors">Verify Now</button>
                  </div>
                ) : (
                  <div className="p-3 bg-neon2/10 text-neon2 rounded-xl">
                    ✓ No pending payments or ticket allocations.
                  </div>
                )}
              </div>
            </div>

            {/* Platform Settings details */}
            <div className="bg-panel border border-edge rounded-2xl p-5 text-xs text-mut leading-relaxed space-y-3">
              <h3 className="font-sans font-bold text-sm text-ink pb-2 border-b border-edge/50">
                🔒 System Administration Rules
              </h3>
              <p>
                <strong>Central Ticketing Guarantee:</strong> All payment requests are transferred directly to the Abuja Events system account (Zenith Bank PLC). After WhatsApp notification matching, confirm the booking to generate a unique booking reference.
              </p>
              <p>
                <strong>Quality Control:</strong> Organizers cannot publish ticket prices directly. Approved events must have ticket classes added by administrators to ensure anti-scam integrity.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* EVENT APPROVALS TAB */}
      {activeTab === 'events' && (
        <div className="bg-panel border border-edge rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-edge/50">
            <div>
              <h4 className="font-sans font-bold text-sm text-ink">Review Abuja Event Listings</h4>
              <p className="text-xs text-mut">Enable, reject, or archive active event pages</p>
            </div>
            <span className="text-xs bg-panel px-3 py-1 rounded-md text-mut font-bold">{events.length} listings</span>
          </div>

          <div className="space-y-4">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-2xl hover:bg-abyss2/50 transition-all"
              >
                <div className="flex gap-4 items-center flex-1 min-w-0">
                  <img src={e.flyerUrl || FALLBACK_FLYER} alt={e.title} className="w-12 h-12 rounded-xl object-cover border bg-abyss2" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-ink font-bold font-sans block truncate max-w-xs">{e.title}</strong>
                      <span className="text-[10px] bg-panel border text-mut px-2 py-0.5 rounded-full font-bold uppercase">{e.status}</span>
                      {e.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-neon/10 text-neon border border-neon/40 px-1.5 py-0.5 rounded-md font-bold">
                          ★ Featured
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-mut mt-1">{e.category} • {e.area} • Organized by: {e.organizerName}</p>
                    <p className="text-[10px] text-mut2 mt-0.5">Contact: {e.phone} | {e.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center justify-end self-stretch sm:self-auto pt-3 sm:pt-0 border-t sm:border-0 border-edge/50">
                  <button
                    onClick={() => onSelectEvent(e.id)}
                    className="p-2 bg-abyss2 hover:bg-panel border rounded-xl text-mut text-xs font-semibold flex items-center gap-1.5"
                    title="Preview Landing page"
                  >
                    <Eye size={14} /> Preview
                  </button>

                  {/* APPROVAL TOGGLES */}
                  {e.status === EventStatus.PendingReview && (
                    <>
                      <button
                        onClick={() => onApproveEvent(e.id)}
                        className="px-3 py-2 bg-neon2/10 hover:bg-neon2/15 text-neon2 rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => onRejectEvent(e.id)}
                        className="px-3 py-2 bg-danger/10 hover:bg-danger/15 text-danger rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}

                  {/* FEATURE ON HOMEPAGE */}
                  {(e.status === EventStatus.Approved || e.status === EventStatus.TicketingActive || e.status === EventStatus.Live) && (
                    <button
                      onClick={() => onToggleFeatureEvent(e.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${
                        e.isFeatured ? 'bg-neon/15 text-neon' : 'bg-abyss2 hover:bg-panel border'
                      }`}
                    >
                      <Star size={13} fill={e.isFeatured ? 'currentColor' : 'none'} />
                      {e.isFeatured ? 'Featured' : 'Feature'}
                    </button>
                  )}

                  {/* MANUAL ARCHIVE */}
                  {e.status !== EventStatus.Archived && (
                    <button
                      onClick={() => onToggleArchiveEvent(e.id)}
                      className="px-3 py-2 bg-panel hover:bg-panel2 text-mut rounded-xl text-xs font-semibold"
                    >
                      Archive Event
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TICKETING ACTIVATION TAB */}
      {activeTab === 'ticketing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of events to choose */}
          <div className="lg:col-span-1 bg-panel border border-edge rounded-2xl p-5 space-y-4">
            <h4 className="font-sans font-bold text-sm text-ink pb-2 border-b border-edge/50">
              Select Approved Event
            </h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {events
                .filter(e => e.status !== EventStatus.Draft && e.status !== EventStatus.Archived)
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setTicketSetupEventId(e.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      ticketSetupEventId === e.id
                        ? 'border-neon bg-neon/15 font-semibold'
                        : 'border-edge hover:bg-abyss2'
                    }`}
                  >
                    <strong className="text-xs text-ink block truncate">{e.title}</strong>
                    <span className="text-[10px] text-mut2 block mt-1 uppercase">{e.status} • {e.area}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Ticket Plan Manager form */}
          <div className="lg:col-span-2 space-y-6">
            {targetEvent ? (
              <div className="bg-panel border border-edge rounded-2xl p-6 space-y-6">
                <div className="pb-3 border-b border-edge/50 flex justify-between items-center">
                  <div>
                    <h4 className="font-sans font-bold text-base text-ink">
                      Configure Ticket Classes for "{targetEvent.title}"
                    </h4>
                    <p className="text-xs text-mut mt-0.5">Adding plans auto-activates landing page sales buttons</p>
                  </div>
                  <span className="text-xs bg-neon2/10 text-neon2 font-extrabold px-3 py-1 rounded-full uppercase">
                    {targetEvent.status}
                  </span>
                </div>

                {/* Existing plans list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-mut2 uppercase tracking-wider block">Existing Ticket Plans</span>
                  {selectedEventPlans.length === 0 ? (
                    <div className="text-center py-6 bg-abyss2/50 rounded-xl border border-dashed text-xs text-mut2">
                      No ticket plans configured. Added plans will automatically convert status to "Ticketing Active".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedEventPlans.map(plan => (
                        <div key={plan.id} className="border border-edge p-4 rounded-xl flex justify-between items-start bg-abyss2/50">
                          <div>
                            <strong className="text-xs font-bold text-ink block">{plan.name}</strong>
                            <p className="text-[10px] text-neon2 font-black mt-1">{formatCurrency(plan.price)} • Qty: {plan.availableQuantity}</p>
                          </div>
                          <button
                            onClick={() => onDeleteTicketPlan(plan.id)}
                            className="p-1.5 text-danger hover:bg-danger/10 rounded-lg"
                            title="Delete plan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ticket Form */}
                <form onSubmit={handleCreateTicketPlan} className="space-y-4 pt-4 border-t">
                  <span className="text-[10px] font-bold text-mut2 uppercase tracking-wider block">Add New Ticket Plan</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-mut uppercase block mb-1">Plan Class Name</label>
                      <input
                        type="text"
                        required
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="e.g. Regular Entry, VIP Pass, Couples Desks"
                        className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-3.5 py-2.5 text-xs text-ink"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-mut uppercase block mb-1">Ticket Price (₦)</label>
                      <input
                        type="number"
                        required
                        value={planPrice}
                        onChange={(e) => setPlanPrice(Number(e.target.value))}
                        className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-3.5 py-2.5 text-xs text-ink font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-mut uppercase block mb-1">Total Available Quantity</label>
                      <input
                        type="number"
                        required
                        value={planQty}
                        onChange={(e) => setPlanQty(Number(e.target.value))}
                        className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-3.5 py-2.5 text-xs text-ink font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-mut uppercase block mb-1">Max Buy Limit Per Order</label>
                      <input
                        type="number"
                        required
                        value={planLimit}
                        onChange={(e) => setPlanLimit(Number(e.target.value))}
                        className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-3.5 py-2.5 text-xs text-ink font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-mut uppercase block mb-1">Ticket Class Description</label>
                    <textarea
                      rows={2}
                      required
                      value={planDesc}
                      onChange={(e) => setPlanDesc(e.target.value)}
                      placeholder="What does this ticket grant access to?"
                      className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-3.5 py-2.5 text-xs text-ink resize-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-mut uppercase block mb-1">Badge Accent Color</label>
                      <div className="flex gap-2">
                        {['#48d8ff', '#65f4c3', '#9b8cff', '#ff6f91', '#f4c56a', '#38bdf8'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setPlanColor(color)}
                            className={`w-7 h-7 rounded-lg border transition-all ${
                              planColor === color ? 'ring-2 ring-neon scale-110' : 'opacity-85'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-abyss hover:bg-abyss2 text-ink font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle size={15} /> Save & Activate Ticket Class
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-panel border border-edge rounded-2xl p-10 text-center text-xs text-mut2">
                Select an active event from the list on the left to configure ticketing parameters.
              </div>
            )}
          </div>

        </div>
      )}

      {/* BOOKING VERIFICATION TAB */}
      {activeTab === 'bookings' && (
        <div className="bg-panel border border-edge rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-edge/50">
            <div>
              <h4 className="font-sans font-bold text-sm text-ink">Verify Bank Transfer Tickets</h4>
              <p className="text-xs text-mut">Crosscheck transfer receipts on WhatsApp and confirm booking codes</p>
            </div>
            <span className="text-xs bg-panel px-3 py-1 rounded-md text-mut font-bold">{bookings.length} Bookings</span>
          </div>

          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-10 text-xs text-mut2">
                No orders placed yet.
              </div>
            ) : (
              bookings.map((b) => {
                const associatedEvent = events.find((e) => e.id === b.eventId);
                const plan = ticketPlans.find((p) => p.id === b.ticketPlanId);

                return (
                  <div
                    key={b.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border rounded-2xl hover:bg-abyss2/50 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-mono font-black text-ink bg-abyss2 px-2 py-0.5 rounded-md">{b.bookingReference}</strong>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          b.status === 'Confirmed' ? 'bg-neon2/10 text-neon2 border-neon2/40' : 'bg-danger/10 text-danger border-danger/35'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      
                      <p className="text-xs text-ink font-semibold leading-tight">
                        {associatedEvent?.title || 'Unknown Event'} — {plan?.name || 'Standard Entrance'} ({b.quantity} Tickets)
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-mut pt-1.5 border-t border-edge/50">
                        <div>
                          <strong>Buyer:</strong> {b.customerDetails.fullName}
                        </div>
                        <div>
                          <strong>Phone:</strong> {b.customerDetails.phone}
                        </div>
                        <div>
                          <strong>Total Transfer:</strong> <span className="font-black text-neon2 text-xs font-mono">{formatCurrency(b.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end self-stretch md:self-auto pt-3 md:pt-0 border-t md:border-0 border-edge/50">
                      {b.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => onConfirmBooking(b.id)}
                            className="bg-neon2 hover:bg-neon2/80 text-ink font-bold px-3 py-2 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check size={14} /> Confirm Payment
                          </button>
                          <button
                            onClick={() => onCancelBooking(b.id)}
                            className="bg-danger/10 hover:bg-danger/15 text-danger font-bold px-3 py-2 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <X size={14} /> Decline
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-neon2 font-bold bg-neon2/10 px-3 py-1.5 border border-neon2/40 rounded-xl flex items-center gap-1 select-none">
                          ✓ Confirmed & Sent
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* USER DIRECTORIES TAB */}
      {activeTab === 'users' && (
        <div className="bg-panel border border-edge rounded-2xl p-5 space-y-4">
          <div className="pb-2 border-b border-edge/50">
            <h4 className="font-sans font-bold text-sm text-ink">User & Partner Database</h4>
            <p className="text-xs text-mut">Track and manage organizers and registered ticket buyers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Organizers */}
            <div className="border border-edge p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-neon bg-neon/10 px-2.5 py-1 rounded-md uppercase tracking-wider inline-block">Registered Organizers ({organizers.length})</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {organizers.map(u => (
                  <div key={u.id} className="p-3 border rounded-xl bg-abyss2/50 flex items-center gap-3">
                    <img src={u.brandLogo || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200'} alt="Logo" className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                    <div>
                      <strong className="text-xs text-ink block font-sans">{u.businessName || u.fullName}</strong>
                      <span className="text-[10px] text-mut block">{u.email} • {u.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyers */}
            <div className="border border-edge p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-neon bg-neon/10 px-2.5 py-1 rounded-md uppercase tracking-wider inline-block">Registered Ticket Buyers ({buyers.length})</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {buyers.map(u => (
                  <div key={u.id} className="p-3 border rounded-xl bg-abyss2/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neon/15 text-neon flex items-center justify-center font-bold text-sm shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-xs text-ink block font-sans">{u.fullName}</strong>
                      <span className="text-[10px] text-mut block">{u.email} • {u.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
