import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  GraduationCap,
  Briefcase,
  Layers,
  Info,
} from 'lucide-react';
import { CandidateProfile, JobRole, RoleMatchScoreBreakdown } from '../types/matching';
import { evaluateCandidateRoleMatch } from '../engine/matchingEngine';

interface RoleMatchingViewProps {
  candidates: CandidateProfile[];
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
  job: JobRole;
}

export const RoleMatchingView: React.FC<RoleMatchingViewProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  job,
}) => {
  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  const evaluation: RoleMatchScoreBreakdown = evaluateCandidateRoleMatch(
    selectedCandidate,
    job
  );

  return (
    <div className="space-y-6">
      {/* Candidate Selector Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Select Candidate for Evaluation
          </span>
          <p className="text-sm text-slate-600">
            Real-time explainable matching against <span className="font-semibold text-slate-900">{job.title}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCandidate(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                c.id === selectedCandidate.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {c.fullName}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate Profile Summary & Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {selectedCandidate.fullName}
              </h3>
              <p className="text-xs text-slate-500">{selectedCandidate.email}</p>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                evaluation.eligibility.isEligible
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {evaluation.eligibility.isEligible ? 'Eligible for Allocation' : 'Shortfall Detected'}
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-sm">
            <div className="flex items-center text-slate-600">
              <Briefcase className="w-4 h-4 text-slate-400 mr-2" />
              <span>
                Total Experience:{' '}
                <strong className="text-slate-800">
                  {selectedCandidate.totalExperienceYears} yrs
                </strong>{' '}
                (Min required: {job.minExperienceYears} yrs)
              </span>
            </div>
            <div className="flex items-center text-slate-600">
              <GraduationCap className="w-4 h-4 text-slate-400 mr-2" />
              <span>
                Education:{' '}
                <strong className="text-slate-800">{selectedCandidate.education}</strong>
              </span>
            </div>
            <div className="flex items-center text-slate-600">
              <Layers className="w-4 h-4 text-slate-400 mr-2" />
              <span>
                Preferred Hubs:{' '}
                <strong className="text-indigo-600">
                  {selectedCandidate.preferredCities.join(' → ')}
                </strong>
              </span>
            </div>
          </div>

          {selectedCandidate.interviewScore !== undefined && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Interview/AI Score: </span>
              {selectedCandidate.interviewScore} / 100
              <p className="text-[11px] text-slate-500 mt-1">
                * Informational note: Per requirement, interview scores never trigger automatic rejection in HireSlot.
              </p>
            </div>
          )}
        </div>

        {/* Score Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overall Match Score
              </span>
              <div className="mt-2 text-4xl font-black text-indigo-600">
                {evaluation.overallScore}%
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Weighted composite of skill proficiency, experience and degree alignment.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Skill Match Rate
              </span>
              <div className="mt-2 text-4xl font-black text-emerald-600">
                {evaluation.skillMatchPercentage}%
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Derived from mandatory & bonus skills evaluated against required years.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Experience Metric
              </span>
              <div className="mt-2 text-4xl font-black text-slate-800">
                {evaluation.experienceScore}%
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              {evaluation.eligibility.experienceMet
                ? 'Candidate meets or exceeds experience baseline'
                : 'Experience shortfall flagged'}
            </p>
          </div>
        </div>
      </div>

      {/* Actionable Skill Gap Hints & Recommendations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900">
              Explainable Skill-Gap Hints & Recommendations
            </h3>
          </div>
          <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
            {evaluation.skillGaps.length} Actionable Gap(s) Found
          </span>
        </div>

        {evaluation.skillGaps.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800">Perfect Skill Alignment</h4>
            <p className="text-sm text-slate-500">
              Candidate satisfies all mandatory and desired skills with full proficiency.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 p-6 space-y-4">
            {evaluation.skillGaps.map((gap, i) => (
              <div
                key={i}
                className="pt-4 first:pt-0 flex flex-col md:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-base">
                      {gap.skillName}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        gap.severity === 'CRITICAL_REQUIRED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {gap.severity === 'CRITICAL_REQUIRED' ? 'Mandatory Requirement' : 'Recommended Bonus'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{gap.gapExplanation}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-w-md w-full">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                    Upskilling Recommendation
                  </span>
                  <p className="text-xs text-slate-700 font-medium">
                    {gap.recommendedAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Skill Evaluation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">
            Skill Requirement vs Candidate Profile
          </h3>
          <p className="text-xs text-slate-500">
            Granular rule breakdown for each required skill
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Skill</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Required Exp</th>
                <th className="px-6 py-3">Candidate Exp</th>
                <th className="px-6 py-3">Proficiency</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {evaluation.skillDetails.map((detail, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3.5 font-bold text-slate-900">
                    {detail.skillName}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        detail.isRequired
                          ? 'bg-rose-50 text-rose-700 font-semibold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {detail.isRequired ? 'Mandatory' : 'Optional'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    {detail.requiredYears ? `${detail.requiredYears} yrs` : '1+ yr'}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">
                    {detail.candidateYears} yrs
                  </td>
                  <td className="px-6 py-3.5 capitalize">
                    {detail.candidateProficiency || '-'}
                  </td>
                  <td className="px-6 py-3.5">
                    {detail.matched ? (
                      <span className="inline-flex items-center text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Matched
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

