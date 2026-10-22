import React from 'react';
import {
  X,
  MessageCircle,
  Sparkles,
  Layers,
  Ruler,
  TreePine,
  ShieldCheck,
  FileText,
  Lock,
} from 'lucide-react';
import { Door, CustomDoorFittingState } from '../../types.ts';
import { getWhatsAppUrl } from '../../lib/contactUtils.ts';

interface DesignCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  door: Door;
  fittingState: CustomDoorFittingState;
  estimatedPrice: number;
  capturedImageUrl: string | null;
  officialWhatsApp?: string;
  onOpenQuotation: () => void;
}

export const DesignCaptureModal: React.FC<DesignCaptureModalProps> = ({
  isOpen,
  onClose,
  door,
  fittingState,
  estimatedPrice,
  capturedImageUrl,
  officialWhatsApp = '7887412884',
  onOpenQuotation,
}) => {
  if (!isOpen || !capturedImageUrl) return null;

  const sqFt = Math.round(((fittingState.widthInch * fittingState.heightInch) / 144) * 100) / 100;

  // WhatsApp Enquiry Text (Direct specification inquiry, no download reference)
  const whatsappText = `Hello Jai Hanuman Door,
I customized "${door.name}" (Catalogue ID: ${door.id}) in your 3D & AR Fitting Studio:
- Design Category: ${door.category}
- Wood Species: ${fittingState.woodType}
- Dimensions: ${fittingState.widthInch}" × ${fittingState.heightInch}" (${sqFt} sq.ft)
- Thickness: ${fittingState.thicknessInch}"
- Estimated Price: ₹${estimatedPrice.toLocaleString('en-IN')}

Please review these specifications and provide an official factory quotation with delivery schedule and site measurement assistance.`;

  const whatsappUrl = getWhatsAppUrl(officialWhatsApp, whatsappText);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl text-[#1A1A1A] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5E5] bg-[#F8F8F6] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#FFF7E3] text-[#C89211]">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A]">
                Custom Design &amp; Specifications
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          
          {/* Protected Captured Image Preview Card */}
          <div
            className="relative rounded-xl overflow-hidden border border-[#E5E5E5] bg-[#FAF9F6] shadow-inner flex items-center justify-center p-2 select-none group"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Protected Image */}
            <img
              src={capturedImageUrl}
              alt={door.name}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="max-h-[300px] sm:max-h-[340px] w-auto object-contain mx-auto rounded-lg select-none pointer-events-none"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
            />

            {/* Subtle Copyright Protection Badge */}
            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-xs text-[10px] font-semibold text-white flex items-center gap-1 border border-white/10 pointer-events-none select-none">
              <Lock className="w-3 h-3 text-[#C89211]" />
              <span>Jai Hanuman Door © Proprietary Design</span>
            </div>

            {/* Transparent Shield Overlay to prevent direct right-click or drag */}
            <div
              className="absolute inset-0 z-10 bg-transparent cursor-default"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              draggable={false}
            />
          </div>

          {/* Specifications Summary Card */}
          <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
              <div>
                <h4 className="font-serif text-sm sm:text-base font-bold text-[#1A1A1A]">{door.name}</h4>
                <p className="text-[11px] text-[#666666]">{door.category}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#777777] uppercase tracking-wider block">Estimated Price</span>
                <div className="text-base sm:text-lg font-bold font-mono text-[#C89211]">
                  ₹{estimatedPrice.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#1A1A1A]">
                <TreePine className="w-3.5 h-3.5 text-[#C89211] shrink-0" />
                <span className="truncate">Wood: <strong>{fittingState.woodType}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 text-[#1A1A1A]">
                <Ruler className="w-3.5 h-3.5 text-[#C89211] shrink-0" />
                <span className="truncate">Size: <strong>{fittingState.widthInch}×{fittingState.heightInch}"</strong></span>
              </div>

              <div className="flex items-center gap-1.5 text-[#1A1A1A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C89211] shrink-0" />
                <span className="truncate">Thick: <strong>{fittingState.thicknessInch}" ({sqFt} sq.ft)</strong></span>
              </div>
            </div>
          </div>

          {/* Action CTAs (Collapsed cleanly without blank space) */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Action: Get Official Quotation */}
            <button
              onClick={() => {
                onClose();
                onOpenQuotation();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Get Official Quotation for This Design →</span>
            </button>

            {/* Direct WhatsApp Consultation */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Send Specifications on WhatsApp (+91 {officialWhatsApp})</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};
