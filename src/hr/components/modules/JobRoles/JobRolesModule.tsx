import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Briefcase,
  Tag,
  Trash2,
  Check,
  DollarSign,
  Layers,
  ChevronRight
} from 'lucide-react';
import { JobRole, SkillRequirement, HiringDrive, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Drawer } from '../../common/Drawer';
import { formatCurrency } from '../../../lib/utils';

export interface JobRolesModuleProps {
  roles: JobRole[];
  drives: HiringDrive[];
  selectedDriveId: string;
  onCreateRole: (role: Partial<JobRole>) => Promise<void>;
  onUpdateRole?: (id: string, role: Partial<JobRole>) => Promise<void>;
  onArchiveRole?: (id: string) => Promise<void>;
  currentRole: UserRole | null;
}

export const JobRolesModule: React.FC<JobRolesModuleProps> = ({
  roles,
  drives,
  selectedDriveId,
  onCreateRole,
  onUpdateRole,
  onArchiveRole,
  currentRole,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [activeDriveId, setActiveDriveId] = useState(selectedDriveId === 'ALL' ? drives[0]?.id : selectedDriveId);

  // Form State
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Product Engineering');
  const [bandLevel, setBandLevel] = useState('L4 / Senior');
  const [minExp, setMinExp] = useState(4);
  const [baseMin, setBaseMin] = useState(120000);
  const [baseMax, setBaseMax] = useState(160000);
  const [currency, setCurrency] = useState('USD');

  // Evaluation criteria weights
  const [skillWeight, setSkillWeight] = useState(40);
  const [expWeight, setExpWeight] = useState(25);
  const [assessWeight, setAssessWeight] = useState(20);
  const [locationWeight, setLocationWeight] = useState(15);

  // Skill Requirements
  const [skills, setSkills] = useState<SkillRequirement[]>([
    { id: '1', name: 'React', category: 'framework', isMandatory: true, minYearsExperience: 3, weight: 9 },
    { id: '2', name: 'TypeScript', category: 'core', isMandatory: true, minYearsExperience: 3, weight: 9 },
    { id: '3', name: 'Node.js', category: 'core', isMandatory: true, minYearsExperience: 2, weight: 8 },
  ]);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillRequirement['category']>('core');
  const [newSkillMandatory, setNewSkillMandatory] = useState(false);
  const [newSkillExp, setNewSkillExp] = useState(2);

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    setSkills([
      ...skills,
      {
        id: 's-' + Date.now(),
        name: newSkillName.trim(),
        category: newSkillCategory,
        isMandatory: newSkillMandatory,
        minYearsExperience: newSkillExp,
        weight: newSkillMandatory ? 9 : 7,
      }
    ]);
    setNewSkillName('');
    setNewSkillMandatory(false);
  };

  const handleRemoveSkill = (id: string) => {
    setSkills(skills.filter(s => s.id !== id));
  };

  const openCreateDrawer = () => {
    setEditingRoleId(null);
    setTitle('');
    setDepartment('Product Engineering');
    setBandLevel('L4 / Senior');
    setMinExp(4);
    setBaseMin(120000);
    setBaseMax(160000);
    setSkills([
      { id: '1', name: 'React', category: 'framework', isMandatory: true, minYearsExperience: 3, weight: 9 },
      { id: '2', name: 'TypeScript', category: 'core', isMandatory: true, minYearsExperience: 3, weight: 9 },
      { id: '3', name: 'Node.js', category: 'core', isMandatory: true, minYearsExperience: 2, weight: 8 },
    ]);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (role: JobRole) => {
    setEditingRoleId(role.id);
    setActiveDriveId(role.driveId);
    setTitle(role.title);
    setDepartment(role.department);
    setBandLevel(role.bandLevel);
    setMinExp(role.minYearsExperience);
    setBaseMin(role.baseSalaryMin);
    setBaseMax(role.baseSalaryMax);
    setCurrency(role.currency || 'USD');
    setSkillWeight(role.evaluationCriteria?.skillMatchWeight || 40);
    setExpWeight(role.evaluationCriteria?.experienceWeight || 25);
    setAssessWeight(role.evaluationCriteria?.assessmentWeight || 20);
    setLocationWeight(role.evaluationCriteria?.locationPrefWeight || 15);
    setSkills(role.requiredSkills || []);
    setIsDrawerOpen(true);
  };

  const handleArchive = async (id: string, roleTitle: string) => {
    if (!confirm(`Are you sure you want to archive / delete job role "${roleTitle}"?`)) return;
    if (onArchiveRole) {
      await onArchiveRole(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const rolePayload: Partial<JobRole> = {
      driveId: activeDriveId || drives[0]?.id,
      title,
      department,
      bandLevel,
      minYearsExperience: minExp,
      baseSalaryMin: baseMin,
      baseSalaryMax: baseMax,
      currency,
      requiredSkills: skills,
      evaluationCriteria: {
        skillMatchWeight: skillWeight,
        experienceWeight: expWeight,
        assessmentWeight: assessWeight,
        locationPrefWeight: locationWeight,
      }
    };

    if (editingRoleId && onUpdateRole) {
      await onUpdateRole(editingRoleId, rolePayload);
    } else {
      await onCreateRole(rolePayload);
    }

    setIsDrawerOpen(false);
    setEditingRoleId(null);
    setTitle('');
  };

  const filteredRoles = roles.filter(r => {
    if (selectedDriveId !== 'ALL' && r.driveId !== selectedDriveId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="sage" size="md">
              <Sliders className="w-3.5 h-3.5" />
              Competency Architecture
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Job Role & Skills Configuration
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-xl">
            Define role seniority benchmarks, mandatory technical competencies, salary bands, and evaluation criteria weights for automated candidate scoring.
          </p>
        </div>

        <button
          onClick={openCreateDrawer}
          className="px-4 py-2 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Job Role
        </button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-card rounded-2xl p-6 border border-border shadow-warm hover:border-sage-300 transition-all space-y-4"
          >
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  {role.department}
                </span>
                <h3 className="text-base font-bold text-text-main font-sans mt-0.5">{role.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="terracotta" size="sm">
                    {role.bandLevel}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    Min {role.minYearsExperience} yrs experience
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-bold text-text-muted uppercase">Salary Band</p>
                <p className="text-xs font-bold text-text-main mt-0.5">
                  {formatCurrency(role.baseSalaryMin, role.currency)} – {formatCurrency(role.baseSalaryMax, role.currency)}
                </p>
              </div>
            </div>

            {/* Required Competencies Pills */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Required Competencies ({role.requiredSkills?.length || 0})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(role.requiredSkills || []).map((skill) => (
                  <span
                    key={skill.id}
                    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border font-medium ${skill.isMandatory
                        ? 'bg-sage-100 text-sage-900 border-sage-300 font-bold'
                        : 'bg-sidebar text-text-main border-border'
                      }`}
                  >
                    {skill.isMandatory && <span className="text-sage-600 font-bold">★</span>}
                    {skill.name} ({skill.minYearsExperience}y+)
                  </span>
                ))}
              </div>
            </div>

            {/* Evaluation Criteria Weights */}
            <div className="pt-3 border-t border-border grid grid-cols-4 gap-2 text-center bg-sidebar/50 p-2.5 rounded-xl">
              <div>
                <span className="text-[10px] text-text-muted block">Skills</span>
                <span className="text-xs font-bold text-text-main">{role.evaluationCriteria?.skillMatchWeight || 40}%</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">Experience</span>
                <span className="text-xs font-bold text-text-main">{role.evaluationCriteria?.experienceWeight || 25}%</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">Assessment</span>
                <span className="text-xs font-bold text-text-main">{role.evaluationCriteria?.assessmentWeight || 20}%</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block">Location</span>
                <span className="text-xs font-bold text-text-main">{role.evaluationCriteria?.locationPrefWeight || 15}%</span>
              </div>
            </div>

            {/* Role Actions */}
            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => openEditDrawer(role)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border text-text-main hover:bg-sidebar transition-colors"
              >
                Edit Role
              </button>
              <button
                type="button"
                onClick={() => handleArchive(role.id, role.title)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Role Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setEditingRoleId(null); }}
        title={editingRoleId ? 'Edit Job Role Configuration' : 'Configure New Job Role'}
        subtitle={editingRoleId ? 'Update competencies, salary bands, and scoring weightings.' : 'Specify technical requirements, band levels, and scoring weightings.'}
        width="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div>
            <label className="block text-text-main font-semibold mb-1">Associate with Hiring Drive</label>
            <select
              value={activeDriveId}
              onChange={(e) => setActiveDriveId(e.target.value)}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-medium focus:outline-none focus:ring-1 focus:ring-sage-500"
            >
              {drives.map(d => (
                <option key={d.id} value={d.id}>{d.code} • {d.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Role Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Staff Backend Architect"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Band / Seniority Level</label>
              <select
                value={bandLevel}
                onChange={(e) => setBandLevel(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                <option value="L3 / Junior-Mid">L3 / Junior-Mid</option>
                <option value="L4 / Senior">L4 / Senior</option>
                <option value="L5 / Lead">L5 / Lead</option>
                <option value="L6 / Principal">L6 / Principal</option>
              </select>
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Min Years Experience</label>
              <input
                type="number"
                min={0}
                max={25}
                value={minExp}
                onChange={(e) => setMinExp(Number(e.target.value))}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          {/* Salary Band */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Salary Range Min ($)</label>
              <input
                type="number"
                value={baseMin}
                onChange={(e) => setBaseMin(Number(e.target.value))}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Salary Range Max ($)</label>
              <input
                type="number"
                value={baseMax}
                onChange={(e) => setBaseMax(Number(e.target.value))}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          {/* Add Skills Section */}
          <div className="p-4 rounded-xl border border-border bg-[#FBFBFA] space-y-3">
            <label className="block text-text-main font-bold">Required Technical Competencies</label>

            {/* List current skills */}
            <div className="flex flex-wrap gap-1.5 min-h-[40px]">
              {skills.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 bg-white border border-border text-text-main px-2.5 py-1 rounded-md text-[11px] shadow-warm-sm"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-text-muted">({s.minYearsExperience}y)</span>
                  {s.isMandatory && <span className="text-terracotta-700 font-bold text-[10px]">Mandatory</span>}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s.id)}
                    className="text-text-subtle hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Input to add skill */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Skill name (e.g. GraphQL, AWS, Go)"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className="flex-1 bg-white border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
              <label className="flex items-center gap-1 text-[11px] text-text-main font-medium whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={newSkillMandatory}
                  onChange={(e) => setNewSkillMandatory(e.target.checked)}
                  className="rounded text-sage-600 focus:ring-sage-500"
                />
                Mandatory
              </label>
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg font-semibold"
              >
                Add
              </button>
            </div>
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
              Save Job Role
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};
