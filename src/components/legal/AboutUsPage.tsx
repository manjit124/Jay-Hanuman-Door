import React, { useEffect } from 'react';
import {
  ArrowLeft,
  TreePine,
  Wrench,
  ShieldCheck,
  Award,
  Layers,
  CheckCircle2,
  Users,
  Building,
  Phone,
  MessageCircle,
  Mail,
  Calculator,
  Compass,
  MapPin,
} from 'lucide-react';
import { BusinessSettings, TeamMember } from '../../types.ts';
import { ContentProtectionWarning } from '../ContentProtectionWarning.tsx';
import { getGoogleMapsUrl, getWhatsAppUrl, formatWhatsAppDisplay } from '../../lib/contactUtils.ts';

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
  teamMembers = [],
  onBack,
  onNavigateGallery,
  onNavigateCalculator,
  onNavigateContact,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'About Us | Jai Hanuman Door';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Learn about ${settings.businessName || 'Jai Hanuman Door'}. Direct manufacturers of seasoned Sagwan, Teak wood and designer doors with transparent pricing and custom design options.`
      );
    }
  }, [settings.businessName]);

  const customAboutText = settings.legalSettings?.aboutUs;
  const activeMembers = teamMembers.filter(m => m.active).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div id="about-us-page" className="min-h-screen bg-white text-[#1A1A1A] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Back navigation & breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="about-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:text-[#C89211] hover:border-[#C89211] transition-all text-xs font-semibold group shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-[#C89211]" />
            <span>Back to Storefront</span>
          </button>

          <span className="text-[11px] font-mono text-[#C89211] bg-[#FFF7E3] px-3 py-1 rounded-full border border-[#C89211]/30">
            Manufacturing Workshop & Digital Studio
          </span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-[#F8F8F6] border border-[#E5E5E5] p-6 sm:p-10 shadow-sm relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#C89211]/60 shadow-md bg-[#0C0A09] shrink-0">
              <img
                src={settings?.logoUrl || '/assets/logo.png'}
                alt="Jai Hanuman Door Official Brand Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[#C89211] text-xs font-bold tracking-widest uppercase mb-1.5">
                <TreePine className="w-4 h-4" />
                <span>Artisanal Woodcraft &amp; Digital Engineering</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight">
                About {settings?.businessName || 'Jai Hanuman Door'}
              </h1>
              <p className="text-xs text-[#C89211] font-medium tracking-wide uppercase mt-1">
                Wooden Door • Sagwan Door • Door Frame
              </p>
            </div>
          </div>

          <p className="text-[#666666] text-sm sm:text-base leading-relaxed max-w-2xl">
            Where traditional woodcraft heritage meets modern digital entrance engineering. We build 100% seasoned timber doors directly in our workshop and provide homeowners and architects with transparent calculation tools.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-[#E5E5E5] text-xs">
            <div className="flex items-center gap-2 text-[#1A1A1A]">
              <CheckCircle2 className="w-4 h-4 text-[#C89211] shrink-0" />
              <span>Kiln-Dried Timber</span>
            </div>
            <div className="flex items-center gap-2 text-[#1A1A1A]">
              <CheckCircle2 className="w-4 h-4 text-[#16803A] shrink-0" />
              <span>Direct Manufacturer</span>
            </div>
            <div className="flex items-center gap-2 text-[#1A1A1A]">
              <CheckCircle2 className="w-4 h-4 text-[#C89211] shrink-0" />
              <span>Transparent Pricing</span>
            </div>
            <div className="flex items-center gap-2 text-[#1A1A1A]">
              <CheckCircle2 className="w-4 h-4 text-[#16803A] shrink-0" />
              <span>AI Entrance Preview</span>
            </div>
          </div>
        </div>

        {/* Admin Customized Story (if present) */}
        {customAboutText && (
          <div className="mb-10 p-6 sm:p-8 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 text-[#1A1A1A]">
            <div className="flex items-center gap-2 text-[#C89211] font-bold text-xs uppercase tracking-wider mb-2">
              <Award className="w-4 h-4" />
              <span>Workshop Mission & Vision</span>
            </div>
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-[#1A1A1A]">
              {customAboutText}
            </p>
          </div>
        )}

        {/* Narrative Section */}
        <div className="space-y-8 text-[#666666] text-sm leading-relaxed">

          {/* Section 1: Our Origin & Craftsmanship */}
          <section className="bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center gap-2.5 mb-4 text-[#C89211]">
              <TreePine className="w-5 h-5 text-[#C89211]" />
              Our Timber Heritage & Factory Workshop
            </h2>
            <p className="leading-relaxed">
              Founded on deep woodworking roots in Maharashtra, <strong>{settings.businessName || 'Shivshahi Doors'}</strong> was established to manufacture genuine, durable, and architecturally stunning entrance doors. For generations, timber buying was plagued by opaque middlemen markups, unseasoned wet wood that warped after the first monsoon, and vague carpenter estimates.
            </p>
            <p className="mt-3 leading-relaxed">
              We changed that paradigm. At our factory workshop in {settings.address || 'Pune, Maharashtra'}, we maintain direct control over the entire supply chain: sourcing raw round logs from certified forestry auctions, sawing custom grain flitches, chemical vacuum-pressure impregnation against borers and termites, and controlled solar/kiln drying to achieve an optimal 8%–12% moisture index.
            </p>
          </section>

          {/* Section 2: What We Make */}
          <section className="bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center gap-2.5 mb-4 text-[#C89211]">
              <Wrench className="w-5 h-5 text-[#C89211]" />
              What We Manufacture
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-1.5">
                <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C89211]" />
                  Sagwan Main Entrance Doors
                </h3>
                <p className="text-[#666666] leading-relaxed">
                  Heavy 35mm to 45mm solid Central Province Sagwan (CP Teak) doors with high natural oil content, rich golden honey grains, and weather-resistant durability.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-1.5">
                <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C89211]" />
                  Double Doors (Jodi Darwaja)
                </h3>
                <p className="text-[#666666] leading-relaxed">
                  Traditional symmetrical twin shutters with interlocking center overlap (t-patti), designed for grand villa entrances, wada architectures, and bungalows.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-1.5">
                <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C89211]" />
                  Solid Wood Chaukhats (Frames)
                </h3>
                <p className="text-[#666666] leading-relaxed">
                  Load-bearing Sagwan and Red Meranti door jambs with precision routered rebates, ensuring seamless hinge bedding and watertight sealing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-1.5">
                <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C89211]" />
                  Custom CNC & Hand Carvings
                </h3>
                <p className="text-[#666666] leading-relaxed">
                  Combining multi-axis computer numerical control (CNC) fluting with master hand-chiseled temple motifs, floral relief borders, and contemporary minimalist geometry.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: The Jai Hanuman Door Digital Platform */}
          <section className="bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center gap-2.5 mb-4 text-[#C89211]">
              <Compass className="w-5 h-5 text-[#C89211]" />
              The Jai Hanuman Door Advantage
            </h2>
            <p className="leading-relaxed">
              Jai Hanuman Door is our digital platform that puts the entire factory catalog into the customer’s hands:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                <Calculator className="w-5 h-5 text-[#C89211] mb-2" />
                <h3 className="font-bold text-[#1A1A1A] mb-1">Instant Price Math</h3>
                <p className="text-[#666666] leading-relaxed">
                  Square footage pricing calculated live based on width and height in inches, including chaukhats, polish, and brass hardware.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                <Wrench className="w-5 h-5 text-[#C89211] mb-2" />
                <h3 className="font-bold text-[#1A1A1A] mb-1">Precision CNC & Hand Carving</h3>
                <p className="text-[#666666] leading-relaxed">
                  Combining advanced 3D CNC wood sculpting with traditional hand-carving by hereditary master carpenters for unmatched depth.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                <Layers className="w-5 h-5 text-[#C89211] mb-2" />
                <h3 className="font-bold text-[#1A1A1A] mb-1">Direct Factory Rates</h3>
                <p className="text-[#666666] leading-relaxed">
                  Zero retail showroom commissions. Pay for pure seasoned cubic feet of solid timber and master artisan labor.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Workshop Leadership & Master Craftsmen (if configured) */}
          {activeMembers.length > 0 && (
            <section className="bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center gap-2.5 mb-2 text-[#C89211]">
                <Users className="w-5 h-5 text-[#C89211]" />
                Workshop Leadership & Craftsmen
              </h2>
              <p className="text-xs text-[#666666] mb-6">
                Meet the master carpenters, timber seasoning specialists, and workshop managers behind our door creations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMembers.map(member => (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex flex-col justify-between"
                  >
                    <div>
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#C89211]/40 mb-3"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#FFF7E3] border-2 border-[#C89211]/40 text-[#C89211] font-bold flex items-center justify-center text-xl font-serif mb-3">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <h3 className="font-bold text-sm text-[#1A1A1A]">{member.name}</h3>
                      <div className="text-xs text-[#C89211] font-medium">{member.role}</div>
                      {member.bio && (
                        <p className="text-[#666666] text-xs mt-2 leading-relaxed line-clamp-3">
                          {member.bio}
                        </p>
                      )}
                    </div>
                    {member.experience && (
                      <div className="mt-3 pt-3 border-t border-[#E5E5E5] text-[11px] text-[#666666]">
                        Experience: <strong className="text-[#1A1A1A]">{member.experience}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Workshop Coordinates & Direct Touchpoints */}
          <section className="bg-white border border-[#E5E5E5] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center gap-2.5 mb-3 text-[#C89211]">
              <Building className="w-5 h-5 text-[#C89211]" />
              Workshop Address & Factory Support
            </h2>
            <p>
              We welcome customers, interior architects, and site supervisors to visit our workshop, inspect raw timber seasoning stacks, and discuss custom door profiles:
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#C89211] font-bold mb-1">
                    <MapPin className="w-4 h-4 text-[#C89211] shrink-0" />
                    <span>Jai Hanuman Door (Shop Location)</span>
                  </div>
                  <p className="text-[#666666] leading-relaxed mb-3">{settings.address}</p>
                </div>
                <a
                  id="about-shop-location-btn"
                  href={getGoogleMapsUrl(settings.googleMapsUrl || settings.legalSettings?.socialLinks?.googleBusiness)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FFF8E8] hover:bg-[#FFF2D4] border border-[#C89211] text-left transition-all duration-200 shadow-xs hover:shadow-sm group mt-2 max-w-full"
                  title="Open Shop Location in Google Maps"
                >
                  <div className="w-7 h-7 rounded-lg bg-white border border-[#C89211]/30 flex items-center justify-center text-[#C89211] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <MapPin className="w-4 h-4 text-[#C89211] fill-[#C89211]/20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-[#222222] leading-tight">
                      Shop Location
                    </div>
                    <div className="text-[10px] text-[#C89211] font-semibold flex items-center gap-0.5 mt-0.5 leading-none">
                      <span>View on Google Maps</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </div>
                </a>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#1A1A1A] block mb-1">Working Hours & Connect</span>
                  <p className="text-[#666666]">Monday to Saturday: 9:00 AM – 8:00 PM</p>
                  <p className="text-[#666666]">Sunday: 10:00 AM – 3:00 PM (By Appointment)</p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
                  <span className="text-[#666666]">Official WhatsApp:</span>
                  <a
                    href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName}, I would like to visit your shop.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#16803A] font-mono font-semibold hover:underline flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3 text-[#16803A]" />
                    {formatWhatsAppDisplay(settings.whatsappNumber)}
                  </a>
                </div>
              </div>
            </div>

            {/* Design & Content Protection Warning */}
            <div className="mt-8">
              <ContentProtectionWarning settings={settings} />
            </div>

            {/* Quick Action Navigation */}
            <div className="mt-8 pt-6 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {onNavigateCalculator && (
                  <button
                    onClick={onNavigateCalculator}
                    className="px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#E5E5E5] text-[#1A1A1A] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#E5E5E5]"
                  >
                    <Calculator className="w-3.5 h-3.5 text-[#C89211]" />
                    Door Calculator
                  </button>
                )}
                {onNavigateGallery && (
                  <button
                    onClick={onNavigateGallery}
                    className="px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#E5E5E5] text-[#1A1A1A] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#E5E5E5]"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#C89211]" />
                    Browse Catalog
                  </button>
                )}
              </div>

              {onNavigateContact && (
                <button
                  onClick={onNavigateContact}
                  className="px-5 py-2.5 rounded-xl bg-[#C89211] hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Contact Workshop
                </button>
              )}
            </div>

          </section>

        </div>

      </div>
    </div>
  );
};
