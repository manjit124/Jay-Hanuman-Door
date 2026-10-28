import React, { useState, useEffect } from 'react';
import {
  Award,
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Save,
  Eye,
  User,
  BookOpen,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { BusinessSettings, CompanyStorySettings } from '../types.ts';
import { uploadImage, updateSettings, resolveImageUrl } from '../lib/api.ts';

export const DEFAULT_STORY_SETTINGS: CompanyStorySettings = {
  sectionTitle: 'Our Story & Heritage',
  subtitle: 'A journey of craftsmanship, trust & quality',
  storyHeading: 'From Craftsmanship to Trusted Door Manufacturing',
  companyStory: `Jai Hanuman Door is a family-driven wooden door manufacturing business built on craftsmanship, quality and customer trust.

We specialize in handcrafted Sagwan (Teak) wood doors, custom main doors, wooden frames and premium entrance solutions.

Our journey has grown from traditional woodworking and hands-on craftsmanship into a modern door manufacturing and customer service experience — while keeping the quality of real wood at the heart of our work.`,
  ownerName: 'Manjeet Prajapati',
  ownerDesignation: 'Founder & Owner — Jai Hanuman Door',
  ownerDescription: 'Building Jai Hanuman Door with a focus on genuine wood quality, custom craftsmanship and transparent service for every customer.',
  ownerPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  highlights: [
    { title: '100% Genuine', subtitle: 'CP Teak & Hardwood' },
    { title: 'Precision Fit', subtitle: 'Custom Millimetre Sizing' },
    { title: 'Direct Factory', subtitle: 'Transparent Pricing' },
  ],
};

interface AdminBrandStoryTabProps {
  settings: BusinessSettings | null;
  onDataUpdated: () => void;
  showToast: (msg: string) => void;
}

export const AdminBrandStoryTab: React.FC<AdminBrandStoryTabProps> = ({
  settings,
  onDataUpdated,
  showToast,
}) => {
  const [formData, setFormData] = useState<CompanyStorySettings>(() => {
    const existing = settings?.storySettings;
    return {
      sectionTitle: existing?.sectionTitle ?? DEFAULT_STORY_SETTINGS.sectionTitle,
      subtitle: existing?.subtitle ?? DEFAULT_STORY_SETTINGS.subtitle,
      storyHeading: existing?.storyHeading ?? DEFAULT_STORY_SETTINGS.storyHeading,
      companyStory: existing?.companyStory ?? DEFAULT_STORY_SETTINGS.companyStory,
      ownerName: existing?.ownerName ?? DEFAULT_STORY_SETTINGS.ownerName,
      ownerDesignation: existing?.ownerDesignation ?? DEFAULT_STORY_SETTINGS.ownerDesignation,
      ownerDescription: existing?.ownerDescription ?? DEFAULT_STORY_SETTINGS.ownerDescription,
      ownerPhotoUrl: existing?.ownerPhotoUrl || DEFAULT_STORY_SETTINGS.ownerPhotoUrl,
      highlights: existing?.highlights && existing.highlights.length === 3
        ? existing.highlights
        : DEFAULT_STORY_SETTINGS.highlights,
    };
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Synchronize when parent settings change
  useEffect(() => {
    if (settings?.storySettings) {
      setFormData({
        sectionTitle: settings.storySettings.sectionTitle ?? DEFAULT_STORY_SETTINGS.sectionTitle,
        subtitle: settings.storySettings.subtitle ?? DEFAULT_STORY_SETTINGS.subtitle,
        storyHeading: settings.storySettings.storyHeading ?? DEFAULT_STORY_SETTINGS.storyHeading,
        companyStory: settings.storySettings.companyStory ?? DEFAULT_STORY_SETTINGS.companyStory,
        ownerName: settings.storySettings.ownerName ?? DEFAULT_STORY_SETTINGS.ownerName,
        ownerDesignation: settings.storySettings.ownerDesignation ?? DEFAULT_STORY_SETTINGS.ownerDesignation,
        ownerDescription: settings.storySettings.ownerDescription ?? DEFAULT_STORY_SETTINGS.ownerDescription,
        ownerPhotoUrl: settings.storySettings.ownerPhotoUrl || DEFAULT_STORY_SETTINGS.ownerPhotoUrl,
        highlights: settings.storySettings.highlights && settings.storySettings.highlights.length === 3
          ? settings.storySettings.highlights
          : DEFAULT_STORY_SETTINGS.highlights,
      });
    }
  }, [settings]);

  // Handle Photo File Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed image formats
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type.toLowerCase())) {
      alert('Please select a valid image file (JPG, JPEG, PNG, or WebP).');
      e.target.value = '';
      return;
    }

    // Maximum file size check (15 MB)
    if (file.size > 15 * 1024 * 1024) {
      alert('Image file size is too large. Please select an image under 15MB.');
      e.target.value = '';
      return;
    }

    if (uploadingPhoto) return;

    try {
      setUploadingPhoto(true);
      setUploadProgress(5);
      const res = await uploadImage(file, {
        maxDimension: 1200,
        quality: 0.84,
        onProgress: pct => setUploadProgress(pct),
      });
      if (res?.url) {
        setFormData(prev => ({ ...prev, ownerPhotoUrl: res.url }));
        showToast('Owner photo uploaded! Click "Save Changes" to apply.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Handle Save
  const handleSave = async () => {
    if (!settings) {
      alert('Settings not loaded. Please refresh and try again.');
      return;
    }

    try {
      setSaving(true);
      await updateSettings({
        ...settings,
        storySettings: {
          sectionTitle: formData.sectionTitle?.trim() || DEFAULT_STORY_SETTINGS.sectionTitle,
          subtitle: formData.subtitle?.trim() || DEFAULT_STORY_SETTINGS.subtitle,
          storyHeading: formData.storyHeading?.trim() || DEFAULT_STORY_SETTINGS.storyHeading,
          companyStory: formData.companyStory?.trim() || DEFAULT_STORY_SETTINGS.companyStory,
          ownerName: formData.ownerName?.trim() || DEFAULT_STORY_SETTINGS.ownerName,
          ownerDesignation: formData.ownerDesignation?.trim() || DEFAULT_STORY_SETTINGS.ownerDesignation,
          ownerDescription: formData.ownerDescription?.trim() || DEFAULT_STORY_SETTINGS.ownerDescription,
          ownerPhotoUrl: formData.ownerPhotoUrl?.trim() || DEFAULT_STORY_SETTINGS.ownerPhotoUrl,
          highlights: formData.highlights || DEFAULT_STORY_SETTINGS.highlights,
        },
      });

      onDataUpdated();
      showToast('Brand & Company Story updated successfully! Changes are live on the Home page.');
    } catch (err: any) {
      alert(err.message || 'Failed to save Brand Story settings.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all fields in Brand & Company Story to original defaults?')) {
      setFormData(DEFAULT_STORY_SETTINGS);
      showToast('Restored original story & owner defaults. Click Save Changes to apply.');
    }
  };

  // Highlight Change Handlers
  const handleHighlightChange = (index: number, field: 'title' | 'subtitle', value: string) => {
    setFormData(prev => {
      const current = [...(prev.highlights || DEFAULT_STORY_SETTINGS.highlights!)];
      current[index] = {
        ...current[index],
        [field]: value,
      };
      return { ...prev, highlights: current };
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211] shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A1A]">
                Brand &amp; Company Story
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                Home Page Live
              </span>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Edit the "Our Story &amp; Heritage" and "Meet the Owner" sections shown on the customer Home page.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="px-3.5 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#EAEAEA] border border-[#E0E0E0] text-[#444444] font-semibold text-xs flex items-center gap-1.5 transition-colors"
            title="Toggle preview of customer Home section"
          >
            <Eye className="w-4 h-4 text-[#777777]" />
            <span>{showLivePreview ? 'Hide Preview' : 'Live Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 border border-[#E5E5E5] hover:border-rose-200 text-stone-600 hover:text-rose-600 font-semibold text-xs flex items-center gap-1 transition-colors"
            title="Reset to original brand story"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            id="btn-save-brand-story"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Box (if enabled) */}
      {showLivePreview && (
        <div className="bg-[#FAF9F5] border-2 border-dashed border-[#C89211]/40 rounded-2xl p-5 shadow-inner">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBE8DF]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#C89211] uppercase tracking-wider">
              <Eye className="w-4 h-4" />
              <span>Live Home Page Customer Preview</span>
            </div>
            <span className="text-[11px] text-[#888888]">This is how it looks on the mobile/desktop home page</span>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#EAE6DA] shadow-xs text-center sm:text-left">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase mb-2">
                <Award className="w-3 h-3 text-[#C89211]" />
                <span>OUR STORY</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A]">
                {formData.sectionTitle || DEFAULT_STORY_SETTINGS.sectionTitle}
              </h3>
              <p className="text-xs text-[#777777] mt-0.5 font-medium">
                {formData.subtitle || DEFAULT_STORY_SETTINGS.subtitle}
              </p>
            </div>

            {/* Story Card */}
            <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-xl p-4 sm:p-5 mb-5">
              <h4 className="font-serif text-sm sm:text-base font-bold text-[#C89211] mb-2 text-center sm:text-left">
                {formData.storyHeading || DEFAULT_STORY_SETTINGS.storyHeading}
              </h4>
              <div className="space-y-2 text-xs text-[#444444] leading-relaxed whitespace-pre-line text-left">
                {formData.companyStory || DEFAULT_STORY_SETTINGS.companyStory}
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#EAE6DA] text-center">
                {(formData.highlights || DEFAULT_STORY_SETTINGS.highlights!).map((h, i) => (
                  <div key={i} className={`p-1.5 ${i === 1 ? 'border-x border-[#EAE6DA]' : ''}`}>
                    <div className="text-[#C89211] font-bold text-xs">{h.title}</div>
                    <div className="text-[10px] text-[#777777]">{h.subtitle}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owner Profile */}
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-[#C89211] via-[#E2B755] to-[#FFF7E3] shrink-0 shadow-xs">
                <img
                  src={resolveImageUrl(formData.ownerPhotoUrl || DEFAULT_STORY_SETTINGS.ownerPhotoUrl)}
                  alt={formData.ownerName}
                  className="w-full h-full object-cover rounded-full bg-[#FAF9F5]"
                />
              </div>
              <div>
                <h5 className="font-serif text-sm font-bold text-[#1A1A1A]">
                  {formData.ownerName || DEFAULT_STORY_SETTINGS.ownerName}
                </h5>
                <p className="text-[11px] text-[#C89211] font-semibold">
                  {formData.ownerDesignation || DEFAULT_STORY_SETTINGS.ownerDesignation}
                </p>
                <p className="text-xs text-[#555555] mt-1.5 leading-relaxed">
                  {formData.ownerDescription || DEFAULT_STORY_SETTINGS.ownerDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Edit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Company Story Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E5E5E5]">
              <Award className="w-4 h-4 text-[#C89211]" />
              <h3 className="font-serif font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">
                1. Company Story &amp; Heritage
              </h3>
            </div>

            {/* 1. Section Title */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Section Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sectionTitle || ''}
                onChange={e => setFormData(prev => ({ ...prev, sectionTitle: e.target.value }))}
                placeholder="e.g. Our Story & Heritage"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D5D5] focus:border-[#C89211] focus:ring-1 focus:ring-[#C89211] outline-hidden text-xs text-[#1A1A1A]"
              />
              <p className="text-[11px] text-[#888888] mt-1">
                Main title displayed in the Home page header. (Default: <code>Our Story &amp; Heritage</code>)
              </p>
            </div>

            {/* 2. Subtitle */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Section Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={e => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="e.g. A journey of craftsmanship, trust & quality"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D5D5] focus:border-[#C89211] focus:ring-1 focus:ring-[#C89211] outline-hidden text-xs text-[#1A1A1A]"
              />
            </div>

            {/* 3. Story Heading */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Story Card Heading
              </label>
              <input
                type="text"
                value={formData.storyHeading || ''}
                onChange={e => setFormData(prev => ({ ...prev, storyHeading: e.target.value }))}
                placeholder="e.g. From Craftsmanship to Trusted Door Manufacturing"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D5D5] focus:border-[#C89211] focus:ring-1 focus:ring-[#C89211] outline-hidden text-xs text-[#1A1A1A]"
              />
            </div>

            {/* 4. Company Story (Multiline) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#222222]">
                  Company Story (Paragraphs) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-[#888888]">Multiline text</span>
              </div>
              <textarea
                rows={6}
                value={formData.companyStory || ''}
                onChange={e => setFormData(prev => ({ ...prev, companyStory: e.target.value }))}
                placeholder="Write the history of Jai Hanuman Door..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D5D5] focus:border-[#C89211] focus:ring-1 focus:ring-[#C89211] outline-hidden text-xs text-[#1A1A1A] leading-relaxed font-sans"
              />
              <p className="text-[11px] text-[#888888] mt-1">
                Tip: Use double line breaks between paragraphs for clean spacing.
              </p>
            </div>
          </div>

          {/* 3 Brand Highlights */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E5E5E5]">
              <Sparkles className="w-4 h-4 text-[#C89211]" />
              <h3 className="font-serif font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">
                3. Brand Highlights / Badges
              </h3>
            </div>
            <p className="text-xs text-[#666666]">
              Three quick credibility pillars shown beneath the company story.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map(idx => {
                const hl = (formData.highlights || DEFAULT_STORY_SETTINGS.highlights!)[idx] || {
                  title: '',
                  subtitle: '',
                };
                return (
                  <div key={idx} className="bg-[#FAF9F5] border border-[#EAE6DA] rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-bold text-[#C89211] uppercase block">
                      Highlight #{idx + 1}
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#444444] mb-0.5">
                        Title
                      </label>
                      <input
                        type="text"
                        value={hl.title}
                        onChange={e => handleHighlightChange(idx, 'title', e.target.value)}
                        placeholder={`e.g. ${DEFAULT_STORY_SETTINGS.highlights![idx].title}`}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#D5D5D5] bg-white text-xs font-semibold text-[#1A1A1A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#444444] mb-0.5">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={hl.subtitle}
                        onChange={e => handleHighlightChange(idx, 'subtitle', e.target.value)}
                        placeholder={`e.g. ${DEFAULT_STORY_SETTINGS.highlights![idx].subtitle}`}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#D5D5D5] bg-white text-xs text-[#666666]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Owner Profile Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E5E5E5]">
              <User className="w-4 h-4 text-[#C89211]" />
              <h3 className="font-serif font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">
                2. Founder &amp; Owner Profile
              </h3>
            </div>

            {/* Owner Photo with Upload / Replace / Preview */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-2">
                Owner Photo
              </label>

              <div className="flex items-center gap-4">
                {/* Circular Preview with Gold Gradient Ring */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 bg-gradient-to-tr from-[#C89211] via-[#E2B755] to-[#FFF7E3] shadow-md">
                    <img
                      src={resolveImageUrl(formData.ownerPhotoUrl || DEFAULT_STORY_SETTINGS.ownerPhotoUrl)}
                      alt={formData.ownerName}
                      className="w-full h-full object-cover rounded-full bg-[#FAF9F5]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  </div>
                </div>

                {/* Upload & Action Buttons */}
                <div className="flex-1 space-y-2">
                  <label className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                    uploadingPhoto
                      ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      : 'bg-[#FFF7E3] hover:bg-[#FFEEC0] text-[#C89211] border border-[#C89211]/40'
                  }`}>
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingPhoto
                        ? `Uploading${uploadProgress !== null ? ` ${uploadProgress}%` : ''}...`
                        : 'Upload New Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          ownerPhotoUrl: DEFAULT_STORY_SETTINGS.ownerPhotoUrl,
                        }));
                        showToast('Reset to default owner avatar.');
                      }}
                      className="text-[11px] text-stone-500 hover:text-stone-700 underline"
                    >
                      Use Default Avatar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Owner Name */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Owner Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ownerName || ''}
                onChange={e => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                placeholder="e.g. Manjeet Prajapati"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D5D5] focus:border-[#C89211] focus:ring-1 focus:ring-[#C89211] outline-hidden text-xs text-[#1A1A1A] font-semibold"
              />
            </div>

            {/* 7. Designation */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Designation / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ownerDesignation || ''}
                onChange={e => setFormData(prev => ({ ...prev, ownerDesignation: e.target.value }))}
                placeholder="e.g. Founder & Owner — Jai Hanuman Door"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D5D5] focus:border-[#C89211] focus:ring-1 focus:ring-[#C89211] outline-hidden text-xs text-[#1A1A1A]"
              />
            </div>

            {/* 8. Owner Description */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Owner Description / Bio <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={formData.ownerDescription || ''}
                onChange={e => setFormData(prev => ({ ...prev, ownerDescription: e.target.value }))}
                placeholder="Write a short statement or focus from the owner..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D5D5] focus:border-[#C89211] focus:ring-1 focus:ring-[#C89211] outline-hidden text-xs text-[#1A1A1A] leading-relaxed"
              />
            </div>

            {/* Save Card Footer CTA */}
            <div className="pt-3 border-t border-[#E5E5E5] flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes to Home Page'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
