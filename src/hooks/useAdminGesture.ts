import { useRef, useCallback, useState, type SyntheticEvent } from 'react';

interface UseAdminGestureOptions {
  requiredTaps?: number;
  maxIntervalMs?: number;
  maxTotalTimeMs?: number;
  onSuccess: () => void;
}

/**
 * Multi-tap detection hook for hidden admin access.
 * - Requires exactly 6 rapid taps on the application logo
 * - Must occur within 2.5 seconds (max 500ms between consecutive taps)
 * - Deduplicates mobile synthetic touch/click events (<70ms apart)
 * - Automatically resets counter if pauses are too long
 * - Provides subtle visual feedback ("Opening secure access...") on the 6th tap
 */
export function useAdminGesture({
  requiredTaps = 6,
  maxIntervalMs = 500,
  maxTotalTimeMs = 2500,
  onSuccess,
}: UseAdminGestureOptions) {
  const tapHistoryRef = useRef<number[]>([]);
  const [isOpeningFeedback, setIsOpeningFeedback] = useState(false);

  const handleTap = useCallback((e?: SyntheticEvent) => {
    const now = Date.now();
    const taps = tapHistoryRef.current;

    // Deduplicate mobile double-events (e.g. touchstart/touchend + simulated click)
    if (taps.length > 0 && now - taps[taps.length - 1] < 70) {
      return;
    }

    // Check if interval between consecutive taps is too slow, or total time window exceeded
    if (taps.length > 0) {
      const intervalSinceLastTap = now - taps[taps.length - 1];
      const totalTimeFromFirstTap = now - taps[0];

      if (intervalSinceLastTap > maxIntervalMs || totalTimeFromFirstTap > maxTotalTimeMs) {
        // Reset and begin new sequence starting with current tap
        tapHistoryRef.current = [now];
        return;
      }
    }

    // Add current tap
    tapHistoryRef.current.push(now);

    // If exactly required taps reached
    if (tapHistoryRef.current.length === requiredTaps) {
      // Prevent standard link/button action for this 6th triggering tap
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Reset counter immediately
      tapHistoryRef.current = [];

      // Display subtle feedback banner (no visible counter or admin hints)
      setIsOpeningFeedback(true);

      // Trigger navigation / login modal after brief transition
      setTimeout(() => {
        setIsOpeningFeedback(false);
        onSuccess();
      }, 350);
    }
  }, [requiredTaps, maxIntervalMs, maxTotalTimeMs, onSuccess]);

  return {
    handleTap,
    isOpeningFeedback,
  };
}
