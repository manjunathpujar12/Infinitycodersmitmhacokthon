import React from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import {
  User,
  GraduationCap,
  MapPin,
  Compass,
  Briefcase,
  Target,
  Building,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Activity,
  Plane,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

export type CandidateTabId =
  | 'profile'
  | 'skills-experience'
  | 'location-preferences'
  | 'relocation-preferences'
  | 'job-openings'
  | 'role-matching'
  | 'allocation-status'
  | 'slot-booking'
  | 'waitlist-timed-offers'
  | 'confirmation'
  | 'attendance-status'
  | 'travel-claims'
  | 'relocation-claims';

interface SidebarProps {
  activeTab: CandidateTabId;
  onTabChange: (tab: CandidateTabId) => void;
}

interface NavItem {
  id: CandidateTabId;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: 'primary' | 'secondary' | 'emerald';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const {
    alternativeOffer,
    timedOffer,
    candidate,
    isWaitlisted
  } = useCandidateAuth();

  const sections: NavSection[] = [
    {
      title: 'Profile & Background',
      items: [
        {
          id: 'profile',
          label: 'Candidate Profile',
          icon: User
        },
        {
          id: 'skills-experience',
          label: 'Skills & Experience',
          icon: GraduationCap
        },
        {
          id: 'location-preferences',
          label: 'Preferred Cities',
          icon: MapPin
        },
        {
          id: 'relocation-preferences',
          label: 'Willingness to Relocate',
          icon: Compass
        }
      ]
    },
    {
      title: 'Role Matching',
      items: [
        {
          id: 'job-openings',
          label: 'Job Openings',
          icon: Briefcase
        },
        {
          id: 'role-matching',
          label: 'Role Match & Skill Gaps',
          icon: Target
        }
      ]
    },
    {
      title: 'Location & Offers',
      items: [
        {
          id: 'allocation-status',
          label: 'Location Allocation',
          icon: Building,
          badge: alternativeOffer?.status === 'PENDING' ? '1 Alt Offer' : undefined,
          badgeColor: 'secondary'
        }
      ]
    },
    {
      title: 'Interview Lifecycle',
      items: [
        {
          id: 'slot-booking',
          label: 'Interview Slot Booking',
          icon: CalendarCheck
        },
        {
          id: 'waitlist-timed-offers',
          label: 'Waitlist & Timed Offers',
          icon: Clock,
          badge: timedOffer && timedOffer.status === 'ACTIVE' ? '15m Exp' : isWaitlisted ? 'Queued' : undefined,
          badgeColor: 'secondary'
        },
        {
          id: 'confirmation',
          label: 'Interview Confirmation',
          icon: CheckCircle2,
          badge: candidate.interviewSlotId ? 'Booked' : undefined,
          badgeColor: 'emerald'
        },
        {
          id: 'attendance-status',
          label: 'Attendance & Appeals',
          icon: Activity
        }
      ]
    },
    {
      title: 'Reimbursements & Payroll',
      items: [
        {
          id: 'travel-claims',
          label: 'Travel Support Claims',
          icon: Plane
        },
        {
          id: 'relocation-claims',
          label: 'Relocation & Payment',
          icon: CreditCard
        }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-borderMuted flex flex-col flex-shrink-0 min-h-[calc(100vh-57px)] select-none">
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h5 className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-textMuted/80 mb-2">
              {section.title}
            </h5>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left group ${isActive
                      ? 'bg-primary text-white shadow-subtle font-bold'
                      : 'text-textPrimary hover:bg-[#E5E7DD] hover:text-textPrimary'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-primary group-hover:text-textPrimary'
                          }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor === 'secondary'
                            ? 'bg-secondary-light text-secondary-dark border border-secondary/30'
                            : 'bg-emerald-100 text-emerald-800'
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Security notice at sidebar bottom */}
      <div className="p-3 border-t border-borderMuted bg-[#E8EAE1]/60 m-2 rounded-xl text-[11px] text-textMuted">
        <div className="font-bold text-textPrimary flex items-center gap-1.5 mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> RLS Privacy Guard
        </div>
        You are authenticated in candidate-only context. Your data is isolated and protected.
      </div>
    </aside>
  );
};

