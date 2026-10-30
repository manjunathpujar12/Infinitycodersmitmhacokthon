import React, { useState, useEffect } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { Badge } from '../common/Badge';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Calendar,
  MapPin,
  Check,
  X,
  UserCheck
} from 'lucide-react';

export const WaitlistTimedOffersPage: React.FC<{ onNavigateToConfirmation: () => void }> = ({
  onNavigateToConfirmation
}) => {
  const {
    isWaitlisted,
    joinWaitlist,
    leaveWaitlist,
    timedOffer,
    claimTimedOffer,
    declineTimedOffer,
    candidate,
    activeRole
  } = useCandidateAuth();

  // 15-Minute Countdown Timer logic
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({
    minutes: 14,
    seconds: 45
  });

  useEffect(() => {
    if (!timedOffer || timedOffer.status !== 'ACTIVE') return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(timedOffer.expiresAt).getTime();
      const diff = Math.max(0, expires - now);

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ minutes, seconds });

      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timedOffer]);

  const handleClaim = () => {
    if (!timedOffer) return;
    claimTimedOffer(timedOffer.id);
    onNavigateToConfirmation();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Standby Waitlist & Timed Slot Offers
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Priority slot recovery engine: when booked interview windows are vacated, waitlisted candidates receive timed claim offers
        </p>
      </div>

      {/* Active Timed Offer Hero Card with Live Countdown Timer */}
      {timedOffer && timedOffer.status === 'ACTIVE' ? (
        <div className="bg-secondary-light/50 border-2 border-secondary/50 rounded-2xl p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary text-white rounded-xl shadow-subtle animate-bounce">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-secondary-dark">
                  Priority Access Window
                </span>
                <h3 className="text-lg font-extrabold text-textPrimary">
                  A Recovered Interview Slot is Reserved for You!
                </h3>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="bg-cards border border-secondary/40 px-4 py-2 rounded-xl text-center shadow-subtle">
              <span className="text-[10px] uppercase font-bold text-textMuted block">Offer Expires In</span>
              <div className="text-xl font-extrabold font-mono text-secondary-dark flex items-center gap-1 justify-center">
                <Clock className="w-4 h-4 text-secondary animate-spin" />
                <span>
                  {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Reserved Slot Details Box */}
          <div className="p-4 bg-cards/90 rounded-xl border border-secondary/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-textMuted block">Date & Time</span>
              <span className="font-extrabold text-textPrimary font-mono mt-0.5 block">
                {timedOffer.slotDetails.date} ({timedOffer.slotDetails.time})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-textMuted block">Office Hub</span>
              <span className="font-bold text-primary mt-0.5 block">
                {timedOffer.slotDetails.city} Tech Center
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-textMuted block">Role</span>
              <span className="font-semibold text-textPrimary mt-0.5 block">
                {timedOffer.slotDetails.role}
              </span>
            </div>
          </div>

          <p className="text-xs text-textMuted leading-relaxed">
            Please confirm or release this slot within the countdown timer. If unconfirmed, the slot will
            automatically rotate to the next waitlisted applicant.
          </p>

          {/* Claim / Decline Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={() => declineTimedOffer(timedOffer.id)}
              className="w-full sm:w-auto px-4 py-2 border border-borderDark text-textPrimary hover:bg-sidebar rounded-xl text-xs font-bold transition-colors"
            >
              Release Slot to Next Candidate
            </button>
            <button
              onClick={handleClaim}
              className="w-full sm:w-auto px-6 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary-hover transition-colors shadow-subtle flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Claim & Confirm Interview Slot
            </button>
          </div>
        </div>
      ) : null}

      {/* Waitlist Status & Management Card */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sidebar flex items-center justify-center text-primary flex-shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-textMuted block">
                Current Standby Queue Status
              </span>
              <h3 className="text-base font-bold text-textPrimary flex items-center gap-2">
                {isWaitlisted ? (
                  <>
                    <span>Active on Standby Waitlist</span>
                    <Badge variant="sage" size="sm">
                      STANDBY ACTIVE
                    </Badge>
                  </>
                ) : (
                  <>
                    <span>Not Currently Waitlisted</span>
                    <Badge variant="neutral" size="sm">
                      OFF WAITLIST
                    </Badge>
                  </>
                )}
              </h3>
            </div>
          </div>

          <div>
            {isWaitlisted ? (
              <button
                onClick={leaveWaitlist}
                className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
              >
                Leave Waitlist
              </button>
            ) : (
              <button
                onClick={joinWaitlist}
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" /> Join Interview Waitlist
              </button>
            )}
          </div>
        </div>

        <div className="p-3 bg-[#FAF9F5] rounded-xl border border-borderMuted text-xs text-textMuted space-y-1">
          <span className="font-bold text-textPrimary block">How Standby Recovery Works:</span>
          <p>
            When existing candidates reschedule, cancel, or mark no-show, the system instantly recovers
            the slot and transmits a 15-minute priority claim notification directly to your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

