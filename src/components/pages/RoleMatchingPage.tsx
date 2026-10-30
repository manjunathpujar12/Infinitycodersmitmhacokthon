import React, { useMemo } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { analyzeCandidateRoleMatch } from '../../services/matchingEngine';
import { Badge } from '../common/Badge';
import { Target, CheckCircle2, AlertTriangle, Sparkles, BookOpen, Award, ArrowRight } from 'lucide-react';

export const RoleMatchingPage: React.FC<{ onNavigateToSlots: () => void }> = ({ onNavigateToSlots }) => {
  const { candidate, activeRole, roles, setSelectedRoleId } = useCandidateAuth();

  const matchAnalysis = useMemo(() => {
    if (!activeRole) return null;
    return analyzeCandidateRoleMatch(candidate, activeRole);
  }, [candidate, activeRole]);

  if (!activeRole || !matchAnalysis) return null;

  return (
    <div className="space-y-6">
      {/* Header with Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
            Role Matching & Skill-Gap Analysis
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Transparent breakdown of your profile competencies evaluated against target role benchmarks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-textMuted font-bold">Evaluating For:</span>
          <select
            value={activeRole.id}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="px-3 py-1.5 bg-cards border border-borderDark rounded-xl text-xs font-bold text-textPrimary focus:outline-none"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Match Score Hero Card */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Circular/Large Match Score Pill */}
          <div className="w-24 h-24 rounded-2xl bg-primary-light border-2 border-primary/30 flex flex-col items-center justify-center text-center p-2 flex-shrink-0">
            <span className="text-3xl font-extrabold font-mono text-primary leading-none">
              {matchAnalysis.matchScorePercentage}%
            </span>
            <span className="text-[10px] font-bold text-primary-dark uppercase tracking-wider mt-1">
              Match Bar
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-textPrimary">{activeRole.title}</h3>
              {matchAnalysis.meetsCutoff ? (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="w-3 h-3" /> QUALIFIED FOR INTERVIEWS
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  <AlertTriangle className="w-3 h-3" /> BELOW CUT-OFF ({activeRole.cutoffScore}%)
                </Badge>
              )}
            </div>

            <p className="text-xs text-textMuted leading-relaxed">
              {matchAnalysis.matchedSkillsCount} of {matchAnalysis.totalSkillsCount} core skills matched •{' '}
              Experience: {matchAnalysis.experienceMatch.candidateYears}y (Target:{' '}
              {matchAnalysis.experienceMatch.requiredYears}y+)
            </p>

            <div className="pt-1 flex items-center gap-3 text-xs">
              <span className="text-textPrimary font-semibold">
                Department: <b className="text-primary">{activeRole.department}</b>
              </span>
              <span>•</span>
              <span className="text-textPrimary font-semibold">
                Target Hub: <b className="text-primary">{candidate.allocatedCity || 'Pending'}</b>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateToSlots}
          className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2 flex-shrink-0"
        >
          <span>Proceed to Interview Booking</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Two Column Layout: Skills Matrix Breakdown & Actionable Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Detailed Competency Evaluation Table */}
        <div className="lg:col-span-7 bg-cards rounded-2xl border border-borderMuted shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-borderMuted bg-[#FAF9F5] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Technical Competency Checklist
            </h3>
            <span className="text-[11px] text-textMuted font-mono">
              Role Weighting Calibration
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] text-textMuted uppercase text-[10px] tracking-wider border-b border-borderMuted">
                <tr>
                  <th className="py-2.5 px-4">Skill Name</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4 text-center">Required Prof</th>
                  <th className="py-2.5 px-4 text-center">Your Rating</th>
                  <th className="py-2.5 px-4 text-right">Alignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderMuted">
                {matchAnalysis.skillsAnalysis.map((item) => (
                  <tr key={item.skillName} className="hover:bg-[#FAF9F5]/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-textPrimary">
                      {item.skillName}
                    </td>

                    <td className="py-3 px-4">
                      {item.isMandatory ? (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.2 rounded bg-sidebar text-textMuted">
                          Preferred
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-textMuted">
                      {item.requiredProficiency} / 5
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-textPrimary">
                      {item.candidateProficiency > 0 ? `${item.candidateProficiency} / 5` : '0 / 5'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.isSatisfied ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> Gap (-{item.gapPoints} pts)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Automated Recommendations to Bridge Skill Gaps */}
        <div className="lg:col-span-5 bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary">
              Actionable Recommendations
            </h3>
          </div>

          <div className="space-y-3">
            {matchAnalysis.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#FAF9F5] border border-borderMuted space-y-1.5 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-textPrimary">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> Recommendation #{idx + 1}
                </div>
                <p className="text-textMuted leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>

          {/* Quick study tip */}
          <div className="p-3 bg-sidebar rounded-xl border border-borderMuted text-xs text-textMuted space-y-1">
            <span className="font-bold text-textPrimary block">Interview Preparation Tip:</span>
            <p>
              Technical panels assess how you explain trade-offs and code architecture rather than pure rote syntax.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

