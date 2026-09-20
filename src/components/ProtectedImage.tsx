import React, { useState } from 'react';
import { ShieldCheck, Download, Lock } from 'lucide-react';
import { ContentProtectionSettings } from '../types.ts';
import { DEFAULT_CONTENT_PROTECTION } from '../lib/contentProtection.ts';
import { getAdminToken } from '../lib/api.ts';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  watermarkSettings?: ContentProtectionSettings;
  showWatermark?: boolean;
  watermarkText?: string;
  loading?: 'lazy' | 'eager';
  onClick?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  fallbackSrc?: string;
  isAdmin?: boolean;
  aspectRatioClass?: string;
  badge?: React.ReactNode;
}

export const ProtectedImage: React.FC<ProtectedImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  watermarkSettings,
  showWatermark = true,
  watermarkText,
  loading = 'lazy',
  onClick,
  onError,
  fallbackSrc = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  isAdmin = false,
  aspectRatioClass = '',
  badge,
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);
  const [adminDownloading, setAdminDownloading] = useState(false);

  const protection = watermarkSettings || DEFAULT_CONTENT_PROTECTION;
  const isProtected = protection.enableImageProtection !== false;
  const isWatermarkActive = isProtected && showWatermark && (protection.enableWatermark !== false);

  const activeText = watermarkText || protection.watermarkText || 'Jai Hanuman Door';
  const activeOpacity = typeof protection.watermarkOpacity === 'number'
    ? Math.min(0.6, Math.max(0.05, protection.watermarkOpacity))
    : 0.22;
  const pattern = protection.watermarkPattern || 'diagonal';

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
      if (onError) onError(e);
    }
  };

  const handleAdminDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const token = getAdminToken();
    if (!token) return;

    setAdminDownloading(true);
    try {
      const response = await fetch(`/api/admin/media/download-original?url=${encodeURIComponent(src)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const extMatch = src.match(/\.[a-zA-Z0-9]+$/);
        const ext = extMatch ? extMatch[0] : '.jpg';
        a.download = `original-asset-${Date.now()}${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        // Fallback direct open for external photos
        window.open(src, '_blank');
      }
    } catch (err) {
      console.error('Admin asset download error:', err);
    } finally {
      setAdminDownloading(false);
    }
  };

  return (
    <div
      data-protected={isProtected ? 'true' : 'false'}
      className={`relative overflow-hidden select-none protected-media-container protected-media-shield ${aspectRatioClass} ${containerClassName}`}
      onClick={onClick}
    >
      {/* Underlying Responsive Image */}
      <img
        src={imgSrc}
        alt={alt}
        loading={loading}
        draggable={false}
        onDragStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onError={handleError}
        className={`w-full h-full object-cover select-none pointer-events-none ${className}`}
      />

      {/* Dynamic Watermark Layer */}
      {isWatermarkActive && (
        <div
          className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center select-none"
          style={{ opacity: activeOpacity }}
        >
          {pattern === 'diagonal' && (
            <div className="w-[180%] h-[180%] flex flex-col justify-around rotate-[-28deg] transform select-none pointer-events-none">
              {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-around whitespace-nowrap text-white font-serif font-bold text-xs sm:text-sm tracking-widest uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                >
                  <span>{activeText}</span>
                  <span className="text-[9px] opacity-70">•</span>
                  <span>{activeText}</span>
                  <span className="text-[9px] opacity-70">•</span>
                  <span>{activeText}</span>
                  <span className="text-[9px] opacity-70">•</span>
                  <span>{activeText}</span>
                </div>
              ))}
            </div>
          )}

          {pattern === 'center' && (
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-white/20 backdrop-blur-[1px] text-center shadow-2xl">
              <div className="flex items-center gap-1.5 text-amber-300 font-serif font-bold text-xs sm:text-sm tracking-wider uppercase drop-shadow-md">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{activeText}</span>
              </div>
              <span className="text-[9px] text-stone-200 font-mono tracking-widest uppercase mt-0.5 opacity-90">
                Proprietary Artisan Design
              </span>
            </div>
          )}

          {pattern === 'repeated' && (
            <div className="w-full h-full grid grid-cols-2 sm:grid-cols-3 gap-4 p-3 items-center justify-items-center">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rotate-[-18deg] text-center text-white font-serif font-semibold text-[11px] sm:text-xs tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  <div>{activeText}</div>
                  <div className="text-[8px] opacity-80">Protected</div>
                </div>
              ))}
            </div>
          )}

          {pattern === 'corner' && (
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/50 border border-white/25 text-[10px] text-stone-200 font-mono tracking-wider uppercase backdrop-blur-sm shadow-md flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>{activeText}</span>
            </div>
          )}
        </div>
      )}

      {/* Transparent Guard Overlay Layer
          This transparent div sits immediately over the image and catches all right-clicks,
          drag gestures, and long-presses, preventing browser context menu "Save Image As" */}
      <div
        className="absolute inset-0 z-20 select-none protected-media-shield cursor-pointer"
        draggable={false}
        onDragStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={onClick}
      />

      {/* Custom badges passed from parent */}
      {badge && <div className="absolute z-30 pointer-events-none">{badge}</div>}

      {/* Authorized Admin Only: Original File Access & Download */}
      {isAdmin && (
        <div className="absolute top-2 right-2 z-30 pointer-events-auto">
          <button
            onClick={handleAdminDownload}
            disabled={adminDownloading}
            className="p-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 shadow-lg transition-all backdrop-blur-md hover:scale-105"
            title="Authorized Admin: Download Original High-Res Asset"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">{adminDownloading ? 'Saving...' : 'Admin Original'}</span>
          </button>
        </div>
      )}

      {/* Print protection notice rendered exclusively during print preview */}
      <div className="hidden protected-print-notice absolute inset-0 bg-stone-900 text-stone-200 flex flex-col items-center justify-center p-4 text-center z-50">
        <ShieldCheck className="w-8 h-8 text-amber-500 mb-1" />
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
          Jai Hanuman Door • Content Protected
        </span>
        <span className="text-[10px] text-stone-400 mt-0.5">
          Proprietary handcrafted wood door design. Unauthorized copying or redistribution is strictly prohibited.
        </span>
      </div>
    </div>
  );
};
