import React, { useState } from 'react';
import {
  Shield,
  FileText,
  Save,
  CheckCircle2,
  ExternalLink,
  Globe,
  Share2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { BusinessSettings, LegalSettings } from '../../types.ts';
import { updateSettings } from '../../lib/api.ts';

interface AdminLegalTabProps {
  settings: BusinessSettings | null;
  onSaved: () => void;
  onShowToast: (msg: string) => void;
  onPreviewPage?: (page: 'privacy' | 'about' | 'contact' | 'disclaimer') => void;
}

export const AdminLegalTab: React.FC<AdminLegalTabProps> = ({
  settings,
  onSaved,
  onShowToast,
  onPreviewPage,
}) => {
  const currentLegal: LegalSettings = settings?.legalSettings || {
    lastUpdated: 'September 2026',
    privacyPolicy: '',
    aboutUs: '',
    contactInfoNotes: '',
    disclaimer: '',
    socialLinks: {
      instagram: '',
      facebook: '',
      youtube: '',
      whatsapp: '',
      googleBusiness: '',
    },
  };

  const [lastUpdated, setLastUpdated] = useState(currentLegal.lastUpdated || 'September 2026');
  const [privacyPolicy, setPrivacyPolicy] = useState(currentLegal.privacyPolicy || '');
  const [aboutUs, setAboutUs] = useState(currentLegal.aboutUs || '');
  const [contactInfoNotes, setContactInfoNotes] = useState(currentLegal.contactInfoNotes || '');
  const [disclaimer, setDisclaimer] = useState(currentLegal.disclaimer || settings?.disclaimer || '');

  // Social Links
  const [instagram, setInstagram] = useState(currentLegal.socialLinks?.instagram || '');
  const [facebook, setFacebook] = useState(currentLegal.socialLinks?.facebook || '');
  const [youtube, setYoutube] = useState(currentLegal.socialLinks?.youtube || '');
  const [googleBusiness, setGoogleBusiness] = useState(currentLegal.socialLinks?.googleBusiness || '');

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const updatedLegalSettings: LegalSettings = {
        lastUpdated: lastUpdated.trim() || 'September 2026',
        privacyPolicy: privacyPolicy.trim(),
        aboutUs: aboutUs.trim(),
        contactInfoNotes: contactInfoNotes.trim(),
        disclaimer: disclaimer.trim(),
        socialLinks: {
          instagram: instagram.trim() || undefined,
          facebook: facebook.trim() || undefined,
          youtube: youtube.trim() || undefined,
          googleBusiness: googleBusiness.trim() || undefined,
          whatsapp: settings.whatsappNumber || undefined,
        },
      };

      await updateSettings({
        ...settings,
        disclaimer: disclaimer.trim() || settings.disclaimer,
        legalSettings: updatedLegalSettings,
      });

      onShowToast('Legal and informational pages content updated successfully');
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save legal settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="admin-legal-tab" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
              Page Content Management
            </span>
            <span className="text-xs text-stone-400">Jai Hanuman Door</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mt-1">
            Legal & Information Pages
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure content, legal notices, workshop heritage narratives, and verified social media links.
          </p>
        </div>

        {/* Quick Preview Links */}
        {onPreviewPage && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-stone-500 text-[11px] mr-1">Live Previews:</span>
            <button
              type="button"
              onClick={() => onPreviewPage('privacy')}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 flex items-center gap-1 transition-colors"
            >
              <span>Privacy</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => onPreviewPage('about')}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 flex items-center gap-1 transition-colors"
            >
              <span>About Us</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => onPreviewPage('contact')}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 flex items-center gap-1 transition-colors"
            >
              <span>Contact</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => onPreviewPage('disclaimer')}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 flex items-center gap-1 transition-colors"
            >
              <span>Disclaimer</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Date of Last Revision */}
        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-200">
                Effective Legal Revision Date
              </label>
              <p className="text-[11px] text-stone-400">
                Displayed at the top of Privacy Policy and Disclaimer pages.
              </p>
            </div>
          </div>
          <input
            type="text"
            value={lastUpdated}
            onChange={e => setLastUpdated(e.target.value)}
            placeholder="e.g. September 2026"
            className="w-full sm:w-56 px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs font-mono focus:border-amber-500 outline-none"
          />
        </div>

        {/* 1. Privacy Policy Custom Notice */}
        <div className="p-5 sm:p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
          <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>1. Privacy Policy — Factory Notice & Custom Terms</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            The Privacy Policy already provides comprehensive disclosures (image handling, camera bounds fitting, no third-party data broker sale, hashed passwords). You can add specific factory notices, registration clauses, or data protection contact details here.
          </p>
          <textarea
            rows={4}
            value={privacyPolicy}
            onChange={e => setPrivacyPolicy(e.target.value)}
            placeholder="e.g. Shivshahi Doors guarantees that all customer door specifications and inquiries are treated with strict confidentiality. Customer phone numbers will only be used by our direct workshop team..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:border-amber-500 outline-none leading-relaxed"
          />
        </div>

        {/* 2. About Us Narrative & Heritage Story */}
        <div className="p-5 sm:p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
          <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>2. About Us — Workshop Heritage & Mission Statement</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Highlight your woodworking legacy, timber sourcing philosophies, master carpenter expertise, or special machinery:
          </p>
          <textarea
            rows={4}
            value={aboutUs}
            onChange={e => setAboutUs(e.target.value)}
            placeholder="e.g. At Jai Hanuman Door, our journey began over twenty years ago in Pune's timber trade. Today, we combine authentic seasoned Sagwan woodcraft with modern manufacturing precision to give customers unmatched quality..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:border-amber-500 outline-none leading-relaxed"
          />
        </div>

        {/* 3. Disclaimer Advisory */}
        <div className="p-5 sm:p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
          <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>3. Disclaimer & Estimation Terms</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Highlighted estimation warning displayed across quotation forms and the Disclaimer page:
          </p>
          <textarea
            rows={3}
            value={disclaimer}
            onChange={e => setDisclaimer(e.target.value)}
            placeholder="e.g. Prices calculated are preliminary estimates based on standard dimensions and current timber market rates. Final quotation will be confirmed upon physical site measurement and timber grading..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:border-amber-500 outline-none leading-relaxed"
          />
        </div>

        {/* 4. Contact Us Notes & Factory Instructions */}
        <div className="p-5 sm:p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
          <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
            <Info className="w-4 h-4 text-amber-400" />
            <span>4. Contact Us — Guidance Notes & Directions Note</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Provide visiting advice, landmark instructions, or measurement booking guidance on the Contact Us page:
          </p>
          <textarea
            rows={2}
            value={contactInfoNotes}
            onChange={e => setContactInfoNotes(e.target.value)}
            placeholder="e.g. Factory workshop visits are welcome between 9:00 AM and 8:00 PM. For on-site door measurements in Pune and PCMC areas, please call us 24 hours in advance."
            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:border-amber-500 outline-none leading-relaxed"
          />
        </div>

        {/* 5. Verified Social Media & Google Maps Links */}
        <div className="p-5 sm:p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>5. Social Profiles & Google Business Map URL</span>
          </div>
          <p className="text-xs text-stone-400">
            Only fill verified URLs that exist. Empty fields will not be shown to customers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-300 font-semibold mb-1">
                Instagram Profile URL
              </label>
              <input
                type="url"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="https://instagram.com/shivshahidoors"
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1">
                Facebook Page URL
              </label>
              <input
                type="url"
                value={facebook}
                onChange={e => setFacebook(e.target.value)}
                placeholder="https://facebook.com/shivshahidoors"
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1">
                YouTube Channel URL
              </label>
              <input
                type="url"
                value={youtube}
                onChange={e => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@shivshahidoors"
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1">
                Google Business / Maps Direct Link
              </label>
              <input
                type="url"
                value={googleBusiness}
                onChange={e => setGoogleBusiness(e.target.value)}
                placeholder="https://maps.app.goo.gl/your-workshop"
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="sticky bottom-0 bg-stone-950/90 backdrop-blur-md p-4 rounded-2xl border border-stone-800 flex items-center justify-between gap-4 shadow-2xl">
          <div className="text-xs text-stone-400">
            Changes apply immediately across all legal and contact pages.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            {saving ? (
              <span>Saving Pages...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Legal & Page Content</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
