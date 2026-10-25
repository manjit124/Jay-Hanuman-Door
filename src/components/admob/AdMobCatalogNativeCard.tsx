import React from 'react';
import { ExternalLink, ShieldCheck, Sparkles, Wrench, HardHat } from 'lucide-react';
import { getActiveAdMobSettings } from '../../lib/admob/admobConfig.ts';
import { BusinessSettings } from '../../types.ts';

interface AdMobCatalogNativeCardProps {
  index: number;
  settings?: BusinessSettings;
}

// Sample policy-compliant sponsored editorial creative templates for woodworking & construction audience
const SPONSOR_TEMPLATES = [
  {
    title: 'Industrial Wood Seasoning & Moisture Meters',
    sponsor: 'ProTimber Tech Tools',
    description: 'Precision digital timber moisture meters with ±0.5% accuracy for carpenters and woodworkers.',
    cta: 'Learn More',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    icon: Wrench,
  },
  {
    title: 'Architectural CNC Router Cutters & Drill Bits',
    sponsor: 'Apex Carbide Engineering',
    description: 'Tungsten carbide tipped router bits for deep 3D door carving and solid teak framing.',
    cta: 'Explore Products',
    image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
    icon: HardHat,
  },
  {
    title: 'Eco-Friendly Polyurethane & Natural Wood Oils',
    sponsor: 'LumberShield Finishes',
    description: 'Low-VOC UV resistant polyurethane clear coats engineered for exterior teak wood doors.',
    cta: 'View Catalog',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    icon: Sparkles,
  },
];

export const AdMobCatalogNativeCard: React.FC<AdMobCatalogNativeCardProps> = ({
  index,
  settings,
}) => {
  const adConfig = getActiveAdMobSettings(settings?.adSettings);
  if (!adConfig.enabled || !adConfig.enableCatalogNativeAds) {
    return null;
  }

  const template = SPONSOR_TEMPLATES[index % SPONSOR_TEMPLATES.length];
  const Icon = template.icon;

  const handleSponsorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // In production native AdMob, the native ad overlay captures user clicks directly.
    // In web preview, open a safe demo sponsor notice or documentation
    console.log('[AdMob Native] Sponsor card interaction recorded');
  };

  return (
    <div
      className="group bg-gradient-to-b from-stone-50 to-stone-100 rounded-xl sm:rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#C89211]/60 transition-all duration-300 flex flex-col overflow-hidden shadow-xs relative"
      aria-label="Sponsored advertisement"
    >
      {/* Policy Mandated AD / SPONSORED Label Badge */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-30 flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded text-[9.5px] sm:text-[11px] font-bold bg-[#C89211] text-white uppercase tracking-wider shadow-sm flex items-center gap-1">
          <span>Ad</span>
        </span>
        <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-white/95 text-stone-700 border border-stone-200 backdrop-blur-xs">
          Sponsored Partner
        </span>
      </div>

      {/* Visual Media Box (Clearly distinguishable from door models) */}
      <div className="relative aspect-[3/4] bg-stone-200 overflow-hidden">
        <img
          src={template.image}
          alt={template.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Floating Sponsor Attribution */}
        <div className="absolute bottom-2.5 left-3 right-3 text-white">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
            <Icon className="w-3.5 h-3.5" />
            <span>{template.sponsor}</span>
          </div>
          <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
            {template.title}
          </h4>
        </div>
      </div>

      {/* Card Content & External CTA */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between bg-white/80 space-y-3">
        <div className="space-y-1">
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {template.description}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-stone-400 pt-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Verified Google AdMob Partner</span>
          </div>
        </div>

        {/* Distinct Sponsor Action Button (Never looks like door pricing or buy action) */}
        <button
          type="button"
          onClick={handleSponsorClick}
          className="w-full py-2 px-3 rounded-lg bg-stone-100 hover:bg-[#C89211] hover:text-white text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-stone-200 cursor-pointer"
        >
          <span>{template.cta}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
