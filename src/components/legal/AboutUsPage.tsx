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
    <div id="about-us-page" className="min-h-screen bg-stone-950 text-stone-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Back navigation & breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="about-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-stone-700 transition-all text-xs font-semibold group shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
            <span>Back to Storefront</span>
          </button>

          <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Manufacturing Workshop & Digital Studio
          </span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-stone-800/90 p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">
            <TreePine className="w-4 h-4" />
            <span>Artisanal Woodcraft & Digital Engineering</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            About Jai Hanuman Door
          </h1>

          <p className="text-stone-300 text-sm sm:text-base mt-4 leading-relaxed max-w-2xl">
            Where traditional woodcraft heritage meets modern digital entrance engineering. We build 100% seasoned timber doors directly in our workshop and provide homeowners and architects with transparent calculation tools.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800/80 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Kiln-Dried Timber</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Direct Manufacturer</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Transparent Pricing</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>AI Entrance Preview</span>
            </div>
          </div>
        </div>

        {/* Admin Customized Story (if present) */}
        {customAboutText && (
          <div className="mb-10 p-6 sm:p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-200">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Award className="w-4 h-4" />
              <span>Workshop Mission & Vision</span>
            </div>
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-stone-200">
              {customAboutText}
            </p>
          </div>
        )}

        {/* Narrative Section */}
        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">

          {/* Section 1: Our Origin & Craftsmanship */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-4 text-amber-400">
              <TreePine className="w-5 h-5 text-amber-500" />
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
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-4 text-amber-400">
              <Wrench className="w-5 h-5 text-amber-500" />
              What We Manufacture
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Sagwan Main Entrance Doors
                </h3>
                <p className="text-stone-400 leading-relaxed">
                  Heavy 35mm to 45mm solid Central Province Sagwan (CP Teak) doors with high natural oil content, rich golden honey grains, and weather-resistant durability.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Double Doors (Jodi Darwaja)
                </h3>
                <p className="text-stone-400 leading-relaxed">
                  Traditional symmetrical twin shutters with interlocking center overlap (t-patti), designed for grand villa entrances, wada architectures, and bungalows.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Solid Wood Chaukhats (Frames)
                </h3>
                <p className="text-stone-400 leading-relaxed">
                  Load-bearing Sagwan and Red Meranti door jambs with precision routered rebates, ensuring seamless hinge bedding and watertight sealing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Custom CNC & Hand Carvings
                </h3>
                <p className="text-stone-400 leading-relaxed">
                  Combining multi-axis computer numerical control (CNC) fluting with master hand-chiseled temple motifs, floral relief borders, and contemporary minimalist geometry.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: The Jai Hanuman Door Digital Platform */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-4 text-amber-400">
              <Compass className="w-5 h-5 text-amber-500" />
              The Jai Hanuman Door Advantage
            </h2>
            <p className="leading-relaxed">
              Jai Hanuman Door is our digital platform that puts the entire factory catalog into the customer’s hands:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800">
                <Calculator className="w-5 h-5 text-amber-400 mb-2" />
                <h3 className="font-bold text-stone-200 mb-1">Instant Price Math</h3>
                <p className="text-stone-400 leading-relaxed">
                  Square footage pricing calculated live based on width and height in inches, including chaukhats, polish, and brass hardware.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800">
                <Wrench className="w-5 h-5 text-amber-400 mb-2" />
                <h3 className="font-bold text-stone-200 mb-1">Precision CNC & Hand Carving</h3>
                <p className="text-stone-400 leading-relaxed">
                  Combining advanced 3D CNC wood sculpting with traditional hand-carving by hereditary master carpenters for unmatched depth.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800">
                <Layers className="w-5 h-5 text-amber-400 mb-2" />
                <h3 className="font-bold text-stone-200 mb-1">Direct Factory Rates</h3>
                <p className="text-stone-400 leading-relaxed">
                  Zero retail showroom commissions. Pay for pure seasoned cubic feet of solid timber and master artisan labor.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Workshop Leadership & Master Craftsmen (if configured) */}
          {activeMembers.length > 0 && (
            <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
              <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-2 text-amber-400">
                <Users className="w-5 h-5 text-amber-500" />
                Workshop Leadership & Craftsmen
              </h2>
              <p className="text-xs text-stone-400 mb-6">
                Meet the master carpenters, timber seasoning specialists, and workshop managers behind our door creations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMembers.map(member => (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl bg-stone-950/70 border border-stone-800/80 flex flex-col justify-between"
                  >
                    <div>
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40 mb-3"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-xl font-serif mb-3">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <h3 className="font-bold text-sm text-stone-100">{member.name}</h3>
                      <div className="text-xs text-amber-400 font-medium">{member.role}</div>
                      {member.bio && (
                        <p className="text-stone-400 text-xs mt-2 leading-relaxed line-clamp-3">
                          {member.bio}
                        </p>
                      )}
                    </div>
                    {member.experience && (
                      <div className="mt-3 pt-3 border-t border-stone-800/80 text-[11px] text-stone-400">
                        Experience: <strong className="text-stone-200">{member.experience}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Workshop Coordinates & Direct Touchpoints */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <Building className="w-5 h-5 text-amber-500" />
              Workshop Address & Factory Support
            </h2>
            <p>
              We welcome customers, interior architects, and site supervisors to visit our workshop, inspect raw timber seasoning stacks, and discuss custom door profiles:
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Jai Hanuman Door (Shop Location)</span>
                  </div>
                  <p className="text-stone-400 leading-relaxed mb-3">{settings.address}</p>
                </div>
                <a
                  id="about-shop-location-btn"
                  href={getGoogleMapsUrl(settings.googleMapsUrl || settings.legalSettings?.socialLinks?.googleBusiness)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors mt-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>View Shop Location</span>
                </a>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-stone-200 block mb-1">Working Hours & Connect</span>
                  <p className="text-stone-400">Monday to Saturday: 9:00 AM – 8:00 PM</p>
                  <p className="text-stone-400">Sunday: 10:00 AM – 3:00 PM (By Appointment)</p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-stone-500">Official WhatsApp:</span>
                  <a
                    href={getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName}, I would like to visit your shop.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 font-mono font-semibold hover:underline flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    {formatWhatsAppDisplay(settings.whatsappNumber)}
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="mt-8 pt-6 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {onNavigateCalculator && (
                  <button
                    onClick={onNavigateCalculator}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Calculator className="w-3.5 h-3.5 text-amber-400" />
                    Door Calculator
                  </button>
                )}
                {onNavigateGallery && (
                  <button
                    onClick={onNavigateGallery}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Browse Catalog
                  </button>
                )}
              </div>

              {onNavigateContact && (
                <button
                  onClick={onNavigateContact}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md transition-all flex items-center gap-2"
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
