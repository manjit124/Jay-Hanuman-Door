import React, { useEffect } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Calculator,
  Ruler,
  TreePine,
  Truck,
  BookOpen,
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  FileCheck,
} from 'lucide-react';
import { BusinessSettings } from '../../types.ts';

interface DisclaimerPageProps {
  settings: BusinessSettings;
  onBack: () => void;
  onNavigateCalculator?: () => void;
  onNavigateContact?: () => void;
}

export const DisclaimerPage: React.FC<DisclaimerPageProps> = ({
  settings,
  onBack,
  onNavigateCalculator,
  onNavigateContact,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Disclaimer | Jai Hanuman Door';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Disclaimer and estimation terms for ${settings.businessName || 'Jai Hanuman Door'}. Information regarding price calculations, dimension measurements, timber variations, and quotation validity.`
      );
    }
  }, [settings.businessName]);

  const lastUpdated = settings.legalSettings?.lastUpdated || 'September 2026';
  const customDisclaimer = settings.legalSettings?.disclaimer || settings.disclaimer;

  return (
    <div id="disclaimer-page" className="min-h-screen bg-stone-950 text-stone-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Back navigation & breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            id="disclaimer-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-stone-700 transition-all text-xs font-semibold group shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
            <span>Back to Storefront</span>
          </button>

          <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Last Updated: {lastUpdated}
          </span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-stone-800/90 p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>Legal & Estimation Terms</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Disclaimer
          </h1>

          <p className="text-stone-300 text-sm sm:text-base mt-4 leading-relaxed max-w-2xl">
            Please review the following important terms regarding quotation estimates, physical dimensions & measurements, natural solid timber characteristics, and workshop manufacturing policies.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800/80 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Calculated Estimates</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Simulation Previews</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Organic Timber Grain</span>
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>30-Day Rate Validity</span>
            </div>
          </div>
        </div>

        {/* Highlight Banner with Custom / Business Disclaimer */}
        {customDisclaimer && (
          <div className="mb-10 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-200">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <FileCheck className="w-4 h-4" />
              <span>Primary Estimation Advisory</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-200">
              {customDisclaimer}
            </p>
          </div>
        )}

        {/* Detailed Disclaimer Clauses */}
        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">
          
          {/* 1. Price Estimation & Calculation */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <Calculator className="w-5 h-5 text-amber-500" />
              1. Price Calculations & Formal Quotations
            </h2>
            <p className="leading-relaxed">
              All price calculations generated through the Jai Hanuman Door Price Calculator are estimates provided for planning and budgeting convenience. The calculation is derived mathematically based on standard dimensions entered, standard 35mm thickness, standard frame jamb sizing (e.g. 4&quot;x2.5&quot; or 5&quot;x2.5&quot;), selected timber material rate per square foot, and polish grades.
            </p>
            <p className="mt-3 leading-relaxed">
              Final confirmed pricing may vary based on:
            </p>
            <ul className="mt-2 space-y-2 pl-4 list-disc text-stone-400 text-xs sm:text-sm">
              <li>Exact timber grade selection (e.g. Grade-A Central Province Teak vs. Burma Teak vs. African Teak vs. Pine Wood).</li>
              <li>Custom non-standard carving relief depth, 3D hand chiseled temple statues, or CNC fluting detail.</li>
              <li>Specialized shutter thickness (38mm, 45mm, or 50mm heavy entrance slabs).</li>
              <li>Physical site measurement discrepancies, wall plumb deviations, or out-of-square wall conditions.</li>
              <li>Premium solid brass aldrop hardware, multi-point mortise locks, and designer stainless steel handles.</li>
            </ul>
          </section>

          {/* 2. Physical Measurements & Civil Dimensions */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <Ruler className="w-5 h-5 text-amber-500" />
              2. On-Site Measurement & Civil Dimensions Notice
            </h2>
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 mb-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <strong>Physical Measurements Required:</strong> Online calculations and catalog dimensions are for preliminary pricing estimates. Final timber cutting requires physical tape verification of rough openings by our team or your carpenter.
              </div>
            </div>
            <p>
              Always verify physical tape measurements of width, height, and wall jamb thickness before placing a custom manufacturing order. We recommend consulting our carpentry team for precision on-site measurement before hardwood log sawing.
            </p>
          </section>

          {/* 3. Natural Wood Characteristics */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <TreePine className="w-5 h-5 text-amber-500" />
              3. Natural Solid Wood Characteristics & Grains
            </h2>
            <p className="leading-relaxed">
              Solid timber is an authentic organic material grown in nature. Every tree and log carries its own unique identity:
            </p>
            <ul className="mt-3 space-y-2 pl-4 list-disc text-stone-400 text-xs sm:text-sm">
              <li>Natural variations in grain pattern, annual growth rings, tonal coloration, natural pin knots, and density are inherent characteristics of real wood and are not defects.</li>
              <li>Wood polish stains (e.g. Natural Teak, Walnut, Rosewood, Honey Teak) interact with the timber’s natural base color. Finished shades may vary slightly from screen display colors due to monitor calibrations and ambient room lighting.</li>
              <li>Solid wood naturally breathes and exhibits micro-expansion or contraction with seasonal humidity shifts (monsoon moisture vs. dry summer). Proper seasoning down to 8%–12% minimizes movement but cannot eliminate natural wood response entirely.</li>
            </ul>
          </section>

          {/* 4. Educational Articles & Guides */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <BookOpen className="w-5 h-5 text-amber-500" />
              4. Educational Articles & Technical Timber Guides
            </h2>
            <p>
              All articles, wood seasoning guides, joinery comparisons, and dimensioning tips published in Jai Hanuman Door are for educational and informational purposes only. Customers and builders must consult their local licensed contractors, structural civil engineers, or master carpenters for site-specific lintel loads, wall anchor specifications, and local building code compliance.
            </p>
          </section>

          {/* 5. Freight, Delivery & Installation */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <Truck className="w-5 h-5 text-amber-500" />
              5. Transportation, Unloading & Fitting Scope
            </h2>
            <p className="leading-relaxed">
              Unless explicitly specified in a formal written contract:
            </p>
            <ul className="mt-2 space-y-2 pl-4 list-disc text-stone-400 text-xs sm:text-sm">
              <li>Freight and transportation charges from our factory workshop ({settings.address || 'Pune'}) are charged extra at actual vehicular logistics rates based on site distance.</li>
              <li>Unloading, crane hoisting for high-rise apartments, and manual carrying upstairs are the customer’s site responsibility.</li>
              <li>Jamb civil masonry work, plaster touching, tile skirting cuts, and on-site hinge mortising are excluded from raw door shutter supply unless a turnkey fitting package is agreed upon.</li>
            </ul>
          </section>

          {/* 6. Quotation Validity Period */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2.5 mb-3 text-amber-400">
              <Calendar className="w-5 h-5 text-amber-500" />
              6. Quotation Validity & Timber Market Commodity Rates
            </h2>
            <p>
              Forest timber auction prices fluctuate based on seasonal harvesting, government forestry regulations, and market demand. Quotation estimates generated through Jai Hanuman Door are valid for <strong>30 calendar days</strong> from the date of generation. Orders confirmed after this period may be subject to prevailing timber lumber rates.
            </p>
          </section>

          {/* 7. Need Clarification / Contact */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif text-lg font-bold text-white">
                Have questions about pricing or custom specs?
              </h3>
              <p className="text-xs text-stone-400">
                Our workshop supervisors are available to clarify dimensions, wood species, and dispatch timelines.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onNavigateCalculator && (
                <button
                  onClick={onNavigateCalculator}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  Price Calculator
                </button>
              )}

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
