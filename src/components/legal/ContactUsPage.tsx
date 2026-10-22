import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  Building,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Calculator,
  Compass,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { BusinessSettings, Door } from '../../types.ts';
import { submitCustomerEnquiry } from '../../lib/api.ts';
import {
  getCleanWhatsAppDigits,
  formatWhatsAppDisplay,
  getWhatsAppUrl,
  getGoogleMapsUrl,
  OFFICIAL_GOOGLE_MAPS_URL,
} from '../../lib/contactUtils.ts';

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
  onOpenGallery,
}) => {
  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [enquiryType, setEnquiryType] = useState('General Inquiry');
  const [selectedDoorId, setSelectedDoorId] = useState(initialDoorId || '');
  const [message, setMessage] = useState('');

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedEnquiryId, setSubmittedEnquiryId] = useState<string | null>(null);
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState<any>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Contact Us | Jai Hanuman Door';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Contact ${settings.businessName || 'Jai Hanuman Door'}. Direct factory workshop in ${settings.address || 'Pune'}. Call, WhatsApp, or submit an enquiry for door pricing and site measurements.`
      );
    }
  }, [settings.businessName, settings.address]);

  // Handle Quick Pre-select from buttons
  const handleQuickEnquiryType = (type: string) => {
    setEnquiryType(type);
    const formElem = document.getElementById('contact-enquiry-form');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
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
      setErrorMsg('Please provide a brief message or describe your door dimensions/requirements.');
      return;
    }

    const selectedDoorObj = doors.find(d => d.id === selectedDoorId);

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
        doorName: selectedDoorObj?.name,
        message: message.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit enquiry. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const forwardToWhatsApp = () => {
    if (!lastSubmittedPayload) return;
    const msg = `Hello ${settings.businessName || 'Jai Hanuman Door'},

I have submitted an enquiry on Jai Hanuman Door:
Name: ${lastSubmittedPayload.name}
Phone: ${lastSubmittedPayload.phone}
City: ${lastSubmittedPayload.city || 'Not specified'}
Enquiry Type: ${lastSubmittedPayload.enquiryType}
${lastSubmittedPayload.doorName ? `Selected Door: ${lastSubmittedPayload.doorName}\n` : ''}Message: ${lastSubmittedPayload.message}`;

    const url = getWhatsAppUrl(settings.whatsappNumber, msg);
    window.open(url, '_blank');
  };

  const googleMapsUrl = getGoogleMapsUrl(
    settings.googleMapsUrl || settings.legalSettings?.socialLinks?.googleBusiness
  );

  return (
    <div id="contact-us-page" className="min-h-screen bg-white text-[#1A1A1A] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Breadcrumb & Back button */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="contact-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:text-[#C89211] hover:border-[#C89211] transition-all text-xs font-semibold group shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-[#C89211]" />
            <span>Back to Storefront</span>
          </button>

          <span className="text-[11px] font-mono text-[#16803A] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16803A] animate-pulse" />
            Factory Workshop Open
          </span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-[#F8F8F6] border border-[#E5E5E5] p-6 sm:p-10 shadow-sm relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 text-[#C89211] text-xs font-bold tracking-widest uppercase mb-3">
            <Building className="w-4 h-4" />
            <span>Direct Workshop & Showroom Connect</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight">
            Contact Us & Factory Inquiries
          </h1>

          <p className="text-[#666666] text-sm sm:text-base mt-4 leading-relaxed max-w-2xl">
            Reach out directly to <strong>{settings.businessName || 'Jai Hanuman Door'}</strong> for rough opening measurements, custom carving consultations, kiln-seasoned timber verification, and factory pricing.
          </p>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-6 border-t border-[#E5E5E5] text-xs">
            <a
              id="contact-hero-shop-location-btn"
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#FFF8E8] hover:bg-[#FFF2D4] border border-[#C89211] text-[#222222] font-semibold text-left transition-all duration-200 shadow-xs hover:shadow-sm group"
              title="Open Shop Location in Google Maps"
            >
              <div className="w-6 h-6 rounded-md bg-white border border-[#C89211]/30 flex items-center justify-center text-[#C89211] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-[#C89211] fill-[#C89211]/20" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs leading-none">Shop Location</span>
                <span className="text-[10px] text-[#C89211] font-semibold leading-tight mt-0.5">View on Maps →</span>
              </div>
            </a>
            <a
              href={`tel:${settings.phone}`}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 text-[#C89211]" />
              Call Factory Now
            </a>
            <a
              id="contact-hero-whatsapp-btn"
              href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName || 'Jai Hanuman Door'}, I have an inquiry.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#16803A] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#16803A]" />
              WhatsApp Us
            </a>
            <button
              onClick={() => handleQuickEnquiryType('Site Visit / Measurement Request')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-[#C89211]" />
              Book Site Visit / Measurement
            </button>
            <button
              onClick={() => handleQuickEnquiryType('Custom Door Carving Design')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C89211]" />
              Request Custom Design
            </button>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (5 Cols): Verified Business Details & Workshop Info */}
          <div className="lg:col-span-5 bg-white border border-[#E5E5E5] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            
            <div>
              <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase tracking-wide">
                Direct Manufacturing Workshop
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-3">
                {settings.businessName || 'Jai Hanuman Door'}
              </h2>
              <p className="text-xs text-[#666666] mt-1">
                {settings.tagline || 'Solid Sagwan & Teak Wood Doors'}
              </p>
            </div>

            {/* Contact Details List */}
            <div className="space-y-4 text-xs sm:text-sm">
              
              {/* Visit Our Shop / Shop Location Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#FFF7E3] via-white to-white border border-[#C89211]/30 shadow-sm">
                <div className="flex items-center gap-2 text-[#C89211] text-xs font-bold uppercase tracking-wider mb-2">
                  <MapPin className="w-4 h-4 text-[#C89211]" />
                  <span>Visit Our Shop</span>
                </div>
                
                <h3 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{settings.businessName || 'Jai Hanuman Door'}</span>
                </h3>
                
                <p className="text-[#666666] text-xs mt-1 leading-relaxed">
                  {settings.address || 'Near Old Timber Market, Industrial Estate, Pune, Maharashtra 411002, India'}
                </p>
                
                <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                  <div className="text-[11px] text-[#666666] mb-2 font-medium">
                    View Shop Location on Google Maps:
                  </div>
                  <a
                    id="contact-view-shop-location-btn"
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 w-full py-3 px-4 rounded-xl bg-[#FFF8E8] hover:bg-[#FFF2D4] border border-[#C89211] text-[#222222] shadow-xs hover:shadow-sm transition-all duration-200 group"
                    title="Open Shop Location in Google Maps"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#C89211]/30 flex items-center justify-center text-[#C89211] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <MapPin className="w-5 h-5 text-[#C89211] fill-[#C89211]/20" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-bold text-sm text-[#222222] leading-tight">
                        Shop Location
                      </div>
                      <div className="text-[11px] text-[#C89211] font-semibold flex items-center gap-1 mt-0.5 leading-none">
                        <span>View on Google Maps</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5]">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center shrink-0 border border-[#C89211]/20">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] text-xs">Factory Phone Helpline</div>
                  <a
                    href={`tel:${settings.phone}`}
                    className="text-[#C89211] font-mono text-sm hover:underline block mt-0.5 font-bold"
                  >
                    {settings.phone || '+91 98765 43210'}
                  </a>
                  <span className="text-[11px] text-[#666666] block mt-0.5">
                    Direct workshop supervisor assistance
                  </span>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#16803A] flex items-center justify-center shrink-0 border border-emerald-300">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#16803A] text-xs">Official WhatsApp Support</div>
                  <a
                    id="contact-whatsapp-link"
                    href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName || 'Jai Hanuman Door'}, I have an inquiry.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#16803A] font-mono text-sm hover:underline block mt-0.5 font-bold"
                  >
                    {formatWhatsAppDisplay(settings.whatsappNumber)}
                  </a>
                  <span className="text-[11px] text-[#16803A]/80 block mt-0.5">
                    Share opening photos & receive catalogs
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5]">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center shrink-0 border border-[#C89211]/20">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] text-xs">Official Email</div>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-[#666666] text-xs hover:text-[#C89211] hover:underline block mt-0.5 break-all"
                  >
                    {settings.email || 'shivshahidoors@gmail.com'}
                  </a>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5]">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center shrink-0 border border-[#C89211]/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] text-xs">Factory Operating Hours</div>
                  <p className="text-[#666666] text-xs mt-1 leading-relaxed">
                    <strong>Monday – Saturday:</strong> 9:00 AM – 8:00 PM<br />
                    <strong>Sunday:</strong> 10:00 AM – 3:00 PM (By Appointment)
                  </p>
                </div>
              </div>

            </div>

            {/* GSTIN & Verified Manufacturer Badge */}
            <div className="pt-4 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2 text-xs text-[#666666]">
              <span className="flex items-center gap-1.5 text-[#16803A] font-semibold">
                <ShieldCheck className="w-4 h-4" />
                100% Kiln-Seasoned Sagwan Wood
              </span>
              {settings.gstNumber && (
                <span className="font-mono text-[11px] text-[#C89211]">
                  GSTIN: {settings.gstNumber}
                </span>
              )}
            </div>

            {/* Social Media Links (if configured) */}
            {settings.legalSettings?.socialLinks && (
              <div className="pt-4 border-t border-[#E5E5E5]">
                <span className="text-xs font-semibold text-[#666666] block mb-2">Connect Online:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {settings.legalSettings.socialLinks.instagram && (
                    <a
                      href={settings.legalSettings.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] hover:text-[#C89211] transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                  {settings.legalSettings.socialLinks.facebook && (
                    <a
                      href={settings.legalSettings.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] hover:text-[#C89211] transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                  {settings.legalSettings.socialLinks.youtube && (
                    <a
                      href={settings.legalSettings.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] hover:text-[#C89211] transition-colors"
                    >
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Admin Guidance Notes (if set) */}
            {settings.legalSettings?.contactInfoNotes && (
              <div className="p-4 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 text-xs text-[#1A1A1A] leading-relaxed">
                {settings.legalSettings.contactInfoNotes}
              </div>
            )}

          </div>

          {/* Right Column (7 Cols): Interactive Customer Enquiry Form */}
          <div className="lg:col-span-7 bg-white border border-[#E5E5E5] rounded-3xl p-6 sm:p-8 shadow-sm">
            
            <div className="border-b border-[#E5E5E5] pb-5 mb-6">
              <span className="text-[#C89211] text-xs font-bold uppercase tracking-wider">
                Direct Contact Form
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-1">
                Send Requirement or Request Site Visit
              </h2>
              <p className="text-xs text-[#666666] mt-1">
                Fill in your details below. Your enquiry will be saved directly into our factory queue and our carpenter representative will call you with quotation guidance.
              </p>
            </div>

            {/* SUCCESS CONFIRMATION STATE */}
            {submittedEnquiryId ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-400 text-[#16803A] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <h3 className="font-serif text-2xl font-bold text-[#1A1A1A]">
                  Enquiry Successfully Registered!
                </h3>

                <p className="text-xs sm:text-sm text-[#666666] max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{lastSubmittedPayload?.name}</strong>! Your requirement has been logged in our factory database under enquiry ID:{' '}
                  <span className="font-mono text-[#C89211] font-bold">{submittedEnquiryId}</span>.
                </p>

                <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] text-xs text-[#666666] text-left space-y-1 max-w-md mx-auto">
                  <div><strong>Phone:</strong> {lastSubmittedPayload?.phone}</div>
                  {lastSubmittedPayload?.city && <div><strong>Location:</strong> {lastSubmittedPayload.city}</div>}
                  <div><strong>Type:</strong> {lastSubmittedPayload?.enquiryType}</div>
                  {lastSubmittedPayload?.doorName && <div><strong>Door:</strong> {lastSubmittedPayload.doorName}</div>}
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={forwardToWhatsApp}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send to WhatsApp as well (Instant)
                  </button>

                  <button
                    onClick={() => {
                      setSubmittedEnquiryId(null);
                      setName('');
                      setPhone('');
                      setEmail('');
                      setCity('');
                      setMessage('');
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#F8F8F6] hover:bg-[#E5E5E5] text-[#1A1A1A] font-semibold text-xs border border-[#E5E5E5]"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE FORM */
              <form id="contact-enquiry-form" onSubmit={handleSubmit} className="space-y-4">
                
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#C62828] text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-[#C62828] shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kulkarni"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40 focus:border-[#C89211]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 98220 12345"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40 focus:border-[#C89211] font-mono"
                    />
                  </div>
                </div>

                {/* Email & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                      Email Address <span className="text-[#666666] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40 focus:border-[#C89211]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                      City / Site Location <span className="text-[#666666] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Kothrud, Baner"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40 focus:border-[#C89211]"
                    />
                  </div>
                </div>

                {/* Enquiry Type & Selected Door */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                      Enquiry Purpose
                    </label>
                    <select
                      value={enquiryType}
                      onChange={e => setEnquiryType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40"
                    >
                      <option value="General Inquiry">General Question / Factory Visit</option>
                      <option value="Price Quotation Request">Price Quotation & Timber Rates</option>
                      <option value="Site Visit / Measurement Request">Request Site Measurement Visit</option>
                      <option value="Custom Door Carving Design">Custom Carved / CNC Door Design</option>
                      <option value="Bulk Order for Villa/Builder">Bulk Order (Bungalow / Architect)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                      Specific Door Model <span className="text-[#666666] font-normal">(Optional)</span>
                    </label>
                    <select
                      value={selectedDoorId}
                      onChange={e => setSelectedDoorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40"
                    >
                      <option value="">-- No specific door (General inquiry) --</option>
                      {doors.map(door => (
                        <option key={door.id} value={door.id}>
                          {door.name} ({door.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                    Your Door Requirements / Approximate Dimensions <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Need 1 main Sagwan entrance door (3.5 ft x 7 ft) with heavy chaukhat, and 4 bedroom doors. Please share rate per sq.ft and dispatch timing."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#C89211] hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                >
                  {submitting ? (
                    <span>Registering Requirement...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Direct Factory Enquiry</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-[#666666] text-center mt-2">
                  🔒 Your phone number is kept private and used exclusively by our workshop to provide quotation assistance.
                </p>

              </form>
            )}

          </div>

        </div>

        {/* Bottom Feature Banners */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {onOpenCalculator && (
            <button
              onClick={onOpenCalculator}
              className="p-5 rounded-2xl bg-white border border-[#E5E5E5] hover:border-[#C89211]/40 text-left transition-colors group shadow-sm"
            >
              <Calculator className="w-6 h-6 text-[#C89211] mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-sm text-[#1A1A1A]">Price Calculator</h3>
              <p className="text-[#666666] mt-1">Calculate exact square-foot cost including frame and polish.</p>
            </button>
          )}

          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              className="p-5 rounded-2xl bg-white border border-[#E5E5E5] hover:border-[#C89211]/40 text-left transition-colors group shadow-sm"
            >
              <Compass className="w-6 h-6 text-[#C89211] mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-sm text-[#1A1A1A]">Catalog Gallery</h3>
              <p className="text-[#666666] mt-1">Browse all carved Sagwan doors and modern minimalist designs.</p>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
