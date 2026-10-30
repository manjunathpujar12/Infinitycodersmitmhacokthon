import React from 'react';
import { Clock, Calendar, CheckCircle, ArrowUpRight, User, MapPin } from 'lucide-react';
import { WaitlistEntry } from '../types/waitlist';
import { formatDate } from '../lib/utils';
import { rankWaitlistEntries } from '../engine/waitlistManager';

interface WaitlistManagerViewProps {
  waitlist: WaitlistEntry[];
  onRefreshData: () => void;
}

export const WaitlistManagerView: React.FC<WaitlistManagerViewProps> = ({
  waitlist,
}) => {
  const rankedEntries = rankWaitlistEntries(waitlist);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Future-Date & Location Capacity Buffer</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Candidate Waitlist Queue
          </h2>
          <p className="text-sm text-slate-600">
            Prioritized FIFO queue evaluated by role match score, joining readiness, and target hub preference.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {rankedEntries.filter((e) => e.status === 'QUEUED').length} Queued Applicants
          </span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {rankedEntries.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800">Waitlist is Empty</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Candidates who decline an alternative city or whose preferred hubs are full are automatically added here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Queue Rank</th>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Target Hub</th>
                  <th className="px-6 py-3">Available From</th>
                  <th className="px-6 py-3">Match Score</th>
                  <th className="px-6 py-3">Priority Score</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Waitlist Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rankedEntries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-black text-slate-900">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-slate-900">
                          {entry.candidateName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{entry.preferredCityName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-700">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(entry.availableFrom)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-indigo-600">
                      {entry.matchScore}%
                    </td>
                    <td className="px-6 py-3.5 font-black text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {entry.priorityScore} pts
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          entry.status === 'PROMOTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500 max-w-xs truncate" title={entry.waitlistReason}>
                      {entry.waitlistReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

