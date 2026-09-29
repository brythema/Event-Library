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
    if (currentUser.id === 'admin') {
      onNavigate('admin-dashboard');
    } else if (currentUser.role === 'Organizer') {
      onNavigate('organizer-dashboard');
    } else {
      onNavigate('buyer-dashboard');
    }
  };

  const getDashboardLabel = () => {
    if (!currentUser) return '';
    if (currentUser.id === 'admin') return 'Admin Panel';
    if (currentUser.role === 'Organizer') return 'Organizer Workspace';
    return 'My Tickets Portal';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-sans font-black text-xl shadow-md shadow-amber-600/20 group-hover:bg-amber-700 transition-colors">
            A
          </div>
          <div>
            <span className="font-sans font-black text-lg text-gray-900 tracking-tight leading-none block">
              Abuja Events
            </span>
            <span className="text-[9px] text-gray-400 font-bold tracking-wider uppercase block mt-0.5">
              Capital City Platform
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-gray-600">
          <button
            onClick={() => onNavigate('home')}
            className={`hover:text-amber-700 transition-colors cursor-pointer ${
              activeView === 'home' ? 'text-amber-600 font-bold' : ''
            }`}
          >
            Explore Events
          </button>
          <button
            onClick={() => onNavigate('about')}
            className={`hover:text-amber-700 transition-colors cursor-pointer ${
              activeView === 'about' ? 'text-amber-600 font-bold' : ''
            }`}
          >
            About & Contacts
          </button>
          <button
            onClick={() => onNavigate('create-event')}
            className="flex items-center gap-1 text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
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
                className="flex items-center gap-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser.id === 'admin' ? 'A' : currentUser.fullName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="font-bold text-gray-800 block leading-none">{currentUser.fullName}</span>
                  <span className="text-[9px] text-amber-600 font-bold block mt-0.5">{currentUser.role}</span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 text-xs text-gray-700 animate-fade-in">
                  <div className="px-3.5 py-2 border-b border-gray-50">
                    <p className="font-bold text-gray-900 truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{currentUser.email}</p>
                  </div>

                  <button
                    onClick={handleDashboardRedirect}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 hover:text-amber-800 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <Sparkles size={14} /> {getDashboardLabel()}
                  </button>

                  {currentUser.id === 'admin' && (
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onNavigate('admin-dashboard');
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 hover:text-amber-800 transition-colors flex items-center gap-2 font-semibold text-amber-700"
                    >
                      <ShieldAlert size={14} /> Admin Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2 font-semibold border-t border-gray-50 mt-1"
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
                className="hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Login as Buyer
              </button>
              <button
                onClick={() => onAuthTrigger('Organizer')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1"
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
