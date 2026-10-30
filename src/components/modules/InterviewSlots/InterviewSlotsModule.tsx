import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Clock, 
  MapPin, 
  UserCheck, 
  Video, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { InterviewSlot, Candidate, CandidateAllocation, CityVacancy, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Drawer } from '../../common/Drawer';
import { Modal } from '../../common/Modal';
import { formatDate } from '../../../lib/utils';

export interface InterviewSlotsModuleProps {
  slots: InterviewSlot[];
  candidates: Candidate[];
  allocations: CandidateAllocation[];
  vacancies: CityVacancy[];
  selectedDriveId: string;
  onCreateSlot: (slot: Partial<InterviewSlot>) => Promise<void>;
  onAssignCandidate: (slotId: string, candidateId: string) => Promise<void>;
  currentRole: UserRole | null;
}

export const InterviewSlotsModule: React.FC<InterviewSlotsModuleProps> = ({
  slots,
  candidates,
  allocations,
  vacancies,
  selectedDriveId,
  onCreateSlot,
  onAssignCandidate,
  currentRole,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [assigningSlot, setAssigningSlot] = useState<InterviewSlot | null>(null);

  // Form state for creating slot
  const [formData, setFormData] = useState({
    city: 'Bengaluru',
    slotDate: '2026-11-03',
    startTime: '10:00',
    endTime: '11:00',
    interviewerName: 'Dr. Vikram Malhotra',
    interviewerEmail: 'v.malhotra@enterprise.com',
    roomOrLink: 'Interview Suite 201 - Tower B',
    maxCapacity: 1,
  });

  const availableCities = Array.from(new Set(vacancies.map(v => v.city)));

  // Filter slots
  const filteredSlots = slots.filter(s => {
    if (selectedDriveId !== 'ALL' && s.driveId !== selectedDriveId) return false;
    if (selectedCity !== 'ALL' && s.city !== selectedCity) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateSlot({
      ...formData,
      driveId: selectedDriveId === 'ALL' ? undefined : selectedDriveId,
    });
    setIsDrawerOpen(false);
  };

  const handleAssignCandidate = async (candidateId: string) => {
    if (!assigningSlot) return;
    await onAssignCandidate(assigningSlot.id, candidateId);
    setAssigningSlot(null);
  };

  // Find eligible candidates for assignment (allocated to this city and not yet scheduled)
  const scheduledCandidateIds = new Set(slots.filter(s => s.currentCandidateId).map(s => s.currentCandidateId));
  const eligibleCandidates = assigningSlot ? candidates.filter(c => {
    const alloc = allocations.find(a => a.candidateId === c.id);
    const isAllocatedToCity = alloc?.allocatedCity === assigningSlot.city && alloc.status === 'ALLOCATED';
    const isNotYetScheduled = !scheduledCandidateIds.has(c.id);
    return isAllocatedToCity && isNotYetScheduled;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-sage-800 uppercase tracking-wider">
              Workflow Phase 2: Interview Scheduling
            </span>
            <span className="text-xs text-text-muted">• Decoupled Operational Calendar</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Interview Slot Creation & Calendar Grid
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Manage interview suites, interviewer panel schedules, candidate assignments, and room allocations across physical drive campuses and virtual interview suites.
          </p>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="px-4 py-2 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-all self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Interview Slot
        </button>
      </div>

      {/* Filter and View Controls */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-warm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* City Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedCity('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCity === 'ALL'
                ? 'bg-sage-500 text-white'
                : 'bg-sidebar text-text-main hover:bg-white'
            }`}
          >
            All Cities ({slots.length})
          </button>
          {availableCities.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCity(c)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCity === c
                  ? 'bg-sage-500 text-white'
                  : 'bg-sidebar text-text-main hover:bg-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-muted font-medium whitespace-nowrap">Slot Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-sidebar border border-border rounded-lg py-1.5 px-3 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
          >
            <option value="ALL">All Slots</option>
            <option value="AVAILABLE">Available (Open)</option>
            <option value="BOOKED">Booked</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Slots Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlots.map((slot) => (
          <div
            key={slot.id}
            className={`bg-card rounded-xl p-5 border shadow-warm transition-all flex flex-col justify-between ${
              slot.status === 'AVAILABLE' 
                ? 'border-dashed border-sage-300 bg-sage-50/20' 
                : 'border-border'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sage-600" />
                  <span className="text-xs font-bold text-text-main font-mono">
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
                <Badge
                  variant={
                    slot.status === 'AVAILABLE' ? 'sage' :
                    slot.status === 'BOOKED' ? 'terracotta' :
                    slot.status === 'COMPLETED' ? 'success' : 'neutral'
                  }
                  size="sm"
                >
                  {slot.status}
                </Badge>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-text-subtle" />
                  {slot.city} • {formatDate(slot.slotDate)}
                </p>
                <p className="text-xs font-bold text-text-main mt-1">
                  Interviewer: {slot.interviewerName}
                </p>
                <p className="text-[11px] text-text-muted truncate">
                  Room: {slot.roomOrLink}
                </p>
              </div>

              {/* Slot recycling indicator */}
              {slot.recycledAt && (
                <div className="mt-2.5 p-1.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                  ⚡ Recycled Slot from previous cancellation
                </div>
              )}
            </div>

            {/* Candidate Section / Action Button */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              {slot.candidateName ? (
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase block">Assigned Candidate</span>
                  <span className="text-xs font-bold text-sage-700">{slot.candidateName}</span>
                </div>
              ) : (
                <span className="text-[11px] text-text-subtle italic">Open Slot</span>
              )}

              {slot.status === 'AVAILABLE' && (
                <button
                  onClick={() => setAssigningSlot(slot)}
                  className="px-2.5 py-1 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm transition-colors"
                >
                  Assign Candidate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Slot Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Schedule New Interview Slot"
        subtitle="Reserve an interview suite or video room for a panel interviewer."
        width="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Target City</label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Slot Date</label>
              <input
                type="date"
                required
                value={formData.slotDate}
                onChange={(e) => setFormData({ ...formData, slotDate: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Start Time</label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">End Time</label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Interviewer Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Dr. Vikram Malhotra"
                value={formData.interviewerName}
                onChange={(e) => setFormData({ ...formData, interviewerName: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Interviewer Email</label>
              <input
                type="email"
                required
                placeholder="v.malhotra@enterprise.com"
                value={formData.interviewerEmail}
                onChange={(e) => setFormData({ ...formData, interviewerEmail: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-main font-semibold mb-1">Room / Suite Location / Video Link</label>
            <input
              type="text"
              required
              placeholder="e.g., Suite 201 - Tower B, or Google Meet URL"
              value={formData.roomOrLink}
              onChange={(e) => setFormData({ ...formData, roomOrLink: e.target.value })}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm"
            >
              Save Interview Slot
            </button>
          </div>
        </form>
      </Drawer>

      {/* Assign Candidate Modal */}
      <Modal
        isOpen={Boolean(assigningSlot)}
        onClose={() => setAssigningSlot(null)}
        title="Assign Candidate to Interview Slot"
        subtitle={`Slot: ${assigningSlot?.startTime} - ${assigningSlot?.endTime} with ${assigningSlot?.interviewerName} (${assigningSlot?.city})`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-muted">
            The following candidates have been confirmed in <strong>{assigningSlot?.city}</strong> during Phase 1 (Job Allocation) and are waiting for an interview schedule:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {eligibleCandidates.length === 0 ? (
              <div className="p-4 text-center text-text-muted border border-dashed border-border rounded-xl">
                No unscheduled allocated candidates found for {assigningSlot?.city}.
              </div>
            ) : (
              eligibleCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-3 rounded-xl border border-border hover:border-sage-300 bg-sidebar/40 flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-text-main">{cand.fullName}</h5>
                    <p className="text-[11px] text-text-muted">
                      {cand.email} • {cand.yearsExperience}y exp • Score: {cand.assessmentScore}%
                    </p>
                  </div>
                  <button
                    onClick={() => handleAssignCandidate(cand.id)}
                    className="px-3 py-1 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm-sm"
                  >
                    Confirm Assignment
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
