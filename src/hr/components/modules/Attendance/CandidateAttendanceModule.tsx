import React, { useState } from 'react';
import { 
  UserCheck2, 
  MapPin, 
  Clock, 
  QrCode, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  UserX,
  Building,
  Check
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatDateTime } from '../../../lib/utils';

export interface CandidateAttendanceModuleProps {
  attendanceRecords: AttendanceRecord[];
  onMarkAttendance: (
    attendanceId: string, 
    status: AttendanceStatus, 
    badgeNumber?: string
  ) => Promise<void>;
  currentRole: UserRole | null;
}

export const CandidateAttendanceModule: React.FC<CandidateAttendanceModuleProps> = ({
  attendanceRecords,
  onMarkAttendance,
  currentRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [checkInModalRecord, setCheckInModalRecord] = useState<AttendanceRecord | null>(null);
  const [badgeNumber, setBadgeNumber] = useState('');

  const filteredRecords = attendanceRecords.filter(r => {
    const matchesSearch = r.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.badgeNumber && r.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCheckIn = (rec: AttendanceRecord) => {
    setCheckInModalRecord(rec);
    const prefix = rec.city.slice(0, 3).toUpperCase();
    setBadgeNumber(`${prefix}-${Math.floor(Math.random() * 899 + 100)}`);
  };

  const handleConfirmCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInModalRecord) return;
    await onMarkAttendance(checkInModalRecord.id, 'CHECKED_IN', badgeNumber);
    setCheckInModalRecord(null);
  };

  const handleMarkAbsent = async (id: string) => {
    await onMarkAttendance(id, 'ABSENT');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-sage-800 uppercase tracking-wider">
              On-Campus Operations
            </span>
            <span className="text-xs text-text-muted">• Live Check-In Console</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Candidate Attendance & Reception Desk
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Record physical candidate arrivals, issue badge passes, route interviewees to designated rooms, and manage real-time attendance status.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-warm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name or badge #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-sidebar border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-muted font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-sidebar border border-border rounded-lg py-1.5 px-3 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
          >
            <option value="ALL">All Attendance States</option>
            <option value="EXPECTED">Expected</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="IN_INTERVIEW">In Interview</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABSENT">Absent (No-Show)</option>
          </select>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sidebar border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-5">Candidate & City</th>
                <th className="py-3 px-4">Scheduled Slot</th>
                <th className="py-3 px-4">Badge Number</th>
                <th className="py-3 px-4">Room Assignment</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-5 text-right">Desk Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-sidebar/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-text-main">{rec.candidateName}</div>
                    <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-sage-600" />
                      <span>{rec.city}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-text-muted">
                    {formatDateTime(rec.scheduledTime)}
                  </td>
                  <td className="py-3.5 px-4">
                    {rec.badgeNumber ? (
                      <span className="font-mono font-bold text-text-main bg-sidebar px-2 py-0.5 rounded border border-border">
                        {rec.badgeNumber}
                      </span>
                    ) : (
                      <span className="text-text-subtle italic">Unissued</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-text-main">
                    {rec.assignedRoom || 'Room Pending'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        rec.status === 'CHECKED_IN' ? 'sage' :
                        rec.status === 'EXPECTED' ? 'warning' :
                        rec.status === 'ABSENT' ? 'danger' : 'success'
                      }
                      size="sm"
                    >
                      {rec.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {rec.status === 'EXPECTED' && (
                        <>
                          <button
                            onClick={() => handleOpenCheckIn(rec)}
                            className="px-2.5 py-1 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold flex items-center gap-1 shadow-warm-sm"
                          >
                            <UserCheck2 className="w-3.5 h-3.5" />
                            Check-In
                          </button>
                          <button
                            onClick={() => handleMarkAbsent(rec.id)}
                            className="px-2.5 py-1 bg-sidebar hover:bg-rose-50 text-rose-700 border border-border rounded-lg font-semibold flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            No-Show
                          </button>
                        </>
                      )}

                      {rec.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => onMarkAttendance(rec.id, 'IN_INTERVIEW')}
                          className="px-2.5 py-1 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg font-semibold shadow-warm-sm"
                        >
                          Send to Interview
                        </button>
                      )}

                      {rec.status === 'IN_INTERVIEW' && (
                        <button
                          onClick={() => onMarkAttendance(rec.id, 'COMPLETED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-warm-sm"
                        >
                          Complete Interview
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check In Badge Issue Modal */}
      <Modal
        isOpen={Boolean(checkInModalRecord)}
        onClose={() => setCheckInModalRecord(null)}
        title="Check-In Candidate & Issue Visitor Badge"
        subtitle={`Candidate: ${checkInModalRecord?.candidateName} at ${checkInModalRecord?.city}`}
      >
        {checkInModalRecord && (
          <form onSubmit={handleConfirmCheckIn} className="space-y-4 text-xs">
            <div>
              <label className="block text-text-main font-semibold mb-1">
                Badge Pass / QR Number
              </label>
              <input
                type="text"
                required
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-mono font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div className="p-3 bg-sage-50 border border-sage-200 rounded-xl text-sage-800">
              <span className="font-bold block">Assigned Room:</span>
              <p className="mt-0.5">{checkInModalRecord.assignedRoom || 'Executive Suite 201'}</p>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCheckInModalRecord(null)}
                className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Check-In
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
