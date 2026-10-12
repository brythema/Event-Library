/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, LogIn, LogOut, ShieldAlert, User as UserIcon, 
  Map, Sparkles, Calendar, Search, HelpCircle, PhoneCall 
} from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onNavigate: (view: 'home' | 'create-event' | 'organizer-dashboard' | 'buyer-dashboard' | 'admin-dashboard' | 'about') => void;
  onAuthTrigger: (role: 'Buyer' | 'Organizer') => void;
  onLogout: () => void;
  activeView: string;
}

export default function Header({
  currentUser,
  onNavigate,
  onAuthTrigger,
  onLogout,
  activeView,
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleDashboardRedirect = () => {
    if (!currentUser) return;
    setShowDropdown(false);
    if (currentUser.role === 'Admin') {
      onNavigate('admin-dashboard');
    } else if (currentUser.role === 'Organizer') {
      onNavigate('organizer-dashboard');
    } else {
      onNavigate('buyer-dashboard');
    }
  };

  const getDashboardLabel = () => {
    if (!currentUser) return '';
    if (currentUser.role === 'Admin') return 'Admin Panel';
    if (currentUser.role === 'Organizer') return 'Organizer Workspace';
    return 'My Tickets Portal';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-abyss/90 backdrop-blur-md border-b border-edge shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center text-ink font-sans font-black text-xl shadow-md shadow-neon/30 group-hover:bg-navy transition-colors">
            A
          </div>
          <div>
            <span className="font-sans font-black text-lg text-ink tracking-tight leading-none block">
              Abuja Events
            </span>
            <span className="text-[9px] text-mut2 font-bold tracking-wider uppercase block mt-0.5">
              Capital City Platform
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-mut">
          <button
            onClick={() => onNavigate('home')}
            className={`hover:text-neon transition-colors cursor-pointer ${
              activeView === 'home' ? 'text-neon font-bold' : ''
            }`}
          >
            Explore Events
          </button>
          <button
            onClick={() => onNavigate('about')}
            className={`hover:text-neon transition-colors cursor-pointer ${
              activeView === 'about' ? 'text-neon font-bold' : ''
            }`}
          >
            About & Contacts
          </button>
          <button
            onClick={() => onNavigate('create-event')}
            className="flex items-center gap-1 text-neon hover:text-neon transition-colors cursor-pointer"
          >
            <Plus size={14} /> Create Event
          </button>
        </nav>

        {/* Authentication Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative">
              {/* Logged In Dropdown trigger */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 bg-abyss2 border border-edge hover:bg-panel px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-navy text-ink flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser.id === 'admin' ? 'A' : currentUser.fullName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="font-bold text-ink block leading-none">{currentUser.fullName}</span>
                  <span className="text-[9px] text-neon font-bold block mt-0.5">{currentUser.role}</span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2.5 w-52 bg-panel rounded-2xl shadow-xl border border-edge py-1.5 z-50 text-xs text-ink animate-fade-in">
                  <div className="px-3.5 py-2 border-b border-edge/50">
                    <p className="font-bold text-ink truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-mut2 truncate mt-0.5">{currentUser.email}</p>
                  </div>

                  <button
                    onClick={handleDashboardRedirect}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-neon/10 hover:text-neon transition-colors flex items-center gap-2 font-semibold"
                  >
                    <Sparkles size={14} /> {getDashboardLabel()}
                  </button>

                  {currentUser.id === 'admin' && (
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onNavigate('admin-dashboard');
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-neon/10 hover:text-neon transition-colors flex items-center gap-2 font-semibold text-neon"
                    >
                      <ShieldAlert size={14} /> Admin Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-danger/10 text-danger transition-colors flex items-center gap-2 font-semibold border-t border-edge/50 mt-1"
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAuthTrigger('Buyer')}
                className="hover:bg-abyss2 border border-edge text-ink font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Login as Buyer
              </button>
              <button
                onClick={() => onAuthTrigger('Organizer')}
                className="bg-navy hover:bg-navy text-ink font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1"
              >
                <LogIn size={13} /> Organizer Portal
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
