import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { InterviewSlot } from '../../types';
import { Badge } from '../common/Badge';
import {
  CalendarCheck,
  Clock,
  MapPin,
  Video,
  User,
  CheckCircle2,
  Calendar,
  Filter,
  ArrowRight
} from 'lucide-react';

export const SlotBookingPage: React.FC<{ onNavigateToConfirmation: () => void }> = ({
  onNavigateToConfirmation
}) => {
  const {
    slots,
    bookInterviewSlot,
    candidate,
    bookedSlot,
    activeRole
  } = useCandidateAuth();

  const [dateFilter, setDateFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  // Available slots for candidate's role and city
  const availableSlots = slots.filter((s) => {
    const isAvailable = s.status === 'AVAILABLE' || s.status === 'RECOVERED';
    const matchesRole = s.roleId === candidate.roleId;
    const matchesCity = !candidate.allocatedCity || s.locationCity === candidate.allocatedCity;
    const matchesDate = dateFilter === 'ALL' || s.date === dateFilter;
    const matchesMode = modeFilter === 'ALL' || s.mode === modeFilter;
    return isAvailable && matchesRole && matchesCity && matchesDate && matchesMode;
  });

  const uniqueDates = Array.from(new Set(slots.map((s) => s.date))).sort();

  const handleBook = (slotId: string) => {
    bookInterviewSlot(slotId);
    onNavigateToConfirmation();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
            Interview Slot Selection & Scheduling
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Select a verified technical interview window with the engineering panel for{' '}
            <span className="font-bold text-textPrimary">{activeRole?.title}</span>
          </p>
        </div>

        {bookedSlot && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Slot Currently Booked
            </span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-cards p-4 rounded-2xl border border-borderMuted shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-textMuted" />
          <span className="text-xs font-bold text-textPrimary">Filter Slots:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
          >
            <option value="ALL">All Available Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
          >
            <option value="ALL">All Interview Modes</option>
            <option value="VIRTUAL">Virtual Video Meet</option>
            <option value="IN_PERSON">In-Person Office Center</option>
          </select>
        </div>
      </div>

      {/* Available Slots Grid */}
      {availableSlots.length === 0 ? (
        <div className="bg-cards p-12 rounded-2xl border border-dashed border-borderDark text-center space-y-3">
          <CalendarCheck className="w-10 h-10 text-textMuted mx-auto" />
          <h3 className="text-sm font-bold text-textPrimary">No Direct Slots Available for This Filter</h3>
          <p className="text-xs text-textMuted max-w-sm mx-auto">
            All current slots for this round are filled. You can join the Standby Waitlist to receive
            instant 15-minute priority access when slots are recovered!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {availableSlots.map((slot) => (
            <div
              key={slot.id}
              className={`bg-cards rounded-2xl border p-5 shadow-subtle flex flex-col justify-between transition-all ${
                slot.isRecoveredSlot
                  ? 'border-secondary/40 bg-secondary-light/20'
                  : 'border-borderMuted hover:border-primary/50 hover:shadow-card'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-textPrimary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" /> {slot.startTime} - {slot.endTime}
                  </span>
                  {slot.isRecoveredSlot ? (
                    <Badge variant="terracotta" size="sm">
                      RECOVERED SLOT
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm">
                      AVAILABLE
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-textPrimary flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" /> {slot.date}
                  </h4>
                  <div className="text-xs text-textMuted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-primary" /> {slot.locationCity} ({slot.mode})
                  </div>
                </div>

                {/* Interviewer Panel info */}
                <div className="p-2.5 rounded-xl bg-sidebar border border-borderMuted text-xs text-textMuted space-y-0.5">
                  <span className="font-bold text-textPrimary block">
                    Panel Lead: {slot.panel.leadInterviewerName}
                  </span>
                  <span className="text-[11px] block">{slot.panel.department}</span>
                </div>
              </div>

              {/* Book Action */}
              <div className="mt-5 pt-3 border-t border-borderMuted flex items-center justify-between">
                <span className="text-[10px] text-textMuted font-mono">{slot.id}</span>
                <button
                  onClick={() => handleBook(slot.id)}
                  className="px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-1.5"
                >
                  <span>Book This Slot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

