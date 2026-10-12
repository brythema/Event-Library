/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, SlidersHorizontal, MapPin, Tag, Calendar, Heart, Share2,
  Clock, Sparkles, Phone, Mail, Instagram, Facebook, Globe, MessageCircle, X
} from 'lucide-react';

import { AbujaEvent, EventStatus, TicketPlan, User, Booking, Notification, DiscoveredEvent } from './types';
import { ABUJA_AREAS, EVENT_CATEGORIES } from './initialData';
import { isToday, isTomorrow, isThisWeekend, isUpcoming, formatCurrency, getDistanceInKm, AREA_COORDINATES, nearestArea } from './utils';
import { onAuthUser, signOut as signOutUser } from './services/auth';
import {
  subscribeEvents, subscribeTicketPlans, subscribeBookings, subscribeNotifications, subscribeUsers,
  saveEvent as dbSaveEvent, deleteEvent as dbDeleteEvent, setEventStatus, setEventFeatured,
  addTicketPlan as dbAddTicketPlan, deleteTicketPlan as dbDeleteTicketPlan,
  confirmBooking as dbConfirmBooking, cancelBooking as dbCancelBooking,
  updateProfile as dbUpdateProfile, toggleBookmark as dbToggleBookmark,
} from './services/db';
import { bookTickets } from './services/bookings';

// Import custom high-fidelity components
import Header from './components/Header';
import EventCard from './components/EventCard';
import EventLandingPage from './components/EventLandingPage';
import CreateEventWizard from './components/CreateEventWizard';
import OrganizerDashboard from './components/OrganizerDashboard';
import AdminDashboard from './components/AdminDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import AuthModal from './components/AuthModal';
import DiscoveredCard from './components/DiscoveredCard';
import { discoverWebEvents } from './services/discover';

