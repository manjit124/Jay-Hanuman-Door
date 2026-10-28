import React from 'react';
import {
  TreePine,
  Sliders,
  Ruler,
  Check,
} from 'lucide-react';
import {
  Door,
  DoorMaterial,
  CustomDoorFittingState,
} from '../../types.ts';
import { resolveImageUrl } from '../../lib/api.ts';

interface DoorCustomizationStudioProps {
  door: Door;
  fittingState: CustomDoorFittingState;
  onChange: (updated: Partial<CustomDoorFittingState>) => void;
  materials: DoorMaterial[];
  estimatedPrice: number;
  className?: string;
}

const PRESET_SIZES = [
  { label: '30 × 78 inch', w: 30, h: 78, desc: 'Compact / Pooja', isDouble: false },
  { label: '32 × 78 inch', w: 32, h: 78, desc: 'Bedroom Standard', isDouble: false },
  { label: '34 × 78 inch', w: 34, h: 78, desc: 'Wide Bedroom', isDouble: false },
  { label: '36 × 78 inch', w: 36, h: 78, desc: 'Main Door Standard', isDouble: false },
  { label: '42 × 84 inch', w: 42, h: 84, desc: 'Grand Villa Entrance', isDouble: false },
  { label: '48 × 84 inch', w: 48, h: 84, desc: 'Double Door Villa', isDouble: true },
  { label: '48 × 96 inch', w: 48, h: 96, desc: 'Double Door Palace', isDouble: true },
  { label: '60 × 96 inch', w: 60, h: 96, desc: 'Double Door Grand', isDouble: true },
];

