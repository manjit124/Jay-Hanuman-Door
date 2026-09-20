import React, { useState } from 'react';
import { X, Calculator, MessageCircle, Ruler, TreePine, ShieldCheck, Check, ChevronRight, Heart } from 'lucide-react';
import { Door, BusinessSettings } from '../types.ts';
import { ProtectedImage } from './ProtectedImage.tsx';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface DoorDetailModalProps {
  door: Door | null;
  onClose: () => void;
  onCalculateThisDoor: (door: Door) => void;
  allDoors: Door[];
  onSelectDoor: (door: Door) => void;
  settings: BusinessSettings;
  favoriteDoorIds?: string[];
  onToggleFavorite?: (doorId: string) => void;
}

export const DoorDetailModal: React.FC<DoorDetailModalProps> = ({
  door,
  onClose,
  onCalculateThisDoor,
  allDoors,
  onSelectDoor,
  settings,
  favoriteDoorIds = [],
  onToggleFavorite,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!door) return null;

  const isFavorite = favoriteDoorIds.includes(door.id);

  const relatedDoors = allDoors
    .filter(d => d.id !== door.id && (d.category === door.category || d.material === door.material))
    .slice(0, 3);

  const images = door.images && door.images.length > 0 ? door.images : ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'];
  const currentImage = images[activeImageIndex] || images[0];

  const whatsappMessage = `Hello ${settings?.businessName || 'Jai Hanuman Door'}, I am interested in the "${door.name}" (${door.category}) starting at ₹${door.startingPrice.toLocaleString('en-IN')}. Please share available customization options and delivery details.`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl text-stone-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {door.category}
            </span>
            {door.featured && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-600 text-stone-950">
                Featured
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                id="modal-fav-toggle-btn"
                onClick={() => onToggleFavorite(door.id)}
                title={isFavorite ? 'Remove from Saved' : 'Save to Favorites'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isFavorite
                    ? 'bg-rose-950/60 text-rose-300 border-rose-600/50'
                    : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{isFavorite ? 'Saved' : 'Save Door'}</span>
              </button>
            )}

            <button
              id="close-door-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Left: Images */}
            <div className="space-y-3">
              <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-xl overflow-hidden bg-stone-950 border border-stone-800 shadow-inner">
                <ProtectedImage
                  src={currentImage}
                  alt={door.name}
                  watermarkSettings={settings?.contentProtection}
                  className="w-full h-full object-cover transition-all duration-300"
                  containerClassName="w-full h-full"
                />
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                        activeImageIndex === i ? 'border-amber-500 scale-95 ring-2 ring-amber-500/30' : 'border-stone-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <ProtectedImage
                        src={img}
                        alt=""
                        showWatermark={false}
                        watermarkSettings={settings?.contentProtection}
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Door Details & Pricing */}
            <div className="flex flex-col justify-between space-y-5">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
                  {door.name}
                </h2>
                
                {/* Starting Price Display */}
                <div className="p-3.5 rounded-xl bg-stone-800/60 border border-stone-700/60 mb-4">
                  <div className="text-xs text-stone-400 font-medium">Estimated Starting Price</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
                      ₹{door.startingPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-stone-400">
                      (Approx. based on standard 30×78" shutter)
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-stone-300 text-sm leading-relaxed mb-5">
                  {door.description}
                </p>

                {/* Specs Specifications */}
                <div className="space-y-3 py-3 border-y border-stone-800 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 flex items-center gap-1.5">
                      <TreePine className="w-4 h-4 text-amber-400" /> Primary Material:
                    </span>
                    <span className="font-semibold text-stone-100">{door.material || 'Sagwan (Teak)'}</span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-stone-400 flex items-center gap-1.5 pt-0.5">
                      <Ruler className="w-4 h-4 text-amber-400" /> Standard Sizes:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[220px]">
                      {door.availableSizes?.map(sz => (
                        <span key={sz} className="px-2 py-0.5 rounded text-xs bg-stone-800 text-stone-200 border border-stone-700">
                          {sz}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Seasoning:
                    </span>
                    <span className="font-medium text-emerald-400 text-xs">100% Kiln-Dried & Termite Resistant</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  id="modal-calc-btn"
                  onClick={() => onCalculateThisDoor(door)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all active:scale-[0.98]"
                >
                  <Calculator className="w-5 h-5" />
                  Calculate Price for this Door
                </button>

                <a
                  id="modal-whatsapp-btn"
                  href={getWhatsAppUrl(settings?.whatsappNumber, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 font-semibold text-sm flex items-center justify-center gap-2 border border-emerald-600/40 transition-all"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-300" />
                  WhatsApp Enquiry
                </a>
              </div>

            </div>

          </div>

          {/* Related Doors Section */}
          {relatedDoors.length > 0 && (
            <div className="pt-6 border-t border-stone-800">
              <h3 className="font-serif text-lg font-bold text-stone-100 mb-3">
                Similar Handcrafted Designs
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {relatedDoors.map(rd => (
                  <div
                    key={rd.id}
                    onClick={() => {
                      onSelectDoor(rd);
                      setActiveImageIndex(0);
                    }}
                    className="cursor-pointer group p-2 rounded-xl bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 transition-all"
                  >
                    <div className="aspect-[4/5] rounded-lg overflow-hidden bg-stone-950 mb-2 relative">
                      <ProtectedImage
                        src={rd.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'}
                        alt={rd.name}
                        watermarkSettings={settings?.contentProtection}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        containerClassName="w-full h-full"
                      />
                    </div>
                    <div className="text-xs font-semibold text-stone-200 line-clamp-1 group-hover:text-amber-400">
                      {rd.name}
                    </div>
                    <div className="text-xs text-amber-400 font-mono font-bold mt-0.5">
                      From ₹{rd.startingPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