export default function App() {
  // Core Application State
  const [view, setView] = useState<'home' | 'create-event' | 'organizer-dashboard' | 'buyer-dashboard' | 'admin-dashboard' | 'about'>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const [events, setEvents] = useState<AbujaEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ticketPlans, setTicketPlans] = useState<TicketPlan[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPriceType, setSelectedPriceType] = useState<'All' | 'Free' | 'Paid'>('All');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening'>('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Location-awareness states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [discoveredEvents, setDiscoveredEvents] = useState<DiscoveredEvent[]>([]);
  const [discoveredArea, setDiscoveredArea] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Authentication Modal Trigger State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'Buyer' | 'Organizer'>('Buyer');

  // Bookmarks State (Saved events for buyer) — lives on the profile document

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Live subscriptions: identity first, then role-scoped data channels.
  useEffect(() => {
    const unsub = onAuthUser((user) => setCurrentUser(user));
    return unsub;
  }, []);

  useEffect(() => {
    const onDataError = (e: Error) => triggerToast(`Data issue: ${e.message}`, 'error');
    const unsubs: Array<() => void> = [
      subscribeTicketPlans(setTicketPlans, onDataError),
      subscribeEvents(currentUser, setEvents, onDataError),
      subscribeBookings(currentUser, setBookings, onDataError),
      subscribeNotifications(currentUser, setNotifications, onDataError),
      subscribeUsers(currentUser, setUsers, onDataError),
    ];
    const settle = setTimeout(() => setIsDataLoading(false), 800);
    return () => { unsubs.forEach((u) => u()); clearTimeout(settle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* Run one async mutation with toast feedback; errors surface verbatim. */
  const runMutation = async (action: () => Promise<void>, successMessage: string, opts: { silent?: boolean } = {}) => {
    try {
      await action();
      if (!opts.silent) triggerToast(successMessage);
    } catch (error) {
      triggerToast((error as Error).message || 'Something went wrong.', 'error');
    }
  };

  // Bookmarks come straight from the live profile document.
  const savedEventIds = currentUser?.savedEventIds || [];

  // Bookmark Toggle
  const handleToggleInterest = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isBookmarked = savedEventIds.includes(eventId);
    if (!currentUser) {
      setAuthModalTab('Buyer');
      setIsAuthModalOpen(true);
      return;
    }
    runMutation(
      () => dbToggleBookmark(eventId, isBookmarked),
      isBookmarked ? 'Removed event from interest list' : 'Marked as Interested! Added to profile portal.',
      { silent: isBookmarked }
    );
  };

  // Auth Modal Callback — the subscription has/will pick up the identity;
  // this only routes the fresh user to the right dashboard.
  const handleAuthSuccess = (loggedInUser: User) => {
    triggerToast(`Logged in successfully as ${loggedInUser.fullName || loggedInUser.email}!`, 'success');
    if (loggedInUser.role === 'Admin') {
      setView('admin-dashboard');
    } else if (loggedInUser.role === 'Organizer') {
      setView('organizer-dashboard');
    } else {
      setView('buyer-dashboard');
    }
  };

  // Logout Call
  const handleLogout = async () => {
    await signOutUser();
    triggerToast('Logged out successfully', 'info');
    setView('home');
    setSelectedEventId(null);
  };

  // Event deletion (Organizer dashboard action). Events with live ticket
  // plans must be cleared by the admin first — plans are admin-owned.
  const handleDeleteEvent = (eventId: string) => {
    if (ticketPlans.some(p => p.eventId === eventId)) {
      triggerToast('This event has ticket classes. Ask the admin to remove them first.', 'error');
      return;
    }
    runMutation(() => dbDeleteEvent(eventId), 'Event deleted successfully');
  };

  // Add new event from Wizard
  const handleAddNewEvent = (newEvent: AbujaEvent) => {
    runMutation(async () => {
      await dbSaveEvent(newEvent, true);
      setView('organizer-dashboard');
    }, newEvent.status === EventStatus.Draft ? 'Draft saved!' : 'Event submitted for review!');
  };

  // Admin approval flow
  const handleApproveEvent = (eventId: string) => {
    const target = events.find(e => e.id === eventId);
    if (!target) return;
    runMutation(
      () => setEventStatus(eventId, EventStatus.Approved, {
        userId: target.organizerId,
        title: 'Event Approved!',
        message: `Your event "${target.title}" was approved by Admin. Please reach out to activate ticketing classes.`,
        type: 'success',
      }),
      `Approved "${target.title}" successfully!`
    );
  };

  const handleRejectEvent = (eventId: string) => {
    const target = events.find(e => e.id === eventId);
    if (!target) return;
    runMutation(
      () => setEventStatus(eventId, EventStatus.Draft, {
        userId: target.organizerId,
        title: 'Submission Declined',
        message: `Your event "${target.title}" was declined by Admin. Please review guideline rules and re-publish.`,
        type: 'warning',
      }),
      `Declined "${target.title}" submission.`
    );
  };

  const handleToggleFeatureEvent = (eventId: string) => {
    const target = events.find(e => e.id === eventId);
    if (!target) return;
    runMutation(() => setEventFeatured(eventId, !target.isFeatured), 'Homepage features updated!');
  };

  const handleToggleArchiveEvent = (eventId: string) => {
    runMutation(
      () => setEventStatus(eventId, EventStatus.Archived),
      'Event moved to archives.'
    );
  };

  // Ticketing activated and setup (Admin adds plans)
  const handleAddTicketPlan = (plan: TicketPlan) => {
    const eventObj = events.find(e => e.id === plan.eventId);
    if (!eventObj) {
      triggerToast('Event not found for this ticket plan.', 'error');
      return;
    }
    runMutation(() => dbAddTicketPlan(plan, eventObj), `Ticket Plan "${plan.name}" added successfully.`);
  };

  const handleDeleteTicketPlan = (planId: string) => {
    runMutation(() => dbDeleteTicketPlan(planId), 'Ticket plan removed');
  };

  const handleUpdateEventStatus = (eventId: string, status: EventStatus) => {
    runMutation(() => setEventStatus(eventId, status), '', { silent: true });
  };

  // Booking updates (Admin verify payment). Declining restocks the tickets.
  const handleConfirmBooking = (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    runMutation(
      () => dbConfirmBooking(target),
      `Verified payment for reference: ${target.bookingReference}`
    );
  };

  const handleCancelBooking = (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const plan = ticketPlans.find(p => p.id === target.ticketPlanId);
    runMutation(
      () => dbCancelBooking(target, plan),
      `Declined reference ${target.bookingReference}`
    );
  };

  // Buyer booking from the landing page — server-side transaction.
  const handleBookTickets = async (plan: TicketPlan, quantity: number): Promise<{ ok: boolean; error?: string; booking?: Booking }> => {
    if (!currentUser) {
      setAuthModalTab('Buyer');
      setIsAuthModalOpen(true);
      return { ok: false, error: 'Please sign in to book tickets.' };
    }
    if (!selectedEventId) return { ok: false, error: 'No event selected.' };
    try {
      const booking = await bookTickets(selectedEventId, plan.id, quantity);
      triggerToast('Order generated! Redirecting to WhatsApp for bank confirmation...');
      return { ok: true, booking };
    } catch (error) {
      triggerToast((error as Error).message, 'error');
      return { ok: false, error: (error as Error).message };
    }
  };

  // Profile updates (Organizer or Buyer)
  const handleUpdateUserProfile = (updatedUser: User) => {
    runMutation(() => dbUpdateProfile(updatedUser), 'Profile updated successfully!');
  };

  // Location-awareness triggers and calculations
  /* Web discovery runs against the resolved area and is fully non-fatal:
     the verified in-house listing is the product, web results are a bonus. */
  const runDiscovery = async (area: string) => {
    setDiscoveredArea(area);
    setIsDiscovering(true);
    try {
      const results = await discoverWebEvents(area);
      setDiscoveredEvents(results);
    } catch (error) {
      setDiscoveredEvents([]);
      triggerToast((error as Error).message || 'The web search is unavailable right now.', 'info');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleFindNearMe = () => {
    if (isNearMeActive) {
      setIsNearMeActive(false);
      setUserLocation(null);
      setDiscoveredEvents([]);
      triggerToast('Location awareness deactivated.', 'info');
      return;
    }

    triggerToast('Requesting your coordinates...', 'info');
    const activate = (lat: number, lng: number, note: string) => {
      setUserLocation({ lat, lng });
      setIsNearMeActive(true);
      const resolved = nearestArea(lat, lng);
      triggerToast(`📍 ${note} Sorted closest to farthest — searching the web around ${resolved.area}…`, 'success');
      runDiscovery(resolved.area);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => activate(position.coords.latitude, position.coords.longitude, 'Location access granted!'),
        (error) => {
          console.warn('Geolocation error:', error);
          // Fallback: Using Abuja Central Business District as central coordinates
          activate(9.0556, 7.4917, 'Geolocation blocked — using Abuja CBD.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      activate(9.0556, 7.4917, 'Geolocation not supported — using Abuja CBD.');
    }
  };

  const getEventDistance = (e: AbujaEvent) => {
    if (!userLocation) return undefined;
    const lat1 = userLocation.lat;
    const lng1 = userLocation.lng;
    const lat2 = e.latitude !== undefined ? e.latitude : (AREA_COORDINATES[e.area]?.lat || 9.0778);
    const lng2 = e.longitude !== undefined ? e.longitude : (AREA_COORDINATES[e.area]?.lng || 7.4786);
    return getDistanceInKm(lat1, lng1, lat2, lng2);
  };

  // Filtering calculations
  const getLowestPriceForEvent = (eventId: string) => {
    const plans = ticketPlans.filter(p => p.eventId === eventId);
    if (plans.length === 0) return undefined;
    return Math.min(...plans.map(p => p.price));
  };

  const filteredEvents = events.filter((e) => {
    // 1. Hide drafts and archived events from non-organizer, non-admin views
    const isSpecialRole = currentUser?.role === 'Admin' || (currentUser?.role === 'Organizer' && e.organizerId === currentUser.id);
    if (!isSpecialRole && (e.status === EventStatus.Draft || e.status === EventStatus.Archived)) {
      return false;
    }

    // 2. Search query check
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchSub = e.subtitle.toLowerCase().includes(q);
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchCat = e.category.toLowerCase().includes(q);
      const matchVenue = e.venueName.toLowerCase().includes(q);
      const matchArea = e.area.toLowerCase().includes(q);
      const matchTags = e.tags && e.tags.some(t => t.toLowerCase().includes(q));
      
      if (!matchTitle && !matchSub && !matchDesc && !matchCat && !matchVenue && !matchArea && !matchTags) {
        return false;
      }
    }

    // 3. Category match
    if (selectedCategory !== 'All' && e.category !== selectedCategory) {
      return false;
    }

    // 4. Area match
    if (selectedArea !== 'All' && e.area !== selectedArea) {
      return false;
    }

    // 5. Date match
    if (selectedDate && e.date !== selectedDate) {
      return false;
    }

    // 6. Price Type Match (Free vs Paid)
    if (selectedPriceType !== 'All') {
      const plans = ticketPlans.filter(p => p.eventId === e.id);
      const isPaid = plans.length > 0 && plans.some(p => p.price > 0);
      
      if (selectedPriceType === 'Free' && isPaid) return false;
      if (selectedPriceType === 'Paid' && !isPaid) return false;
    }

    // 7. Time of Day Match
    if (selectedTimeOfDay !== 'All' && e.openingTime) {
      const hour = parseInt(e.openingTime.split(':')[0], 10);
      if (selectedTimeOfDay === 'Morning' && (hour < 5 || hour >= 12)) return false;
      if (selectedTimeOfDay === 'Afternoon' && (hour < 12 || hour >= 17)) return false;
      if (selectedTimeOfDay === 'Evening' && (hour < 17 && hour >= 5)) return false;
    }

    return true;
  });

  const sortEventsByDistance = (list: AbujaEvent[]) => {
    if (!isNearMeActive || !userLocation) return list;
    return [...list].sort((a, b) => {
      const distA = getEventDistance(a) || 999999;
      const distB = getEventDistance(b) || 999999;
      return distA - distB;
    });
  };

  const displayFilteredEvents = sortEventsByDistance(filteredEvents);
  const featuredList = sortEventsByDistance(filteredEvents.filter((e) => e.isFeatured));
  const todaysList = sortEventsByDistance(filteredEvents.filter((e) => isToday(e.date)));
  const tomorrowsList = sortEventsByDistance(filteredEvents.filter((e) => isTomorrow(e.date)));
  const weekendsList = sortEventsByDistance(filteredEvents.filter((e) => isThisWeekend(e.date)));
  const upcomingList = sortEventsByDistance(filteredEvents.filter((e) => isUpcoming(e.date)));
  const recentlyAddedList = isNearMeActive 
    ? sortEventsByDistance(filteredEvents)
    : [...filteredEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedArea('All');
    setSelectedDate('');
    setSelectedPriceType('All');
    setSelectedTimeOfDay('All');
    setShowAdvancedFilters(false);
  };

  const isFiltersActive = 
    searchQuery.trim() !== '' || 
    selectedCategory !== 'All' || 
    selectedArea !== 'All' || 
    selectedDate !== '' || 
    selectedPriceType !== 'All' || 
    selectedTimeOfDay !== 'All';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-950 text-emerald-100 border-emerald-800' :
          toast.type === 'error' ? 'bg-red-950 text-red-100 border-red-800' : 'bg-slate-900 text-slate-100 border-slate-800'
        }`}>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Primary Sticky Header */}
      <Header
        currentUser={currentUser}
        activeView={view}
        onNavigate={(target) => {
          setView(target);
          setSelectedEventId(null);
        }}
        onAuthTrigger={(role) => {
          setAuthModalTab(role);
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* LANDING PAGE ROUTE */}
        {selectedEventId ? (
          (() => {
            const ev = events.find(e => e.id === selectedEventId);
            if (!ev) return <p className="text-center py-10 text-xs">Event not found.</p>;
            return (
              <EventLandingPage
                event={ev}
                ticketPlans={ticketPlans.filter(p => p.eventId === ev.id)}
                relatedEvents={events.filter(e => e.category === ev.category && e.id !== ev.id)}
                currentUser={currentUser}
                isInterested={savedEventIds.includes(ev.id)}
                onToggleInterest={handleToggleInterest}
                onBack={() => setSelectedEventId(null)}
                onSelectEvent={(id) => setSelectedEventId(id)}
                onLoginTrigger={() => {
                  setAuthModalTab('Buyer');
                  setIsAuthModalOpen(true);
                }}
                onBook={handleBookTickets}
              />
            );
          })()
        ) : (
          <>
            {/* VIEW: HOME */}
            {view === 'home' && (
              <div className="space-y-12">
                
                {/* HERO SEARCH & FILTERS PANEL */}
                <div className="relative rounded-3xl bg-amber-600 p-6 sm:p-10 text-white overflow-hidden shadow-xl shadow-amber-600/10">
                  {/* Subtle graphical background accents */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                  
                  <div className="relative z-10 max-w-2xl space-y-4">
                    <span className="text-[10px] font-extrabold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
                      Abuja Event Magazine Hub
                    </span>
                    <h2 className="font-sans font-black text-2xl sm:text-4xl tracking-tight leading-tight">
                      Find spectacular happenings in Abuja.
                    </h2>
                    <p className="text-amber-100 text-xs sm:text-sm">
                      Centralized discovery platform verified by city authorities. Search events, dates, areas, and ticket classes seamlessly.
                    </p>

                    {/* Integrated search form */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search title, tags, description, venue, or organizer..."
                          className="w-full bg-white text-gray-900 placeholder:text-gray-400 rounded-xl pl-11 pr-4 py-3.5 text-xs outline-hidden shadow-xs border-0 focus:ring-2 focus:ring-amber-500 font-semibold"
                        />
                      </div>
                      
                      <button
                        onClick={handleFindNearMe}
                        className={`px-4 py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                          isNearMeActive ? 'bg-emerald-800 text-white animate-pulse' : 'bg-white text-amber-900 hover:bg-amber-50'
                        }`}
                      >
                        <MapPin size={14} /> {isNearMeActive ? '📍 Location Active' : '📍 Near Me'}
                      </button>

                      <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`px-4 py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                          showAdvancedFilters || isFiltersActive ? 'bg-amber-950 text-white' : 'bg-white/15 text-white hover:bg-white/20'
                        }`}
                      >
                        <SlidersHorizontal size={14} /> Filter Settings
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Advanced Filter Drawer */}
                  {(showAdvancedFilters || isFiltersActive) && (
                    <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                      {/* Category select */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-100 uppercase block mb-1.5">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-white/15 hover:bg-white/25 border-0 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-hidden cursor-pointer"
                        >
                          <option value="All" className="text-gray-900">All Categories</option>
                          {EVENT_CATEGORIES.map(c => (
                            <option key={c} value={c} className="text-gray-900">{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* District Area select */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-100 uppercase block mb-1.5">Abuja District</label>
                        <select
                          value={selectedArea}
                          onChange={(e) => setSelectedArea(e.target.value)}
                          className="w-full bg-white/15 hover:bg-white/25 border-0 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-hidden cursor-pointer"
                        >
                          <option value="All" className="text-gray-900">All Districts</option>
                          {ABUJA_AREAS.map(a => (
                            <option key={a} value={a} className="text-gray-900">{a}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date selection */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-100 uppercase block mb-1.5">Event Date</label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full bg-white/15 hover:bg-white/25 border-0 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-hidden cursor-pointer placeholder-white"
                        />
                      </div>

                      {/* Paid vs Free selection */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-100 uppercase block mb-1.5">Ticket Pricing</label>
                        <select
                          value={selectedPriceType}
                          onChange={(e) => setSelectedPriceType(e.target.value as any)}
                          className="w-full bg-white/15 hover:bg-white/25 border-0 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-hidden cursor-pointer"
                        >
                          <option value="All" className="text-gray-900">All Price Types</option>
                          <option value="Free" className="text-gray-900">Free Events</option>
                          <option value="Paid" className="text-gray-900">Paid Ticket Plans</option>
                        </select>
                      </div>

                      {/* Time of Day selection */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-100 uppercase block mb-1.5">Time of Day</label>
                        <select
                          value={selectedTimeOfDay}
                          onChange={(e) => setSelectedTimeOfDay(e.target.value as any)}
                          className="w-full bg-white/15 hover:bg-white/25 border-0 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-hidden cursor-pointer"
                        >
                          <option value="All" className="text-gray-900">Any Time</option>
                          <option value="Morning" className="text-gray-900">Morning (05:00 - 12:00)</option>
                          <option value="Afternoon" className="text-gray-900">Afternoon (12:00 - 17:00)</option>
                          <option value="Evening" className="text-gray-900">Evening (17:00 - 05:00)</option>
                        </select>
                      </div>

                      {/* Clear Button */}
                      <div className="sm:col-span-4 flex justify-end gap-2 border-t border-white/10 pt-4 mt-1">
                        <button
                          onClick={handleClearFilters}
                          className="px-4 py-2 bg-amber-950 hover:bg-amber-900 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer text-white"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isNearMeActive && userLocation && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📍</span>
                      <div>
                        <p className="text-xs font-black text-emerald-900">Location Discovery Active</p>
                        <p className="text-[11px] text-emerald-700">
                          Verified events are sorted by proximity to your coordinates, and the web around <strong>{discoveredArea || 'your area'}</strong> is being scanned below. Highlighted distances show how close events are to you.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsNearMeActive(false);
                        setUserLocation(null);
                        setDiscoveredEvents([]);
                        triggerToast('Location awareness deactivated.', 'info');
                      }}
                      className="text-xs font-extrabold text-emerald-800 hover:text-emerald-950 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-xl whitespace-nowrap cursor-pointer"
                    >
                      Disable Proximity Sort
                    </button>
                  </div>
                )}

                {/* DYNAMIC RESULTS VIEW VS GENERAL MAGAZINE */}
                {isFiltersActive ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="font-sans font-black text-xl text-gray-900">Search & Filter Results</h3>
                        <p className="text-xs text-gray-500 mt-1">Found <strong>{filteredEvents.length} events</strong> based on active filters.</p>
                      </div>
                      <button
                        onClick={handleClearFilters}
                        className="text-xs text-amber-600 hover:text-amber-800 font-bold"
                      >
                        Reset filters
                      </button>
                    </div>

                    {displayFilteredEvents.length === 0 ? (
                      <div className="text-center py-20 bg-white border rounded-3xl space-y-4">
                        <span className="text-4xl block">🔍</span>
                        <h4 className="font-bold text-gray-800">No events found matching filters</h4>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">Try widening your search terms, removing dates, or expanding district boundaries.</p>
                        <button onClick={handleClearFilters} className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2 rounded-xl">Clear filters</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {displayFilteredEvents.map((e) => (
                          <EventCard
                            key={e.id}
                            event={e}
                            lowestPrice={getLowestPriceForEvent(e.id)}
                            onSelect={(id) => setSelectedEventId(id)}
                            onToggleInterest={handleToggleInterest}
                            isInterested={savedEventIds.includes(e.id)}
                            distance={getEventDistance(e)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // STANDARD GORGEOUS MAGAZINE LAYOUT (Horizontal Scrolls)
                  <div className="space-y-12">
                    
                    {/* FEATURED EVENTS */}
                    {featuredList.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-sans font-black text-xl text-gray-950 flex items-center gap-1.5">
                              ⭐ Featured Spotlights
                            </h3>
                            <p className="text-xs text-gray-500">Premium city experiences selected by administrators</p>
                          </div>
                        </div>

                        {/* Horizontal Scroll wrapper */}
                        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-none snap-x select-none">
                          {featuredList.map((e) => (
                            <div key={e.id} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start shrink-0">
                              <EventCard
                                event={e}
                                lowestPrice={getLowestPriceForEvent(e.id)}
                                onSelect={(id) => setSelectedEventId(id)}
                                onToggleInterest={handleToggleInterest}
                                isInterested={savedEventIds.includes(e.id)}
                                distance={getEventDistance(e)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TODAY'S EVENTS */}
                    {todaysList.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-sans font-black text-xl text-gray-950 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                            Happening Today
                          </h3>
                          <p className="text-xs text-gray-500">Events scheduled for today, {new Date().toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>

                        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-none snap-x select-none">
                          {todaysList.map((e) => (
                            <div key={e.id} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start shrink-0">
                              <EventCard
                                event={e}
                                lowestPrice={getLowestPriceForEvent(e.id)}
                                onSelect={(id) => setSelectedEventId(id)}
                                onToggleInterest={handleToggleInterest}
                                isInterested={savedEventIds.includes(e.id)}
                                distance={getEventDistance(e)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TOMORROW'S EVENTS */}
                    {tomorrowsList.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-sans font-black text-xl text-gray-950">
                            Tomorrow's Agenda
                          </h3>
                          <p className="text-xs text-gray-500">Clear your schedules for tomorrow's verified line-up</p>
                        </div>

                        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-none snap-x select-none">
                          {tomorrowsList.map((e) => (
                            <div key={e.id} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start shrink-0">
                              <EventCard
                                event={e}
                                lowestPrice={getLowestPriceForEvent(e.id)}
                                onSelect={(id) => setSelectedEventId(id)}
                                onToggleInterest={handleToggleInterest}
                                isInterested={savedEventIds.includes(e.id)}
                                distance={getEventDistance(e)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* WEEKEND EVENTS */}
                    {weekendsList.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-sans font-black text-xl text-gray-950">
                            Weekend Planners
                          </h3>
                          <p className="text-xs text-gray-500">Upcoming weekend events (Fri July 10 to Sun July 12)</p>
                        </div>

                        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-none snap-x select-none">
                          {weekendsList.map((e) => (
                            <div key={e.id} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start shrink-0">
                              <EventCard
                                event={e}
                                lowestPrice={getLowestPriceForEvent(e.id)}
                                onSelect={(id) => setSelectedEventId(id)}
                                onToggleInterest={handleToggleInterest}
                                isInterested={savedEventIds.includes(e.id)}
                                distance={getEventDistance(e)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* RECENTLY ADDED */}
                    {recentlyAddedList.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-sans font-black text-xl text-gray-950">
                            Recently Added listings
                          </h3>
                          <p className="text-xs text-gray-500">Be the first to secure early bird slots for newly announced items</p>
                        </div>

                        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-none snap-x select-none">
                          {recentlyAddedList.slice(0, 6).map((e) => (
                            <div key={e.id} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start shrink-0">
                              <EventCard
                                event={e}
                                lowestPrice={getLowestPriceForEvent(e.id)}
                                onSelect={(id) => setSelectedEventId(id)}
                                onToggleInterest={handleToggleInterest}
                                isInterested={savedEventIds.includes(e.id)}
                                distance={getEventDistance(e)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* FOUND ON THE WEB — discovery runs only inside Near Me.
                        Verified in-house listings above always come first;
                        web finds are clearly UNVERIFIED and link to sources. */}
                    {isNearMeActive && (
                      <div className="space-y-4 border-t border-gray-100 pt-8">
                        <div>
                          <h3 className="font-sans font-black text-xl text-gray-950 flex items-center gap-2">
                            🌐 Found on the web
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-amber-200">
                              Unverified
                            </span>
                          </h3>
                          <p className="text-xs text-gray-500">
                            {isDiscovering
                              ? `Searching public event pages around ${discoveredArea || 'your area'}…`
                              : discoveredEvents.length > 0
                                ? `Web-sourced happenings around ${discoveredArea}. These come straight from the internet — the platform has not verified them.`
                                : `No public web listings surfaced for ${discoveredArea || 'your area'} right now. Verified listings above are the ones we can vouch for.`}
                          </p>
                        </div>

                        {isDiscovering ? (
                          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                            <span className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                            <p className="text-xs text-gray-500 mt-3">Scanning ticketing platforms, venue pages and public listings…</p>
                          </div>
                        ) : discoveredEvents.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {discoveredEvents.map((item) => (
                              <DiscoveredCard
                                key={item.id}
                                item={item}
                                onListIt={() => {
                                  setAuthModalTab('Organizer');
                                  setIsAuthModalOpen(true);
                                }}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* BROWSE BY CATEGORY */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 space-y-6">
                      <div>
                        <h4 className="font-sans font-black text-base text-gray-950">
                          Browse By Experience Category
                        </h4>
                        <p className="text-xs text-gray-500">Narrow down experiences using specific category fields</p>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {EVENT_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategory(cat);
                              setShowAdvancedFilters(true);
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 text-gray-800 hover:text-amber-700 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* BROWSE BY AREA */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 space-y-6">
                      <div>
                        <h4 className="font-sans font-black text-base text-gray-950">
                          Explore Abuja Areas & Districts
                        </h4>
                        <p className="text-xs text-gray-500">Discover events within walking distance in your district</p>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {ABUJA_AREAS.map((area) => (
                          <button
                            key={area}
                            onClick={() => {
                              setSelectedArea(area);
                              setShowAdvancedFilters(true);
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 text-gray-800 hover:text-amber-700 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                          >
                            📍 {area}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* VIEW: CREATE EVENT WIZARD */}
            {view === 'create-event' && (
              currentUser ? (
                <CreateEventWizard
                  organizer={currentUser}
                  onSave={handleAddNewEvent}
                  onCancel={() => setView('home')}
                />
              ) : (
                <div className="max-w-md mx-auto text-center py-16 space-y-6 bg-white border border-gray-100 rounded-3xl shadow-xs p-6">
                  <span className="text-4xl block">🔑</span>
                  <h3 className="font-sans font-black text-lg text-gray-900">Organizer Login Required</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    You must register or log in as an organizer to design, save, and submit event landing pages.
                  </p>
                  <button
                    onClick={() => {
                      setAuthModalTab('Organizer');
                      setIsAuthModalOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Login to Organizer Portal
                  </button>
                </div>
              )
            )}

            {/* VIEW: ORGANIZER DASHBOARD */}
            {view === 'organizer-dashboard' && currentUser && (
              <OrganizerDashboard
                organizer={currentUser}
                events={events}
                onAddNewEventTrigger={() => setView('create-event')}
                onSelectEvent={(id) => setSelectedEventId(id)}
                onDeleteEvent={handleDeleteEvent}
                onUpdateProfile={handleUpdateUserProfile}
              />
            )}

            {/* VIEW: BUYER PORTAL */}
            {view === 'buyer-dashboard' && currentUser && (
              <BuyerDashboard
                buyer={currentUser}
                bookings={bookings}
                events={events}
                ticketPlans={ticketPlans}
                notifications={notifications}
                savedEventIds={savedEventIds}
                onSelectEvent={(id) => setSelectedEventId(id)}
                onToggleInterest={(id) => handleToggleInterest(id)}
                onUpdateProfile={handleUpdateUserProfile}
              />
            )}

            {/* VIEW: ADMIN CONSOLE */}
            {view === 'admin-dashboard' && currentUser?.role === 'Admin' && (
              <AdminDashboard
                events={events}
                users={users}
                ticketPlans={ticketPlans}
                bookings={bookings}
                onApproveEvent={handleApproveEvent}
                onRejectEvent={handleRejectEvent}
                onToggleFeatureEvent={handleToggleFeatureEvent}
                onToggleArchiveEvent={handleToggleArchiveEvent}
                onAddTicketPlan={handleAddTicketPlan}
                onDeleteTicketPlan={handleDeleteTicketPlan}
                onConfirmBooking={handleConfirmBooking}
                onCancelBooking={handleCancelBooking}
                onSelectEvent={(id) => setSelectedEventId(id)}
                onUpdateEventStatus={handleUpdateEventStatus}
              />
            )}

            {/* VIEW: ABOUT & CONTACTS */}
            {view === 'about' && (
              <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
                {/* Visual Intro */}
                <div className="text-center space-y-4 max-w-2xl mx-auto pt-4">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
                    About Platform
                  </span>
                  <h2 className="font-sans font-black text-3xl text-gray-900 tracking-tight leading-tight">
                    Every event deserves a beautiful landing page.
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    The Abuja Events Platform is the capital's centralized discovery and anti-scam ticketing interface. We facilitate transparent event listings and secure seat placements.
                  </p>
                </div>

                {/* Grid info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 space-y-4">
                    <h3 className="font-sans font-bold text-base text-gray-950 pb-2 border-b border-gray-50">
                      Our Philosophy
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Traditional ticketing platforms confuse users and charge heavy processing percentages. Abuja Events decouples publishing from payment. Any organizer can submit. Only city platform administrators can activate payment modules.
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      This quality check eliminates ticketing scams, double entries, and guarantees that every attendee receives valid vector passes confirmed by physical bank transfers.
                    </p>
                  </div>

                  {/* Interactive Contact Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      triggerToast('Contact request submitted! Our administrators will reach out via WhatsApp shortly.', 'success');
                      e.currentTarget.reset();
                    }}
                    className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 space-y-4"
                  >
                    <h3 className="font-sans font-bold text-base text-gray-950 pb-2 border-b border-gray-50">
                      Reach Out To Admin Office
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Your Full Name</label>
                        <input type="text" required placeholder="Chidi Okafor" className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-xs text-gray-900 outline-hidden" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Your WhatsApp Number</label>
                        <input type="tel" required placeholder="+234 800..." className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-xs text-gray-900 outline-hidden" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Your Query / Inquiry</label>
                        <textarea rows={3} required placeholder="State your ticket plan or sponsorship goals..." className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-xs text-gray-900 outline-hidden resize-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Submit inquiry message
                    </button>
                  </form>
                </div>
              </div>
            )}

          </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center space-y-4">
          <div className="flex justify-center items-center gap-2 text-gray-700 font-sans font-bold text-sm">
            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-sans font-black text-xs">
              A
            </span>
            Abuja Events Platform
          </div>
          <p className="text-[11px] text-gray-400 max-w-md mx-auto leading-relaxed">
            All ticket payments are verified relationally by central administrators. Offline bank transfers are backed 100% by digital seat reserves.
          </p>
          <div className="text-[10px] text-gray-400 pt-3 border-t">
            © 2026 Abuja Events Platform. Designed for the Federal Capital Territory, Abuja.
          </div>
        </div>
      </footer>

      {/* CORE AUTH MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

    </div>
  );
}
