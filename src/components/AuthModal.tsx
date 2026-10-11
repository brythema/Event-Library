/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Lock, Mail, Phone, User, Globe, Briefcase, MapPin, Instagram, Facebook, ArrowRight } from 'lucide-react';
import { User as UserType } from '../types';
import { signIn, signUp, fetchProfile } from '../services/auth';
import { auth } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  initialTab?: 'Buyer' | 'Organizer';
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'Buyer',
}: AuthModalProps) {
  const [role, setRole] = useState<'Buyer' | 'Organizer'>(initialTab);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // Buyer & Shared Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Optional buyer social handles
  const [buyerInstagram, setBuyerInstagram] = useState('');
  const [buyerX, setBuyerX] = useState('');
  const [buyerFacebook, setBuyerFacebook] = useState('');

  // Organizer Fields
  const [businessName, setBusinessName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [orgInstagram, setOrgInstagram] = useState('');
  const [orgFacebook, setOrgFacebook] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsBusy(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        const fbUser = auth.currentUser;
        if (!fbUser) throw new Error('Sign-in did not complete. Please try again.');
        const profile = await fetchProfile(fbUser);
        onSuccess(profile || {
          id: fbUser.uid,
          role: 'Buyer',
          email: fbUser.email || email,
          fullName: fbUser.displayName || 'Account',
          phone: fbUser.phoneNumber || '',
        });
        onClose();
      } else {
        if (!fullName || !email || !phone || !password) {
          setError('Please fill out all required fields.');
          return;
        }
        await signUp({
          role,
          email,
          password,
          fullName,
          phone,
          businessName: role === 'Organizer' ? businessName : undefined,
          businessAddress: role === 'Organizer' ? businessAddress : undefined,
          brandLogo: role === 'Organizer' ? brandLogo : undefined,
          instagram: role === 'Organizer' ? orgInstagram : buyerInstagram,
          facebook: role === 'Organizer' ? orgFacebook : buyerFacebook,
          website: role === 'Organizer' ? orgWebsite : undefined,
        });
        // The profile document carries the identity; construct the immediate
        // session user for routing, then live subscriptions take over.
        onSuccess({
          id: 'session',
          role,
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          businessName: role === 'Organizer' ? (businessName || fullName).trim() : undefined,
          businessAddress: role === 'Organizer' ? (businessAddress || 'Abuja, Nigeria').trim() : undefined,
        });
        onClose();
      }
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="font-sans font-bold text-xl text-gray-900">
              {isLogin ? 'Welcome Back' : 'Join Abuja Events'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Centralized Abuja Events & Ticket Hub
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-6 flex-1">
          {/* Role selector */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRole('Buyer')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                role === 'Buyer' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              For Visitors & Buyers
            </button>
            <button
              type="button"
              onClick={() => setRole('Organizer')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                role === 'Organizer' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              For Organizers
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl p-3.5 font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* EMAIL */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm outline-hidden transition-all text-gray-900"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm outline-hidden transition-all text-gray-900"
                />
              </div>
            </div>

            {/* SIGNUP FIELDS */}
            {!isLogin && (
              <>
                {/* FULL NAME */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm outline-hidden transition-all text-gray-900"
                    />
                  </div>
                </div>

                {/* PHONE NUMBER */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm outline-hidden transition-all text-gray-900"
                    />
                  </div>
                </div>

                {/* SPECIFIC BUYER FIELDS */}
                {role === 'Buyer' && (
                  <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Online Presence (Optional)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">Instagram</label>
                        <input
                          type="text"
                          value={buyerInstagram}
                          onChange={(e) => setBuyerInstagram(e.target.value)}
                          placeholder="@username"
                          className="w-full bg-gray-50 border border-gray-100 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-hidden text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">X (Twitter)</label>
                        <input
                          type="text"
                          value={buyerX}
                          onChange={(e) => setBuyerX(e.target.value)}
                          placeholder="@username"
                          className="w-full bg-gray-50 border border-gray-100 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-hidden text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-1">Facebook</label>
                        <input
                          type="text"
                          value={buyerFacebook}
                          onChange={(e) => setBuyerFacebook(e.target.value)}
                          placeholder="fb.com/username"
                          className="w-full bg-gray-50 border border-gray-100 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-hidden text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SPECIFIC ORGANIZER FIELDS */}
                {role === 'Organizer' && (
                  <div className="border-t border-gray-100 pt-4 mt-2 space-y-4">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Business Details
                    </p>
                    
                    {/* Business Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Business Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                        <input
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Abuja Creative Hub"
                          className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm outline-hidden text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Brand Logo URL */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Brand Logo URL (Optional)
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                        <input
                          type="url"
                          value={brandLogo}
                          onChange={(e) => setBrandLogo(e.target.value)}
                          placeholder="https://images.unsplash.com/... or empty for default"
                          className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm outline-hidden text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Business Address */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                        Business Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                        <input
                          type="text"
                          required
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          placeholder="e.g. Aminu Kano Crescent, Wuse II"
                          className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm outline-hidden text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Organizer Social Presence */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Social Presence & Links
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Instagram</label>
                          <input
                            type="text"
                            value={orgInstagram}
                            onChange={(e) => setOrgInstagram(e.target.value)}
                            placeholder="@brand"
                            className="w-full bg-gray-50 border border-gray-100 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-hidden text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Facebook</label>
                          <input
                            type="text"
                            value={orgFacebook}
                            onChange={(e) => setOrgFacebook(e.target.value)}
                            placeholder="fb.com/brand"
                            className="w-full bg-gray-50 border border-gray-100 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-hidden text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Website (Optional)</label>
                          <input
                            type="text"
                            value={orgWebsite}
                            onChange={(e) => setOrgWebsite(e.target.value)}
                            placeholder="brand.com"
                            className="w-full bg-gray-50 border border-gray-100 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-hidden text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-3.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm mt-6 cursor-pointer"
            >
              {isBusy ? 'Please wait…' : isLogin ? 'Login Securely' : 'Complete Registration'}
              {!isBusy && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Switch Tab */}
          <div className="text-center mt-6 pt-5 border-t border-gray-50">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-xs text-amber-600 hover:text-amber-800 font-semibold"
            >
              {isLogin
                ? "Don't have an account yet? Register here"
                : 'Already have an account? Sign in here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
