/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, Eye, Edit3, Plus, Trash2, Heart, Clock, CheckCircle, 
  Settings, User as UserIcon, LayoutDashboard, FileText, Bell, BarChart2 
} from 'lucide-react';
import { AbujaEvent, EventStatus, User } from '../types';
import { FALLBACK_FLYER } from '../utils';

interface OrganizerDashboardProps {
  organizer: User;
  events: AbujaEvent[];
  onAddNewEventTrigger: () => void;
  onSelectEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateProfile: (updated: User) => void;
}

export default function OrganizerDashboard({
  organizer,
  events,
  onAddNewEventTrigger,
  onSelectEvent,
  onDeleteEvent,
  onUpdateProfile,
}: OrganizerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'my-events' | 'profile'>('overview');
  
  // Profile Form States
  const [fullName, setFullName] = useState(organizer.fullName);
  const [phone, setPhone] = useState(organizer.phone);
  const [businessName, setBusinessName] = useState(organizer.businessName || '');
  const [brandLogo, setBrandLogo] = useState(organizer.brandLogo || '');
  const [businessAddress, setBusinessAddress] = useState(organizer.businessAddress || '');
  const [instagram, setInstagram] = useState(organizer.instagram || '');
  const [facebook, setFacebook] = useState(organizer.facebook || '');
  const [website, setWebsite] = useState(organizer.website || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const orgEvents = events.filter((e) => e.organizerId === organizer.id);
  const publishedEvents = orgEvents.filter((e) => e.status !== EventStatus.Draft);
  const draftEvents = orgEvents.filter((e) => e.status === EventStatus.Draft);

  // Compute analytics
  const totalInterests = orgEvents.reduce((acc, curr) => acc + (curr.interestedCount || 0), 0);
  const liveEventsCount = orgEvents.filter((e) => e.status === EventStatus.Live).length;
  const pendingApprovalsCount = orgEvents.filter((e) => e.status === EventStatus.PendingReview).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...organizer,
      fullName,
      phone,
      businessName,
      brandLogo,
      businessAddress,
      instagram,
      facebook,
      website,
    };
    onUpdateProfile(updatedUser);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case EventStatus.Draft:
        return <span className="bg-panel text-ink px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border">Draft</span>;
      case EventStatus.PendingReview:
        return <span className="bg-neon/15 text-neon px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-neon/30">Review Pending</span>;
      case EventStatus.Approved:
        return <span className="bg-neon/15 text-neon px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-neon/30">Approved</span>;
      case EventStatus.TicketingActive:
        return <span className="bg-neon2/15 text-neon2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-neon2/30">Ticketing Active</span>;
      case EventStatus.Live:
        return <span className="bg-danger/15 text-danger px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-danger/25 animate-pulse">Live</span>;
      case EventStatus.Archived:
        return <span className="bg-panel text-mut2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border">Archived</span>;
      default:
        return <span className="bg-panel text-ink px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Title banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-panel border border-edge p-6 rounded-3xl shadow-xs">
        <div>
          <h2 className="font-sans font-black text-2xl text-ink">
            Organizer Workspace
          </h2>
          <p className="text-xs text-mut mt-1">
            Welcome, <strong className="text-ink">{organizer.fullName}</strong> • Managing <strong>{organizer.businessName || 'Abuja Creative Agency'}</strong>
          </p>
        </div>

        <button
          onClick={onAddNewEventTrigger}
          className="bg-navy hover:bg-navy text-ink font-semibold py-3 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-neon/25 cursor-pointer transition-all"
        >
          <Plus size={16} /> Create Event
        </button>
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-edge">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3.5 px-6 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          <LayoutDashboard size={14} /> Dashboard Overview
        </button>
        <button
          onClick={() => setActiveTab('my-events')}
          className={`pb-3.5 px-6 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'my-events' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          <FileText size={14} /> My Events & Drafts ({orgEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3.5 px-6 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'profile' ? 'border-neon text-neon' : 'border-transparent text-mut2 hover:text-mut'
          }`}
        >
          <UserIcon size={14} /> Brand Profile
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-panel border border-edge p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-neon/10 text-neon rounded-xl">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-mut2 uppercase tracking-wider block">Total Events</span>
                <strong className="text-ink text-xl font-sans font-extrabold">{orgEvents.length}</strong>
              </div>
            </div>

            <div className="bg-panel border border-edge p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-danger/10 text-danger rounded-xl">
                <Heart size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-mut2 uppercase tracking-wider block">Total Interests</span>
                <strong className="text-ink text-xl font-sans font-extrabold">🔥 {totalInterests}</strong>
              </div>
            </div>

            <div className="bg-panel border border-edge p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-neon2/10 text-neon2 rounded-xl">
                <CheckCircle size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-mut2 uppercase tracking-wider block">Live Now</span>
                <strong className="text-ink text-xl font-sans font-extrabold">{liveEventsCount}</strong>
              </div>
            </div>

            <div className="bg-panel border border-edge p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-neon/10 text-neon rounded-xl">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-mut2 uppercase tracking-wider block">Reviews Pending</span>
                <strong className="text-ink text-xl font-sans font-extrabold">{pendingApprovalsCount}</strong>
              </div>
            </div>
          </div>

          {/* Quick lists */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Active/Published Events column */}
            <div className="md:col-span-2 bg-panel border border-edge rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-edge/50">
                <h4 className="font-sans font-bold text-sm text-ink">Recently Published Events</h4>
                <button onClick={() => setActiveTab('my-events')} className="text-[10px] font-bold text-neon hover:underline">View All</button>
              </div>

              {publishedEvents.length === 0 ? (
                <div className="text-center py-10 text-xs text-mut2">
                  No published events yet. Click Create Event to get started!
                </div>
              ) : (
                <div className="space-y-3.5">
                  {publishedEvents.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      onClick={() => onSelectEvent(e.id)}
                      className="flex items-center gap-4 p-3 rounded-xl border border-edge/70 hover:bg-abyss2/50 cursor-pointer transition-all"
                    >
                      <img src={e.flyerUrl || FALLBACK_FLYER} alt={e.title} className="w-12 h-12 rounded-lg object-cover bg-abyss2" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <strong className="text-xs text-ink block truncate font-sans font-semibold">{e.title}</strong>
                        <span className="text-[10px] text-mut2 mt-0.5 block">{e.date} • {e.venueName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-danger block">❤️ {e.interestedCount}</span>
                        <div className="mt-1">{getStatusBadge(e.status)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Drafts Column */}
            <div className="bg-panel border border-edge rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-edge/50">
                <h4 className="font-sans font-bold text-sm text-ink">Saved Drafts</h4>
                <button onClick={() => setActiveTab('my-events')} className="text-[10px] font-bold text-neon hover:underline">Manage</button>
              </div>

              {draftEvents.length === 0 ? (
                <div className="text-center py-10 text-xs text-mut2">
                  No saved drafts.
                </div>
              ) : (
                <div className="space-y-3">
                  {draftEvents.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      onClick={() => onSelectEvent(e.id)}
                      className="p-3 rounded-xl border border-dashed border-edge hover:bg-abyss2 cursor-pointer transition-colors"
                    >
                      <strong className="text-xs text-ink block truncate">{e.title || 'Untitled Draft'}</strong>
                      <span className="text-[10px] text-mut2 block mt-1">Created: {new Date(e.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MY EVENTS TAB */}
      {activeTab === 'my-events' && (
        <div className="bg-panel border border-edge rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-edge/50">
            <div>
              <h4 className="font-sans font-bold text-base text-ink">Event Catalog</h4>
              <p className="text-xs text-mut mt-0.5">Manage drafts, published items, and duplicate profiles</p>
            </div>
            <span className="text-xs bg-panel px-3 py-1 rounded-md text-mut font-bold">Total: {orgEvents.length} Events</span>
          </div>

          {orgEvents.length === 0 ? (
            <div className="text-center py-16 text-xs text-mut2 space-y-4">
              <span className="text-3xl block">📁</span>
              <p>You haven’t added any events to the Abuja Events platform yet.</p>
              <button
                onClick={onAddNewEventTrigger}
                className="bg-neon/10 hover:bg-neon/15 border border-neon/40 text-neon text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Launch Builder
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orgEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl border border-edge hover:border-edge hover:bg-abyss2/50 transition-all"
                >
                  <div className="flex gap-4 items-center flex-1 min-w-0" onClick={() => onSelectEvent(e.id)}>
                    <img src={e.flyerUrl || FALLBACK_FLYER} alt={e.title} className="w-14 h-14 rounded-xl object-cover bg-panel border shrink-0 cursor-pointer" referrerPolicy="no-referrer" />
                    <div className="min-w-0 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-ink truncate font-sans leading-tight block">{e.title || 'Untitled Event'}</strong>
                        {getStatusBadge(e.status)}
                      </div>
                      <p className="text-xs text-mut mt-1">{e.category} • {e.area}</p>
                      <p className="text-[10px] text-mut2 mt-0.5">Date Scheduled: {e.date} at {e.openingTime}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end pt-3 sm:pt-0 border-t sm:border-0 border-edge/50">
                    <button
                      onClick={() => onSelectEvent(e.id)}
                      className="p-2 bg-abyss2 hover:bg-panel border border-edge rounded-xl text-mut transition-colors"
                      title="View landing page"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => onDeleteEvent(e.id)}
                      className="p-2 bg-danger/10 hover:bg-danger/15 text-danger rounded-xl transition-colors"
                      title="Delete event"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BRAND PROFILE TAB */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-panel border border-edge rounded-2xl p-6 space-y-6">
          <div className="pb-3 border-b border-edge/50">
            <h4 className="font-sans font-bold text-base text-ink">Brand Profile Settings</h4>
            <p className="text-xs text-mut mt-0.5">Your brand details populate all landing page footer sections automatically</p>
          </div>

          {saveSuccess && (
            <div className="bg-neon2/10 border border-neon2/30 text-neon2 text-xs rounded-xl p-3.5 font-bold">
              Profile updated successfully! All newly created events will use these credentials.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Full Contact Person Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Business phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Business brand Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Brand Logo URL</label>
              <input
                type="url"
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Business Street Address</label>
              <input
                type="text"
                required
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Instagram Username</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@handle"
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Facebook URL</label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="fb.com/page"
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-1.5">Brand Website Link</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="brand.com"
                className="w-full bg-abyss2 border border-edge focus:bg-panel rounded-xl px-4 py-3 text-xs outline-hidden text-ink"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-navy hover:bg-navy text-ink font-semibold py-3.5 px-6 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            Save Profile Credentials
          </button>
        </form>
      )}

    </div>
  );
}
