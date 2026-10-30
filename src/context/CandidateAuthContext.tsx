import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  CandidateProfile,
  JobRole,
  HiringDrive,
  AlternativeCityOffer,
  InterviewSlot,
  TimedSlotOffer,
  AttendanceRecord,
  AbsenceAppeal,
  TravelClaim,
  RelocationClaim,
  SupabaseConfigState,
  LocationPreference,
  CandidateSkill,
  EducationItem,
  ExperienceItem,
  RelocationPreferences
} from '../types';

import {
  INITIAL_CANDIDATE,
  SEED_DRIVES,
  SEED_ROLES,
  SEED_ALTERNATIVE_OFFER,
  SEED_SLOTS,
  SEED_TIMED_OFFER,
  SEED_ATTENDANCE,
  SEED_TRAVEL_CLAIMS,
  SEED_RELOCATION_CLAIM
} from '../services/seedData';

import {
  LocalSync,
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  getSupabaseClient,
  isSupabaseConfigured
} from '../services/supabase';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface CandidateAuthContextType {
  // Auth state
  isAuthenticated: boolean;
  authUser: { id: string; email: string; name: string } | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  register: (fullName: string, email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;

  // Candidate Profile
  candidate: CandidateProfile;
  updateProfile: (updates: Partial<CandidateProfile>) => void;
  updateSkills: (skills: CandidateSkill[]) => void;
  updateEducation: (education: EducationItem[]) => void;
  updateExperience: (experience: ExperienceItem[]) => void;
  updateLocationPreferences: (prefs: LocationPreference[], currentCity: string) => void;
  updateRelocationPreferences: (relocation: RelocationPreferences) => void;

  // Job Openings & Role
  drives: HiringDrive[];
  roles: JobRole[];
  selectedRoleId: string;
  setSelectedRoleId: (id: string) => void;
  activeRole: JobRole | undefined;

  // Allocation & Alternative Offers
  alternativeOffer: AlternativeCityOffer | undefined;
  respondToAlternativeOffer: (status: 'ACCEPTED' | 'DECLINED') => void;

  // Slots & Booking
  slots: InterviewSlot[];
  bookedSlot: InterviewSlot | undefined;
  bookInterviewSlot: (slotId: string) => void;
  cancelInterviewBooking: () => void;
  reconfirmInterview: () => void;

  // Waitlist & Timed Offers
  isWaitlisted: boolean;
  timedOffer: TimedSlotOffer | undefined;
  joinWaitlist: () => void;
  leaveWaitlist: () => void;
  claimTimedOffer: (timedOfferId: string) => void;
  declineTimedOffer: (timedOfferId: string) => void;

  // Attendance & Absence Appeals
  attendanceRecord: AttendanceRecord | undefined;
  absenceAppeal: AbsenceAppeal | undefined;
  submitAbsenceAppeal: (data: {
    slotId: string;
    interviewDate: string;
    reasonCategory: AbsenceAppeal['reasonCategory'];
    explanation: string;
    hasDocumentAttachment: boolean;
    documentName?: string;
  }) => void;

  // Claims
  travelClaims: TravelClaim[];
  relocationClaim: RelocationClaim | undefined;
  submitTravelClaim: (claim: Omit<TravelClaim, 'id' | 'candidateId' | 'candidateName' | 'submittedAt' | 'status'>) => void;
  submitRelocationClaim: (claim: Omit<RelocationClaim, 'id' | 'candidateId' | 'candidateName' | 'submittedAt' | 'status'>) => void;

  // Supabase Configuration
  supabaseConfig: SupabaseConfigState;
  updateSupabaseConfig: (cfg: Partial<SupabaseConfigState>) => void;
  testConnection: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  resetToDefaultSeedData: () => void;

  // UI state
  loading: boolean;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
}

const CandidateAuthContext = createContext<CandidateAuthContextType | undefined>(undefined);

export const CandidateAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    false
  );

  const [authUser, setAuthUser] = useState<{ id: string; email: string; name: string } | null>(null);

  // Candidate Profile State
  const [candidate, setCandidate] = useState<CandidateProfile>(() =>
    LocalSync.get<CandidateProfile>('profile', INITIAL_CANDIDATE)
  );

  // Drives & Roles
  const [drives] = useState<HiringDrive[]>(SEED_DRIVES);
  const [roles] = useState<JobRole[]>(SEED_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(candidate.roleId || 'role-fse');

  // Alternative City Offer
  const [alternativeOffer, setAlternativeOffer] = useState<AlternativeCityOffer | undefined>(() =>
    LocalSync.get<AlternativeCityOffer | undefined>('alt_offer', SEED_ALTERNATIVE_OFFER)
  );

  // Slots
  const [slots, setSlots] = useState<InterviewSlot[]>(() =>
    LocalSync.get<InterviewSlot[]>('slots', SEED_SLOTS)
  );

  // Waitlist & Timed Offers
  const [isWaitlisted, setIsWaitlisted] = useState<boolean>(() =>
    LocalSync.get<boolean>('is_waitlisted', false)
  );
  const [timedOffer, setTimedOffer] = useState<TimedSlotOffer | undefined>(() =>
    LocalSync.get<TimedSlotOffer | undefined>('timed_offer', SEED_TIMED_OFFER)
  );

  // Attendance & Absence
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | undefined>(() =>
    LocalSync.get<AttendanceRecord | undefined>('attendance', SEED_ATTENDANCE)
  );
  const [absenceAppeal, setAbsenceAppeal] = useState<AbsenceAppeal | undefined>(() =>
    LocalSync.get<AbsenceAppeal | undefined>('absence_appeal', undefined)
  );

  // Claims
  const [travelClaims, setTravelClaims] = useState<TravelClaim[]>(() =>
    LocalSync.get<TravelClaim[]>('travel_claims', SEED_TRAVEL_CLAIMS)
  );
  const [relocationClaim, setRelocationClaim] = useState<RelocationClaim | undefined>(() =>
    LocalSync.get<RelocationClaim | undefined>('relocation_claim', SEED_RELOCATION_CLAIM)
  );

  // Supabase Configuration
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfigState>(getSavedSupabaseConfig);

  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persistent storage synchronizations
  useEffect(() => { LocalSync.set('alt_offer', alternativeOffer); }, [alternativeOffer]);
  useEffect(() => { LocalSync.set('slots', slots); }, [slots]);
  useEffect(() => { LocalSync.set('is_waitlisted', isWaitlisted); }, [isWaitlisted]);
  useEffect(() => { LocalSync.set('timed_offer', timedOffer); }, [timedOffer]);
  useEffect(() => { LocalSync.set('attendance', attendanceRecord); }, [attendanceRecord]);
  useEffect(() => { LocalSync.set('absence_appeal', absenceAppeal); }, [absenceAppeal]);
  useEffect(() => { LocalSync.set('travel_claims', travelClaims); }, [travelClaims]);
  useEffect(() => { LocalSync.set('relocation_claim', relocationClaim); }, [relocationClaim]);

  // Restore and observe the real Supabase Auth session. No demo identity is created.
  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      setIsAuthenticated(false);
      setAuthUser(null);
      return () => { active = false; };
    }
    const client = getSupabaseClient();
    const applyUser = async (user: any) => {
      if (!active) return;
      if (!user) {
        setIsAuthenticated(false);
        setAuthUser(null);
        return;
      }
      setIsAuthenticated(true);
      setAuthUser({
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.full_name ?? user.email ?? 'Candidate',
      });
      const { data, error } = await client.from('profiles')
        .select('id, email, full_name, phone, avatar_url, metadata')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error('Unable to load candidate profile:', error.message);
        return;
      }
      const saved = data?.metadata?.candidate;
      setCandidate({
        ...INITIAL_CANDIDATE,
        ...(saved && typeof saved === 'object' ? saved : {}),
        id: user.id,
        userId: user.id,
        email: data?.email ?? user.email ?? '',
        fullName: data?.full_name ?? user.user_metadata?.full_name ?? '',
        phone: data?.phone ?? '',
        avatarUrl: data?.avatar_url ?? undefined,
      });
    };
    void client.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Session restore failed:', error.message);
      return applyUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Toast Helpers
  const showToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Active Role Memo
  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  // Booked Slot Memo
  const bookedSlot = useMemo(() => {
    if (!candidate.interviewSlotId) return undefined;
    return slots.find((s) => s.id === candidate.interviewSlotId);
  }, [slots, candidate.interviewSlotId]);

  // Auth Operations
  const login = async (email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) throw error;
      return { success: true, message: 'Signed in successfully.' };
    } catch (err: any) {
      const message = err?.message || 'Unable to sign in. Check your credentials and Supabase configuration.';
      showToast('error', 'Login Failed', message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password: pass,
        options: { data: { full_name: fullName.trim(), role: 'candidate' } },
      });
      if (error) throw error;
      if (!data.session) {
        const message = 'Registration received. Check your email to confirm your account, then sign in.';
        showToast('info', 'Confirm Your Email', message);
        return { success: true, message };
      }
      return { success: true, message: 'Account created and signed in.' };
    } catch (err: any) {
      const message = err?.message || 'Unable to register this account.';
      showToast('error', 'Registration Failed', message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    void getSupabaseClient().auth.signOut().then(({ error }) => {
      if (error) showToast('error', 'Sign Out Failed', error.message);
      else showToast('info', 'Logged Out', 'You have been safely signed out.');
    });
  };

  // Profile Mutations
  const updateProfile = (updates: Partial<CandidateProfile>) => {
    const next = { ...candidate, ...updates, updatedAt: new Date().toISOString() };
    setCandidate(next);
    void (async () => {
      try {
        const client = getSupabaseClient();
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError || !user) throw userError || new Error('Your session has expired. Please sign in again.');
        const { error } = await client.from('profiles').update({
          full_name: next.fullName,
          email: user.email ?? next.email,
          phone: next.phone || null,
          avatar_url: next.avatarUrl || null,
          metadata: { candidate: next },
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
        if (error) throw error;
        showToast('success', 'Profile Updated', 'Your profile was saved to your account.');
      } catch (err: any) {
        showToast('error', 'Save Failed', err?.message || 'Could not save your profile.');
      }
    })();
  };

  const updateSkills = (skills: CandidateSkill[]) => {
    setCandidate((prev) => ({
      ...prev,
      skills,
      updatedAt: new Date().toISOString()
    }));
    showToast('success', 'Skills Saved', 'Competency ratings updated.');
  };

  const updateEducation = (education: EducationItem[]) => {
    setCandidate((prev) => ({
      ...prev,
      education,
      updatedAt: new Date().toISOString()
    }));
    showToast('success', 'Education Saved', 'Academic credentials updated.');
  };

  const updateExperience = (experienceHistory: ExperienceItem[]) => {
    setCandidate((prev) => ({
      ...prev,
      experienceHistory,
      updatedAt: new Date().toISOString()
    }));
    showToast('success', 'Experience Saved', 'Work background updated.');
  };

  const updateLocationPreferences = (locationPreferences: LocationPreference[], currentCity: string) => {
    setCandidate((prev) => ({
      ...prev,
      locationPreferences,
      currentCity,
      updatedAt: new Date().toISOString()
    }));
    showToast('success', 'Preferences Saved', 'City preferences updated.');
  };

  const updateRelocationPreferences = (relocation: RelocationPreferences) => {
    setCandidate((prev) => ({
      ...prev,
      relocation,
      updatedAt: new Date().toISOString()
    }));
    showToast('success', 'Relocation Preferences Saved', 'Mobility terms updated.');
  };

  // Alternative City Offer Decision
  const respondToAlternativeOffer = (status: 'ACCEPTED' | 'DECLINED') => {
    if (!alternativeOffer) return;

    setAlternativeOffer((prev) => (prev ? { ...prev, status } : undefined));

    if (status === 'ACCEPTED') {
      setCandidate((prev) => ({
        ...prev,
        allocatedCity: alternativeOffer.offeredCity,
        allocationStatus: 'ALLOCATED',
        updatedAt: new Date().toISOString()
      }));
      showToast(
        'success',
        'Offer Accepted',
        `Relocation offer accepted! Assigned to ${alternativeOffer.offeredCity} with ₹${alternativeOffer.relocationBonusOffered.toLocaleString()} relocation grant.`
      );
    } else {
      setCandidate((prev) => ({
        ...prev,
        allocationStatus: 'DECLINED',
        updatedAt: new Date().toISOString()
      }));
      showToast('info', 'Offer Declined', 'Alternative city offer declined.');
    }
  };

  // Slot Booking
  const bookInterviewSlot = (slotId: string) => {
    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot) return;

    // Update slot
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              status: 'BOOKED',
              bookedCandidateId: candidate.id,
              bookedCandidateName: candidate.fullName
            }
          : s
      )
    );

    // Update candidate
    setCandidate((prev) => ({
      ...prev,
      interviewSlotId: slotId,
      reconfirmedAttendance: false,
      updatedAt: new Date().toISOString()
    }));

    // Update attendance record
    const newAtt: AttendanceRecord = {
      id: `att-${Date.now().toString().slice(-4)}`,
      slotId,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      roleTitle: activeRole?.title || 'Engineer',
      scheduledTime: `${targetSlot.date}T${targetSlot.startTime}:00Z`,
      status: 'SCHEDULED'
    };
    setAttendanceRecord(newAtt);

    // Leave waitlist if was on it
    setIsWaitlisted(false);
    if (timedOffer && timedOffer.slotId === slotId) {
      setTimedOffer(undefined);
    }

    showToast('success', 'Interview Confirmed', `Interview booked for ${targetSlot.date} at ${targetSlot.startTime}.`);
  };

  const cancelInterviewBooking = () => {
    if (!candidate.interviewSlotId) return;

    const slotId = candidate.interviewSlotId;
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              status: 'AVAILABLE',
              bookedCandidateId: undefined,
              bookedCandidateName: undefined
            }
          : s
      )
    );

    setCandidate((prev) => ({
      ...prev,
      interviewSlotId: undefined,
      reconfirmedAttendance: false,
      updatedAt: new Date().toISOString()
    }));

    if (attendanceRecord) {
      setAttendanceRecord((prev) => (prev ? { ...prev, status: 'RESCHEDULED' } : undefined));
    }

    showToast('info', 'Booking Cancelled', 'Your interview slot has been released back to the candidate pool.');
  };

  const reconfirmInterview = () => {
    setCandidate((prev) => ({
      ...prev,
      reconfirmedAttendance: true,
      reconfirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    showToast('success', 'Attendance Reconfirmed', 'Your attendance confirmation has been submitted to the panel.');
  };

  // Waitlist & Timed Offers
  const joinWaitlist = () => {
    setIsWaitlisted(true);
    showToast('info', 'Added to Waitlist', 'You are queued for the next released interview slot.');
  };

  const leaveWaitlist = () => {
    setIsWaitlisted(false);
    showToast('info', 'Left Waitlist', 'You have opted out of the standby interview waitlist.');
  };

  const claimTimedOffer = (timedOfferId: string) => {
    if (!timedOffer || timedOffer.id !== timedOfferId) return;
    bookInterviewSlot(timedOffer.slotId);
    setTimedOffer((prev) => (prev ? { ...prev, status: 'CLAIMED' } : undefined));
    showToast('success', 'Timed Offer Claimed', 'You claimed the priority slot before time expired!');
  };

  const declineTimedOffer = (timedOfferId: string) => {
    if (!timedOffer || timedOffer.id !== timedOfferId) return;
    setTimedOffer((prev) => (prev ? { ...prev, status: 'DECLINED' } : undefined));
    showToast('info', 'Offer Released', 'Slot released to the next candidate on the standby list.');
  };

  // Absence Appeals
  const submitAbsenceAppeal = (data: {
    slotId: string;
    interviewDate: string;
    reasonCategory: AbsenceAppeal['reasonCategory'];
    explanation: string;
    hasDocumentAttachment: boolean;
    documentName?: string;
  }) => {
    const newAppeal: AbsenceAppeal = {
      ...data,
      id: `app-${Date.now().toString().slice(-4)}`,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      submittedAt: new Date().toISOString(),
      hrDecisionStatus: 'PENDING_REVIEW'
    };

    setAbsenceAppeal(newAppeal);
    showToast('success', 'Appeal Submitted', 'Your absence waiver request has been routed to HR for review.');
  };

  // Claims
  const submitTravelClaim = (
    claimData: Omit<TravelClaim, 'id' | 'candidateId' | 'candidateName' | 'submittedAt' | 'status'>
  ) => {
    const newClaim: TravelClaim = {
      ...claimData,
      id: `trv-${Date.now().toString().slice(-4)}`,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString()
    };
    setTravelClaims((prev) => [newClaim, ...prev]);
    showToast('success', 'Claim Submitted', 'Travel reimbursement claim submitted for HR audit.');
  };

  const submitRelocationClaim = (
    claimData: Omit<RelocationClaim, 'id' | 'candidateId' | 'candidateName' | 'submittedAt' | 'status'>
  ) => {
    const newClaim: RelocationClaim = {
      ...claimData,
      id: `reloc-${Date.now().toString().slice(-4)}`,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString()
    };
    setRelocationClaim(newClaim);
    showToast('success', 'Claim Submitted', 'Relocation allowance request forwarded to corporate mobility.');
  };

  // Supabase Config
  const updateSupabaseConfig = (cfg: Partial<SupabaseConfigState>) => {
    const updated = saveSupabaseConfig(cfg);
    setSupabaseConfigState(updated);
  };

  const testConnection = async (url: string, key: string) => {
    return await testSupabaseConnection(url, key);
  };

  const resetToDefaultSeedData = () => {
    localStorage.clear();
    setCandidate(INITIAL_CANDIDATE);
    setAlternativeOffer(SEED_ALTERNATIVE_OFFER);
    setSlots(SEED_SLOTS);
    setTimedOffer(SEED_TIMED_OFFER);
    setAttendanceRecord(SEED_ATTENDANCE);
    setAbsenceAppeal(undefined);
    setTravelClaims(SEED_TRAVEL_CLAIMS);
    setRelocationClaim(SEED_RELOCATION_CLAIM);
    setIsWaitlisted(false);
    showToast('info', 'Demo Data Reset', 'Local preview data was reset. Sign in to access your account.');
  };

  return (
    <CandidateAuthContext.Provider
      value={{
        isAuthenticated,
        authUser,
        login,
        register,
        logout,
        candidate,
        updateProfile,
        updateSkills,
        updateEducation,
        updateExperience,
        updateLocationPreferences,
        updateRelocationPreferences,
        drives,
        roles,
        selectedRoleId,
        setSelectedRoleId,
        activeRole,
        alternativeOffer,
        respondToAlternativeOffer,
        slots,
        bookedSlot,
        bookInterviewSlot,
        cancelInterviewBooking,
        reconfirmInterview,
        isWaitlisted,
        timedOffer,
        joinWaitlist,
        leaveWaitlist,
        claimTimedOffer,
        declineTimedOffer,
        attendanceRecord,
        absenceAppeal,
        submitAbsenceAppeal,
        travelClaims,
        relocationClaim,
        submitTravelClaim,
        submitRelocationClaim,
        supabaseConfig,
        updateSupabaseConfig,
        testConnection,
        resetToDefaultSeedData,
        loading,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </CandidateAuthContext.Provider>
  );
};

export const useCandidateAuth = (): CandidateAuthContextType => {
  const context = useContext(CandidateAuthContext);
  if (!context) {
    throw new Error('useCandidateAuth must be used within CandidateAuthProvider');
  }
  return context;
};

