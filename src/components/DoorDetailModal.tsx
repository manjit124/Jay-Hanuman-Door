import React, { useState } from 'react';
import { X, Calculator, MessageCircle, Ruler, TreePine, ShieldCheck, Check, ChevronRight, Heart, Box, Sparkles, Video, Image as ImageIcon } from 'lucide-react';
import { Door, BusinessSettings } from '../types.ts';
import { ProtectedImage } from './ProtectedImage.tsx';
import { ContentProtectionWarning } from './ContentProtectionWarning.tsx';
import { AdMobBannerSlot } from './admob/AdMobBannerSlot.tsx';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface DoorDetailModalProps {
  door: Door | null;
  onClose: () => void;
  onCalculateThisDoor: (door: Door) => void;
  onOpenVisualizer?: (door: Door) => void;
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
  onOpenVisualizer,
  allDoors,
  onSelectDoor,
  settings,
  favoriteDoorIds = [],
  onToggleFavorite,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mediaTab, setMediaTab] = useState<'photos' | 'video'>('photos');

  if (!door) return null;

  const isFavorite = favoriteDoorIds.includes(door.id);

  const relatedDoors = allDoors
    .filter(d => d.id !== door.id && (d.category === door.category || d.material === door.material))
    .slice(0, 3);

  const rawImages = Array.isArray(door.images) ? door.images.filter(Boolean) : [];
  const orderedImages = door.image
    ? [door.image, ...rawImages.filter(img => img !== door.image)]
    : rawImages;
  const images = orderedImages.length > 0 ? orderedImages : ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'];
  const currentImage = images[activeImageIndex] || images[0];

  const whatsappMessage = `Hello ${settings?.businessName || 'Jai Hanuman Door'}, I am interested in the "${door.name}" (${door.category}) starting at ₹${door.startingPrice.toLocaleString('en-IN')}. Please share available customization options and delivery details.`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl text-[#1A1A1A] overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5] bg-[#F8F8F6] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
              {door.category}
            </span>
            {door.featured && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#C89211] text-white">
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
                    ? 'bg-rose-50 text-rose-600 border-rose-300'
                    : 'bg-white text-[#666666] border-[#E5E5E5] hover:text-rose-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{isFavorite ? 'Saved' : 'Save Door'}</span>
              </button>
            )}

            <button
              id="close-door-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
            
            {/* Left: Media (Photos & Video) */}
            <div className="space-y-3 w-full flex flex-col items-center">
              
              {/* Media Toggle Switcher (Visible ONLY if door.videoUrl is available) */}
              {door.videoUrl && (
                <div className="w-full flex items-center justify-center p-1 bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl shadow-xs">
                  <button
                    id="door-detail-photos-tab-btn"
                    type="button"
                    onClick={() => setMediaTab('photos')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mediaTab === 'photos'
                        ? 'bg-[#C89211] text-white shadow-sm'
                        : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Photos</span>
                  </button>
                  <button
                    id="door-detail-video-tab-btn"
                    type="button"
                    onClick={() => setMediaTab('video')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mediaTab === 'video'
                        ? 'bg-[#C89211] text-white shadow-sm'
                        : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                </div>
              )}

              {/* Photos View */}
              {(!door.videoUrl || mediaTab === 'photos') && (
                <>
                  {/* Main Product Image Container - Adapts to image aspect ratio, NO cropping */}
                  <div
                    id="door-detail-image-wrapper"
                    className="relative w-full rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5] shadow-inner p-2 sm:p-4 flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[400px] md:min-h-[480px]"
                  >
                    <ProtectedImage
                      src={currentImage}
                      alt={door.name}
                      watermarkSettings={settings?.contentProtection}
                      objectFit="contain"
                      className="w-full h-auto max-h-[55vh] sm:max-h-[65vh] md:max-h-[72vh] object-contain mx-auto block transition-all duration-300"
                      containerClassName="w-full flex items-center justify-center bg-transparent"
                      imgStyle={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '72vh',
                        objectFit: 'contain',
                      }}
                    />
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 w-full max-w-full scrollbar-thin">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImageIndex(i)}
                          className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all bg-[#F8F8F6] flex items-center justify-center p-1 ${
                            activeImageIndex === i
                              ? 'border-[#C89211] scale-95 ring-2 ring-[#C89211]/30 shadow-md'
                              : 'border-[#E5E5E5] opacity-70 hover:opacity-100 hover:border-stone-400'
                          }`}
                          title={`Select view ${i + 1}`}
                        >
                          <ProtectedImage
                            src={img}
                            alt={`${door.name} angle ${i + 1}`}
                            showWatermark={false}
                            watermarkSettings={settings?.contentProtection}
                            objectFit="contain"
                            className="w-full h-full object-contain"
                            containerClassName="w-full h-full bg-[#F8F8F6] flex items-center justify-center"
                            imgStyle={{ objectFit: 'contain' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Video View */}
              {door.videoUrl && mediaTab === 'video' && (
                <div className="w-full rounded-2xl bg-black border border-[#E5E5E5] shadow-inner p-2 flex flex-col items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[400px] md:min-h-[480px]">
                  <video
                    src={door.videoUrl}
                    controls
                    playsInline
                    preload="none"
                    controlsList="nodownload"
                    onContextMenu={e => e.preventDefault()}
                    className="w-full h-auto max-h-[55vh] sm:max-h-[65vh] md:max-h-[72vh] object-contain mx-auto block rounded-xl"
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '72vh',
                      objectFit: 'contain',
                    }}
                  />
                  <div className="w-full px-3 py-1.5 text-center text-[11px] text-white/70">
                    Product Video • {door.name}
                  </div>
                </div>
              )}

            </div>

            {/* Right: Door Details & Pricing */}
            <div className="flex flex-col justify-between space-y-5">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2 leading-tight">
                  {door.name}
                </h2>
                
                {/* Starting Price Display */}
                <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] mb-4">
                  <div className="text-xs text-[#666666] font-medium">Estimated Starting Price</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-bold text-[#C89211] font-mono">
                      ₹{door.startingPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-[#666666]">
                      (Approx. based on standard 30×78" shutter)
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[#666666] text-sm leading-relaxed mb-5">
                  {door.description}
                </p>

                {/* Specs Specifications */}
                <div className="space-y-3 py-3 border-y border-[#E5E5E5] text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666] flex items-center gap-1.5">
                      <TreePine className="w-4 h-4 text-[#C89211]" /> Primary Material:
                    </span>
                    <span className="font-semibold text-[#1A1A1A]">{door.material || 'Sagwan (Teak)'}</span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-[#666666] flex items-center gap-1.5 pt-0.5">
                      <Ruler className="w-4 h-4 text-[#C89211]" /> Standard Sizes:
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[220px]">
                      {door.availableSizes?.map(sz => (
                        <span key={sz} className="px-2 py-0.5 rounded text-xs bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5]">
                          {sz}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#666666] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#16803A]" /> Seasoning:
                    </span>
                    <span className="font-medium text-[#16803A] text-xs">100% Kiln-Dried & Termite Resistant</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {/* 3D & AR Fitting Button */}
                {onOpenVisualizer && (
                  <button
                    id="modal-visualizer-btn"
                    onClick={() => onOpenVisualizer(door)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Box className="w-5 h-5 text-white" />
                    <span>View in My Home (3D &amp; AR Fitting)</span>
                  </button>
                )}

                <button
                  id="modal-calc-btn"
                  onClick={() => onCalculateThisDoor(door)}
                  className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-[#E5E5E5] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Calculator className="w-5 h-5 text-[#C89211]" />
                  Calculate Price for this Door
                </button>

                <a
                  id="modal-whatsapp-btn"
                  href={getWhatsAppUrl(settings?.whatsappNumber, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                  WhatsApp Enquiry
                </a>
              </div>

              {/* Design & Media Protection Warning Badge */}
              <ContentProtectionWarning variant="modal" settings={settings} className="mt-4" />

            </div>

          </div>

          {/* Related Doors Section */}
          {relatedDoors.length > 0 && (
            <div className="pt-6 border-t border-[#E5E5E5]">
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A] mb-3">
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
                    className="cursor-pointer group p-2 rounded-xl bg-[#F8F8F6] hover:bg-white border border-[#E5E5E5] hover:shadow-md transition-all"
                  >
                    <div className="aspect-[3/4] sm:aspect-[4/5] rounded-xl overflow-hidden bg-white mb-2 relative flex items-center justify-center p-1.5 border border-[#E5E5E5]">
                      <ProtectedImage
                        src={rd.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'}
                        alt={rd.name}
                        watermarkSettings={settings?.contentProtection}
                        objectFit="contain"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        containerClassName="w-full h-full bg-white flex items-center justify-center"
                        imgStyle={{ objectFit: 'contain' }}
                      />
                    </div>
                    <div className="text-xs font-semibold text-[#1A1A1A] line-clamp-1 group-hover:text-[#C89211]">
                      {rd.name}
                    </div>
                    <div className="text-xs text-[#C89211] font-mono font-bold mt-0.5">
                      From ₹{rd.startingPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AdMob Adaptive Banner Placement (Product Detail Modal) */}
          <div className="pt-2">
            <AdMobBannerSlot placement="detail" settings={settings} />
          </div>

        </div>

      </div>
    </div>
  );
};
