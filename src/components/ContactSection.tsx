import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  Send,
  Building2,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { BusinessSettings } from '../types.ts';
import {
  getCleanWhatsAppDigits,
  formatWhatsAppDisplay,
  getWhatsAppUrl,
  getGoogleMapsUrl,
} from '../lib/contactUtils.ts';

interface ContactSectionProps {
  settings: BusinessSettings;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ settings }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [doorType, setDoorType] = useState('Sagwan Main Door');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Hello ${settings.businessName || 'Jai Hanuman Door'},

New Direct Enquiry from App:
Name: ${name}
Phone: ${phone}
City/Location: ${city || 'Not specified'}
Door Requirement: ${doorType}
Message: ${notes || 'Need quote and catalog'}`;

    const url = getWhatsAppUrl(settings.whatsappNumber, msg);
    window.open(url, '_blank');
    setSubmitted(true);
  };

  const googleMapsUrl = getGoogleMapsUrl(
    settings.googleMapsUrl || settings.legalSettings?.socialLinks?.googleBusiness
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      
      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
        <span className="text-amber-500 font-semibold text-xs sm:text-sm tracking-wider uppercase">
          Direct Workshop & Showroom
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-1">
          Visit Us or Request Site Measurement
        </h2>
        <p className="text-stone-600 text-sm sm:text-base mt-2">
          Experience seasoned timber cuts, hand-carved sample shutters, and custom jamb sizing directly at our manufacturing workshop.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left: Contact Info & Workshop Details (5 Cols) */}
        <div className="lg:col-span-5 bg-white text-[#1A1A1A] rounded-2xl border border-[#E5E5E5] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase tracking-wide">
                Direct Manufacturer
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-2">
                {settings.businessName || 'Jai Hanuman Door'}
              </h3>
              <p className="text-xs text-[#666666] mt-1">
                {settings.tagline || 'Specialist in Handcrafted Sagwan & Teak Doors'}
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Address & Shop Location */}
              <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#C89211]/20">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A]">
                      <span>📍</span>
                      <span>Jai Hanuman Door (Factory & Display)</span>
                    </div>
                    <p className="text-[#666666] text-xs mt-0.5 leading-relaxed">
                      {settings.address || 'Near Old Timber Market, Industrial Estate, Pune, Maharashtra 411002, India'}
                    </p>
                    <a
                      id="section-view-shop-location-btn"
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#FFF8E8] hover:bg-[#FFF2D4] border border-[#C89211] text-left transition-all duration-200 shadow-xs hover:shadow-sm group mt-3 min-w-[210px] max-w-full"
                      title="Open Shop Location in Google Maps"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#C89211]/30 flex items-center justify-center text-[#C89211] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <MapPin className="w-4.5 h-4.5 text-[#C89211] fill-[#C89211]/20" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#222222] leading-tight">
                          Shop Location
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[#C89211] font-semibold flex items-center gap-1 mt-0.5 leading-none">
                          <span>View on Google Maps</span>
                          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#C89211]/20">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A]">Phone Support</div>
                  <a href={`tel:${settings.phone}`} className="text-[#C89211] font-mono text-xs hover:underline block mt-0.5 font-semibold">
                    {settings.phone || '+91 98220 12345'}
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16803A] flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A]">Official WhatsApp</div>
                  <a
                    id="section-whatsapp-link"
                    href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName || 'Jai Hanuman Door'}, I have an enquiry.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#16803A] font-mono text-xs hover:underline block mt-0.5 font-semibold"
                  >
                    {formatWhatsAppDisplay(settings.whatsappNumber)} (Instant Response)
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#C89211]/20">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A]">Email Inquiries</div>
                  <a href={`mailto:${settings.email}`} className="text-[#666666] text-xs hover:underline block mt-0.5">
                    {settings.email || 'orders@shivshahidoors.com'}
                  </a>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#C89211]/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A]">Working Hours</div>
                  <p className="text-[#666666] text-xs mt-0.5">
                    Monday to Saturday: 9:00 AM – 8:00 PM<br />
                    Sunday: 10:00 AM – 3:00 PM (By Appointment)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E5E5E5] mt-6 flex items-center justify-between text-xs text-[#666666]">
            <span className="flex items-center gap-1.5 text-[#16803A]">
              <ShieldCheck className="w-4 h-4" /> Direct Manufacturer Warranty
            </span>
            {settings.gstNumber && (
              <span className="font-mono text-[11px] text-[#C89211]">GST: {settings.gstNumber}</span>
            )}
          </div>
        </div>

        {/* Right: Interactive Inquiry & Site Visit Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mb-1">
              Send Requirement & Get Call Back
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mb-6">
              Our master carpenter will guide you with rough opening measurements, wood species selection, and dispatch estimates.
            </p>

            {submitted ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-lg font-bold text-emerald-950">
                  Enquiry Transmitted to WhatsApp
                </h4>
                <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                  Thank you! Our factory team has received your message on WhatsApp and will connect with catalog options promptly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Your Name <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kulkarni"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-stone-900 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phone Number <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 98220 12345"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-stone-900 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      City / Site Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Mumbai, Kolhapur"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-stone-900 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Interested In
                    </label>
                    <select
                      value={doorType}
                      onChange={e => setDoorType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-stone-900 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="Sagwan Main Door">Sagwan Main Entrance Door</option>
                      <option value="Double Door (Jodi Darwaja)">Double Door (Jodi Darwaja)</option>
                      <option value="Designer Carved Door">Designer Carved Door</option>
                      <option value="Modern CNC Fluted Door">Modern CNC Fluted Door</option>
                      <option value="Chaukhat / Door Frame">Chaukhat / Door Frame Only</option>
                      <option value="Full Bungalow Package">Full Bungalow / House Package</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Door Sizes or Special Requirements
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Need 1 main door 36x78 inch with heavy frame, and 4 bedroom doors 32x78 inch with polish."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-stone-900 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20 transition-all active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  Send Requirement to WhatsApp
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
