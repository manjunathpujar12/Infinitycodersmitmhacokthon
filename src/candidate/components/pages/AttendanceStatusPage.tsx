import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { AbsenceAppeal } from '../../types';
import { Badge } from '../common/Badge';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileQuestion,
  Upload,
  FileText,
  RotateCcw,
  Check
} from 'lucide-react';

export const AttendanceStatusPage: React.FC = () => {
  const {
    attendanceRecord,
    absenceAppeal,
    submitAbsenceAppeal,
    bookedSlot,
    candidate
  } = useCandidateAuth();

  const [reasonCategory, setReasonCategory] = useState<AbsenceAppeal['reasonCategory']>('TRAVEL_DELAY');
  const [explanation, setExplanation] = useState('');
  const [documentName, setDocumentName] = useState('Medical_Transit_Document.pdf');
  const [hasDoc, setHasDoc] = useState(true);

  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    submitAbsenceAppeal({
      slotId: bookedSlot?.id || 'slt-101',
      interviewDate: bookedSlot?.date || new Date().toISOString().split('T')[0],
      reasonCategory,
      explanation,
      hasDocumentAttachment: hasDoc,
      documentName: hasDoc ? documentName : undefined
    });
    setExplanation('');
  };

  const steps = [
    { label: 'Scheduled', status: 'done' },
    { label: 'Check-In', status: attendanceRecord?.checkInTime ? 'done' : 'current' },
    { label: 'In Progress', status: attendanceRecord?.interviewStartTime ? 'done' : 'upcoming' },
    { label: 'Completed', status: attendanceRecord?.status === 'COMPLETED' ? 'done' : 'upcoming' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Live Attendance Status & Absence Appeals
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Real-time interview check-in tracking and formal absence waiver submission
        </p>
      </div>

      {/* Live Stepper Card */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Interview Day Execution Progress
          </h3>
          <Badge
            variant={attendanceRecord?.status === 'COMPLETED' ? 'success' : 'sage'}
            size="md"
          >
            {attendanceRecord?.status || 'SCHEDULED'}
          </Badge>
        </div>

        {/* Progress Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {steps.map((step, idx) => (
            <div
              key={step.label}
              className={`p-4 rounded-xl border space-y-1.5 ${
                step.status === 'done'
                  ? 'bg-primary-light/50 border-primary/40'
                  : step.status === 'current'
                  ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                  : 'bg-[#FAF9F5] border-borderMuted opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-textMuted">Stage 0{idx + 1}</span>
                {step.status === 'done' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                {step.status === 'current' && <Clock className="w-4 h-4 text-amber-600 animate-spin" />}
              </div>
              <span className="text-xs font-extrabold text-textPrimary block">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Absence Appeal Status if already submitted */}
      {absenceAppeal && (
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-textMuted uppercase block">
                Appeal Ref: {absenceAppeal.id}
              </span>
              <h3 className="text-base font-bold text-textPrimary">
                Absence Appeal Review Status
              </h3>
            </div>
            <Badge
              variant={
                absenceAppeal.hrDecisionStatus === 'RESCHEDULE_GRANTED'
                  ? 'success'
                  : absenceAppeal.hrDecisionStatus === 'APPEAL_REJECTED'
                  ? 'error'
                  : 'warning'
              }
              size="md"
            >
              {absenceAppeal.hrDecisionStatus.replace('_', ' ')}
            </Badge>
          </div>

          <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-borderMuted text-xs space-y-1">
            <span className="font-bold text-textPrimary">Submitted Justification:</span>
            <p className="text-textMuted italic">"{absenceAppeal.explanation}"</p>
          </div>

          {absenceAppeal.hrDecisionNotes && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950">
              <span className="font-bold block">HR Adjudication Feedback:</span>
              <p className="mt-0.5">{absenceAppeal.hrDecisionNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Submit New Absence Appeal Form */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-5">
        <div>
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <FileQuestion className="w-4 h-4 text-secondary" /> Submit Absence Reason Appeal
          </h3>
          <p className="text-xs text-textMuted mt-0.5">
            If an emergency, transit failure, or illness prevents your attendance, submit a formal appeal for an excused reschedule
          </p>
        </div>

        <form onSubmit={handleSubmitAppeal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Primary Reason Category
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
              >
                <option value="MEDICAL_EMERGENCY">Medical Emergency / Sudden Illness</option>
                <option value="TRAVEL_DELAY">Travel / Flight / Train Intercity Delay</option>
                <option value="TECHNICAL_CONNECTIVITY">ISP Power Outage / Hardware Failure</option>
                <option value="FAMILY_EMERGENCY">Urgent Family Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Supporting Certificate / Document Name
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Doctor_Note_or_Railway_Notice.pdf"
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
              Detailed Explanation of Circumstances
            </label>
            <textarea
              rows={4}
              required
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Provide exact details of the event, flight/train PNR, or medical urgency..."
              className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary leading-relaxed focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Submit Absence Appeal for HR Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

