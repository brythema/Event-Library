/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Clock, Heart, Share2, Ticket, Check, ChevronDown, 
  ChevronUp, Instagram, Facebook, Globe, Phone, ExternalLink, ArrowRight, MessageCircle 
} from 'lucide-react';
import { AbujaEvent, TicketPlan, User, Booking, EventStatus } from '../types';
import { formatCurrency, calculateCountdown, Countdown, generateWhatsAppLink } from '../utils';

interface EventLandingPageProps {
  event: AbujaEvent;
  ticketPlans: TicketPlan[];
  relatedEvents: AbujaEvent[];
  currentUser: User | null;
  isInterested: boolean;
  onToggleInterest: (eventId: string) => void;
  onBack: () => void;
  onSelectEvent: (eventId: string) => void;
  onLoginTrigger: () => void;
  onAddBooking: (booking: Booking) => void;
}

export default function EventLandingPage({
  event,
  ticketPlans,
  relatedEvents,
  currentUser,
  isInterested,
  onToggleInterest,
  onBack,
  onSelectEvent,
  onLoginTrigger,
  onAddBooking,
}: EventLandingPageProps) {
  const [copied, setCopied] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false });

  // Booking Flow State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TicketPlan | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<1 | 2>(1); // 1: Select tickets & summary, 2: Transfer instruction & confirmation

  // Registration states if user is unregistered during purchase
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');

  // Update countdown every second
  useEffect(() => {
    const updateTime = () => {
      const calc = calculateCountdown(event.date, event.openingTime);
      setCountdown(calc);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/?event=${event.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFAQ = (idx: number) => {
    setExpandedFAQ(expandedFAQ === idx ? null : idx);
  };

  const handleStartBooking = () => {
    if (!currentUser) {
      setShowAuthForm(true);
    } else {
      setSelectedPlan(ticketPlans[0] || null);
      setQuantity(1);
      setStep(1);
      setIsBookingOpen(true);
    }
  };

  const handleRegisterBuyer = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName || !regEmail || !regPhone || !regPassword) {
      setRegError('Please fill in all required registration fields');
      return;
    }

    // Register user in local storage
    const usersRaw = localStorage.getItem('abuja_events_users');
    let users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
    
    if (users.some(u => u.email.toLowerCase() === regEmail.toLowerCase() && u.role === 'Buyer')) {
      setRegError('An account with this email already exists.');
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      role: 'Buyer',
      email: regEmail,
      fullName: regName,
      phone: regPhone,
      password: regPassword,
    };

    users.push(newUser);
    localStorage.setItem('abuja_events_users', JSON.stringify(users));
    localStorage.setItem('abuja_events_current_user', JSON.stringify(newUser));
    
    // Trigger login updates
    window.dispatchEvent(new Event('storage'));
    
    // Continue with booking
    setShowAuthForm(false);
    setSelectedPlan(ticketPlans[0] || null);
    setQuantity(1);
    setStep(1);
    setIsBookingOpen(true);
  };

  const handleProceedToPayment = () => {
    if (!selectedPlan) return;
    setStep(2);
  };

  const handleConfirmPayment = () => {
    if (!selectedPlan || !currentUser) return;

    const ref = `AE-${event.title.substring(0, 2).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const total = selectedPlan.price * quantity;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      eventId: event.id,
      buyerId: currentUser.id,
      ticketPlanId: selectedPlan.id,
      quantity,
      totalAmount: total,
      status: 'Pending',
      bookingReference: ref,
      createdAt: new Date().toISOString(),
      customerDetails: {
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
      },
    };

    onAddBooking(newBooking);

    // Deep link to Whatsapp
    // Admin's WhatsApp number is preconfigured. We will format the WhatsApp url
    const adminWhatsApp = '+2348012345678';
    const link = generateWhatsAppLink(
      adminWhatsApp,
      event.title,
      selectedPlan.name,
      quantity,
      total,
      currentUser.fullName,
      currentUser.phone,
      currentUser.email
    );

    window.open(link, '_blank');
    setIsBookingOpen(false);
  };

  // Beautiful status bar
  const getTicketingStatusHeader = () => {
    if (event.status === EventStatus.TicketingActive) {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              🎟️
            </div>
            <div>
              <p className="font-sans font-bold text-sm">Centralized Secure Ticketing is Active</p>
              <p className="text-xs text-emerald-600">Guaranteed real tickets verified by Abuja Events platform</p>
            </div>
          </div>
          <button
            onClick={handleStartBooking}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer text-sm"
          >
            Buy Tickets Now
          </button>
        </div>
      );
    } else {
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 rounded-2xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
              ⏳
            </div>
            <div>
              <p className="font-sans font-bold text-sm">Ticket Sales are Coming Soon</p>
              <p className="text-xs text-amber-600">Administrator has not yet enabled sales. Save this event to get notified!</p>
            </div>
          </div>
          <button
            disabled
            className="bg-gray-200 text-gray-400 font-bold py-2.5 px-6 rounded-xl cursor-not-allowed text-sm"
          >
            Coming Soon
          </button>
        </div>
      );
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-20 space-y-8 animate-fade-in">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors pb-2 cursor-pointer"
      >
        ← Back to Abuja Events Discovery
      </button>

      {/* 1. HERO IMAGE BANNER & FLOATING LOGO */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-gray-100 bg-gray-900 min-h-[360px] flex flex-col justify-end">
        <img
          src={event.backgroundBanner || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-50 select-none"
        />
        
        {/* Soft elegant gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent" />
        
        <div className="relative p-6 sm:p-10 z-10 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="bg-amber-500 text-gray-950 text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase">
              {event.category}
            </span>
            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full">
              📍 {event.area} District
            </span>
          </div>

          <h1 className="font-sans font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight max-w-3xl">
            {event.title}
          </h1>

          <p className="text-gray-200 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            {event.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-y-4 gap-6 text-xs sm:text-sm text-gray-300 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Calendar className="text-amber-400" size={16} />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-amber-400" size={16} />
              <span>{event.openingTime} {event.closingTime ? `to ${event.closingTime}` : ''} ({event.timezone})</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="text-amber-400" size={16} />
              <span>{event.venueName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: CONTENT & DETAILS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Status Alert bar */}
          {getTicketingStatusHeader()}

          {/* 2. EVENT SUMMARY */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
              <div>
                <h2 className="font-sans font-bold text-xl text-gray-900">
                  Event Discovery Summary
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Verified event detail cards by capital administrators
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onToggleInterest(event.id)}
                  className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isInterested
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-50 text-gray-700 hover:text-red-500 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <Heart size={14} fill={isInterested ? 'currentColor' : 'none'} />
                  {isInterested ? 'Interested' : 'Mark Interested'}
                </button>

                <button
                  onClick={handleShare}
                  className={`relative flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Share2 size={14} />}
                  Share Flyer
                  {copied && (
                    <span className="absolute -top-10 right-0 bg-gray-900 text-white text-[10px] py-1.5 px-2.5 rounded-md font-medium whitespace-nowrap">
                      Link copied!
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-50 text-xs text-gray-600">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">District Area</span>
                <strong className="text-gray-900 text-sm">{event.area}</strong>
              </div>
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">Interests</span>
                <strong className="text-gray-900 text-sm">🔥 {event.interestedCount} Residents</strong>
              </div>
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1">Ticket Sales</span>
                <strong className={`text-sm ${event.status === EventStatus.TicketingActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {event.status === EventStatus.TicketingActive ? 'Available' : 'Coming Soon'}
                </strong>
              </div>
            </div>
          </div>

          {/* 3. ABOUT EVENT */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-4">
            <h3 className="font-sans font-bold text-lg text-gray-900 pb-3 border-b border-gray-50">
              About This Event
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-4">
                {event.tags.map(tag => (
                  <span key={tag} className="bg-gray-50 text-gray-500 text-xs px-2.5 py-1 rounded-md border border-gray-100 font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. VENUE & MAP */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-5">
            <h3 className="font-sans font-bold text-lg text-gray-900 pb-3 border-b border-gray-50">
              Venue & Landmarks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-gray-800 font-semibold block text-xs uppercase tracking-wider text-gray-400 mb-0.5">Venue Name</strong>
                  <p className="text-gray-950 font-bold text-base">{event.venueName}</p>
                </div>
                <div>
                  <strong className="text-gray-800 font-semibold block text-xs uppercase tracking-wider text-gray-400 mb-0.5">Street Address</strong>
                  <p className="text-gray-600">{event.streetAddress}</p>
                </div>
                {event.landmark && (
                  <div>
                    <strong className="text-gray-800 font-semibold block text-xs uppercase tracking-wider text-gray-400 mb-0.5">Landmark</strong>
                    <p className="text-gray-600">📍 {event.landmark}</p>
                  </div>
                )}
              </div>

              {/* Simulated / Real Map Section */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between items-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-2">
                  🗺️
                </div>
                <div>
                  <h4 className="font-sans font-bold text-xs text-gray-800">Abuja District Coordinate Verified</h4>
                  <p className="text-[10px] text-gray-500 mt-1 mb-4">Location is accurately pinned in the {event.area} district.</p>
                </div>
                {event.googleMapLink ? (
                  <a
                    href={event.googleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Open Google Maps <ExternalLink size={12} />
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-100 border border-gray-200 text-gray-400 font-semibold py-2 px-4 rounded-xl text-xs cursor-not-allowed"
                  >
                    No Google Map Link Provided
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 5. GALLERY */}
          {event.gallery && event.gallery.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-4">
              <h3 className="font-sans font-bold text-lg text-gray-900 pb-3 border-b border-gray-50">
                Event Gallery
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {event.gallery.map((url, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-xs">
                    <img
                      src={url}
                      alt={`Gallery ${i}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. FAQS */}
          {event.faqs && event.faqs.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-4">
              <h3 className="font-sans font-bold text-lg text-gray-900 pb-3 border-b border-gray-50">
                Frequently Asked Questions
              </h3>
              <div className="space-y-3.5">
                {event.faqs.map((faq, i) => {
                  const isExpanded = expandedFAQ === i;
                  return (
                    <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggleFAQ(i)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 text-left transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-xs text-gray-900">{faq.question}</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {isExpanded && (
                        <div className="p-4 border-t border-gray-100 bg-white text-xs text-gray-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: COUNTDOWN, TICKETS & ORGANIZER */}
        <div className="space-y-8">
          
          {/* 7. COUNTDOWN TIMERS */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs text-center space-y-4">
            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
              ⏰ Event Countdown
            </span>
            
            {countdown.isOver ? (
              <div className="py-4 font-sans font-extrabold text-xl text-red-600">
                This event is currently Live or Ended!
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                  <span className="font-sans font-black text-2xl text-gray-900 block">{countdown.days}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Days</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                  <span className="font-sans font-black text-2xl text-gray-900 block">{countdown.hours}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hrs</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                  <span className="font-sans font-black text-2xl text-gray-900 block">{countdown.minutes}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Min</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                  <span className="font-sans font-black text-2xl text-gray-900 block">{countdown.seconds}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sec</span>
                </div>
              </div>
            )}
          </div>

          {/* 8. TICKET PLANS DISPLAY */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5 shadow-xs">
            <h4 className="font-sans font-bold text-base text-gray-900">
              Ticket Classes & Pricing
            </h4>
            
            {event.status !== EventStatus.TicketingActive || ticketPlans.length === 0 ? (
              <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <span className="text-2xl block mb-2">🎟️</span>
                <strong className="text-xs text-gray-700 block">Coming Soon</strong>
                <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                  Payment verification and seating configurations are currently being finalized.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ticketPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border border-gray-100 rounded-2xl p-4 flex flex-col justify-between gap-3 bg-gray-50/30"
                    style={{ borderLeft: `4px solid ${plan.color || '#F59E0B'}` }}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <strong className="text-xs font-bold text-gray-900 leading-tight block">{plan.name}</strong>
                        <span className="text-xs font-black text-amber-600 shrink-0">
                          {formatCurrency(plan.price)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-2.5 border-t border-gray-100 mt-1">
                      <span className="text-gray-400 font-medium">Limit: {plan.maxPurchaseLimit} per buyer</span>
                      <span className={`font-semibold ${plan.availableQuantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {plan.availableQuantity > 0 ? `${plan.availableQuantity} left` : 'Sold Out!'}
                      </span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleStartBooking}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/10 transition-all text-xs flex items-center justify-center gap-1.5 mt-4 cursor-pointer"
                >
                  Buy Tickets Now <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* 9. THE TERMS & RULES */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 shadow-xs">
            <h4 className="font-sans font-bold text-base text-gray-900">
              Rules & Guidelines
            </h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-400">Age Restriction</span>
                <span className="font-bold text-gray-800">{event.ageRestriction}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-400">Dress Code</span>
                <span className="font-bold text-gray-800">{event.dressCode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-400">Parking Setup</span>
                <span className="font-bold text-gray-800">{event.parking}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-400">Refund Terms</span>
                <span className="font-bold text-gray-800">{event.refundPolicy}</span>
              </div>
            </div>
          </div>

          {/* 10. ORGANIZER INFO */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 shadow-xs">
            <h4 className="font-sans font-bold text-base text-gray-900">
              Event Organizer
            </h4>
            <div className="flex gap-3 items-center">
              <img
                src={event.organizerLogo || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200'}
                alt={event.organizerName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-gray-100 bg-gray-50"
              />
              <div>
                <h5 className="font-bold text-gray-900 text-sm">{event.organizerName}</h5>
                <p className="text-[10px] text-gray-500 mt-0.5">Verified Abuja Organizer</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {event.whatsapp && (
                <a
                  href={`https://wa.me/${event.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl text-center font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
              {event.phone && (
                <a
                  href={`tel:${event.phone}`}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 p-2.5 rounded-xl text-center font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone size={14} /> Call Office
                </a>
              )}
            </div>

            <div className="flex gap-3 justify-center pt-3 border-t border-gray-50 text-gray-400 text-xs">
              {event.instagram && (
                <a href={`https://instagram.com/${event.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="hover:text-amber-600 transition-colors flex items-center gap-1">
                  <Instagram size={14} /> Instagram
                </a>
              )}
              {event.website && (
                <a href={`https://${event.website}`} target="_blank" rel="noreferrer" className="hover:text-amber-600 transition-colors flex items-center gap-1">
                  <Globe size={14} /> Website
                </a>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 11. RELATED EVENTS */}
      {relatedEvents.length > 0 && (
        <div className="pt-10 border-t border-gray-100 space-y-6">
          <div>
            <h3 className="font-sans font-bold text-xl text-gray-900">
              Related Events in Abuja
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Discover other spectacular happenings based on your criteria
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedEvents.slice(0, 3).map((re) => (
              <div
                key={re.id}
                onClick={() => onSelectEvent(re.id)}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 shadow-xs hover:shadow-md overflow-hidden cursor-pointer transition-all duration-300"
              >
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  <img src={re.flyerUrl} alt={re.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-md text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full text-gray-800">
                    {re.category}
                  </span>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-sm text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-1">{re.title}</h4>
                  <p className="text-gray-500 text-[10px] mt-1 line-clamp-2 leading-relaxed">{re.subtitle || re.description}</p>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 pt-3 border-t border-gray-50 mt-3 font-medium">
                    <span>📍 {re.area}</span>
                    <span>{formatDate(re.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TICKET REGISTRATION FORM POPOVER (IF USER UNREGISTERED) */}
      {showAuthForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-100">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <div>
                <h4 className="font-sans font-bold text-lg text-gray-900">Account Required</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Please register once to purchase and track your bookings</p>
              </div>
              <button onClick={() => setShowAuthForm(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>

            {regError && (
              <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl p-3">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterBuyer} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Tunde Johnson"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-950"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-950"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="e.g. +234 812..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-950"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-950"
                />
              </div>

              <div className="flex justify-between items-center pt-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthForm(false);
                    onLoginTrigger();
                  }}
                  className="text-amber-700 font-bold hover:underline"
                >
                  Already have an account? Sign in
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-xl text-xs mt-4 cursor-pointer"
              >
                Register & Continue Purchase
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 12. TICKET BOOKING FLOW DIALOG */}
      {isBookingOpen && selectedPlan && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <div>
                <h4 className="font-sans font-bold text-lg text-gray-900">Purchase Event Tickets</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Secure, verified, direct ticketing system</p>
              </div>
              <button onClick={() => setIsBookingOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">×</button>
            </div>

            {/* STEP 1: CHOOSE PLAN & AMOUNT */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">Select Ticket Class</label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {ticketPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => {
                          setSelectedPlan(plan);
                          setQuantity(1);
                        }}
                        className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all ${
                          selectedPlan.id === plan.id
                            ? 'border-emerald-500 bg-emerald-50/20 shadow-xs'
                            : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <strong className="text-xs text-gray-900 block">{plan.name}</strong>
                          <span className="text-[10px] text-gray-400 mt-0.5 block line-clamp-1">{plan.description}</span>
                        </div>
                        <span className="text-xs font-black text-emerald-700">{formatCurrency(plan.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* QUANTITY LIMIT */}
                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border">
                  <div>
                    <strong className="text-xs text-gray-800 block">Ticket Quantity</strong>
                    <span className="text-[10px] text-gray-400 block">Maximum limit is {selectedPlan.maxPurchaseLimit}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      disabled={quantity >= selectedPlan.maxPurchaseLimit}
                      onClick={() => setQuantity(prev => Math.min(selectedPlan.maxPurchaseLimit, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ORDER SUMMARY */}
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Order Summary</span>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{selectedPlan.name} (₦{selectedPlan.price.toLocaleString()} × {quantity})</span>
                    <span>{formatCurrency(selectedPlan.price * quantity)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Admin Processing Charge</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t mt-1">
                    <span>Total Amount Due</span>
                    <span>{formatCurrency(selectedPlan.price * quantity)}</span>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1 mt-4 cursor-pointer"
                >
                  Proceed to Bank Transfer <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* STEP 2: BANK TRANSFER DETAILS & WHATSAPP REDIRECT */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100 text-xs leading-relaxed space-y-1">
                  <strong className="block text-emerald-950 font-bold mb-1">🏦 Bank Transfer Instructions:</strong>
                  Please transfer exactly the total amount below to the designated central ticket account. After transfer, click confirm to verify via WhatsApp.
                </div>

                <div className="border rounded-2xl p-4 bg-gray-50/50 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-400">Bank Name</span>
                    <strong className="text-gray-800 font-bold">Zenith Bank PLC</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-400">Account Name</span>
                    <strong className="text-gray-800 font-bold">Abuja Events Tickets Ltd</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-400">Account Number</span>
                    <strong className="text-amber-700 font-black text-sm font-mono tracking-wider">1012345678</strong>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-gray-400 font-bold">Total Transfer Amount</span>
                    <strong className="text-emerald-700 font-black text-base">{formatCurrency(selectedPlan.price * quantity)}</strong>
                  </div>
                </div>

                <div className="bg-amber-50 text-amber-800 border border-amber-100 p-3.5 rounded-xl text-[11px] leading-relaxed">
                  <p className="font-bold">📱 What happens next?</p>
                  Clicking below submits the order reference <strong>AE-PENDING</strong> and launches WhatsApp with a custom receipt message. Send it to the admin, and your booking reference is activated immediately!
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs transition-colors"
                  >
                    Back to Summary
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    <MessageCircle size={14} /> I've Made Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
