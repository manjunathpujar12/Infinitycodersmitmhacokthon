import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { Badge } from '../common/Badge';
import { Briefcase, Building, ChevronRight, CheckCircle2, Award, ArrowRight } from 'lucide-react';
import { CandidateTabId } from '../common/Sidebar';

export const JobOpeningsPage: React.FC<{ onNavigateToMatch: () => void }> = ({ onNavigateToMatch }) => {
  const { roles, drives, selectedRoleId, setSelectedRoleId, candidate } = useCandidateAuth();

  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const departments = Array.from(new Set(roles.map((r) => r.department)));

  const filteredRoles = roles.filter(
    (r) => departmentFilter === 'ALL' || r.department === departmentFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
            Active Enterprise Job Openings
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Explore open engineering and platform cohorts across participating technology hubs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-cards border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRoles.map((role) => {
          const isSelected = role.id === selectedRoleId;

          return (
            <div
              key={role.id}
              className={`bg-cards rounded-2xl border p-5 shadow-subtle flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-[#FCFCF9]'
                  : 'border-borderMuted hover:border-borderDark hover:shadow-card'
              }`}
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted">
                    {role.department}
                  </span>
                  <Badge variant="sage" size="sm">
                    {role.experienceBand}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-textPrimary">{role.title}</h3>
                  <p className="text-xs text-textMuted mt-1 line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>
                </div>

                {/* Salary & Cutoff info */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-borderMuted grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-textMuted block">Target Comp</span>
                    <span className="font-extrabold text-textPrimary font-mono mt-0.5 block">
                      ₹{(role.baseSalaryMin / 100000).toFixed(1)}L - ₹{(role.baseSalaryMax / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-textMuted block">Passing Bar</span>
                    <span className="font-bold text-primary flex items-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5" /> {role.cutoffScore}/100
                    </span>
                  </div>
                </div>

                {/* Required Skills list */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-textMuted block">
                    Core Competencies Required
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {role.requiredSkills.map((sk) => (
                      <span
                        key={sk.id}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          sk.isMandatory
                            ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                            : 'bg-sidebar text-textPrimary border-borderMuted'
                        }`}
                      >
                        {sk.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-5 pt-3 border-t border-borderMuted flex items-center justify-between">
                {isSelected ? (
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Active Selection
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className="text-xs font-bold text-textPrimary hover:text-primary transition-colors"
                  >
                    Select Role
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleId(role.id);
                    onNavigateToMatch();
                  }}
                  className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-1"
                >
                  Analyze Match <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

