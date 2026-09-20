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
    <div id="contact-us-page" className="min-h-screen bg-stone-950 text-stone-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Breadcrumb & Back button */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="contact-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-stone-700 transition-all text-xs font-semibold group shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
            <span>Back to Storefront</span>
          </button>

          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Factory Workshop Open
          </span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-stone-800/90 p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">
            <Building className="w-4 h-4" />
            <span>Direct Workshop & Showroom Connect</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Contact Us & Factory Inquiries
          </h1>

          <p className="text-stone-300 text-sm sm:text-base mt-4 leading-relaxed max-w-2xl">
            Reach out directly to <strong>{settings.businessName || 'Jai Hanuman Door'}</strong> for rough opening measurements, custom carving consultations, kiln-seasoned timber verification, and factory pricing.
          </p>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-6 border-t border-stone-800 text-xs">
            <a
              id="contact-hero-shop-location-btn"
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>View Shop Location</span>
            </a>
            <a
              href={`tel:${settings.phone}`}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              Call Factory Now
            </a>
            <a
              id="contact-hero-whatsapp-btn"
              href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName || 'Jai Hanuman Door'}, I have an inquiry.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-800/80 text-emerald-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp Us
            </a>
            <button
              onClick={() => handleQuickEnquiryType('Site Visit / Measurement Request')}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Book Site Visit / Measurement
            </button>
            <button
              onClick={() => handleQuickEnquiryType('Custom Door Carving Design')}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Request Custom Design
            </button>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (5 Cols): Verified Business Details & Workshop Info */}
          <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            
            <div>
              <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                Direct Manufacturing Workshop
              </span>
              <h2 className="font-serif text-2xl font-bold text-white mt-3">
                {settings.businessName || 'Jai Hanuman Door'}
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                {settings.tagline || 'Solid Sagwan & Teak Wood Doors'}
              </p>
            </div>

            {/* Contact Details List */}
            <div className="space-y-4 text-xs sm:text-sm">
              
              {/* Visit Our Shop / Shop Location Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-stone-950/80 to-stone-950 border border-amber-500/30 shadow-lg">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Visit Our Shop</span>
                </div>
                
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{settings.businessName || 'Jai Hanuman Door'}</span>
                </h3>
                
                <p className="text-stone-300 text-xs mt-1 leading-relaxed">
                  {settings.address || 'Near Old Timber Market, Industrial Estate, Pune, Maharashtra 411002, India'}
                </p>
                
                <div className="mt-3 pt-3 border-t border-stone-800/80">
                  <div className="text-[11px] text-stone-400 mb-2 font-medium">
                    View Shop Location on Google Maps:
                  </div>
                  <a
                    id="contact-view-shop-location-btn"
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-[0.99]"
                  >
                    <MapPin className="w-4 h-4 text-stone-950" />
                    <span>View Shop Location</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-950/80" />
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                <div className="w-9 h-9 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center shrink-0 border border-stone-700">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-200 text-xs">Factory Phone Helpline</div>
                  <a
                    href={`tel:${settings.phone}`}
                    className="text-amber-400 font-mono text-sm hover:underline block mt-0.5 font-bold"
                  >
                    {settings.phone || '+91 98765 43210'}
                  </a>
                  <span className="text-[11px] text-stone-400 block mt-0.5">
                    Direct workshop supervisor assistance
                  </span>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-900/50">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/70 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-700/60">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-emerald-200 text-xs">Official WhatsApp Support</div>
                  <a
                    id="contact-whatsapp-link"
                    href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName || 'Jai Hanuman Door'}, I have an inquiry.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 font-mono text-sm hover:underline block mt-0.5 font-bold"
                  >
                    {formatWhatsAppDisplay(settings.whatsappNumber)}
                  </a>
                  <span className="text-[11px] text-emerald-400/80 block mt-0.5">
                    Share opening photos & receive catalogs
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                <div className="w-9 h-9 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center shrink-0 border border-stone-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-200 text-xs">Official Email</div>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-stone-300 text-xs hover:text-amber-400 hover:underline block mt-0.5 break-all"
                  >
                    {settings.email || 'shivshahidoors@gmail.com'}
                  </a>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                <div className="w-9 h-9 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center shrink-0 border border-stone-700">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-200 text-xs">Factory Operating Hours</div>
                  <p className="text-stone-400 text-xs mt-1 leading-relaxed">
                    <strong>Monday – Saturday:</strong> 9:00 AM – 8:00 PM<br />
                    <strong>Sunday:</strong> 10:00 AM – 3:00 PM (By Appointment)
                  </p>
                </div>
              </div>

            </div>

            {/* GSTIN & Verified Manufacturer Badge */}
            <div className="pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                100% Kiln-Seasoned Sagwan Wood
              </span>
              {settings.gstNumber && (
                <span className="font-mono text-[11px] text-amber-400/90">
                  GSTIN: {settings.gstNumber}
                </span>
              )}
            </div>

            {/* Social Media Links (if configured) */}
            {settings.legalSettings?.socialLinks && (
              <div className="pt-4 border-t border-stone-800">
                <span className="text-xs font-semibold text-stone-400 block mb-2">Connect Online:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {settings.legalSettings.socialLinks.instagram && (
                    <a
                      href={settings.legalSettings.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                  {settings.legalSettings.socialLinks.facebook && (
                    <a
                      href={settings.legalSettings.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                  {settings.legalSettings.socialLinks.youtube && (
                    <a
                      href={settings.legalSettings.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                    >
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Admin Guidance Notes (if set) */}
            {settings.legalSettings?.contactInfoNotes && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                {settings.legalSettings.contactInfoNotes}
              </div>
            )}

          </div>

          {/* Right Column (7 Cols): Interactive Customer Enquiry Form */}
          <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            
            <div className="border-b border-stone-800 pb-5 mb-6">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                Direct Contact Form
              </span>
              <h2 className="font-serif text-2xl font-bold text-white mt-1">
                Send Requirement or Request Site Visit
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Fill in your details below. Your enquiry will be saved directly into our factory queue and our carpenter representative will call you with quotation guidance.
              </p>
            </div>

            {/* SUCCESS CONFIRMATION STATE */}
            {submittedEnquiryId ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-600/30 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <h3 className="font-serif text-2xl font-bold text-white">
                  Enquiry Successfully Registered!
                </h3>

                <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{lastSubmittedPayload?.name}</strong>! Your requirement has been logged in our factory database under enquiry ID:{' '}
                  <span className="font-mono text-amber-400 font-bold">{submittedEnquiryId}</span>.
                </p>

                <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 text-xs text-stone-400 text-left space-y-1 max-w-md mx-auto">
                  <div><strong>Phone:</strong> {lastSubmittedPayload?.phone}</div>
                  {lastSubmittedPayload?.city && <div><strong>Location:</strong> {lastSubmittedPayload.city}</div>}
                  <div><strong>Type:</strong> {lastSubmittedPayload?.enquiryType}</div>
                  {lastSubmittedPayload?.doorName && <div><strong>Door:</strong> {lastSubmittedPayload.doorName}</div>}
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={forwardToWhatsApp}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
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
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE FORM */
              <form id="contact-enquiry-form" onSubmit={handleSubmit} className="space-y-4">
                
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Your Full Name <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kulkarni"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Mobile Number <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 98220 12345"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 font-mono"
                    />
                  </div>
                </div>

                {/* Email & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Email Address <span className="text-stone-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      City / Site Location <span className="text-stone-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Kothrud, Baner"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60"
                    />
                  </div>
                </div>

                {/* Enquiry Type & Selected Door */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Enquiry Purpose
                    </label>
                    <select
                      value={enquiryType}
                      onChange={e => setEnquiryType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    >
                      <option value="General Inquiry">General Question / Factory Visit</option>
                      <option value="Price Quotation Request">Price Quotation & Timber Rates</option>
                      <option value="Site Visit / Measurement Request">Request Site Measurement Visit</option>
                      <option value="Custom Door Carving Design">Custom Carved / CNC Door Design</option>
                      <option value="Bulk Order for Villa/Builder">Bulk Order (Bungalow / Architect)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Specific Door Model <span className="text-stone-500 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={selectedDoorId}
                      onChange={e => setSelectedDoorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
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
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Your Door Requirements / Approximate Dimensions <span className="text-amber-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Need 1 main Sagwan entrance door (3.5 ft x 7 ft) with heavy chaukhat, and 4 bedroom doors. Please share rate per sq.ft and dispatch timing."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30 transition-all active:scale-[0.99]"
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

                <p className="text-[11px] text-stone-500 text-center mt-2">
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
              className="p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-left transition-colors group shadow-lg"
            >
              <Calculator className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-sm text-stone-200">Price Calculator</h3>
              <p className="text-stone-400 mt-1">Calculate exact square-foot cost including frame and polish.</p>
            </button>
          )}

          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              className="p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-left transition-colors group shadow-lg"
            >
              <Compass className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-sm text-stone-200">Catalog Gallery</h3>
              <p className="text-stone-400 mt-1">Browse all carved Sagwan doors and modern minimalist designs.</p>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
