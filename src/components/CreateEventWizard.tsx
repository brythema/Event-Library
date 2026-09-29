/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Image, Info, Calendar, MapPin, Phone, HelpCircle, AlertTriangle, 
  Eye, Save, Send, ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2 
} from 'lucide-react';
import { AbujaEvent, EventStatus, FAQ, User } from '../types';
import { ABUJA_AREAS, EVENT_CATEGORIES } from '../initialData';
import { AREA_COORDINATES } from '../utils';

interface CreateEventWizardProps {
  organizer: User;
  onSave: (event: AbujaEvent) => void;
  onCancel: () => void;
}

export default function CreateEventWizard({ organizer, onSave, onCancel }: CreateEventWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  // Section 1: Visual Identity
  const [flyerUrl, setFlyerUrl] = useState('https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800');
  const [organizerLogo, setOrganizerLogo] = useState(organizer.brandLogo || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200');
  const [backgroundBanner, setBackgroundBanner] = useState('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200');

  // Section 2: Event Info
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Section 3: Schedule
  const [date, setDate] = useState('2026-07-10'); // Sane default
  const [openingTime, setOpeningTime] = useState('18:00');
  const [closingTime, setClosingTime] = useState('23:00');
  const [timezone, setTimezone] = useState('WAT (UTC+1)');

  // Section 4: Venue
  const [venueName, setVenueName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [area, setArea] = useState(ABUJA_AREAS[0]);
  const [landmark, setLandmark] = useState('');
  const [googleMapLink, setGoogleMapLink] = useState('');

  // Section 5: Organizer
  const [organizerName, setOrganizerName] = useState(organizer.businessName || organizer.fullName);
  const [phone, setPhone] = useState(organizer.phone);
  const [email, setEmail] = useState(organizer.email);
  const [website, setWebsite] = useState(organizer.website || '');
  const [instagram, setInstagram] = useState(organizer.instagram || '');
  const [facebook, setFacebook] = useState(organizer.facebook || '');
  const [whatsapp, setWhatsapp] = useState(organizer.phone || '');

  // Section 6: Gallery
  const [galleryInputs, setGalleryInputs] = useState<string[]>(['']);

  // Section 7: FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([{ question: '', answer: '' }]);

  // Section 8: Terms
  const [ageRestriction, setAgeRestriction] = useState('All Ages');
  const [dressCode, setDressCode] = useState('Casual');
  const [parking, setParking] = useState('Available & Secured');
  const [refundPolicy, setRefundPolicy] = useState('No refunds');

  const steps = [
    { num: 1, title: 'Visuals', desc: 'Flyer & Banners', icon: Image },
    { num: 2, title: 'Details', desc: 'Title & Category', icon: Info },
    { num: 3, title: 'Schedule', desc: 'Date & Timing', icon: Calendar },
    { num: 4, title: 'Venue', desc: 'Location & Map', icon: MapPin },
    { num: 5, title: 'Contact', desc: 'Organizer details', icon: Phone },
    { num: 6, title: 'Gallery', desc: 'Photos & Slides', icon: Image },
    { num: 7, title: 'FAQs', desc: 'Questions', icon: HelpCircle },
    { num: 8, title: 'Terms', desc: 'Rules & dresscode', icon: AlertTriangle },
    { num: 9, title: 'Publish', desc: 'Preview & post', icon: CheckCircle2 },
  ];

  // Tag helper
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleaned = tagInput.trim();
      if (cleaned && !tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
        setTagInput('');
      }
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t));
  };

  // Gallery helpers
  const handleAddGalleryField = () => setGalleryInputs([...galleryInputs, '']);
  const handleGalleryChange = (idx: number, val: string) => {
    const next = [...galleryInputs];
    next[idx] = val;
    setGalleryInputs(next);
  };
  const handleRemoveGalleryField = (idx: number) => {
    if (galleryInputs.length === 1) return;
    setGalleryInputs(galleryInputs.filter((_, i) => i !== idx));
  };

  // FAQ helpers
  const handleAddFAQ = () => setFaqs([...faqs, { question: '', answer: '' }]);
  const handleFAQChange = (idx: number, field: 'question' | 'answer', val: string) => {
    const next = [...faqs];
    next[idx][field] = val;
    setFaqs(next);
  };
  const handleRemoveFAQ = (idx: number) => {
    if (faqs.length === 1) return;
    setFaqs(faqs.filter((_, i) => i !== idx));
  };

  // Validation
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 2) {
      if (!title.trim()) errs.title = 'Event Title is required';
      if (!description.trim()) errs.description = 'Event Description is required';
    }
    if (step === 3) {
      if (!date) errs.date = 'Event Date is required';
      if (!openingTime) errs.openingTime = 'Opening Time is required';
    }
    if (step === 4) {
      if (!venueName.trim()) errs.venueName = 'Venue Name is required';
      if (!streetAddress.trim()) errs.streetAddress = 'Street Address is required';
    }
    if (step === 5) {
      if (!organizerName.trim()) errs.organizerName = 'Organizer Name is required';
      if (!phone.trim()) errs.phone = 'Phone number is required';
      if (!email.trim()) errs.email = 'Email address is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 9));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePublish = (asDraft: boolean) => {
    if (!validateStep(currentStep)) return;

    // Filter blank gallery images and blank FAQs
    const cleanGallery = galleryInputs.filter(url => url.trim() !== '');
    const cleanFAQs = faqs.filter(faq => faq.question.trim() !== '' && faq.answer.trim() !== '');

    const newEvent: AbujaEvent = {
      id: `event-created-${Date.now()}`,
      organizerId: organizer.id,
      title,
      subtitle,
      description,
      category,
      tags: tags.length > 0 ? tags : [category, area],
      flyerUrl,
      organizerLogo,
      backgroundBanner,
      date,
      openingTime,
      closingTime,
      timezone,
      venueName,
      streetAddress,
      area,
      landmark,
      googleMapLink: googleMapLink || `https://maps.google.com/?q=${encodeURIComponent(venueName + ' ' + area + ' Abuja')}`,
      organizerName,
      phone,
      email,
      website,
      instagram,
      facebook,
      whatsapp: whatsapp || phone,
      gallery: cleanGallery,
      faqs: cleanFAQs,
      ageRestriction,
      dressCode,
      parking,
      refundPolicy,
      status: asDraft ? EventStatus.Draft : EventStatus.PendingReview, // "Published Event goes to Pending Review for central ticket authority"
      isFeatured: false,
      interestedCount: 0,
      createdAt: new Date().toISOString(),
      latitude: AREA_COORDINATES[area]?.lat || 9.0778,
      longitude: AREA_COORDINATES[area]?.lng || 7.4786,
    };

    onSave(newEvent);
  };

  const ActiveIcon = steps[currentStep - 1].icon;

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[75vh]">
      
      {/* Sidebar: Step progress */}
      <div className="w-full md:w-80 bg-gray-50/70 border-r border-gray-100 p-6 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
            Event Builder
          </span>
          <h2 className="font-sans font-bold text-xl text-gray-900 mt-3">
            Publish Abuja Event
          </h2>
          <p className="text-xs text-gray-500 mt-1 mb-8 leading-relaxed">
            Abuja events are styled and structured automatically for professional results.
          </p>

          {/* Stepper Navigation */}
          <div className="space-y-1.5">
            {steps.map((s) => {
              const StepIcon = s.icon;
              const isActive = currentStep === s.num;
              const isCompleted = currentStep > s.num;

              return (
                <button
                  key={s.num}
                  disabled={s.num > currentStep && !validateStep(currentStep)}
                  onClick={() => validateStep(currentStep) && setCurrentStep(s.num)}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all ${
                    isActive 
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/15 font-semibold' 
                      : isCompleted 
                        ? 'text-emerald-600 hover:bg-gray-100/50' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-white text-amber-700' 
                      : isCompleted 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-white border border-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : s.num}
                  </div>
                  <div>
                    <p className="text-xs leading-none font-bold">{s.title}</p>
                    <p className={`text-[10px] mt-0.5 ${isActive ? 'text-amber-100' : 'text-gray-400'}`}>
                      {s.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-[11px] text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">🎟️ Ticket Authority Note:</p>
          Once published, your event is submitted for Review. The Admin will contact you to configure ticket plans (VIP, Regular, VVIP) and enable sales.
        </div>
      </div>

      {/* Main Form content */}
      <div className="flex-1 p-6 md:p-10 flex flex-col justify-between">
        
        {/* Step Title Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-gray-50 mb-6">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <ActiveIcon size={24} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-gray-900">
              Section {currentStep}: {steps[currentStep - 1].title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Please enter accurate information. All details are reviewed.
            </p>
          </div>
        </div>

        {/* Step Fields content */}
        <div className="flex-1 mb-8">
          
          {/* SECTION 1: VISUAL IDENTITY */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Event Flyer Image URL
                </label>
                <input
                  type="url"
                  value={flyerUrl}
                  onChange={(e) => setFlyerUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  High quality event flyer aspect ratios work best. Prefer 4:3 or square images.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Organizer Logo URL
                </label>
                <input
                  type="url"
                  value={organizerLogo}
                  onChange={(e) => setOrganizerLogo(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Event Landing Banner URL
                </label>
                <input
                  type="url"
                  value={backgroundBanner}
                  onChange={(e) => setBackgroundBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Wide landscape banner displayed at the top of your custom event page.
                </p>
              </div>

              {/* Visual preview */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Live Visuals Preview</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border">
                    <img src={backgroundBanner} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <div className="flex items-center gap-2">
                        <img src={organizerLogo} alt="Logo" className="w-8 h-8 rounded-full border border-white object-cover" referrerPolicy="no-referrer" />
                        <span className="text-white text-xs font-bold font-sans">Landing Header</span>
                      </div>
                    </div>
                  </div>
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border flex items-center justify-center">
                    <img src={flyerUrl} alt="Flyer" className="h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: EVENT INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Millennium Concert"
                  className={`w-full bg-gray-50 border ${errors.title ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-amber-500'} focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900`}
                />
                {errors.title && <p className="text-[10px] text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Subtitle <span className="text-gray-400">(Brief visual pitch)</span>
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. An explosive night under the stars"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  >
                    {EVENT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Tags <span className="text-gray-400">(Press Enter or Comma to add)</span>
                  </label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="e.g. Music, Outdoor"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map(t => (
                        <span key={t} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-medium border border-gray-100">
                          {t}
                          <button type="button" onClick={() => removeTag(t)} className="text-gray-400 hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Detailed Event Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell Abuja residents what makes this event spectacular..."
                  className={`w-full bg-gray-50 border ${errors.description ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-amber-500'} focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900 resize-none`}
                />
                {errors.description && <p className="text-[10px] text-red-500 mt-1">{errors.description}</p>}
              </div>
            </div>
          )}

          {/* SECTION 3: SCHEDULE */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Opening / Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Closing / End Time
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>
            </div>
          )}

          {/* SECTION 4: VENUE */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Venue Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. Millennium Park"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Abuja Area / District <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  >
                    {ABUJA_AREAS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. Three Arms Zone, Maitama, Abuja"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Landmark / Nearest Junction
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Opposite Transcorp Hilton"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Google Maps Link <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={googleMapLink}
                    onChange={(e) => setGoogleMapLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: ORGANIZER INFORMATION */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Organizer Public Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Organizer Public Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    WhatsApp Link/Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. +234 809 111 2222"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Public Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-50 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="brand.com"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs outline-hidden text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Instagram Handle</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@handle"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs outline-hidden text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Facebook Page</label>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="fb.com/page"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs outline-hidden text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: GALLERY */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed mb-2">
                Provide image URLs of past editions, the venue, or promo posters to display in the event landing gallery section.
              </p>

              {galleryInputs.map((val, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={val}
                    onChange={(e) => handleGalleryChange(idx, e.target.value)}
                    placeholder="https://images.unsplash.com/your-photo-url"
                    className="flex-1 bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryField(idx)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Remove Image"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddGalleryField}
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-100 rounded-xl px-4 py-3 transition-all"
              >
                <Plus size={14} /> Add Gallery Image Link
              </button>
            </div>
          )}

          {/* SECTION 7: FAQ ENTRY */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Anticipate your visitors’ concerns. Clear questions and answers improve ticket conversions.
              </p>

              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 space-y-3 relative group">
                  <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleRemoveFAQ(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete FAQ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Question</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => handleFAQChange(idx, 'question', e.target.value)}
                      placeholder="e.g. Is there a dress code?"
                      className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs outline-hidden text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Answer</label>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={(e) => handleFAQChange(idx, 'answer', e.target.value)}
                      placeholder="Yes, strictly casual and smart!"
                      className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs outline-hidden text-gray-900 resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddFAQ}
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-100 rounded-xl px-4 py-3 transition-all"
              >
                <Plus size={14} /> Add New FAQ
              </button>
            </div>
          )}

          {/* SECTION 8: TERMS */}
          {currentStep === 8 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Age Restriction
                </label>
                <select
                  value={ageRestriction}
                  onChange={(e) => setAgeRestriction(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                >
                  <option value="All Ages">All Ages</option>
                  <option value="12+">12+</option>
                  <option value="16+">16+</option>
                  <option value="18+">18+</option>
                  <option value="21+">21+</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Dress Code
                </label>
                <input
                  type="text"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  placeholder="e.g. Smart Casual, Elegant, White"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Parking
                </label>
                <input
                  type="text"
                  value={parking}
                  onChange={(e) => setParking(e.target.value)}
                  placeholder="e.g. Ample secured parking inside"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Refund Policy
                </label>
                <input
                  type="text"
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-hidden text-gray-900"
                />
              </div>
            </div>
          )}

          {/* SECTION 9: PUBLISH */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={24} />
                <div>
                  <h4 className="font-sans font-bold text-sm text-emerald-900">
                    Your Event is Fully Configured!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    You can either save this event as a <strong>Draft</strong> to make edits later, or <strong>Publish</strong> it directly. Once published, the Admin will immediately review the listing to launch customized Ticket plans.
                  </p>
                </div>
              </div>

              {/* Summary card */}
              <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 space-y-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Event Details Summary</span>
                
                <div className="flex gap-4">
                  <img src={flyerUrl} alt="Flyer" className="w-20 h-20 rounded-xl object-cover border bg-white" referrerPolicy="no-referrer" />
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">{title || 'Untitled Event'}</h5>
                    <p className="text-xs text-gray-500 mt-1">{category} • {area}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date} at {openingTime}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 pt-3 border-t">
                  <div>
                    <strong>Venue:</strong> {venueName || 'N/A'}
                  </div>
                  <div>
                    <strong>Street:</strong> {streetAddress || 'N/A'}
                  </div>
                  <div>
                    <strong>WhatsApp:</strong> {whatsapp || 'N/A'}
                  </div>
                  <div>
                    <strong>FAQs Count:</strong> {faqs.filter(f => f.question).length} FAQ entries
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer controls */}
        <div className="flex justify-between pt-6 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-gray-100 hover:border-gray-200 text-xs font-semibold text-gray-500 transition-colors"
          >
            Cancel Builder
          </button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}

            {currentStep < 9 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-amber-600/10 cursor-pointer"
              >
                Next Step <ChevronRight size={14} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePublish(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <Save size={14} /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handlePublish(false)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  <Send size={14} /> Submit & Publish
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
