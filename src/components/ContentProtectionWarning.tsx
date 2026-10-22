import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  Camera,
  Layers,
  Sparkles,
  Scale,
  CheckCircle2,
  FileText,
  AlertOctagon,
} from 'lucide-react';
import { BusinessSettings } from '../types.ts';

export interface DesignProtectionNoticeProps {
  settings?: BusinessSettings;
  variant?: 'full' | 'compact' | 'modal';
  onNavigateLegal?: (view: string) => void;
  className?: string;
}

export const ContentProtectionWarning: React.FC<DesignProtectionNoticeProps> = ({
  settings,
  variant = 'full',
  onNavigateLegal,
  className = '',
}) => {
  const brandName = settings?.businessName || 'Jai Hanuman Door';

  if (variant === 'modal') {
    return (
      <div
        className={`rounded-xl bg-[#FFFDF7] border border-amber-300/80 p-3 sm:p-4 text-xs shadow-xs ${className}`}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A] text-xs">
              <span className="text-red-600">⚠️</span>
              <span>DESIGN &amp; CONTENT PROTECTION</span>
            </div>
            <p className="text-[11px] text-[#555555] mt-1 leading-relaxed">
              All original designs, product images, catalogue content, graphics and brand materials displayed on this website are protected by applicable intellectual property rights.
            </p>
            <p className="text-[11px] text-red-700 font-semibold mt-1">
              Unauthorized use may result in legal action, including a police complaint where applicable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`rounded-2xl bg-[#FFFDF7] border border-[#E8DCC0] p-4 sm:p-5 shadow-xs relative overflow-hidden ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 border border-[#C89211]/30 flex items-center justify-center text-red-600 shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#1A1A1A]">
                <span className="text-red-600 font-extrabold">⚠️</span>
                <span>DESIGN &amp; CONTENT PROTECTION</span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#666666] mt-0.5 leading-snug">
                All original designs, product images, catalogue content, graphics and brand materials are protected by applicable intellectual property rights.
              </p>
              <p className="text-[11px] text-red-700 font-semibold mt-0.5">
                Unauthorized use may result in legal action, including a police complaint where applicable.
              </p>
            </div>
          </div>

          {onNavigateLegal && (
            <button
              onClick={() => onNavigateLegal('disclaimer')}
              className="text-xs font-semibold text-[#C89211] hover:text-[#A0700B] self-start sm:self-center shrink-0 underline decoration-[#C89211]/50 underline-offset-2"
            >
              Legal Terms &rarr;
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full variant — perfectly optimized for both Mobile and Desktop
  return (
    <section
      id="design-content-protection-section"
      aria-label="Design and Content Protection Warning"
      className={`relative w-full max-w-7xl mx-auto px-0 sm:px-0 py-2 sm:py-4 ${className}`}
    >
      <div className="rounded-2xl sm:rounded-[20px] bg-gradient-to-b from-[#FFFDF9] to-[#FFF8EC] border border-[#E8D9B5] shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-7 lg:p-9 relative overflow-hidden">
        
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-red-500/5 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        <div className="relative z-10">
          
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100/90 border border-red-300 text-red-700 text-[10px] sm:text-xs font-extrabold tracking-wide uppercase shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>LEGAL NOTICE &amp; COPYRIGHT</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF3D6] border border-[#C89211]/30 text-[#A0700B] text-[10px] sm:text-xs font-bold">
              <Lock className="w-3 h-3 text-[#C89211]" />
              <span>All Rights Reserved</span>
            </span>
          </div>

          {/* Heading with danger icon */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 mt-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50 to-red-50 border-2 border-red-400/40 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
              <AlertOctagon className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
            </div>

            <div>
              <h2 className="font-serif text-lg sm:text-2xl lg:text-3xl font-black text-[#1A1A1A] tracking-tight flex items-center flex-wrap gap-1.5">
                <span>⚠️ DESIGN &amp; CONTENT PROTECTION</span>
              </h2>
              <p className="text-[11px] sm:text-xs font-medium text-[#C89211] mt-0.5">
                Official Intellectual Property Guidelines for {brandName}
              </p>
            </div>
          </div>

          {/* Main Protection Message */}
          <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-white/95 border border-[#EADBBD] shadow-2xs">
            <p className="text-xs sm:text-sm text-[#2D2D2D] leading-relaxed font-medium">
              All original designs, product images, catalogue content, graphics and brand materials displayed on this website are protected by applicable intellectual property rights.
            </p>
            <p className="text-xs sm:text-sm text-[#4A4A4A] mt-1.5 leading-relaxed font-medium">
              Unauthorized copying, downloading, reproduction, modification, resale, publication or commercial use is strictly prohibited.
            </p>
          </div>

          {/* Highlighted Warning Box */}
          <div className="mt-3 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-red-50 via-amber-50 to-red-50 border-l-4 border-red-600 border-t border-r border-b border-red-200 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-xs sm:text-sm text-red-800 tracking-tight">
                  STRICT LEGAL ACTION NOTICE
                </div>
                <p className="text-xs sm:text-sm text-red-700 font-semibold mt-0.5 leading-snug">
                  Unauthorized use may result in legal action, including a police complaint where applicable.
                </p>
              </div>
            </div>
          </div>

          {/* 4 Feature Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4">
            
            <div className="p-3 rounded-xl bg-white/80 border border-[#E5E0D0] hover:border-[#C89211]/60 transition-colors shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-amber-100/70 border border-[#C89211]/30 flex items-center justify-center text-[#C89211] mb-2">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-[#1A1A1A]">
                Original Woodcraft Designs
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#666666] mt-0.5 leading-snug">
                Handcrafted solid Sagwan teak patterns, custom CNC carvings &amp; main door motifs.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#E5E0D0] hover:border-[#C89211]/60 transition-colors shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-amber-100/70 border border-[#C89211]/30 flex items-center justify-center text-[#C89211] mb-2">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-[#1A1A1A]">
                Protected Workshop Media
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#666666] mt-0.5 leading-snug">
                Authentic factory photos, finish samples, and customer installation portfolios.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#E5E0D0] hover:border-[#C89211]/60 transition-colors shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-amber-100/70 border border-[#C89211]/30 flex items-center justify-center text-[#C89211] mb-2">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-[#1A1A1A]">
                3D &amp; Fitting Visualizer Tech
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#666666] mt-0.5 leading-snug">
                Live AR fitting software, door dimension calculators, and proprietary models.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-[#E5E0D0] hover:border-[#C89211]/60 transition-colors shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-amber-100/70 border border-[#C89211]/30 flex items-center justify-center text-[#C89211] mb-2">
                <Scale className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-[#1A1A1A]">
                Brand Identity &amp; Trademark
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#666666] mt-0.5 leading-snug">
                Jai Hanuman Door trade name, logo badges, verified seal &amp; guarantees.
              </p>
            </div>

          </div>

          {/* Bottom Action Footer */}
          <div className="mt-4 pt-3.5 border-t border-[#E8DCBD] flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-[#666666] text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Digital Watermark &amp; Media Protection Enabled</span>
            </div>

            {onNavigateLegal && (
              <div className="flex items-center gap-2.5">
                <button
                  id="warning-view-disclaimer-btn"
                  onClick={() => onNavigateLegal('disclaimer')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#C89211]/50 text-[#C89211] hover:bg-[#FFF7E3] hover:border-[#C89211] font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  <FileText className="w-3 h-3" />
                  <span>View Full Legal Terms</span>
                </button>
                <button
                  id="warning-view-privacy-btn"
                  onClick={() => onNavigateLegal('privacy')}
                  className="text-[#666666] hover:text-[#1A1A1A] font-medium text-[11px] transition-colors"
                >
                  Privacy Policy
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

// Reusable alias
export const DesignProtectionNotice = ContentProtectionWarning;
