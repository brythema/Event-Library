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
import { formatCurrency } from '../utils';

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
  const [planColor, setPlanColor] = useState('#3B82F6');

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
    setPlanColor('#8B5CF6');
  };

  const selectedEventPlans = ticketPlans.filter((p) => p.eventId === ticketSetupEventId);
  const targetEvent = events.find((e) => e.id === ticketSetupEventId);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Admin Title badge */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-amber-500 text-gray-950 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            SYSTEM CONTROL CENTER
          </span>
          <h2 className="font-sans font-black text-2xl text-white mt-2">
            Administrator Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Abuja Events Platform Central Authority
          </p>
        </div>
        
        {/* Status indicator */}
        <div className="bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>System Active • Live Database Connected</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stats' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          📈 Stats & Analytics
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'events' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          📂 Event Approvals {pendingApprovals.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-extrabold">{pendingApprovals.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ticketing')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'ticketing' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          🎟️ Ticket Activations
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'bookings' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          🏦 Payment Verifications {pendingPaymentsCount > 0 && (
            <span className="bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded-full font-extrabold">{pendingPaymentsCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3.5 px-5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          👥 User Directories
        </button>
      </div>

      {/* STATS PANEL */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">Total Sales</span>
              <strong className="text-gray-900 text-2xl font-black font-mono">{formatCurrency(totalSales)}</strong>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">Registered Buyers</span>
              <strong className="text-gray-900 text-2xl font-black font-mono">{buyers.length} Users</strong>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">Active Organizers</span>
              <strong className="text-gray-900 text-2xl font-black font-mono">{organizers.length} Orgs</strong>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">Active Events</span>
              <strong className="text-gray-900 text-2xl font-black font-mono">{activeEvents.length} listings</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick Action Alerts */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
              <h3 className="font-sans font-bold text-sm text-gray-900 pb-2 border-b border-gray-50">
                ⚠️ Platform Action Required
              </h3>

              <div className="space-y-3 text-xs">
                {pendingApprovals.length > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl flex justify-between items-center">
                    <span><strong>{pendingApprovals.length} Event listings</strong> awaiting visual approval.</span>
                    <button onClick={() => setActiveTab('events')} className="bg-white px-2.5 py-1 rounded-lg border font-bold text-[10px] hover:bg-amber-100 transition-colors">Review Now</button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
                    ✓ All event submissions are reviewed and up to date.
                  </div>
                )}

                {pendingPaymentsCount > 0 ? (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl flex justify-between items-center">
                    <span><strong>{pendingPaymentsCount} Ticket transfers</strong> awaiting bank verification.</span>
                    <button onClick={() => setActiveTab('bookings')} className="bg-white px-2.5 py-1 rounded-lg border font-bold text-[10px] hover:bg-red-100 transition-colors">Verify Now</button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
                    ✓ No pending payments or ticket allocations.
                  </div>
                )}
              </div>
            </div>

            {/* Platform Settings details */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-xs text-gray-600 leading-relaxed space-y-3">
              <h3 className="font-sans font-bold text-sm text-gray-900 pb-2 border-b border-gray-50">
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
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-50">
            <div>
              <h4 className="font-sans font-bold text-sm text-gray-900">Review Abuja Event Listings</h4>
              <p className="text-xs text-gray-500">Enable, reject, or archive active event pages</p>
            </div>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-md text-gray-500 font-bold">{events.length} listings</span>
          </div>

          <div className="space-y-4">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-2xl hover:bg-gray-50/50 transition-all"
              >
                <div className="flex gap-4 items-center flex-1 min-w-0">
                  <img src={e.flyerUrl} alt={e.title} className="w-12 h-12 rounded-xl object-cover border bg-gray-50" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-gray-900 font-bold font-sans block truncate max-w-xs">{e.title}</strong>
                      <span className="text-[10px] bg-gray-100 border text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">{e.status}</span>
                      {e.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold">
                          ★ Featured
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{e.category} • {e.area} • Organized by: {e.organizerName}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Contact: {e.phone} | {e.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center justify-end self-stretch sm:self-auto pt-3 sm:pt-0 border-t sm:border-0 border-gray-50">
                  <button
                    onClick={() => onSelectEvent(e.id)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 border rounded-xl text-gray-600 text-xs font-semibold flex items-center gap-1.5"
                    title="Preview Landing page"
                  >
                    <Eye size={14} /> Preview
                  </button>

                  {/* APPROVAL TOGGLES */}
                  {e.status === EventStatus.PendingReview && (
                    <>
                      <button
                        onClick={() => onApproveEvent(e.id)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => onRejectEvent(e.id)}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1"
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
                        e.isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 hover:bg-gray-100 border'
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
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl text-xs font-semibold"
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
          <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
            <h4 className="font-sans font-bold text-sm text-gray-900 pb-2 border-b border-gray-50">
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
                        ? 'border-amber-600 bg-amber-50/20 font-semibold'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <strong className="text-xs text-gray-900 block truncate">{e.title}</strong>
                    <span className="text-[10px] text-gray-400 block mt-1 uppercase">{e.status} • {e.area}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Ticket Plan Manager form */}
          <div className="lg:col-span-2 space-y-6">
            {targetEvent ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6">
                <div className="pb-3 border-b border-gray-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-sans font-bold text-base text-gray-900">
                      Configure Ticket Classes for "{targetEvent.title}"
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">Adding plans auto-activates landing page sales buttons</p>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-full uppercase">
                    {targetEvent.status}
                  </span>
                </div>

                {/* Existing plans list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Existing Ticket Plans</span>
                  {selectedEventPlans.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed text-xs text-gray-400">
                      No ticket plans configured. Added plans will automatically convert status to "Ticketing Active".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedEventPlans.map(plan => (
                        <div key={plan.id} className="border border-gray-100 p-4 rounded-xl flex justify-between items-start bg-gray-50/50">
                          <div>
                            <strong className="text-xs font-bold text-gray-900 block">{plan.name}</strong>
                            <p className="text-[10px] text-emerald-700 font-black mt-1">{formatCurrency(plan.price)} • Qty: {plan.availableQuantity}</p>
                          </div>
                          <button
                            onClick={() => onDeleteTicketPlan(plan.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
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
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Add New Ticket Plan</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Plan Class Name</label>
                      <input
                        type="text"
                        required
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="e.g. Regular Entry, VIP Pass, Couples Desks"
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Ticket Price (₦)</label>
                      <input
                        type="number"
                        required
                        value={planPrice}
                        onChange={(e) => setPlanPrice(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Available Quantity</label>
                      <input
                        type="number"
                        required
                        value={planQty}
                        onChange={(e) => setPlanQty(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Max Buy Limit Per Order</label>
                      <input
                        type="number"
                        required
                        value={planLimit}
                        onChange={(e) => setPlanLimit(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Ticket Class Description</label>
                    <textarea
                      rows={2}
                      required
                      value={planDesc}
                      onChange={(e) => setPlanDesc(e.target.value)}
                      placeholder="What does this ticket grant access to?"
                      className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-gray-900 resize-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Badge Accent Color</label>
                      <div className="flex gap-2">
                        {['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#10B981'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setPlanColor(color)}
                            className={`w-7 h-7 rounded-lg border transition-all ${
                              planColor === color ? 'ring-2 ring-gray-900 scale-110' : 'opacity-85'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle size={15} /> Save & Activate Ticket Class
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-xs text-gray-400">
                Select an active event from the list on the left to configure ticketing parameters.
              </div>
            )}
          </div>

        </div>
      )}

      {/* BOOKING VERIFICATION TAB */}
      {activeTab === 'bookings' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-50">
            <div>
              <h4 className="font-sans font-bold text-sm text-gray-900">Verify Bank Transfer Tickets</h4>
              <p className="text-xs text-gray-500">Crosscheck transfer receipts on WhatsApp and confirm booking codes</p>
            </div>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-md text-gray-500 font-bold">{bookings.length} Bookings</span>
          </div>

          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400">
                No orders placed yet.
              </div>
            ) : (
              bookings.map((b) => {
                const associatedEvent = events.find((e) => e.id === b.eventId);
                const plan = ticketPlans.find((p) => p.id === b.ticketPlanId);

                return (
                  <div
                    key={b.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border rounded-2xl hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{b.bookingReference}</strong>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          b.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-800 font-semibold leading-tight">
                        {associatedEvent?.title || 'Unknown Event'} — {plan?.name || 'Standard Entrance'} ({b.quantity} Tickets)
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-gray-500 pt-1.5 border-t border-gray-50">
                        <div>
                          <strong>Buyer:</strong> {b.customerDetails.fullName}
                        </div>
                        <div>
                          <strong>Phone:</strong> {b.customerDetails.phone}
                        </div>
                        <div>
                          <strong>Total Transfer:</strong> <span className="font-black text-emerald-700 text-xs font-mono">{formatCurrency(b.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end self-stretch md:self-auto pt-3 md:pt-0 border-t md:border-0 border-gray-50">
                      {b.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => onConfirmBooking(b.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check size={14} /> Confirm Payment
                          </button>
                          <button
                            onClick={() => onCancelBooking(b.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-2 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <X size={14} /> Decline
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 border border-emerald-200 rounded-xl flex items-center gap-1 select-none">
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
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h4 className="font-sans font-bold text-sm text-gray-900">User & Partner Database</h4>
            <p className="text-xs text-gray-500">Track and manage organizers and registered ticket buyers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Organizers */}
            <div className="border border-gray-100 p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md uppercase tracking-wider inline-block">Registered Organizers ({organizers.length})</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {organizers.map(u => (
                  <div key={u.id} className="p-3 border rounded-xl bg-gray-50/50 flex items-center gap-3">
                    <img src={u.brandLogo || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200'} alt="Logo" className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                    <div>
                      <strong className="text-xs text-gray-900 block font-sans">{u.businessName || u.fullName}</strong>
                      <span className="text-[10px] text-gray-500 block">{u.email} • {u.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyers */}
            <div className="border border-gray-100 p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider inline-block">Registered Ticket Buyers ({buyers.length})</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {buyers.map(u => (
                  <div key={u.id} className="p-3 border rounded-xl bg-gray-50/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-xs text-gray-900 block font-sans">{u.fullName}</strong>
                      <span className="text-[10px] text-gray-500 block">{u.email} • {u.phone}</span>
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
