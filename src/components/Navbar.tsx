import React from 'react';
import { Briefcase, Sliders, ShieldCheck, UserCheck, LayoutDashboard, Radio } from 'lucide-react';
import { JobRole, HrRankingWeights } from '../types/matching';

interface NavbarProps {
  jobs: JobRole[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  rankingWeights: HrRankingWeights;
  onOpenRankingModal: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  portalMode: 'HR' | 'CANDIDATE';
  onTogglePortalMode: (mode: 'HR' | 'CANDIDATE') => void;
  pendingOffersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  rankingWeights,
  onOpenRankingModal,
  activeTab,
  onSelectTab,
  portalMode,
  onTogglePortalMode,
  pendingOffersCount = 0,
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

          {/* Portal Switcher & Job Selector */}
          <div className="flex items-center space-x-3">
            {/* Dual Portal Switcher: HR vs Candidate */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => onTogglePortalMode('HR')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                  portalMode === 'HR'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                <span>HR Dashboard (Member 3)</span>
              </button>

              <button
                onClick={() => onTogglePortalMode('CANDIDATE')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition relative ${
                  portalMode === 'CANDIDATE'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Candidate Portal</span>
                {pendingOffersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                    {pendingOffersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Job Role Selector */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <label htmlFor="job-selector" className="sr-only">Select Role</label>
              <select
                id="job-selector"
                value={selectedJobId}
                onChange={(e) => onSelectJob(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.department})
                  </option>
                ))}
              </select>
            </div>

            {/* HR Rules Trigger */}
            {portalMode === 'HR' && (
              <button
                onClick={onOpenRankingModal}
                className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-sm"
                title="Configure HR Candidate Ranking Rules"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Rules: {rankingWeights.ruleName}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-6 border-t border-slate-100 pt-1 -mb-px text-sm font-medium overflow-x-auto">
          {portalMode === 'HR' ? (
            [
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
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))
          ) : (
            [
              { id: 'candidate-decision', label: 'My Allocation & Offers' },
              { id: 'candidate-matching', label: 'My Skill Profile & Match' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}
        </div>
      </div>
    </header>
  );
};
