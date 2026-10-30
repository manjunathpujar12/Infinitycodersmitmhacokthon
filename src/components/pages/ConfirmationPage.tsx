import React from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Video,
  User,
  ShieldCheck,
  XCircle,
  Calendar,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { CandidateTabId } from '../common/Sidebar';

export const ConfirmationPage: React.FC<{ onNavigateToSlots: () => void }> = ({ onNavigateToSlots }) => {
  const {
    bookedSlot,
    candidate,
    activeRole,
    reconfirmInterview,
    cancelInterviewBooking
  } = useCandidateAuth();

  if (!bookedSlot) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
            Interview Confirmation & Reconfirmation
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Confirmed interview bookings and 24-hour mandatory attendance acknowledgments
          </p>
        </div>

        <EmptyState
          icon={CalendarCheck}
          title="No Active Interview Slot Scheduled"
          description="You do not currently have a booked technical interview slot. Please visit the Slot Selection page to choose a time window."
          actionText="Browse Available Slots"
          onAction={onNavigateToSlots}
        />
      </div>
    );
  }

  const isReconfirmed = candidate.reconfirmedAttendance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Interview Confirmation & Attendance Reconfirmation
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Official booking confirmation pass. Candidates are required to reconfirm attendance within 24 hours of scheduled time
        </p>
      </div>

      {/* Main Confirmation Hero Card */}
      <div className="bg-cards rounded-2xl border border-borderMuted p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-borderMuted">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-textMuted uppercase">
                Booking Reference: {bookedSlot.id}
              </span>
              <h3 className="text-xl font-extrabold text-textPrimary">
                Confirmed: {activeRole?.title}
              </h3>
            </div>
          </div>

          <div>
            {isReconfirmed ? (
              <Badge variant="success" size="md">
                <CheckCircle2 className="w-4 h-4" /> ATTENDANCE RECONFIRMED
              </Badge>
            ) : (
              <Badge variant="warning" size="md">
                <AlertTriangle className="w-4 h-4" /> PENDING RECONFIRMATION
              </Badge>
            )}
          </div>
        </div>

        {/* Schedule & Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-borderMuted space-y-1">
            <span className="text-[10px] uppercase font-bold text-textMuted block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Interview Date
            </span>
            <span className="text-base font-extrabold text-textPrimary font-mono block">
              {bookedSlot.date}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-borderMuted space-y-1">
            <span className="text-[10px] uppercase font-bold text-textMuted block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" /> Time Window
            </span>
            <span className="text-base font-extrabold text-textPrimary font-mono block">
              {bookedSlot.startTime} - {bookedSlot.endTime} (IST)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-borderMuted space-y-1">
            <span className="text-[10px] uppercase font-bold text-textMuted block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Mode & Location
            </span>
            <span className="text-base font-extrabold text-textPrimary block">
              {bookedSlot.locationCity} ({bookedSlot.mode})
            </span>
          </div>
        </div>

        {/* Meeting Link / Venue Card */}
        <div className="p-4 rounded-xl bg-sidebar border border-borderMuted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-textPrimary block flex items-center gap-1.5">
              {bookedSlot.mode === 'VIRTUAL' ? <Video className="w-4 h-4 text-primary" /> : <MapPin className="w-4 h-4 text-primary" />}
              {bookedSlot.mode === 'VIRTUAL' ? 'Virtual Conference Room' : 'Office Center Address'}
            </span>
            <span className="text-textMuted font-mono mt-0.5 block truncate max-w-md">
              {bookedSlot.venueOrLink}
            </span>
          </div>

          {bookedSlot.mode === 'VIRTUAL' && (
            <a
              href={bookedSlot.venueOrLink}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-cards border border-borderDark text-textPrimary font-bold rounded-xl hover:bg-sidebar transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-subtle"
            >
              <span>Test Meeting Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Panelist Card */}
        <div className="p-4 rounded-xl bg-[#FAF9F5] border border-borderMuted flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cards border border-borderDark rounded-xl text-primary font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-textPrimary block">
                Lead Interviewer: {bookedSlot.panel.leadInterviewerName}
              </span>
              <span className="text-textMuted">
                {bookedSlot.panel.department} • {bookedSlot.panel.leadInterviewerEmail}
              </span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-primary font-mono bg-primary-light px-2 py-0.5 rounded">
            Verified Panel
          </span>
        </div>

        {/* 24-hr Reconfirmation Callout */}
        <div className="p-4 rounded-xl border border-borderMuted bg-cards space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> 24-Hour Attendance Reconfirmation
              </h4>
              <p className="text-xs text-textMuted mt-0.5">
                {isReconfirmed
                  ? `Reconfirmed on ${candidate.reconfirmedAt?.split('T')[0]}. Your slot is safely locked with the interviewer.`
                  : 'Please reconfirm that your system, camera, and schedule are ready for this interview window.'}
              </p>
            </div>

            {!isReconfirmed ? (
              <button
                onClick={reconfirmInterview}
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-1.5 flex-shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" /> Reconfirm Attendance Now
              </button>
            ) : null}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-4 border-t border-borderMuted flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('Cancel this interview booking? The slot will be returned to the candidate pool.')) {
                cancelInterviewBooking();
              }
            }}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 transition-colors flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" /> Cancel & Release Booking
          </button>

          <span className="text-[11px] text-textMuted font-mono">
            Candidate ID: {candidate.id}
          </span>
        </div>
      </div>
    </div>
  );
};

