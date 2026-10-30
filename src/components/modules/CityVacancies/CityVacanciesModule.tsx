import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Building, 
  Phone, 
  User, 
  Target, 
  Percent, 
  ShieldCheck, 
  Edit2,
  Download
} from 'lucide-react';
import { CityVacancy, CandidateAllocation, HiringDrive, JobRole, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';

export interface CityVacanciesModuleProps {
  vacancies: CityVacancy[];
  allocations: CandidateAllocation[];
  drives: HiringDrive[];
  roles: JobRole[];
  selectedDriveId: string;
  onSaveVacancy: (vacancy: Partial<CityVacancy>) => Promise<void>;
  currentRole: UserRole | null;
}

export const CityVacanciesModule: React.FC<CityVacanciesModuleProps> = ({
  vacancies,
  allocations,
  drives,
  roles,
  selectedDriveId,
  onSaveVacancy,
  currentRole,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<CityVacancy | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    city: 'Bengaluru',
    targetHeadcount: 20,
    bufferPercentage: 15,
    minBarScore: 75,
    venueName: 'Tech Park Executive Center',
    venueAddress: 'Bellandur Ring Road, Bengaluru',
    pointOfContactName: 'Ananya Deshmukh',
    pointOfContactPhone: '+91 98450 12345',
    driveId: selectedDriveId === 'ALL' ? drives[0]?.id : selectedDriveId,
    roleId: roles[0]?.id || '',
  });

  const handleOpenCreate = () => {
    setEditingVacancy(null);
    setFormData({
      city: 'Chennai',
      targetHeadcount: 15,
      bufferPercentage: 15,
      minBarScore: 72,
      venueName: 'Tidel Park Technology Center',
      venueAddress: 'Tarmani, Chennai, Tamil Nadu 600113',
      pointOfContactName: 'Karthik Raja',
      pointOfContactPhone: '+91 94440 12399',
      driveId: selectedDriveId === 'ALL' ? drives[0]?.id : selectedDriveId,
      roleId: roles[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: CityVacancy) => {
    setEditingVacancy(v);
    setFormData({
      city: v.city,
      targetHeadcount: v.targetHeadcount,
      bufferPercentage: v.bufferPercentage,
      minBarScore: v.minBarScore,
      venueName: v.venueName || '',
      venueAddress: v.venueAddress || '',
      pointOfContactName: v.pointOfContactName || '',
      pointOfContactPhone: v.pointOfContactPhone || '',
      driveId: v.driveId,
      roleId: v.roleId,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVacancy) {
      await onSaveVacancy({ id: editingVacancy.id, ...formData });
    } else {
      await onSaveVacancy(formData);
    }
    setIsModalOpen(false);
  };

  const filteredVacancies = vacancies.filter(v => {
    if (selectedDriveId !== 'ALL' && v.driveId !== selectedDriveId) return false;
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['City', 'Target Headcount', 'Buffer %', 'Min Bar Score', 'Filled', 'Remaining', 'Venue'];
    const rows = filteredVacancies.map(v => {
      const allocatedCount = allocations.filter(
        a => a.allocatedCity === v.city && a.status === 'ALLOCATED'
      ).length;
      const remaining = Math.max(0, v.targetHeadcount - allocatedCount);
      return [
        `"${v.city.replace(/"/g, '""')}"`,
        v.targetHeadcount,
        `${v.bufferPercentage}%`,
        v.minBarScore,
        allocatedCount,
        remaining,
        `"${(v.venueName || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `city_vacancies_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="sage" size="md">
              <MapPin className="w-3.5 h-3.5" />
              Regional Headcount Quotas
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            City-wise Vacancy Configuration
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-xl">
            Configure headcount targets per location, overflow buffer tolerances, minimum technical bar thresholds, and venue logistics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-all"
            title="Export City Vacancies to CSV"
          >
            <Download className="w-4 h-4 text-terracotta-600" />
            <span>Export Vacancies (CSV)</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add City Vacancy</span>
          </button>
        </div>
      </div>

      {/* Grid of City Vacancies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredVacancies.map((vacancy) => {
          const role = roles.find(r => r.id === vacancy.roleId);
          const allocatedCount = allocations.filter(
            a => a.allocatedCity === vacancy.city && a.status === 'ALLOCATED'
          ).length;
          const maxCapacityWithBuffer = Math.round(vacancy.targetHeadcount * (1 + vacancy.bufferPercentage / 100));
          const fillPercentage = Math.round((allocatedCount / (vacancy.targetHeadcount || 1)) * 100);

          return (
            <div
              key={vacancy.id}
              className="bg-card rounded-2xl p-6 border border-border shadow-warm hover:shadow-warm-md transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-terracotta-600" />
                    <h3 className="text-base font-bold text-text-main font-sans">{vacancy.city}</h3>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 font-medium">
                    {role ? role.title : 'General Engineering'}
                  </p>
                </div>

                <button
                  onClick={() => handleOpenEdit(vacancy)}
                  className="p-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted hover:text-text-main transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Targets and Buffer metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-sidebar/50 rounded-xl border border-border text-center">
                <div>
                  <span className="text-[10px] text-text-muted block uppercase font-bold">Target</span>
                  <span className="text-sm font-bold text-text-main">{vacancy.targetHeadcount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block uppercase font-bold">Buffer Cap</span>
                  <span className="text-sm font-bold text-terracotta-700">{maxCapacityWithBuffer} (+{vacancy.bufferPercentage}%)</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block uppercase font-bold">Min Bar</span>
                  <span className="text-sm font-bold text-sage-700">{vacancy.minBarScore}%</span>
                </div>
              </div>

              {/* Allocation Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-muted font-medium">Allocated Candidates</span>
                  <span className="font-bold text-text-main">{allocatedCount} / {vacancy.targetHeadcount} ({fillPercentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-sidebar rounded-full overflow-hidden border border-border">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      fillPercentage >= 100 ? 'bg-terracotta-500' : 'bg-sage-500'
                    }`}
                    style={{ width: `${Math.min(100, fillPercentage)}%` }}
                  />
                </div>
              </div>

              {/* Venue & POC Info */}
              <div className="pt-3 border-t border-border space-y-1.5 text-xs text-text-muted">
                <div className="flex items-start gap-2">
                  <Building className="w-3.5 h-3.5 text-text-subtle shrink-0 mt-0.5" />
                  <span className="truncate">{vacancy.venueName} • {vacancy.venueAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-text-subtle shrink-0" />
                  <span>POC: {vacancy.pointOfContactName} ({vacancy.pointOfContactPhone})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Vacancy Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVacancy ? 'Edit City Vacancy Target' : 'Configure New City Vacancy'}
        subtitle="Specify headcount volume, overflow buffer percentages, and center logistics."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Target City</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">Job Role</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.title} ({r.bandLevel})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Target Headcount</label>
              <input
                type="number"
                min={1}
                required
                value={formData.targetHeadcount}
                onChange={(e) => setFormData({ ...formData, targetHeadcount: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Buffer % (Overflow)</label>
              <input
                type="number"
                min={0}
                max={50}
                required
                value={formData.bufferPercentage}
                onChange={(e) => setFormData({ ...formData, bufferPercentage: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Min Bar Score (%)</label>
              <input
                type="number"
                min={50}
                max={100}
                required
                value={formData.minBarScore}
                onChange={(e) => setFormData({ ...formData, minBarScore: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-main font-semibold mb-1">Venue Name</label>
            <input
              type="text"
              required
              value={formData.venueName}
              onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div>
            <label className="block text-text-main font-semibold mb-1">Venue Address</label>
            <textarea
              rows={2}
              required
              value={formData.venueAddress}
              onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Point of Contact Name</label>
              <input
                type="text"
                required
                value={formData.pointOfContactName}
                onChange={(e) => setFormData({ ...formData, pointOfContactName: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">POC Contact Phone</label>
              <input
                type="text"
                required
                value={formData.pointOfContactPhone}
                onChange={(e) => setFormData({ ...formData, pointOfContactPhone: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm"
            >
              {editingVacancy ? 'Save Changes' : 'Save Vacancy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
