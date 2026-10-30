import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import {
  Layers,
  Database,
  LogOut,
  MapPin,
  Clock,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { SupabaseModal } from './SupabaseModal';
import { Badge } from './Badge';

export const Navbar: React.FC = () => {
  const {
    candidate,
    logout,
    supabaseConfig,
    timedOffer,
    alternativeOffer
  } = useCandidateAuth();

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-cards border-b border-borderMuted shadow-subtle px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-textPrimary tracking-tight">
                  HireSlot
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-primary-light text-primary-dark border border-primary/20">
                  Candidate Portal
                </span>
              </div>
              <p className="text-[10px] text-textMuted font-medium leading-none mt-0.5">
                Career Opportunities, Interview Scheduling & Relocation
              </p>
            </div>
          </div>

          {/* Center Alert Pills: Timed Offers or Alternative City Offers */}
          <div className="hidden lg:flex items-center gap-2">
            {timedOffer && timedOffer.status === 'ACTIVE' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-secondary-light border border-secondary/30 rounded-full text-xs font-bold text-secondary-dark animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>Priority Interview Slot Available!</span>
              </div>
            )}

            {candidate.allocatedCity ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-900">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Allocated: {candidate.allocatedCity}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-sidebar border border-borderMuted rounded-full text-xs font-semibold text-textMuted">
                <span>Location Allocation: Pending</span>
              </div>
            )}
          </div>

          {/* Right Tools & Candidate Profile */}
          <div className="flex items-center gap-3">
            {/* Supabase Status Pill */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                supabaseConfig.isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-[#F8F7F2] text-textMuted border-borderMuted hover:border-borderDark hover:text-textPrimary'
              }`}
              title="Supabase Database Configuration"
            >
              <Database className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Supabase</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>

            {/* Candidate Identity */}
            <div className="flex items-center gap-2 pl-2 border-l border-borderMuted">
              <img
                src={candidate.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                alt={candidate.fullName}
                className="w-8 h-8 rounded-full object-cover border border-borderDark ring-1 ring-primary/20"
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-textPrimary leading-none">
                  {candidate.fullName}
                </div>
                <div className="text-[10px] text-textMuted mt-0.5 leading-none">
                  {candidate.email}
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-1.5 text-textMuted hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Supabase Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </>
  );
};

