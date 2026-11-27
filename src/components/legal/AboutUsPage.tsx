import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Wrench,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Mail,
  Calculator,
  Camera,
  Ruler,
  Sliders,
  Grid3X3,
} from 'lucide-react';
import { BusinessSettings, TeamMember } from '../../types.ts';
import {
  BRAND_LOGO_URL,
  BRAND_NAME,
  BRAND_TAGLINE,
  resolveBrandLogoUrl,
  resolveBrandName,
  resolveBrandTagline,
} from '../../config/brand.ts';
import { SlidingWindowIcon } from '../sliding-window/SlidingWindowIcon.tsx';

interface AboutUsPageProps {
  settings: BusinessSettings;
  teamMembers?: TeamMember[];
  onBack: () => void;
  onNavigateGallery?: () => void;
  onNavigateCalculator?: () => void;
  onNavigateContact?: () => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({
  settings,
  onBack,
  onNavigateCalculator,
  onNavigateContact,
}) => {
  const brandName = resolveBrandName(settings.businessName);
  const brandTagline = resolveBrandTagline(settings.tagline);
  const logoUrl = resolveBrandLogoUrl(settings.logoUrl);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = `About ${BRAND_NAME} | ${BRAND_TAGLINE}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Learn about ${brandName} — ${brandTagline}. Fast, accurate cutting lists for 2-Track & 3-Track sliding windows, glass panels, tracks, bearing positions, mosquito nets, and bulk projects.`
      );
    }
  }, [brandName, brandTagline]);

  return (
    <div id="about-us-page" className="min-h-screen bg-white text-[#0F172A] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="about-back-btn"
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] hover:text-[#0B5ED7] hover:border-[#0B5ED7] transition-all text-xs font-semibold group shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-[#0B5ED7]" />
            <span>Back to Home</span>
          </button>

          <span className="text-[11px] font-mono font-semibold text-[#0B5ED7] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#BFDBFE]">
            {BRAND_NAME} · Precision Fabrication
          </span>
        </div>

        {/* Hero Header with Official WindowCut Pro Logo */}
        <div className="rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 sm:p-10 shadow-xs mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-white p-1.5 shrink-0 flex items-center justify-center">
              <img
                src={logoUrl}
                alt={`${brandName} Official Brand Logo`}
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = BRAND_LOGO_URL;
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[#0B5ED7] text-xs font-bold tracking-wider uppercase mb-1">
                <SlidingWindowIcon className="w-4 h-4 text-[#F97316]" />
                <span>Aluminium &amp; Glass Workshop Engineering</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A2540] tracking-tight leading-tight">
                About {brandName}
              </h1>
              <p className="text-xs sm:text-sm text-[#0B5ED7] font-semibold mt-1">
                {brandTagline}
              </p>
            </div>
          </div>

          <p className="text-[#475569] text-sm sm:text-base leading-relaxed max-w-2xl">
            <strong>{brandName}</strong> is built for aluminium sliding window fabricators, glass cutters, site engineers, and contractors who need fast, repeatable, zero-error cutting dimensions on every job.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 pt-6 border-t border-[#E2E8F0] text-xs">
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#0B5ED7] shrink-0" />
              <span>2-Track &amp; 3-Track</span>
            </div>
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>Exact 1/16&Prime; Decimals</span>
            </div>
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#0B5ED7] shrink-0" />
              <span>Bulk &amp; PDF/Excel</span>
            </div>
            <div className="flex items-center gap-2 text-[#0A2540] font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>AI Photo Scanner</span>
            </div>
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="space-y-8 text-[#475569] text-sm leading-relaxed">
          <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-extrabold text-[#0A2540] flex items-center gap-2.5 mb-4">
              <Wrench className="w-5 h-5 text-[#0B5ED7]" />
              <span>Complete Sliding Window Calculation Suite</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                {
                  icon: SlidingWindowIcon,
                  title: 'Sliding Window Size Calculator',
                  desc: 'Compute complete aluminium profile cutting lists from rough site measurements in inches, feet, or millimetres.',
                },
                {
                  icon: Grid3X3,
                  title: 'Glass Cutting Size Calculator',
                  desc: 'Automatic glass panel width & height calculations with configurable glass clearance deductions.',
                },
                {
                  icon: Ruler,
                  title: 'Track Size Calculator',
                  desc: 'Exact Top Track, Bottom Track, and outer frame section lengths for 2-Track and 3-Track installations.',
                },
                {
                  icon: Wrench,
                  title: 'Bearing Position Calculator',
                  desc: 'Accurate bearing placement, handle section, and interlock cuts to ensure smooth shutter sliding.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Mosquito Net Size Calculator',
                  desc: 'Dedicated mosquito mesh shutter width and height outputs for 3-Track mosquito net configurations.',
                },
                {
                  icon: Layers,
                  title: 'Bulk Window Calculator',
                  desc: 'Enter dozens of windows in one project sheet and export workshop-ready PDF drawings and Excel tables.',
                },
                {
                  icon: Camera,
                  title: 'Photo Measurement Scanner',
                  desc: 'Scan handwritten carpenter measurement pages with AI OCR and load rows straight into Bulk Window Calculation.',
                },
                {
                  icon: Sliders,
                  title: 'Custom Profile Deductions',
                  desc: 'Save your workshop’s exact aluminium extrusion deduction rules and switch profiles anytime.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
                  >
                    <h3 className="font-bold text-sm text-[#0A2540] flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                      <span>{item.title}</span>
                    </h3>
                    <p className="text-[#475569] leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Support & Contact */}
          <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-extrabold text-[#0A2540] mb-3">
              Support &amp; Technical Assistance
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] mb-4">
              Need help configuring your aluminium section profile deductions, bulk sheets, or Premium subscription? Reach out directly to the {brandName} team.
            </p>
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-[#0A2540] block">Official Support Hours</span>
                <span className="text-[#475569]">Monday to Saturday: 9:00 AM – 8:00 PM IST</span>
              </div>
              <a
                href={`mailto:${settings.email || 'support@windowcutpro.com'}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0B5ED7] border border-[#BFDBFE] font-semibold transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{settings.email || 'support@windowcutpro.com'}</span>
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
              {onNavigateCalculator && (
                <button
                  type="button"
                  onClick={onNavigateCalculator}
                  className="px-4 py-2.5 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Open Sliding Window Calculator</span>
                </button>
              )}

              {onNavigateContact && (
                <button
                  type="button"
                  onClick={onNavigateContact}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0A2540] hover:text-[#0B5ED7] border border-[#CBD5E1] font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-[#0B5ED7]" />
                  <span>Contact Support</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
