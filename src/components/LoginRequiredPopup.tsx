import React from 'react';
import { Lock, Phone, ShieldCheck, X } from 'lucide-react';
import { BRAND_LOGO_URL, BRAND_NAME } from '../config/brand.ts';

interface LoginRequiredPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
}

export const LoginRequiredPopup: React.FC<LoginRequiredPopupProps> = ({
  isOpen,
  onClose,
  onLoginClick,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="login-required-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
      className="fixed inset-0 z-50 bg-[#0A2540]/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden text-[#0F172A]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center shrink-0 p-1">
              <img
                src={BRAND_LOGO_URL}
                alt={BRAND_NAME}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <h2
                id="login-required-title"
                className="text-lg font-extrabold text-[#0A2540] leading-tight flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                <span>Login Required</span>
              </h2>
              <p className="text-[11px] font-medium text-[#475569] mt-0.5">
                {BRAND_NAME} Account
              </p>
            </div>
          </div>
          <button
            id="close-login-required-popup"
            type="button"
            onClick={onClose}
            aria-label="Close login required popup"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-[#334155] leading-relaxed">
            Please login with your mobile number to view your calculation results.
          </p>

          <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-2.5 text-xs text-[#1E3A8A] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#0B5ED7] shrink-0 mt-0.5" />
            <span>
              Your entered measurements and selected options are preserved automatically. Results will appear immediately after mobile OTP verification.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              id="btn-login-with-mobile-number"
              type="button"
              onClick={onLoginClick}
              className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>Login with Mobile Number</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] py-2.5 px-4 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Back to Inputs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredPopup;
