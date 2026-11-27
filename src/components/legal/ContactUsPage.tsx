import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  Clock,
  Send,
  Building,
  CheckCircle2,
  AlertCircle,
  Calculator,
} from 'lucide-react';
import { BusinessSettings, Door } from '../../types.ts';
import { submitCustomerEnquiry } from '../../lib/api.ts';
import {
  BRAND_NAME,
  resolveBrandName,
  resolveBrandTagline,
} from '../../config/brand.ts';

interface ContactUsPageProps {
  settings: BusinessSettings;
  doors?: Door[];
  initialDoorId?: string;
  onBack: () => void;
  onOpenCalculator?: () => void;
  onOpenGallery?: () => void;
}

export const ContactUsPage: React.FC<ContactUsPageProps> = ({
  settings,
  doors = [],
  initialDoorId,
  onBack,
  onOpenCalculator,
}) => {
  const brandName = resolveBrandName(settings.businessName);
  const brandTagline = resolveBrandTagline(settings.tagline);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [enquiryType, setEnquiryType] = useState('Fabrication Calculator Support');
  const [selectedDoorId] = useState(initialDoorId || '');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedEnquiryId, setSubmittedEnquiryId] = useState<string | null>(null);
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState<any>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = `Contact Us | ${BRAND_NAME}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Contact ${brandName} support for Sliding Window Fabrication Calculator assistance, profile rules, bulk calculation help, or account queries.`
      );
    }
  }, [brandName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number so our team can reach you.');
      return;
    }

    if (!message.trim() || message.trim().length < 5) {
      setErrorMsg('Please provide a brief message describing your inquiry.');
      return;
    }

    const selectedDoorObj = doors.find((d) => d.id === selectedDoorId);

    setSubmitting(true);
    try {
      const res = await submitCustomerEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        enquiryType,
        doorId: selectedDoorId || undefined,
        doorName: selectedDoorObj ? selectedDoorObj.name : undefined,
        message: message.trim(),
      });

      setSubmittedEnquiryId(res.enquiry?.id || `enq-${Date.now()}`);
      setLastSubmittedPayload({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        enquiryType,
        message: message.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit enquiry. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div id="contact-us-page" className="min-h-screen bg-white text-[#0F172A] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="contact-back-btn"
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#0F172A] hover:text-[#0B5ED7] hover:border-[#0B5ED7] transition-all text-xs font-semibold group shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-[#0B5ED7]" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 sm:p-10 shadow-xs mb-10">
          <div className="flex items-center gap-2 text-[#0B5ED7] text-xs font-bold tracking-wider uppercase mb-2">
            <Building className="w-4 h-4 text-[#F97316]" />
            <span>{brandName} Support Desk</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A2540] tracking-tight leading-tight">
            Contact &amp; Workshop Support
          </h1>

          <p className="text-[#475569] text-sm sm:text-base mt-3 leading-relaxed max-w-2xl">
            Reach out to the <strong>{brandName}</strong> team for help with aluminium profile deductions, bulk window cutting lists, Photo Measurement Scanner, or Premium subscription assistance.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-6 border-t border-[#E2E8F0] text-xs">
            <a
              href={`mailto:${settings.email || 'support@windowcutpro.com'}`}
              className="px-4 py-2.5 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Support</span>
            </a>
            {onOpenCalculator && (
              <button
                type="button"
                onClick={onOpenCalculator}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFF6FF] border border-[#CBD5E1] text-[#0A2540] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Open Calculator</span>
              </button>
            )}
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0A2540]">{brandName}</h2>
              <p className="text-xs font-semibold text-[#0B5ED7] mt-0.5">{brandTagline}</p>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#0B5ED7] flex items-center justify-center shrink-0 border border-[#BFDBFE]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#0A2540] text-xs">Official Email</div>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-[#475569] text-xs hover:text-[#0B5ED7] hover:underline block mt-0.5 break-all"
                  >
                    {settings.email || 'support@windowcutpro.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0 border border-[#FED7AA]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#0A2540] text-xs">Support Hours</div>
                  <p className="text-[#475569] text-xs mt-1 leading-relaxed">
                    <strong>Monday – Saturday:</strong> 9:00 AM – 8:00 PM<br />
                    <strong>Sunday:</strong> 10:00 AM – 3:00 PM (By Appointment)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="border-b border-[#E2E8F0] pb-5 mb-6">
              <span className="text-[#0B5ED7] text-xs font-bold uppercase tracking-wider">
                Direct Support Form
              </span>
              <h2 className="text-2xl font-extrabold text-[#0A2540] mt-1">
                Send a Message to {brandName}
              </h2>
              <p className="text-xs text-[#475569] mt-1">
                Fill in your details below and our team will respond promptly.
              </p>
            </div>

            {submittedEnquiryId ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-400 text-[#16803A] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-extrabold text-[#0A2540]">
                  Inquiry Submitted Successfully
                </h3>

                <p className="text-xs sm:text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{lastSubmittedPayload?.name}</strong>. Your inquiry reference ID is{' '}
                  <span className="font-mono text-[#0B5ED7] font-bold">{submittedEnquiryId}</span>.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedEnquiryId(null);
                      setName('');
                      setPhone('');
                      setEmail('');
                      setCity('');
                      setMessage('');
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0A2540] font-semibold text-xs border border-[#CBD5E1] cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form id="contact-enquiry-form" onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kulkarni"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/25 focus:border-[#0B5ED7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter your 10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/25 focus:border-[#0B5ED7] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Email Address <span className="text-[#64748B] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="yourname@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/25 focus:border-[#0B5ED7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      City / Location <span className="text-[#64748B] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/25 focus:border-[#0B5ED7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Inquiry Topic
                  </label>
                  <select
                    value={enquiryType}
                    onChange={(e) => setEnquiryType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/25 focus:border-[#0B5ED7]"
                  >
                    <option value="Fabrication Calculator Support">Sliding Window Calculator Support</option>
                    <option value="Custom Profile Deductions">Custom Aluminium Profile Deductions</option>
                    <option value="Photo Measurement Scanner">Photo Measurement Scanner Help</option>
                    <option value="Premium Subscription & Billing">Premium Subscription &amp; Billing</option>
                    <option value="General Inquiry">General Workshop Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Message / Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your profile series, window fabrication requirement, or question..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5ED7]/25 focus:border-[#0B5ED7]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting Inquiry...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {onOpenCalculator && (
          <div className="mt-10">
            <button
              type="button"
              onClick={onOpenCalculator}
              className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0B5ED7] text-left transition-colors group shadow-xs flex items-center gap-4 w-full sm:w-auto cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#0B5ED7] flex items-center justify-center border border-[#BFDBFE]">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#0A2540]">Open Workshop Calculator</h3>
                <p className="text-xs text-[#475569] mt-0.5">
                  Return to your cutting list and estimation workspace.
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
