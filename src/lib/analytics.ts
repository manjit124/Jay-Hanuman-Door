/**
 * Google Analytics 4 (GA4) Tracking for Jai Hanuman Door
 * Measurement ID: G-BL01LQ6EC7
 * Website: https://jaihanumandoor.com
 */

export const GA_MEASUREMENT_ID = 'G-BL01LQ6EC7';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

// Track the last recorded path to prevent duplicate page_view events
let lastTrackedPath: string | null = null;
let isInitialized = false;

/**
 * Safely send a page_view event to GA4
 * Ensures duplicate page_view events are never fired for the same path
 */
export function trackPageView(customPath?: string, customTitle?: string): void {
  if (typeof window === 'undefined') return;

  const currentPath = customPath || (window.location.pathname + window.location.search);
  const currentTitle = customTitle || document.title || 'Jai Hanuman Door';
  const currentUrl = window.location.href;

  // Deduplication check: Do not re-send if the path hasn't changed
  if (lastTrackedPath === currentPath) {
    return;
  }

  lastTrackedPath = currentPath;

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: currentTitle,
      page_location: currentUrl,
      page_path: currentPath,
      send_to: GA_MEASUREMENT_ID,
    });
  }
}

/**
 * Track custom GA4 events (e.g. quote calculation, WhatsApp click, catalog filter)
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
  }
}

/**
 * Initialize SPA route change listeners for Google Analytics 4.
 *
 * 1. The initial page load is already tracked by the gtag('config', ...) snippet in <head>.
 * 2. This listener detects client-side route transitions (pushState, replaceState, popstate)
 *    and fires a single deduplicated page_view event.
 */
export function initSpaAnalytics(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }

  isInitialized = true;

  // Initialize with the current path so the initial load is not duplicated
  lastTrackedPath = window.location.pathname + window.location.search;

  const handleLocationChange = () => {
    // Wait for the next tick so document.title and URL state are settled
    setTimeout(() => {
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== lastTrackedPath) {
        trackPageView(currentPath, document.title);
      }
    }, 50);
  };

  // Wrap pushState
  const originalPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    handleLocationChange();
    return result;
  };

  // Wrap replaceState
  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    handleLocationChange();
    return result;
  };

  // Listen to browser Back / Forward buttons
  window.addEventListener('popstate', handleLocationChange);

  return () => {
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', handleLocationChange);
    isInitialized = false;
  };
}