export const DoorCustomizationStudio: React.FC<DoorCustomizationStudioProps> = ({
  door,
  fittingState,
  onChange,
  materials,
  estimatedPrice,
  className = '',
}) => {
  // Sq Ft helper
  const sqFt = Math.round(((fittingState.widthInch * fittingState.heightInch) / 144) * 100) / 100;
  const widthFeet = (fittingState.widthInch / 12).toFixed(1);
  const heightFeet = (fittingState.heightInch / 12).toFixed(1);

  return (
    <div className={`space-y-5 ${className}`}>
      
      {/* 1. Wood Species Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] flex items-center gap-1.5">
            <TreePine className="w-3.5 h-3.5" />
            <span>1. Wood Species (Timber)</span>
          </label>
          <span className="text-[11px] text-[#666666]">
            Selected: <strong className="text-[#1A1A1A]">{fittingState.woodType}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {materials.map(mat => {
            const isSelected = fittingState.woodMaterialId === mat.id;
            return (
              <button
                key={mat.id}
                onClick={() =>
                  onChange({
                    woodMaterialId: mat.id,
                    woodType: mat.name,
                  })
                }
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFF7E3] border-[#C89211] text-[#1A1A1A] shadow-sm ring-1 ring-[#C89211]/50'
                    : 'bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A] hover:border-stone-400 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate">{mat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#C89211] shrink-0" />}
                </div>
                <div className="text-[11px] text-[#C89211] font-mono mt-1">
                  ₹{mat.ratePerSqFt}/sq.ft
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Catalogue Design & Carving Details */}
      <div className="p-3.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>2. Catalogue Design Carving</span>
          </label>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-[#16803A] border border-emerald-300">
            ✓ Original Design Preserved
          </span>
        </div>
        <div className="flex items-center gap-3">
          <img
            src={resolveImageUrl(door.image || door.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80')}
            alt={door.name}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80') {
                target.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80';
              }
            }}
            className="w-12 h-16 object-cover rounded-lg bg-white border border-[#E5E5E5] shrink-0"
          />
          <div>
            <div className="text-xs font-bold text-[#1A1A1A] line-clamp-1">{door.name}</div>
            <div className="text-[11px] text-[#666666] mt-0.5">{door.category} • Handcrafted Master Design</div>
            <p className="text-[10px] text-[#666666] mt-1 leading-snug">
              Authentic solid timber carvings and finish are directly crafted at our workshop.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Dimensions & Thickness */}
      <div className="space-y-3 p-4 bg-[#F8F8F6] border border-[#E5E5E5] rounded-2xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            <span>3. Dimensions &amp; Opening Size</span>
          </label>
          <span className="text-xs font-mono font-bold text-[#C89211]">
            {sqFt} sq.ft ({widthFeet} ft × {heightFeet} ft)
          </span>
        </div>

        {/* Shutter Format Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5E5E5]">
          <span className="text-xs text-[#1A1A1A] font-semibold">Shutter Format:</span>
          <div className="flex gap-1 bg-[#F8F8F6] p-0.5 rounded-lg border border-[#E5E5E5]">
            <button
              type="button"
              onClick={() =>
                onChange({
                  isDoubleDoor: false,
                  widthInch: fittingState.widthInch > 42 ? 36 : fittingState.widthInch,
                })
              }
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                !fittingState.isDoubleDoor
                  ? 'bg-white text-[#1A1A1A] shadow-xs border border-[#E5E5E5]'
                  : 'text-[#666666] hover:text-[#1A1A1A]'
              }`}
            >
              Single Shutter (1 Leaf)
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  isDoubleDoor: true,
                  widthInch: fittingState.widthInch < 48 ? 48 : fittingState.widthInch,
                })
              }
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                fittingState.isDoubleDoor
                  ? 'bg-[#C89211] text-white shadow-xs font-bold'
                  : 'text-[#666666] hover:text-[#1A1A1A]'
              }`}
            >
              Double Door (2 Leaves)
            </button>
          </div>
        </div>

        {/* Preset Sizes */}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_SIZES.map(p => {
            const isMatch = fittingState.widthInch === p.w && fittingState.heightInch === p.h && fittingState.isDoubleDoor === p.isDouble;
            return (
              <button
                key={p.label}
                onClick={() =>
                  onChange({
                    widthInch: p.w,
                    heightInch: p.h,
                    isDoubleDoor: p.isDouble,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isMatch
                    ? 'bg-[#C89211] text-white font-bold border-[#C89211]'
                    : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-stone-50'
                }`}
              >
                {p.w}" × {p.h}"
              </button>
            );
          })}
        </div>

        {/* Custom Width, Height, Thickness */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#1A1A1A]">
              <span>Width:</span>
              <span className="font-mono text-[#C89211] font-bold">{fittingState.widthInch} inches</span>
            </div>
            <input
              type="range"
              min="24"
              max="72"
              step="1"
              value={fittingState.widthInch}
              onChange={e => onChange({ widthInch: Number(e.target.value) })}
              className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#1A1A1A]">
              <span>Height:</span>
              <span className="font-mono text-[#C89211] font-bold">{fittingState.heightInch} inches</span>
            </div>
            <input
              type="range"
              min="60"
              max="108"
              step="1"
              value={fittingState.heightInch}
              onChange={e => onChange({ heightInch: Number(e.target.value) })}
              className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 col-span-2 sm:col-span-1">
            <div className="flex justify-between text-xs text-[#1A1A1A]">
              <span>Thickness:</span>
              <span className="font-mono text-[#C89211] font-bold">{fittingState.thicknessInch}"</span>
            </div>
            <div className="flex gap-1.5">
              {[1.25, 1.5, 1.75, 2.0].map(th => (
                <button
                  key={th}
                  onClick={() => onChange({ thicknessInch: th })}
                  className={`flex-1 py-1 rounded text-xs font-mono font-medium border cursor-pointer ${
                    fittingState.thicknessInch === th
                      ? 'bg-[#C89211] text-white font-bold border-[#C89211]'
                      : 'bg-white text-[#1A1A1A] border-[#E5E5E5]'
                  }`}
                >
                  {th}"
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Estimated Price Summary */}
      <div className="p-4 rounded-2xl bg-white border-2 border-[#C89211]/30 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
            Estimated Factory Price:
          </span>
          <div className="font-serif text-2xl sm:text-3xl font-extrabold text-[#C89211] mt-0.5">
            ₹{estimatedPrice.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-[#666666] mt-1">
            *Based on selected timber species &amp; door dimensions.
          </p>
        </div>

        <div className="text-right text-xs text-[#666666] font-mono space-y-0.5 hidden sm:block">
          <div>Area: {sqFt} sq.ft</div>
          <div>Size: {fittingState.widthInch}" × {fittingState.heightInch}"</div>
          <div className="text-[#16803A] font-semibold">{fittingState.woodType}</div>
        </div>
      </div>

    </div>
  );
};
