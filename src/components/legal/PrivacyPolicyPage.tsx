import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Server,
  FileText,
  UserCheck,
  CheckCircle2,
  Mail,
  Phone,
  MessageCircle,
  Building,
} from 'lucide-react';
import { BusinessSettings } from '../../types.ts';
import { getWhatsAppUrl, formatWhatsAppDisplay } from '../../lib/contactUtils.ts';

interface PrivacyPolicyPageProps {
  settings: BusinessSettings;
  onBack: () => void;
  onNavigateContact?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  settings,
  onBack,
  onNavigateContact,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Privacy Policy | Jai Hanuman Door';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Privacy Policy for ${settings.businessName || 'Jai Hanuman Door'}. Learn how your personal data and quotation specifications are securely handled.`
      );
    }
  }, [settings.businessName]);

  const lastUpdated = settings.legalSettings?.lastUpdated || 'September 2026';
  const customPolicyText = settings.legalSettings?.privacyPolicy;

  return (
    <div id="privacy-policy-page" className="min-h-screen bg-stone-950 text-stone-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Back navigation & breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="privacy-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-stone-700 transition-all text-xs font-semibold group shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
            <span>Back to Storefront</span>
          </button>

          <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Last Updated: {lastUpdated}
          </span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-stone-800/90 p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">
            <Shield className="w-4 h-4" />
            <span>Legal & Data Protection</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Privacy Policy
          </h1>

          <p className="text-stone-400 text-sm sm:text-base mt-4 leading-relaxed max-w-2xl">
            This Privacy Policy outlines how{' '}
            <strong>{settings.businessName || 'Jai Hanuman Door'}</strong> collects, uses, protects, and handles your personal information, design preferences, and quotation details across our application.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800/80 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No Third-Party Sale</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Salted Hashed Auth</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Direct Factory Estimates</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full User Control</span>
            </div>
          </div>
        </div>

        {/* Admin Customized Policy Notice (if configured) */}
        {customPolicyText && (
          <div className="mb-10 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-200">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <FileText className="w-4 h-4" />
              <span>Notice from Factory Management</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line text-stone-200">
              {customPolicyText}
            </p>
          </div>
        )}

        {/* Core Policy Content Sections */}
        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">
          
          {/* Section 1: Introduction */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">01</span>
              Introduction & Identity
            </h2>
            <p>
              Jai Hanuman Door is a dedicated woodworking and door manufacturing enterprise created for customers, builders, architects, and homeowners seeking high-quality solid wood doors. The physical manufacturing, timber seasoning, and fulfillment operations are conducted by <strong>{settings.businessName || 'Jai Hanuman Door'}</strong> ({settings.address || 'Pune, Maharashtra, India'}).
            </p>
            <p className="mt-3">
              By accessing Jai Hanuman Door, using our door price estimation calculator, or submitting customer contact inquiries, you acknowledge and agree to the data practices described in this policy.
            </p>
          </section>

          {/* Section 2: Information We Collect */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">02</span>
              Information We Collect
            </h2>
            <p>
              We collect only the minimum necessary information required to compute accurate door estimates, respond to custom woodworking inquiries, and manage customer quotes:
            </p>
            <ul className="mt-4 space-y-3 pl-2">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span>
                  <strong>Customer Contact Details:</strong> When you request a quote or submit an enquiry via our Contact form, we collect your name, mobile phone number, optional email address, and city or site location.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span>
                  <strong>Quotation & Calculation Specifications:</strong> Selected door models, width and height dimensions in inches, timber material species (e.g. Seasoned Sagwan, CP Teak, Pine Wood), frame (chaukhat) selections, polish finish grades, and hardware options.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span>
                  <strong>Account Credentials:</strong> If you register a customer profile, we store your name, phone, city, and a cryptographically salted password hash.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span>
                  <strong>App Preferences & Interaction Data:</strong> Favorite door IDs, saved calculations, and article reading bookmarks stored locally on your device.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 3: Customer Inquiries & Quotation Privacy */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">03</span>
              Customer Inquiries & Quotation Privacy
            </h2>
            <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 mb-4 flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-stone-300 space-y-1">
                <p className="font-semibold text-amber-300">Your Quotation Data Is Strictly Confidential</p>
                <p className="leading-relaxed">
                  All door measurements, timber grade selections, pricing estimates, and contact records are handled with complete confidentiality and stored securely.
                </p>
              </div>
            </div>
            <p>
              We do not sell, rent, or trade your contact numbers or quotation requests to third-party marketing brokers. Your information is accessed exclusively by our direct workshop carpentry estimators.
            </p>
          </section>

          {/* Section 4: How We Use Your Information */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">04</span>
              How We Use Your Information
            </h2>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                <span>To generate transparent itemized price estimates and formal PDF quotation sheets.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                <span>To coordinate site measurement appointments and dispatch logistics directly from our workshop.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                <span>To communicate order updates, wood seasoning status, and delivery schedules via phone or WhatsApp.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                <span>To deliver optional push notification updates regarding new seasonal door designs (when opted in).</span>
              </li>
            </ul>
          </section>

          {/* Section 5: Data Security */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">05</span>
              Data Security & Protection Measures
            </h2>
            <p>
              We implement industry-standard technical safeguards to protect your personal information:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800">
                <span className="font-bold text-amber-400 block mb-1">Encrypted In Transit</span>
                All network communication utilizes HTTPS / TLS encryption to protect against data interception.
              </div>
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800">
                <span className="font-bold text-amber-400 block mb-1">Salted Hashed Passwords</span>
                User passwords are never stored in plaintext. They are hashed using individual cryptographic salts.
              </div>
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800">
                <span className="font-bold text-amber-400 block mb-1">Anti-Spam & Rate Limits</span>
                Enquiry endpoints feature strict rate limiting and deduplication guards against malicious abuse.
              </div>
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800">
                <span className="font-bold text-amber-400 block mb-1">Role-Based Admin Protection</span>
                Administrative endpoints require secure bearer token authentication.
              </div>
            </div>
          </section>

          {/* Section 6: Third-Party Services */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">06</span>
              Third-Party Services & Integrations
            </h2>
            <p>
              We do not sell, rent, or trade customer information. We interface only with trusted technology infrastructure:
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <strong>WhatsApp Messaging:</strong> When you initiate a WhatsApp chat or send an inquiry, your chat interaction is governed by WhatsApp / Meta's privacy policies.
              </li>
              <li>
                <strong>AI Vision API:</strong> Entrance opening detection is processed securely via Google Gemini Vision API to detect structural geometry coordinates.
              </li>
            </ul>
          </section>

          {/* Section 7: User Rights & Data Retention */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">07</span>
              Your Privacy Rights & Choices
            </h2>
            <p>
              As a customer, you have complete control over your data:
            </p>
            <ul className="mt-3 space-y-2 pl-4 list-disc">
              <li>You may request a copy of the quotations and enquiries registered under your phone number.</li>
              <li>You can clear local favorites and calculation history at any time from your browser settings or user profile.</li>
              <li>You may opt out of push notifications at any time via your browser notification permissions.</li>
              <li>You can request the permanent deletion of your account and customer inquiry records by emailing us.</li>
            </ul>
          </section>

          {/* Section 8: Grievance Officer & Contact */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">08</span>
              Privacy Grievances & Factory Contact
            </h2>
            <p>
              If you have any questions, clarifications, or requests regarding this Privacy Policy, please contact our workshop:
            </p>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                <Building className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{settings.businessName || 'Jai Hanuman Door'}</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`mailto:${settings.email}`} className="text-amber-400 hover:underline">
                  {settings.email || 'shivshahidoors@gmail.com'}
                </a>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`tel:${settings.phone}`} className="text-stone-300 font-mono hover:underline">
                  {settings.phone || '+91 78874 12884'}
                </a>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName || 'Jai Hanuman Door'}, I have a question regarding privacy.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 font-mono hover:underline"
                >
                  {formatWhatsAppDisplay(settings.whatsappNumber)}
                </a>
              </div>
            </div>

            {onNavigateContact && (
              <div className="mt-6 pt-6 border-t border-stone-800 flex justify-end">
                <button
                  onClick={onNavigateContact}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Visit Contact Page
                </button>
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
};
