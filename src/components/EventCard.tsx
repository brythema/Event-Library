/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Heart, Share2, Ticket, Check } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
            <Ticket size={12} />
            Tickets Available {lowestPrice !== undefined ? `from ${formatCurrency(lowestPrice)}` : ''}
          </span>
        );
      case EventStatus.Approved:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
            <Clock size={12} />
            Tickets Coming Soon
          </span>
        );
      case EventStatus.Live:
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-red-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            Happening Live Today!
          </span>
        );
      case EventStatus.Ended:
        return (
          <span className="inline-flex items-center bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200">
            Event Ended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-purple-200">
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
      className="group relative flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      {/* Event Flyer Container */}
      <div className="relative aspect-16/10 overflow-hidden bg-gray-100">
        <img
          src={event.flyerUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800'}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-gray-800 uppercase shadow-xs">
          {event.category}
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
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-white/90 text-gray-600 hover:text-red-500 hover:bg-white'
          } shadow-xs`}
          title={isInterested ? 'Marked Interested' : 'Mark Interested'}
        >
          <Heart size={16} fill={isInterested ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className="font-sans font-semibold text-lg text-gray-900 group-hover:text-amber-600 transition-colors duration-200 line-clamp-1 mb-1.5">
          {event.title}
        </h3>

        {/* Subtitle / Description excerpt */}
        <p className="text-gray-500 text-xs line-clamp-2 mb-4 leading-relaxed">
          {event.subtitle || event.description}
        </p>

        {/* Quick Details */}
        <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-600 mb-5 mt-auto">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <span className="truncate">{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-400 shrink-0" />
            <span>{event.openingTime}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            <span className="truncate max-w-[70%]" title={`${event.venueName}, ${event.area}`}>
              {event.venueName} ({event.area})
            </span>
            {distance !== undefined && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md shrink-0">
                {distance.toFixed(1)} km away
              </span>
            )}
          </div>
        </div>

        {/* Footer Area with Badges & Share */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              {event.interestedCount} Interested
            </div>
            {getStatusBadge()}
          </div>

          {/* Share Button with status */}
          <button
            id={`btn-share-${event.id}`}
            onClick={handleShare}
            className={`relative p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors ${
              copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 text-gray-500 hover:text-gray-800'
            }`}
            title="Copy link to share"
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            {copied && (
              <span className="absolute -top-8 right-0 bg-gray-900 text-white text-[10px] py-1 px-2 rounded-md font-medium whitespace-nowrap">
                Link copied!
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
