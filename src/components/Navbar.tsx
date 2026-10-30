import React from 'react';
import { Briefcase, Sliders, ShieldCheck } from 'lucide-react';
import { JobRole, HrRankingWeights } from '../types/matching';

interface NavbarProps {
  jobs: JobRole[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  rankingWeights: HrRankingWeights;
  onOpenRankingModal: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  rankingWeights,
  onOpenRankingModal,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-brand-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Hire<span className="text-indigo-600">Slot</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Allocation Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Recruitment, Matching & Location Allocation Platform
              </p>
            </div>
          </div>

          {/* Job Role Selector & HR Weight Presets Trigger */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <label htmlFor="job-selector" className="sr-only">Select Role</label>
              <select
                id="job-selector"
                value={selectedJobId}
                onChange={(e) => onSelectJob(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.department})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenRankingModal}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition shadow-sm"
              title="Configure HR Candidate Ranking Rules"
            >
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>HR Rules: <strong className="text-slate-900">{rankingWeights.ruleName}</strong></span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-8 border-t border-slate-100 pt-1 -mb-px text-sm font-medium">
          {[
            { id: 'allocation', label: 'Allocation Console' },
            { id: 'matching', label: 'Role Match & Skill Gaps' },
            { id: 'vacancies', label: 'City Vacancies' },
            { id: 'overflow', label: 'Overflow & Haversine' },
            { id: 'waitlist', label: 'Waitlist Queue' },
            { id: 'audit', label: 'Audit Trail' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

