import React, { useState } from 'react';
import {
  Mail,
  Clock,
  Send,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { BusinessSettings } from '../types.ts';
import { submitCustomerEnquiry } from '../lib/api.ts';

interface ContactSectionProps {
  settings: BusinessSettings;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ settings }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [requirementType, setRequirementType] = useState('Sliding Window Fabrication');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitCustomerEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim() || undefined,
        enquiryType: requirementType,
        message: notes.trim() || `Support inquiry regarding ${requirementType}`,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit inquiry right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
        <span className="text-[#0B5ED7] font-semibold text-xs sm:text-sm tracking-wider uppercase">
          Customer Support Desk
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#0A2540] tracking-tight mt-1">
          Contact {settings.businessName || 'WindowCut Pro'} Support
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          Need assistance with sliding window calculations, cutting tolerances, account access, or premium subscriptions? Send us a message directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Support Info (5 Cols) */}
        <div className="lg:col-span-5 bg-white text-[#1A1A1A] rounded-2xl border border-[#E5E5E5] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#0B5ED7] border border-[#BFDBFE] uppercase tracking-wide">
                Official Support
              </span>
              <h3 className="text-2xl font-bold text-[#0A2540] mt-2">
                {settings.businessName || 'WindowCut Pro'}
              </h3>
              <p className="text-xs text-[#475569] mt-1">
                {settings.tagline || 'Sliding Window Fabrication Calculator'}
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#0B5ED7] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#BFDBFE]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#0A2540]">Email Support</div>
                  <a
                    href={`mailto:${settings.email || 'support@windowcutpro.app'}`}
                    className="text-[#0B5ED7] text-xs hover:underline block mt-0.5 font-medium"
                  >
                    {settings.email || 'support@windowcutpro.app'}
                  </a>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#F97316] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#FED7AA]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#0A2540]">Support Hours</div>
                  <p className="text-[#475569] text-xs mt-0.5">
                    Monday to Saturday: 9:00 AM – 8:00 PM<br />
                    Sunday: 10:00 AM – 3:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E5E5E5] mt-6 flex items-center justify-between text-xs text-[#475569]">
            <span className="flex items-center gap-1.5 text-[#16803A] font-medium">
              <ShieldCheck className="w-4 h-4" /> Verified Technical Support
            </span>
          </div>
        </div>

        {/* Right: Direct In-App Inquiry Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#0A2540] mb-1">
              Send Your Message
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Submit your inquiry directly through our secure support desk and our team will reply promptly.
            </p>

            {submitted ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-lg font-bold text-emerald-950">
                  Inquiry Received
                </h4>
                <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                  Thank you! Your message has been logged with the {settings.businessName || 'WindowCut Pro'} support team.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setNotes('');
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {errorMsg}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Name <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-[#0B5ED7]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter your 10-digit mobile number"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-[#0B5ED7]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your city"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-[#0B5ED7]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Topic
                    </label>
                    <select
                      value={requirementType}
                      onChange={e => setRequirementType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-[#0B5ED7]/30"
                    >
                      <option value="Sliding Window Fabrication">Sliding Window Size Calculator</option>
                      <option value="Glass & Track Cutting">Glass &amp; Track Cutting Sizes</option>
                      <option value="Bulk Window Calculator">Bulk Window Calculator</option>
                      <option value="Photo Measurement Scanner">Photo Measurement Scanner</option>
                      <option value="Account & Subscription">Account / Premium Subscription</option>
                      <option value="General Support">General Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message / Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe your question or requirement..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-[#0B5ED7]/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0B5ED7] to-[#084298] hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Sending...' : 'Submit Support Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
