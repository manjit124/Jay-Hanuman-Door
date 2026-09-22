import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Briefcase,
  Award,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Video,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { TeamMember, BusinessSettings } from '../types.ts';
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  toggleTeamMemberActive,
  reorderTeamMembers,
  uploadImage,
} from '../lib/api.ts';
import { TeamMemberDetailModal } from './TeamMemberDetailModal.tsx';

interface AdminTeamTabProps {
  teamMembers: TeamMember[];
  onReload: () => Promise<void>;
  settings?: BusinessSettings;
}

const COMMON_DESIGNATIONS = [
  'Founder & CEO',
  'Managing Director',
  'General Manager',
  'Production Manager',
  'Workshop Manager',
  'Sales Manager',
  'Design Head',
  'Master Wood Carver',
  'Quality & Seasoning Head',
  'Customer Relationship Manager',
];

export const AdminTeamTab: React.FC<AdminTeamTabProps> = ({
  teamMembers,
  onReload,
  settings,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Preview Modal state (Section 18)
  const [previewMember, setPreviewMember] = useState<TeamMember | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    name: string;
    designation: string;
    photo: string;
    shortBio: string;
    fullBio: string;
    experience: string;
    specialization: string;
    responsibilitiesText: string;
    achievementsText: string;
    linkedin: string;
    instagram: string;
    facebook: string;
    youtube: string;
    email: string;
    videoUrl: string;
    displayOrder: number;
    active: boolean;
  }>({
    name: '',
    designation: '',
    photo: '',
    shortBio: '',
    fullBio: '',
    experience: '',
    specialization: '',
    responsibilitiesText: '',
    achievementsText: '',
    linkedin: '',
    instagram: '',
    facebook: '',
    youtube: '',
    email: '',
    videoUrl: '',
    displayOrder: 1,
    active: true,
  });

  // Photo Upload States
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sorted members
  const sortedMembers = [...(teamMembers || [])].sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );

  const activeCount = sortedMembers.filter(m => m.active).length;
  const inactiveCount = sortedMembers.length - activeCount;

  // Open Form for Adding New Member
  const handleOpenAdd = () => {
    setEditingMember(null);
    const nextOrder = sortedMembers.length > 0
      ? Math.max(...sortedMembers.map(m => m.displayOrder || 0)) + 1
      : 1;

    setFormData({
      name: '',
      designation: '',
      photo: '',
      shortBio: '',
      fullBio: '',
      experience: '',
      specialization: '',
      responsibilitiesText: '',
      achievementsText: '',
      linkedin: '',
      instagram: '',
      facebook: '',
      youtube: '',
      email: '',
      videoUrl: '',
      displayOrder: nextOrder,
      active: true,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Open Form for Editing Member
  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      designation: member.designation,
      photo: member.photo || '',
      shortBio: member.shortBio || '',
      fullBio: member.fullBio || '',
      experience: member.experience || '',
      specialization: member.specialization || '',
      responsibilitiesText: (member.responsibilities || []).join('\n'),
      achievementsText: (member.achievements || []).join('\n'),
      linkedin: member.socialLinks?.linkedin || '',
      instagram: member.socialLinks?.instagram || '',
      facebook: member.socialLinks?.facebook || '',
      youtube: member.socialLinks?.youtube || '',
      email: member.socialLinks?.email || '',
      videoUrl: member.videoUrl || '',
      displayOrder: member.displayOrder || 1,
      active: member.active,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Photo Upload Handler (JPG, JPEG, PNG, WEBP, Max 15MB)
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate image type
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      setErrorMessage('Please upload a valid image file (JPG, JPEG, PNG, or WEBP).');
      return;
    }

    // Validate 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 15MB limit. Please upload a smaller photo.');
      return;
    }

    try {
      setUploadingPhoto(true);
      setErrorMessage(null);
      const res = await uploadImage(file);
      if (res && res.url) {
        setFormData(prev => ({ ...prev, photo: res.url }));
        setSuccessMessage('Profile photo uploaded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      setErrorMessage(err?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
    e.target.value = '';
  };

  const onDropPhoto = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.designation.trim()) {
      setErrorMessage('Designation is required.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const parseLines = (text: string) =>
        text.split('\n').map(l => l.trim()).filter(Boolean);

      const payload: Partial<TeamMember> = {
        name: formData.name.trim(),
        designation: formData.designation.trim(),
        photo: formData.photo.trim(),
        shortBio: formData.shortBio.trim(),
        fullBio: formData.fullBio.trim(),
        experience: formData.experience.trim() || undefined,
        specialization: formData.specialization.trim() || undefined,
        responsibilities: parseLines(formData.responsibilitiesText),
        achievements: parseLines(formData.achievementsText),
        socialLinks: {
          linkedin: formData.linkedin.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          facebook: formData.facebook.trim() || undefined,
          youtube: formData.youtube.trim() || undefined,
          email: formData.email.trim() || undefined,
        },
        videoUrl: formData.videoUrl.trim() || undefined,
        displayOrder: Number(formData.displayOrder) || 1,
        active: formData.active,
      };

      if (editingMember) {
        await updateTeamMember(editingMember.id, payload);
        setSuccessMessage(`Updated profile for ${formData.name}`);
      } else {
        await createTeamMember(payload);
        setSuccessMessage(`Added ${formData.name} to team`);
      }

      setIsModalOpen(false);
      await onReload();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save team member:', err);
      setErrorMessage(err?.message || 'Failed to save team member.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleActive = async (id: string, name: string) => {
    try {
      setLoading(true);
      const res = await toggleTeamMemberActive(id);
      await onReload();
      setSuccessMessage(`${name} is now ${res.active ? 'Visible to Customers (Active)' : 'Hidden from Customers (Inactive)'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Toggle error:', err);
      setErrorMessage('Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  // Move Up / Move Down Reordering
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedMembers.length) return;

    const currentItem = sortedMembers[index];
    const targetItem = sortedMembers[targetIndex];

    const currentOrder = currentItem.displayOrder || index + 1;
    const targetOrder = targetItem.displayOrder || targetIndex + 1;

    // Swap orders
    const orderList = [
      { id: currentItem.id, displayOrder: targetOrder === currentOrder ? (direction === 'up' ? currentOrder - 1 : currentOrder + 1) : targetOrder },
      { id: targetItem.id, displayOrder: currentOrder },
    ];

    try {
      setLoading(true);
      await reorderTeamMembers(orderList);
      await onReload();
    } catch (err: any) {
      console.error('Reorder error:', err);
      setErrorMessage('Failed to reorder team members.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Team Member
  const handleDelete = async (member: TeamMember) => {
    if (!window.confirm(`Are you sure you want to delete ${member.name} (${member.designation})?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteTeamMember(member.id);
      await onReload();
      setSuccessMessage(`Deleted ${member.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMessage(err?.message || 'Failed to delete team member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin-team-management-tab" className="space-y-6">
      {/* Header with Stats & Actions */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-100">
                Team & Leadership Management
              </h2>
              <p className="text-xs text-stone-400">
                Configure founders, executive leadership, workshop heads, and master craftsmen displayed on the home page.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-medium">
              Total: <strong>{sortedMembers.length}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Active: <strong>{activeCount}</strong>
            </span>
            {inactiveCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                Inactive (Hidden): <strong>{inactiveCount}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            id="admin-reload-team-btn"
            onClick={() => onReload()}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs flex items-center gap-1.5 border border-stone-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="admin-add-team-btn"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        {sortedMembers.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-800/80 text-stone-500 flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="font-serif text-base font-bold text-stone-200">No Team Members Added Yet</h3>
              <p className="text-xs text-stone-400 mt-1">
                Add your company founder, workshop manager, or master craftsman to showcase leadership and build buyer trust.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs inline-flex items-center gap-2 shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-stone-400 uppercase tracking-wider text-[10px] font-semibold border-b border-stone-800">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">Order</th>
                  <th className="py-3.5 px-4">Member Profile</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Specialization & Experience</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {sortedMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`hover:bg-stone-850/60 transition-colors ${
                      !member.active ? 'opacity-60 bg-stone-950/40' : ''
                    }`}
                  >
                    {/* Order Controls */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          title="Move up"
                          className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-amber-500 text-xs">
                          {member.displayOrder}
                        </span>
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === sortedMembers.length - 1}
                          title="Move down"
                          className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-transparent"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Member Profile Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-14 rounded-xl overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-serif font-bold text-stone-100 text-sm">
                            {member.name}
                          </div>
                          <div className="text-amber-400 font-medium text-xs mt-0.5">
                            {member.designation}
                          </div>
                          {member.shortBio && (
                            <div className="text-[11px] text-stone-400 line-clamp-1 italic mt-1">
                              "{member.shortBio}"
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Specialization & Experience */}
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <div className="space-y-1">
                        {member.experience && (
                          <div className="text-xs text-stone-300 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                            <span>{member.experience}</span>
                          </div>
                        )}
                        {member.specialization && (
                          <div className="text-xs text-stone-400 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span>{member.specialization}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Badge & Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(member.id, member.name)}
                        title={`Click to ${member.active ? 'disable' : 'enable'}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          member.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-700'
                        }`}
                      >
                        {member.active ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview Customer View */}
                        <button
                          onClick={() => setPreviewMember(member)}
                          title="Preview Customer Profile"
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(member)}
                          title="Edit Profile"
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(member)}
                          title="Delete Profile"
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-600 hover:text-white text-stone-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div
          id="admin-team-form-modal"
          className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-stone-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-stone-100 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif text-lg font-bold text-stone-100">
                  {editingMember ? `Edit Team Member: ${editingMember.name}` : 'Add New Team Member'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Profile Photo Section (Direct File Upload Only) */}
              <div className="space-y-3 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Profile Photo
                  </label>
                  {uploadingPhoto && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading photo...
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* 1. Current Profile Photo Preview */}
                  <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-stone-800 border-2 border-amber-500/30 shrink-0 shadow-md">
                    {formData.photo ? (
                      <img
                        src={formData.photo}
                        alt="Profile preview"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 p-2 text-center">
                        <ImageIcon className="w-6 h-6 mb-1 text-stone-600" />
                        <span className="text-[10px]">No Photo</span>
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-stone-950/80 flex items-center justify-center text-amber-400 backdrop-blur-xs">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* 2. Upload / Browse Files, 3. Replace Photo, 4. Remove Photo */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={onDropPhoto}
                    className={`flex-1 w-full border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                      isDragOver
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-stone-700 hover:border-amber-500/50 bg-stone-900/60'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={onFileInputChange}
                      className="hidden"
                    />

                    <Upload className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <p className="text-xs text-stone-300 font-medium">
                      Drag & drop person's photo here, or{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="text-amber-400 underline hover:text-amber-300 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        browse files
                      </button>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Supported: JPG, JPEG, PNG, WEBP (Max 15MB)
                    </p>

                    {/* Action buttons: Replace Photo & Remove Photo */}
                    {formData.photo && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="text-xs px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-stone-400" />
                          Replace Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, photo: '' }))}
                          disabled={uploadingPhoto}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          Remove Photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Full Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Manjeet Prajapati"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Designation / Role <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="designation-suggestions"
                    value={formData.designation}
                    onChange={(e) => setFormData(p => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Founder & CEO"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                  <datalist id="designation-suggestions">
                    {COMMON_DESIGNATIONS.map(role => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Experience & Specialization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Experience (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData(p => ({ ...p, experience: e.target.value }))}
                    placeholder="e.g. 10+ Years or 15 Years in Timber"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Specialization / Expertise (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData(p => ({ ...p, specialization: e.target.value }))}
                    placeholder="e.g. Sagwan Door Manufacturing & Carving"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Short Bio for Carousel Card */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Short Bio / Quote (Displayed on Carousel Card)
                </label>
                <textarea
                  rows={2}
                  value={formData.shortBio}
                  onChange={(e) => setFormData(p => ({ ...p, shortBio: e.target.value }))}
                  placeholder="e.g. Dedicated to delivering premium wooden doors with authentic teak craftsmanship and enduring trust."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Full Biography for Detailed Modal View */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Full Biography (Displayed in Detailed Profile View)
                </label>
                <textarea
                  rows={4}
                  value={formData.fullBio}
                  onChange={(e) => setFormData(p => ({ ...p, fullBio: e.target.value }))}
                  placeholder="Detailed background, industry experience, craftsmanship standards, and dedication to wood architecture."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Key Responsibilities & Milestones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Responsibilities (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.responsibilitiesText}
                    onChange={(e) => setFormData(p => ({ ...p, responsibilitiesText: e.target.value }))}
                    placeholder="Timber selection & seasoning&#10;Workshop quality supervision&#10;Client architectural consultations"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Achievements / Milestones (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.achievementsText}
                    onChange={(e) => setFormData(p => ({ ...p, achievementsText: e.target.value }))}
                    placeholder="10,000+ custom doors engineered&#10;State woodworking award 2024&#10;Pioneered vacuum pressure treatment"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Optional Social / Contact Links */}
              <div className="space-y-3 bg-stone-950/40 p-4 rounded-2xl border border-stone-800">
                <span className="block text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Optional Contact & Social Links
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData(p => ({ ...p, linkedin: e.target.value }))}
                      placeholder="LinkedIn Profile URL"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="url"
                      value={formData.instagram}
                      onChange={(e) => setFormData(p => ({ ...p, instagram: e.target.value }))}
                      placeholder="Instagram Profile URL"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="url"
                      value={formData.facebook}
                      onChange={(e) => setFormData(p => ({ ...p, facebook: e.target.value }))}
                      placeholder="Facebook Profile URL"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="url"
                      value={formData.youtube}
                      onChange={(e) => setFormData(p => ({ ...p, youtube: e.target.value }))}
                      placeholder="YouTube Video / Channel URL"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="Business Email"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData(p => ({ ...p, videoUrl: e.target.value }))}
                      placeholder="Intro / Workshop Video URL"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Display Order & Active Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-950/60 border border-stone-800">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-stone-300">
                    Display Order:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData(p => ({ ...p, displayOrder: parseInt(e.target.value) || 1 }))}
                    className="w-20 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1 text-xs text-amber-400 font-bold focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-stone-300 cursor-pointer" htmlFor="member-active-toggle">
                    Visible on Customer Site:
                  </label>
                  <button
                    type="button"
                    id="member-active-toggle"
                    onClick={() => setFormData(p => ({ ...p, active: !p.active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formData.active ? 'bg-amber-600' : 'bg-stone-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || uploadingPhoto}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-2 shadow transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{editingMember ? 'Save Changes' : 'Create Team Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Preview Modal (Section 18) */}
      {previewMember && (
        <TeamMemberDetailModal
          member={previewMember}
          onClose={() => setPreviewMember(null)}
          settings={settings}
        />
      )}
    </div>
  );
};
