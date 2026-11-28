import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  KeyRound,
} from 'lucide-react';
import {
  fetchSmsProviderStatus,
  sendCustomerOtp,
  verifyCustomerOtp,
  type CustomerSessionPayload,
  type SmsProviderStatusResponse,
} from '../lib/customerPaymentApi.ts';
import { BRAND_LOGO_URL, BRAND_NAME, BRAND_TAGLINE } from '../config/brand.ts';

interface CustomerOtpLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (session: CustomerSessionPayload) => void;
  title?: string;
  subtitle?: string;
}

export const CustomerOtpLoginModal: React.FC<CustomerOtpLoginModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  title = `${BRAND_NAME} Login`,
  subtitle = 'Sign in with a 6-digit SMS OTP to view calculation results, save cutting sheets, and manage your account.',
}) => {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingEnvVars, setMissingEnvVars] = useState<string[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<SmsProviderStatusResponse | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setError(null);
    setInfoMessage(null);
    setMissingEnvVars([]);
    setProviderStatus(null);
    fetchSmsProviderStatus()
      .then((status) => {
        if (!active) return;
        setProviderStatus(status);
      })
      .catch((err: any) => {
        if (!active) return;
        setProviderStatus({
          provider: 'apitxt',
          configured: false,
          hasApiKey: false,
          missingEnvVars: [],
          unavailable: true,
          setupMessage:
            err?.message ||
            'Unable to reach the OTP login server. Check your internet connection and try again.',
        });
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSec]);

  if (!isOpen) return null;

  const cleanMobile = mobile.replace(/\D/g, '').slice(0, 10);
  const isValidMobile = /^[6-9]\d{9}$/.test(cleanMobile);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setMissingEnvVars([]);

    if (!isValidMobile) {
      setError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setSending(true);
    try {
      const res = await sendCustomerOtp(cleanMobile);
      if (!res.success) {
        setError(res.error || 'Unable to send OTP.');
        if (Array.isArray(res.missingEnvVars) && res.missingEnvVars.length > 0) {
          setMissingEnvVars(res.missingEnvVars);
        }
        if (res.resendAfterSeconds && res.resendAfterSeconds > 0) {
          setCooldownSec(res.resendAfterSeconds);
        }
        return;
      }

      setMaskedMobile(res.maskedMobile || `+91 ${cleanMobile}`);
      setIsExistingAccount(Boolean(res.isExistingAccount));
      setCooldownSec(res.resendAfterSeconds || 45);
      setInfoMessage(res.message || '6-digit OTP sent to your mobile number. Valid for 5 minutes.');
      setOtp('');
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Network error while requesting OTP.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanOtp = otp.replace(/\D/g, '').slice(0, 6);
    if (cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setVerifying(true);
    try {
      const res = await verifyCustomerOtp({
        mobile: cleanMobile,
        otp: cleanOtp,
        name: name.trim() || undefined,
      });

      if (!res.success || !res.customer) {
        setError(res.error || 'OTP verification failed.');
        return;
      }

      await Promise.resolve(
        onAuthenticated({
          authenticated: true,
          customer: res.customer,
          entitlement: res.entitlement,
          payments: Array.isArray(res.payments) ? res.payments : [],
          quotes: Array.isArray(res.quotes) ? res.quotes : [],
          orders: Array.isArray(res.orders) ? res.orders : [],
          isNewUser: res.isNewUser,
        })
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to verify OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const providerMissingVars = Array.isArray(providerStatus?.missingEnvVars)
    ? providerStatus.missingEnvVars
    : [];

  return (
    <div
      id="customer-otp-login-modal"
      className="fixed inset-0 z-50 bg-[#0A2540]/65 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-heading"
    >
      <div className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden text-[#0F172A] my-auto">
        {/* Header with official WindowCut Pro logo */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center shrink-0 p-1">
              <img
                src={BRAND_LOGO_URL}
                alt={BRAND_NAME}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="space-y-0.5">
              <h2 id="otp-modal-heading" className="text-lg font-extrabold text-[#0A2540] leading-tight">
                {title}
              </h2>
              <p className="text-[11px] font-semibold text-[#0B5ED7]">{BRAND_TAGLINE}</p>
              <p className="text-xs text-[#475569] leading-relaxed pt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            id="close-otp-login-modal"
            type="button"
            onClick={onClose}
            aria-label="Close login modal"
            className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Provider configuration or connectivity notice (safe against missing fields) */}
          {providerStatus && !providerStatus.configured && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-xs text-[#9A3412] space-y-1.5"
            >
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#EA580C] shrink-0" />
                <span>
                  {providerStatus.unavailable
                    ? 'OTP Login Service Status Notice'
                    : 'APITXT SMS OTP Configuration Required'}
                </span>
              </div>
              <p className="leading-relaxed">
                {providerStatus.unavailable
                  ? providerStatus.setupMessage ||
                    'Unable to reach the OTP login service right now. Please check your connection and try again.'
                  : 'Real SMS delivery is enforced (no dummy OTPs). Configure this server environment variable to activate live OTP SMS:'}
              </p>
              {providerMissingVars.length > 0 && (
                <div className="font-mono text-[11px] bg-white/90 border border-[#FED7AA] rounded-lg px-2.5 py-1.5 text-[#7C2D12]">
                  {providerMissingVars.join(', ')}
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {missingEnvVars.length > 0 && (
                <div className="font-mono text-[11px] bg-white border border-rose-200 rounded-lg px-2.5 py-1 text-rose-900">
                  Required server variables: {missingEnvVars.join(', ')}
                </div>
              )}
            </div>
          )}

          {infoMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {step === 'mobile' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="otp-mobile-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Indian Mobile Number
                </label>
                <div className="flex items-center rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] focus-within:border-[#0B5ED7] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0B5ED7]/20 overflow-hidden transition-all">
                  <span className="px-3.5 py-3 text-sm font-semibold text-[#475569] border-r border-[#E2E8F0] select-none">
                    +91
                  </span>
                  <input
                    id="otp-mobile-input"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={cleanMobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 px-3.5 py-3 bg-transparent text-sm font-mono tabular-nums text-[#0F172A] placeholder:font-sans placeholder:text-[#94A3B8] focus:outline-none"
                    required
                  />
                  <Phone className="w-4 h-4 text-[#94A3B8] mr-3.5 shrink-0" />
                </div>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  New users get an account automatically. Existing numbers sign into their saved profile.
                </p>
              </div>

              <div>
                <label htmlFor="otp-name-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Your Name (optional for returning users)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="otp-name-input"
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Rajesh Patil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] focus:bg-white focus:border-[#0B5ED7] focus:ring-2 focus:ring-[#0B5ED7]/20 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                  />
                </div>
              </div>

              <button
                id="btn-send-otp"
                type="submit"
                disabled={sending || !isValidMobile || cooldownSec > 0}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : cooldownSec > 0 ? (
                  <span>Wait {cooldownSec}s before retrying</span>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#475569] pb-1 border-b border-[#E2E8F0]">
                <span>
                  Verifying <strong className="text-[#0F172A] font-mono">{maskedMobile}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('mobile');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="text-[#0B5ED7] hover:underline font-semibold cursor-pointer"
                >
                  Change number
                </button>
              </div>

              {!isExistingAccount && (
                <div>
                  <label htmlFor="otp-step2-name" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="otp-step2-name"
                    type="text"
                    maxLength={80}
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] focus:bg-white focus:border-[#0B5ED7] text-sm focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="otp-code-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  6-Digit Verification OTP
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="otp-code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] focus:bg-white focus:border-[#0B5ED7] focus:ring-2 focus:ring-[#0B5ED7]/20 text-lg font-mono tracking-[0.4em] tabular-nums text-[#0F172A] focus:outline-none"
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1.5">
                  <span>Expires in 5 minutes · Max 5 attempts</span>
                  <button
                    id="btn-resend-otp"
                    type="button"
                    disabled={cooldownSec > 0 || sending}
                    onClick={() => handleSendOtp()}
                    className="inline-flex items-center gap-1 font-semibold text-[#0B5ED7] hover:underline disabled:text-[#94A3B8] disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3 h-3 ${sending ? 'animate-spin' : ''}`} />
                    <span>{cooldownSec > 0 ? `Resend in ${cooldownSec}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </div>

              <button
                id="btn-verify-otp"
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#0A2540] hover:bg-[#0B5ED7] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#F97316]" />
                    <span>Verify &amp; Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-2 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Hashed OTP verification with secure session protection.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
