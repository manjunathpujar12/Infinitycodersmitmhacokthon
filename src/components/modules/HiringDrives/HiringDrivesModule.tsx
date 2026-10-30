import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Calendar, 
  Users, 
  Edit3, 
  CheckCircle, 
  Play, 
  Pause, 
  Search,
  Filter
} from 'lucide-react';
import { HiringDrive, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatDate } from '../../../lib/utils';
import { RoleGuard } from '../../layout/RoleGuard';

export interface HiringDrivesModuleProps {
  drives: HiringDrive[];
  onCreateDrive: (drive: Partial<HiringDrive>) => Promise<void>;
  onUpdateDrive: (id: string, updates: Partial<HiringDrive>) => Promise<void>;
  currentRole: UserRole | null;
}

export const HiringDrivesModule: React.FC<HiringDrivesModuleProps> = ({
  drives,
  onCreateDrive,
  onUpdateDrive,
  currentRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<HiringDrive | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    mode: 'HYBRID' as HiringDrive['mode'],
    status: 'ACTIVE' as HiringDrive['status'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    totalTargetHeadcount: 25,
  });

  const handleOpenCreate = () => {
    setEditingDrive(null);
    setFormData({
      code: `DRV-${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${Math.floor(Math.random() * 899 + 100)}`,
      title: '',
      description: '',
      mode: 'HYBRID',
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      totalTargetHeadcount: 30,
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (drive: HiringDrive) => {
    setEditingDrive(drive);
    setFormData({
      code: drive.code,
      title: drive.title,
      description: drive.description,
      mode: drive.mode,
      status: drive.status,
      startDate: drive.startDate,
      endDate: drive.endDate,
      totalTargetHeadcount: drive.totalTargetHeadcount,
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingDrive) {
      await onUpdateDrive(editingDrive.id, formData);
    } else {
      await onCreateDrive(formData);
    }
    setIsCreateModalOpen(false);
  };

  const handleToggleStatus = async (drive: HiringDrive) => {
    const nextStatus = drive.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await onUpdateDrive(drive.id, { status: nextStatus });
  };

  const filteredDrives = drives.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="sage" size="md">
              <Building2 className="w-3.5 h-3.5" />
              Recruitment Campaigns
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Hiring Drive Management
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Configure multi-city hiring campaigns, timelines, target headcount volumes, and operating modes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Hiring Drive
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-warm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search drives by title or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-sidebar border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-muted font-medium whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-sidebar border border-border rounded-lg py-1.5 px-3 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="DRAFT">Draft</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Drives Table */}
      <div className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sidebar border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-5">Drive Title & Code</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Target Positions</th>
                <th className="py-3 px-4">Timeline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredDrives.map((drive) => (
                <tr key={drive.id} className="hover:bg-sidebar/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-text-main">{drive.title}</div>
                    <div className="text-[11px] text-text-muted font-mono mt-0.5">{drive.code}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-text-main px-2 py-0.5 rounded bg-sidebar border border-border text-[11px]">
                      {drive.mode}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-text-main">
                    {drive.totalTargetHeadcount} seats
                  </td>
                  <td className="py-3.5 px-4 text-text-muted">
                    {formatDate(drive.startDate)} → {formatDate(drive.endDate)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge 
                      variant={
                        drive.status === 'ACTIVE' ? 'sage' :
                        drive.status === 'DRAFT' ? 'warning' :
                        drive.status === 'PAUSED' ? 'terracotta' : 'neutral'
                      } 
                      size="sm"
                    >
                      {drive.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(drive)}
                        title={drive.status === 'ACTIVE' ? 'Pause drive' : 'Activate drive'}
                        className="p-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted hover:text-text-main transition-colors"
                      >
                        {drive.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(drive)}
                        className="px-2.5 py-1 rounded-lg border border-border hover:bg-sidebar text-text-main font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3 h-3 text-sage-600" />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Drive Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingDrive ? 'Edit Hiring Drive' : 'Create New Hiring Drive'}
        subtitle="Configure target headcounts, dates, and operational modes."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-main font-semibold mb-1">Drive Code (Identifier)</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-mono focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div>
            <label className="block text-text-main font-semibold mb-1">Drive Title</label>
            <input
              type="text"
              required
              placeholder="e.g., Pan-India Q4 Engineering Mega Drive"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div>
            <label className="block text-text-main font-semibold mb-1">Description & Objectives</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief summary of target teams and drive purpose..."
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Operational Mode</label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as HiringDrive['mode'] })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                <option value="HYBRID">Hybrid (Multi-Campus & Remote)</option>
                <option value="ON_SITE">On-Site Only (Regional Center)</option>
                <option value="VIRTUAL">Virtual / Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">Target Headcount</label>
              <input
                type="number"
                min={1}
                required
                value={formData.totalTargetHeadcount}
                onChange={(e) => setFormData({ ...formData, totalTargetHeadcount: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm"
            >
              {editingDrive ? 'Save Changes' : 'Create Drive'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
