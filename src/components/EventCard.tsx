/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Heart, Share2, Ticket, Check, BadgeCheck } from 'lucide-react';
import { AbujaEvent, EventStatus } from '../types';
import { formatCurrency } from '../utils';

interface EventCardProps {
  event: AbujaEvent;
  lowestPrice?: number;
  onSelect: (eventId: string) => void;
  onToggleInterest: (eventId: string, e: React.MouseEvent) => void;
  isInterested: boolean;
  distance?: number;
}

export default function EventCard({
  event,
  lowestPrice,
  onSelect,
  onToggleInterest,
  isInterested,
  distance,
}: EventCardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?event=${event.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (event.status) {
      case EventStatus.TicketingActive:
        return (
          <span className="inline-flex items-center gap-1 bg-neon2/10 text-neon2 px-2.5 py-1 rounded-full text-xs font-semibold border border-neon2/40">
            <Ticket size={12} />
            Tickets Available {lowestPrice !== undefined ? `from ${formatCurrency(lowestPrice)}` : ''}
          </span>
        );
      case EventStatus.Approved:
        return (
          <span className="inline-flex items-center gap-1 bg-neon/10 text-neon px-2.5 py-1 rounded-full text-xs font-semibold border border-neon/40">
            <Clock size={12} />
            Tickets Coming Soon
          </span>
        );
      case EventStatus.Live:
        return (
          <span className="inline-flex items-center gap-1 bg-danger/10 text-danger px-2.5 py-1 rounded-full text-xs font-semibold border border-danger/35 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
            Happening Live Today!
          </span>
        );
      case EventStatus.Ended:
        return (
          <span className="inline-flex items-center bg-abyss2 text-mut px-2.5 py-1 rounded-full text-xs font-semibold border border-edge">
            Event Ended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center bg-neon/10 text-neon px-2.5 py-1 rounded-full text-xs font-semibold border border-neon/30">
            {event.status}
          </span>
        );
    }
  };

  // Format date elegantly
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      id={`event-card-${event.id}`}
      onClick={() => onSelect(event.id)}
      className="group relative flex flex-col h-full bg-panel rounded-2xl overflow-hidden border border-edge hover:border-edge shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      {/* Event Flyer Container */}
      <div className="relative aspect-16/10 overflow-hidden bg-panel">
        <img
          src={event.flyerUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800'}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-abyss/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-ink uppercase shadow-xs">
          {event.category}
        </div>

        {/* Verification Badge — in-house listings are platform-verified */}
        <div className="absolute top-11 left-3 inline-flex items-center gap-1 bg-neon2/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider text-ink uppercase shadow-xs">
          <BadgeCheck size={11} /> Verified
        </div>

        {/* Interested Button */}
        <button
          id={`btn-interest-${event.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleInterest(event.id, e);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-300 ${
            isInterested
              ? 'bg-danger text-ink hover:bg-danger'
              : 'bg-abyss/85 text-mut hover:text-danger hover:bg-panel'
          } shadow-xs`}
          title={isInterested ? 'Marked Interested' : 'Mark Interested'}
        >
          <Heart size={16} fill={isInterested ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className="font-sans font-semibold text-lg text-ink group-hover:text-neon transition-colors duration-200 line-clamp-1 mb-1.5">
          {event.title}
        </h3>

        {/* Subtitle / Description excerpt */}
        <p className="text-mut text-xs line-clamp-2 mb-4 leading-relaxed">
          {event.subtitle || event.description}
        </p>

        {/* Quick Details */}
        <div className="grid grid-cols-2 gap-y-2 text-xs text-mut mb-5 mt-auto">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-mut2 shrink-0" />
            <span className="truncate">{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-mut2 shrink-0" />
            <span>{event.openingTime}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin size={14} className="text-mut2 shrink-0" />
            <span className="truncate max-w-[70%]" title={`${event.venueName}, ${event.area}`}>
              {event.venueName} ({event.area})
            </span>
            {distance !== undefined && (
              <span className="text-[10px] font-bold bg-neon/15 text-neon px-1.5 py-0.5 rounded-md shrink-0">
                {distance.toFixed(1)} km away
              </span>
            )}
          </div>
        </div>

        {/* Footer Area with Badges & Share */}
        <div className="flex items-center justify-between pt-4 border-t border-edge/50">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-mut">
              <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
              {event.interestedCount} Interested
            </div>
            {getStatusBadge()}
          </div>

          {/* Share Button with status */}
          <button
            id={`btn-share-${event.id}`}
            onClick={handleShare}
            className={`relative p-2.5 rounded-xl border border-edge hover:border-edge transition-colors ${
              copied ? 'bg-neon2/10 border-neon2/40 text-neon2' : 'bg-abyss2 text-mut hover:text-ink'
            }`}
            title="Copy link to share"
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            {copied && (
              <span className="absolute -top-8 right-0 bg-abyss text-ink text-[10px] py-1 px-2 rounded-md font-medium whitespace-nowrap">
                Link copied!
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
