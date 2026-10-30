import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { CandidateSkill, EducationItem, ExperienceItem } from '../../types';
import { Modal } from '../common/Modal';
import {
  GraduationCap,
  Briefcase,
  Star,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Building,
  CheckCircle2,
  Award
} from 'lucide-react';

export const SkillsExperiencePage: React.FC = () => {
  const {
    candidate,
    updateSkills,
    updateEducation,
    updateExperience
  } = useCandidateAuth();

  // Skills local state
  const [skills, setSkills] = useState<CandidateSkill[]>(candidate.skills);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillRating, setNewSkillRating] = useState(4);

  // Education Modal
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduYear, setEduYear] = useState(2023);
  const [eduGrade, setEduGrade] = useState('8.5 / 10.0');

  // Experience Modal
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expStartDate, setExpStartDate] = useState('2023-01-01');
  const [expEndDate, setExpEndDate] = useState('');
  const [expIsCurrent, setExpIsCurrent] = useState(true);
  const [expSummary, setExpSummary] = useState('');

  // Skills handlers
  const handleRatingChange = (skillName: string, newRating: number) => {
    const updated = skills.map((s) => (s.skillName === skillName ? { ...s, rating: newRating } : s));
    setSkills(updated);
    updateSkills(updated);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const updated = [
      ...skills,
      { skillName: newSkillName.trim(), rating: newSkillRating, matchesRequirement: true }
    ];
    setSkills(updated);
    updateSkills(updated);
    setNewSkillName('');
    setNewSkillRating(4);
  };

  const handleRemoveSkill = (skillName: string) => {
    const updated = skills.filter((s) => s.skillName !== skillName);
    setSkills(updated);
    updateSkills(updated);
  };

  // Education handlers
  const handleSaveEducation = (e: React.FormEvent) => {
    e.preventDefault();
    const newEdu: EducationItem = {
      id: `edu-${Date.now().toString().slice(-4)}`,
      institution: eduInstitution,
      degree: eduDegree,
      fieldOfStudy: eduField,
      graduationYear: eduYear,
      gradeOrCgpa: eduGrade
    };
    const updated = [...candidate.education, newEdu];
    updateEducation(updated);
    setIsEduModalOpen(false);
  };

  const handleDeleteEducation = (id: string) => {
    const updated = candidate.education.filter((e) => e.id !== id);
    updateEducation(updated);
  };

  // Experience handlers
  const handleSaveExperience = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp: ExperienceItem = {
      id: `exp-${Date.now().toString().slice(-4)}`,
      companyName: expCompany,
      roleTitle: expRole,
      startDate: expStartDate,
      endDate: expIsCurrent ? undefined : expEndDate,
      isCurrent: expIsCurrent,
      summary: expSummary
    };
    const updated = [...candidate.experienceHistory, newExp];
    updateExperience(updated);
    setIsExpModalOpen(false);
  };

  const handleDeleteExperience = (id: string) => {
    const updated = candidate.experienceHistory.filter((e) => e.id !== id);
    updateExperience(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Skills, Education & Professional Experience
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          These verified qualifications directly power the automated role matching & skill-gap algorithms
        </p>
      </div>

      {/* Skills Matrix Section */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> Technical Competencies & Proficiency Ratings
            </h3>
            <p className="text-xs text-textMuted mt-0.5">
              Rate your hands-on mastery from 1 (Novice) to 5 (Expert Architecture)
            </p>
          </div>
          <span className="text-xs font-bold text-primary font-mono bg-primary-light px-2.5 py-1 rounded-lg">
            {skills.length} Competencies Listed
          </span>
        </div>

        {/* Existing Skills Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.map((skill) => (
            <div
              key={skill.skillName}
              className="p-3.5 rounded-xl bg-[#FAF9F5] border border-borderMuted flex flex-col justify-between space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-textPrimary truncate">{skill.skillName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.skillName)}
                  className="text-textMuted hover:text-rose-700 p-0.5 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Star Rating Selector */}
              <div className="flex items-center justify-between pt-1 border-t border-borderMuted">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(skill.skillName, star)}
                      className="p-0.5 text-textMuted hover:text-amber-500 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= skill.rating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-borderDark hover:fill-amber-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold font-mono text-primary">{skill.rating} / 5</span>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Skill Inline Form */}
        <form
          onSubmit={handleAddSkill}
          className="p-3.5 bg-sidebar rounded-xl border border-borderMuted flex flex-wrap items-center gap-3 text-xs"
        >
          <span className="font-bold text-textPrimary uppercase tracking-wider text-[10px]">
            Add Competency:
          </span>
          <input
            type="text"
            required
            placeholder="e.g. GraphQL, Tailwind, Redis, AWS"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-1.5 bg-cards border border-borderDark rounded-lg text-xs text-textPrimary focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-textMuted font-medium">Proficiency:</span>
            <select
              value={newSkillRating}
              onChange={(e) => setNewSkillRating(Number(e.target.value))}
              className="px-2 py-1.5 bg-cards border border-borderDark rounded-lg text-xs font-bold font-mono"
            >
              <option value={1}>1 - Novice</option>
              <option value={2}>2 - Elementary</option>
              <option value={3}>3 - Intermediate</option>
              <option value={4}>4 - Advanced</option>
              <option value={5}>5 - Expert</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover shadow-subtle flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </div>

      {/* Education Credentials Section */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" /> Educational Qualifications
            </h3>
            <p className="text-xs text-textMuted mt-0.5">
              Degrees, universities, graduation years, and academic standing
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEduInstitution('National Institute of Technology');
              setEduDegree('Bachelor of Engineering (B.E.)');
              setEduField('Information Technology');
              setEduYear(2023);
              setEduGrade('8.8 / 10.0');
              setIsEduModalOpen(true);
            }}
            className="px-3 py-1.5 bg-sidebar hover:bg-[#E5E7DD] border border-borderDark text-textPrimary text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5 text-primary" /> Add Degree
          </button>
        </div>

        <div className="space-y-3">
          {candidate.education.map((edu) => (
            <div
              key={edu.id}
              className="p-4 rounded-xl bg-[#FAF9F5] border border-borderMuted flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-textPrimary text-sm block">
                  {edu.degree} — {edu.fieldOfStudy}
                </span>
                <span className="text-xs text-textMuted flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-primary" /> {edu.institution}
                </span>
                <div className="text-[11px] text-textMuted font-mono flex items-center gap-3 pt-1">
                  <span>Class of {edu.graduationYear}</span>
                  <span>•</span>
                  <span className="font-bold text-primary">CGPA: {edu.gradeOrCgpa}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteEducation(edu.id)}
                className="text-textMuted hover:text-rose-700 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Experience History Section */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Professional Work Experience
            </h3>
            <p className="text-xs text-textMuted mt-0.5">
              Engineering roles, accomplishments, and stack contributions
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setExpCompany('Acme Distributed Systems');
              setExpRole('Senior Full Stack Developer');
              setExpStartDate('2023-08-01');
              setExpIsCurrent(true);
              setExpSummary('Led engineering of customer-facing dashboards in React/TypeScript.');
              setIsExpModalOpen(true);
            }}
            className="px-3 py-1.5 bg-sidebar hover:bg-[#E5E7DD] border border-borderDark text-textPrimary text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5 text-primary" /> Add Position
          </button>
        </div>

        <div className="space-y-3">
          {candidate.experienceHistory.map((exp) => (
            <div
              key={exp.id}
              className="p-4 rounded-xl bg-[#FAF9F5] border border-borderMuted flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-textPrimary">{exp.roleTitle}</span>
                  {exp.isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                      CURRENT ROLE
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-primary">{exp.companyName}</div>
                <div className="text-[11px] text-textMuted font-mono">
                  {exp.startDate} to {exp.isCurrent ? 'Present' : exp.endDate}
                </div>
                <p className="text-xs text-textPrimary leading-relaxed mt-1">{exp.summary}</p>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteExperience(exp.id)}
                className="text-textMuted hover:text-rose-700 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Education Modal */}
      <Modal
        isOpen={isEduModalOpen}
        onClose={() => setIsEduModalOpen(false)}
        title="Add Educational Credential"
        subtitle="Degree details and academic institution"
        maxWidth="md"
      >
        <form onSubmit={handleSaveEducation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
              Institution Name
            </label>
            <input
              type="text"
              required
              value={eduInstitution}
              onChange={(e) => setEduInstitution(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                Degree (e.g. B.Tech, M.S.)
              </label>
              <input
                type="text"
                required
                value={eduDegree}
                onChange={(e) => setEduDegree(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                Field of Study
              </label>
              <input
                type="text"
                required
                value={eduField}
                onChange={(e) => setEduField(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                Graduation Year
              </label>
              <input
                type="number"
                min="1990"
                max="2030"
                required
                value={eduYear}
                onChange={(e) => setEduYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                CGPA or Percentage
              </label>
              <input
                type="text"
                required
                value={eduGrade}
                onChange={(e) => setEduGrade(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted">
            <button
              type="button"
              onClick={() => setIsEduModalOpen(false)}
              className="px-3.5 py-1.5 border border-borderDark rounded-lg text-xs font-semibold hover:bg-sidebar"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover shadow-subtle"
            >
              Save Degree
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Experience Modal */}
      <Modal
        isOpen={isExpModalOpen}
        onClose={() => setIsExpModalOpen(false)}
        title="Add Work Experience"
        subtitle="Role title, duration, and technical contributions"
        maxWidth="md"
      >
        <form onSubmit={handleSaveExperience} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                value={expCompany}
                onChange={(e) => setExpCompany(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                Role Title
              </label>
              <input
                type="text"
                required
                value={expRole}
                onChange={(e) => setExpRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={expStartDate}
                onChange={(e) => setExpStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                disabled={expIsCurrent}
                value={expEndDate}
                onChange={(e) => setExpEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs font-medium text-textPrimary disabled:opacity-40"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-textPrimary">
              <input
                type="checkbox"
                checked={expIsCurrent}
                onChange={(e) => setExpIsCurrent(e.target.checked)}
                className="accent-primary"
              />
              Currently Working in this Role
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
              Summary of Contributions
            </label>
            <textarea
              rows={3}
              required
              value={expSummary}
              onChange={(e) => setExpSummary(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF9F5] border border-borderDark rounded-lg text-xs text-textPrimary"
              placeholder="Responsibilities, tools, architecture, and results..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted">
            <button
              type="button"
              onClick={() => setIsExpModalOpen(false)}
              className="px-3.5 py-1.5 border border-borderDark rounded-lg text-xs font-semibold hover:bg-sidebar"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover shadow-subtle"
            >
              Save Experience
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

