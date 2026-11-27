import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  Lock,
  FileText,
  UserCheck,
  CheckCircle2,
  Mail,
  Building,
} from 'lucide-react';
import { BusinessSettings } from '../../types.ts';
import { BRAND_NAME, resolveBrandName } from '../../config/brand.ts';

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
  const brandName = resolveBrandName(settings.businessName);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = `Privacy Policy | ${BRAND_NAME}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Privacy Policy for ${brandName}. Learn how your account details, saved sliding window projects, and measurement data are securely handled.`
      );
    }
  }, [brandName]);

  const lastUpdated = settings.legalSettings?.lastUpdated || 'November 2026';

  return (
    <div id="privacy-policy-page" className="min-h-screen bg-white text-[#0F172A] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="privacy-back-btn"
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] hover:text-[#0B5ED7] hover:border-[#0B5ED7] transition-all text-xs font-semibold group shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-[#0B5ED7]" />
            <span>Back to Home</span>
          </button>

          <span className="text-[11px] font-mono font-semibold text-[#0B5ED7] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#BFDBFE]">
            Last Updated: {lastUpdated}
          </span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 sm:p-10 shadow-xs mb-10">
          <div className="flex items-center gap-2 text-[#0B5ED7] text-xs font-bold tracking-wider uppercase mb-3">
            <Shield className="w-4 h-4" />
            <span>Legal &amp; Data Protection</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A2540] tracking-tight leading-tight">
            Privacy Policy
          </h1>

          <p className="text-[#475569] text-sm sm:text-base mt-4 leading-relaxed max-w-2xl">
            This Privacy Policy explains how <strong>{brandName}</strong> collects, uses, protects, and manages your mobile login details, saved fabrication profiles, cutting sheets, and support inquiries.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 pt-6 border-t border-[#E2E8F0] text-xs">
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#16803A] shrink-0" />
              <span>No Third-Party Sale</span>
            </div>
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <Lock className="w-4 h-4 text-[#0B5ED7] shrink-0" />
              <span>Hashed OTP Auth</span>
            </div>
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <FileText className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>Private Cutting Sheets</span>
            </div>
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <UserCheck className="w-4 h-4 text-[#16803A] shrink-0" />
              <span>Full User Control</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-[#475569] text-sm leading-relaxed">
          <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-extrabold text-[#0A2540] flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0B5ED7] text-xs flex items-center justify-center font-mono font-bold">01</span>
              <span>Introduction &amp; Scope</span>
            </h2>
            <p>
              <strong>{brandName}</strong> provides sliding window fabrication calculators, custom profile deduction management, bulk window cutting lists, AI photo measurement scanning, and workshop estimation tools. By signing in or using {brandName}, you agree to the practices described in this Privacy Policy.
            </p>
          </section>

          <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-extrabold text-[#0A2540] flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0B5ED7] text-xs flex items-center justify-center font-mono font-bold">02</span>
              <span>Information We Collect</span>
            </h2>
            <ul className="space-y-2.5 pl-1">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5ED7] mt-2 shrink-0" />
                <span>
                  <strong>Account &amp; OTP Verification:</strong> Your 10-digit mobile number and optional name/email used to verify login via SMS OTP and keep your saved fabrication projects and subscription status synced.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5ED7] mt-2 shrink-0" />
                <span>
                  <strong>Fabrication Profiles &amp; Projects:</strong> Window dimensions, track configurations, glass deductions, and saved project sheets that you choose to store in your workspace.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5ED7] mt-2 shrink-0" />
                <span>
                  <strong>Uploaded Measurement Photos:</strong> Photos uploaded to the Photo Measurement Scanner or AI Wood Detector are processed strictly to extract measurements or visual estimates for your session.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5ED7] mt-2 shrink-0" />
                <span>
                  <strong>Payments &amp; Subscriptions:</strong> Google Play subscription purchase tokens and Razorpay payment transaction references used strictly to verify your entitlement and issue receipts.
                </span>
              </li>
            </ul>
          </section>

          <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-extrabold text-[#0A2540] flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0B5ED7] text-xs flex items-center justify-center font-mono font-bold">03</span>
              <span>Data Security &amp; Your Rights</span>
            </h2>
            <p>
              We protect your account with HTTPS/TLS transport encryption, cryptographically hashed OTP codes with expiry and attempt limits, and strict access controls. We never sell or rent your phone number or project data to third-party brokers. You may request export or deletion of your account data at any time.
            </p>
          </section>

          <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-extrabold text-[#0A2540] flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0B5ED7] text-xs flex items-center justify-center font-mono font-bold">04</span>
              <span>Privacy Contact</span>
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <Building className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                <span className="font-semibold text-[#0A2540]">{brandName}</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <Mail className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                <a href={`mailto:${settings.email || 'support@windowcutpro.com'}`} className="text-[#0B5ED7] hover:underline">
                  {settings.email || 'support@windowcutpro.com'}
                </a>
              </div>
            </div>

            {onNavigateContact && (
              <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex justify-end">
                <button
                  type="button"
                  onClick={onNavigateContact}
                  className="px-5 py-2.5 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Visit Contact Page</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
