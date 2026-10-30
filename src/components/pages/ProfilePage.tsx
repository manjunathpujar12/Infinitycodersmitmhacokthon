import React, { useState, useRef, useEffect } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { ResumeMetadata } from '../../types';
import { Badge } from '../common/Badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Code2,
  Link,
  Save,
  CheckCircle2,
  FileText,
  Upload,
  RefreshCw,
  Trash2,
  Eye,
  AlertCircle
} from 'lucide-react';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatUploadDate = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoString;
  }
};

export const ProfilePage: React.FC = () => {
  const { candidate, updateProfile, showToast } = useCandidateAuth();

  const [fullName, setFullName] = useState(candidate.fullName);
  const [phone, setPhone] = useState(candidate.phone);
  const [currentCity, setCurrentCity] = useState(candidate.currentCity);
  const [bio, setBio] = useState(candidate.bio || '');
  const [portfolioUrl, setPortfolioUrl] = useState(candidate.portfolioUrl || '');
  const [githubUrl, setGithubUrl] = useState(candidate.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(candidate.linkedinUrl || '');
  const [avatarUrl, setAvatarUrl] = useState(candidate.avatarUrl || '');

  // Resume Upload State
  const [resume, setResume] = useState<ResumeMetadata | undefined>(candidate.resume);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (candidate.resume && !resume) {
      setResume(candidate.resume);
    }
  }, [candidate.resume]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeError(null);

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type) || (file.type === '' && isValidExtension);

    if (!isValidExtension && !isValidMime) {
      const msg = 'Unsupported file format. Please upload a PDF, DOC, or DOCX file.';
      setResumeError(msg);
      showToast('error', 'Upload Failed', msg);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File size exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a smaller file.`;
      setResumeError(msg);
      showToast('error', 'Upload Failed', msg);
      e.target.value = '';
      return;
    }

    // Revoke previous blob URL if exists
    if (resume?.fileUrl && resume.fileUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(resume.fileUrl);
      } catch {}
    }

    const formatName = extension ? extension.toUpperCase() : 'PDF';
    const objectUrl = URL.createObjectURL(file);

    const newResume: ResumeMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: formatName,
      uploadedAt: new Date().toISOString(),
      fileUrl: objectUrl,
      storageType: 'local_session'
    };

    setResume(newResume);
    updateProfile({ resume: newResume });
    showToast('success', 'Resume Uploaded', `${file.name} uploaded successfully.`);
    e.target.value = '';
  };

  const handleTriggerUpload = () => {
    setResumeError(null);
    fileInputRef.current?.click();
  };

  const handleRemoveResume = () => {
    if (window.confirm('Are you sure you want to remove your uploaded resume? This cannot be undone.')) {
      if (resume?.fileUrl && resume.fileUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(resume.fileUrl);
        } catch {}
      }
      setResume(undefined);
      setResumeError(null);
      updateProfile({ resume: undefined });
      showToast('info', 'Resume Removed', 'Your resume has been removed from your profile.');
    }
  };

  const handleViewNotice = () => {
    if (resume?.fileUrl) {
      window.open(resume.fileUrl, '_blank');
    } else {
      showToast(
        'info',
        'Resume Metadata Stored',
        `File: ${resume?.fileName} (${resume?.fileType}, ${formatFileSize(resume?.fileSize || 0)}). Use "Replace Resume" to re-attach the document in this session.`
      );
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName,
      phone,
      currentCity,
      bio,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      avatarUrl,
      resume
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Candidate Profile & Personal Details
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Maintain your verified contact information, online presence, and executive biography
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Header Card */}
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <img
            src={avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
            alt={fullName}
            className="w-20 h-20 rounded-2xl object-cover border border-borderDark ring-2 ring-primary/20 shadow-subtle flex-shrink-0"
          />

          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-lg font-bold text-textPrimary">{fullName}</h3>
            <p className="text-xs text-textMuted">
              Candidate ID: <span className="font-mono font-bold text-textPrimary">{candidate.id}</span> •{' '}
              {currentCity}
            </p>
            <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-textMuted font-medium">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" /> {candidate.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-primary" /> {phone}
              </span>
            </div>
          </div>
        </div>

        {/* Form Fields Card */}
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-5">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            Personal & Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Primary Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Current Residence City
              </label>
              <input
                type="text"
                required
                value={currentCity}
                onChange={(e) => setCurrentCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
              Professional Biography
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Highlight your core technical strengths, engineering philosophies, and recent accomplishments..."
            />
          </div>
        </div>

        {/* Resume / CV Card */}
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Resume / CV
              </h3>
              <p className="text-xs text-textMuted mt-0.5">
                Upload your latest resume to help recruiters understand your qualifications and experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-textMuted">
              <span className="px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-borderMuted font-medium">
                PDF, DOC, DOCX
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-borderMuted font-medium">
                Max 5 MB
              </span>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload Resume"
          />

          {/* Error Banner */}
          {resumeError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{resumeError}</span>
            </div>
          )}

          {!resume ? (
            /* Empty State: No Resume Uploaded */
            <div className="p-6 rounded-xl border border-dashed border-borderDark bg-[#FAF9F5] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sidebar border border-borderMuted flex items-center justify-center text-primary shadow-subtle">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-textPrimary">
                  No resume uploaded yet. Upload your latest resume.
                </p>
                <p className="text-[11px] text-textMuted">
                  Supported file formats: PDF, DOC and DOCX (Maximum file size: 5 MB)
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerUpload}
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload Resume
              </button>
            </div>
          ) : (
            /* Uploaded State: Resume Details & Actions */
            <div className="p-4 sm:p-5 rounded-xl border border-primary/30 bg-primary-light/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-3 bg-cards rounded-xl border border-borderDark text-primary shadow-subtle flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-textPrimary truncate max-w-xs sm:max-w-md">
                        {resume.fileName}
                      </span>
                      <Badge variant="sage" size="sm">
                        {resume.fileType}
                      </Badge>
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3" /> UPLOADED
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-textMuted">
                      <span>
                        Size: <strong className="text-textPrimary font-mono">{formatFileSize(resume.fileSize)}</strong>
                      </span>
                      {resume.uploadedAt && (
                        <>
                          <span>•</span>
                          <span>
                            Uploaded: <strong className="text-textPrimary">{formatUploadDate(resume.uploadedAt)}</strong>
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-textMuted font-medium">
                        Status: <strong className="text-emerald-700">Active Profile Document</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-primary/20 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {resume.fileUrl ? (
                    <a
                      href={resume.fileUrl}
                      download={resume.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-cards border border-borderDark text-textPrimary rounded-xl text-xs font-bold hover:bg-sidebar transition-colors shadow-subtle flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> View / Download
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleViewNotice}
                      className="px-3.5 py-1.5 bg-cards border border-borderDark text-textPrimary rounded-xl text-xs font-bold hover:bg-sidebar transition-colors shadow-subtle flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> View / Download
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleTriggerUpload}
                    className="px-3.5 py-1.5 bg-cards border border-borderDark text-textPrimary rounded-xl text-xs font-bold hover:bg-sidebar transition-colors shadow-subtle flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-primary" /> Replace Resume
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveResume}
                  className="px-3.5 py-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Resume
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Links Card */}
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            Web & Portfolio Presence
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" /> Personal Website / Portfolio
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://yourname.dev"
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-primary" /> GitHub Profile
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-primary" /> LinkedIn Profile
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Profile Details
          </button>
        </div>
      </form>
    </div>
  );
};
