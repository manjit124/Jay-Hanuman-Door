import { useEffect } from 'react';
import { ContentProtectionSettings } from '../types.ts';

declare global {
  interface Window {
    AndroidBridge?: {
      setFlagSecure?: (enabled: boolean) => void;
      enableScreenshotProtection?: (enabled: boolean) => void;
      isNativeAndroid?: () => boolean;
    };
    AndroidInterface?: {
      setFlagSecure?: (enabled: boolean) => void;
      setSecure?: (enabled: boolean) => void;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        ScreenProtection?: {
          enable?: () => Promise<void>;
          disable?: () => Promise<void>;
        };
      };
    };
  }
}

// Default fallback settings
export const DEFAULT_CONTENT_PROTECTION: ContentProtectionSettings = {
  enableImageProtection: true,
  enableWatermark: true,
  watermarkText: 'Jai Hanuman Door',
  watermarkOpacity: 0.22,
  watermarkPattern: 'diagonal',
  enableAndroidFlagSecure: true,
  enableAndroidScreenRecordProtection: true,
};

/**
 * Communicates with native Android wrapper (Android WebView / Capacitor / Native APK)
 * to set WindowManager.LayoutParams.FLAG_SECURE on the native Android Window.
 * When FLAG_SECURE is active on Android, the operating system hardware compositor
 * blocks screenshots, screen recording, and task switcher preview thumbnails.
 */
export function applyAndroidFlagSecure(enabled: boolean): boolean {
  let bridgeCalled = false;

  try {
    // 1. Check custom AndroidBridge JavascriptInterface
    if (typeof window !== 'undefined' && window.AndroidBridge?.setFlagSecure) {
      window.AndroidBridge.setFlagSecure(enabled);
      bridgeCalled = true;
    } else if (typeof window !== 'undefined' && window.AndroidBridge?.enableScreenshotProtection) {
      window.AndroidBridge.enableScreenshotProtection(enabled);
      bridgeCalled = true;
    }

    // 2. Check AndroidInterface variant
    if (typeof window !== 'undefined' && window.AndroidInterface?.setFlagSecure) {
      window.AndroidInterface.setFlagSecure(enabled);
      bridgeCalled = true;
    } else if (typeof window !== 'undefined' && window.AndroidInterface?.setSecure) {
      window.AndroidInterface.setSecure(enabled);
      bridgeCalled = true;
    }

    // 3. Check Capacitor ScreenProtection plugin
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.ScreenProtection) {
      const plugin = window.Capacitor.Plugins.ScreenProtection;
      if (enabled && plugin.enable) {
        plugin.enable().catch(() => {});
        bridgeCalled = true;
      } else if (!enabled && plugin.disable) {
        plugin.disable().catch(() => {});
        bridgeCalled = true;
      }
    }
  } catch (err) {
    console.warn('[ContentProtection] Android native bridge communication notice:', err);
  }

  return bridgeCalled;
}

/**
 * Returns true if running inside a native Android container or detected Android platform
 */
export function isAndroidPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isAndroidUA = /android/.test(ua);
  const hasAndroidBridge = Boolean(
    window.AndroidBridge ||
    window.AndroidInterface ||
    (window.Capacitor?.isNativePlatform && window.Capacitor.isNativePlatform())
  );
  return isAndroidUA || hasAndroidBridge;
}

/**
 * Global anti-copy & screenshot mitigation hook for Web and Android environments
 */
export function useContentProtection(
  settings?: ContentProtectionSettings | null,
  activeScreen?: string,
  onNotice?: (message: string) => void
) {
  const protection = settings || DEFAULT_CONTENT_PROTECTION;

  useEffect(() => {
    if (!protection.enableImageProtection) {
      return;
    }

    // 1. Android FLAG_SECURE sync
    if (protection.enableAndroidFlagSecure) {
      applyAndroidFlagSecure(true);
    }

    // 2. Context Menu (Right Click) Prevention on protected images
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isProtectedImg =
        target.tagName === 'IMG' ||
        target.closest('[data-protected="true"]') ||
        target.closest('.protected-media-container') ||
        target.closest('.protected-media-shield');

      if (isProtectedImg) {
        e.preventDefault();
        e.stopPropagation();
        if (onNotice) {
          onNotice('Image download is protected by Jai Hanuman Door copyright.');
        }
      }
    };

    // 3. Drag Prevention (Dragging image to desktop or another tab)
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        target.tagName === 'IMG' ||
        target.closest('[data-protected="true"]') ||
        target.closest('.protected-media-container')
      ) {
        e.preventDefault();
      }
    };

    // 4. Keyboard shortcuts interception (PrintScreen, Ctrl+P, Ctrl+S, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        // Try clearing clipboard if browser allows
        try {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText('').catch(() => {});
          }
        } catch {
          // ignore
        }
        if (onNotice) {
          onNotice('Screen captures of catalog designs are copyright-protected.');
        }
      }

      // Ctrl+P / Cmd+P (Print to PDF / save)
      if (isCtrlOrMeta && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (onNotice) {
          onNotice('Direct printing is disabled to protect proprietary door designs.');
        }
      }

      // Ctrl+S / Cmd+S (Save webpage with assets)
      if (isCtrlOrMeta && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (onNotice) {
          onNotice('Page saving is disabled to protect visual catalog assets.');
        }
      }

      // Ctrl+U / Cmd+Alt+U (View source)
      if (isCtrlOrMeta && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('keydown', handleKeyDown, true);

      // Clean up FLAG_SECURE if screen unmounts and no other protected view is active
      if (activeScreen === 'modal_closed' && protection.enableAndroidFlagSecure) {
        applyAndroidFlagSecure(false);
      }
    };
  }, [protection, activeScreen, onNotice]);
}
