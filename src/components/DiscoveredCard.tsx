/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A web-discovered event card. Always visually distinct from in-house
 * listings: UNVERIFIED badge, source citation, and a "List it here" CTA
 * that funnels the organizer into the verified pipeline.
 */
import React from 'react';
import { Calendar, MapPin, ExternalLink, TriangleAlert, BadgePlus } from 'lucide-react';
import { DiscoveredEvent } from '../types';

interface DiscoveredCardProps {
  item: DiscoveredEvent;
  onListIt: () => void;
}

export default function DiscoveredCard({ item, onListIt }: DiscoveredCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Date not confirmed';
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const host = (() => {
    try { return item.sourceName || new URL(item.sourceUrl).hostname.replace(/^www\./, ''); }
    catch { return item.sourceName || 'the web'; }
  })();

  return (
    <div className="flex flex-col h-full bg-panel rounded-2xl overflow-hidden border border-dashed border-edge hover:border-edge shadow-xs hover:shadow-md transition-all duration-300">
      <div className="p-5 flex flex-col flex-1">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 bg-neon/10 text-neon px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-neon/40">
            <TriangleAlert size={11} /> Unverified
          </span>
          <span className="text-[10px] font-semibold text-mut2 uppercase tracking-wider">
            Found on the web
          </span>
        </div>

        {/* Title */}
        <h3 className="font-sans font-semibold text-lg text-ink line-clamp-2 mb-1.5">
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-mut text-xs line-clamp-2 mb-4 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Details */}
        <div className="grid gap-y-2 text-xs text-mut mb-4 mt-auto">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-mut2 shrink-0" />
            <span>{formatDate(item.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-mut2 shrink-0" />
            <span className="truncate">
              {[item.venue, item.area].filter(Boolean).join(', ') || 'Venue to be confirmed'}
            </span>
          </div>
        </div>

        {/* Footer: source + claim CTA */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-edge">
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neon hover:text-neon truncate max-w-[55%]"
            title={`Source: ${item.sourceUrl}`}
          >
            <ExternalLink size={12} className="shrink-0" />
            <span className="truncate">Source: {host}</span>
          </a>
          <button
            onClick={onListIt}
            className="inline-flex items-center gap-1.5 bg-neon/10 hover:bg-neon/15 border border-neon/40 text-neon text-[11px] font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            title="List this event as its organizer"
          >
            <BadgePlus size={13} /> List it here
          </button>
        </div>
      </div>
    </div>
  );
}
