import React, { useState } from 'react';
import {
  Bell,
  Sparkles,
  Tag,
  DollarSign,
  BookOpen,
  CheckCircle2,
  X,
  AlertCircle,
  Shield,
} from 'lucide-react';
import {
  setupPushNotifications,
  markPromptDismissed,
  getNotificationPermissionState,
} from '../lib/notifications.ts';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionDeniedMsg, setPermissionDeniedMsg] = useState(false);

  if (!isOpen) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    setPermissionDeniedMsg(false);

    try {
      const result = await setupPushNotifications();
      if (result.success) {
        if (onPermissionGranted) onPermissionGranted();
        onClose();
      } else {
        const state = getNotificationPermissionState();
        if (state === 'denied') {
          setPermissionDeniedMsg(true);
        } else {
          // User closed prompt or error occurred
          onClose();
        }
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      onClose();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleNotNow = () => {
    markPromptDismissed();
    onClose();
  };

  return (
    <div
      id="notification-permission-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-stone-900 text-stone-100 rounded-3xl max-w-md w-full border border-stone-800 shadow-2xl overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={handleNotNow}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Visual with Door & Bell */}
        <div className="pt-8 pb-4 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-900/40 text-stone-950">
            <Bell className="w-8 h-8 text-stone-950 animate-bounce" />
          </div>

          <h3 className="text-xl font-bold text-stone-100 font-serif">
            🔔 Get Door Updates
          </h3>
          <p className="text-stone-300 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
            Stay updated with new door designs, offers, price updates and useful door tips.
          </p>
        </div>

        {/* Feature Points */}
        <div className="px-6 py-3 space-y-2.5">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-850 border border-stone-800 text-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-stone-200">New Door Designs</span>
              <p className="text-stone-400 text-[11px]">Instant alerts when new handcrafted designs are added</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-850 border border-stone-800 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-stone-200">Offers & Deals</span>
              <p className="text-stone-400 text-[11px]">Exclusive festival discounts on Teak & Sagwan woodwork</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-850 border border-stone-800 text-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-stone-200">Price & Timber Rate Updates</span>
              <p className="text-stone-400 text-[11px]">Get notified when wood material rates change</p>
            </div>
          </div>
        </div>

        {/* Permission Denied Guide (if blocked by browser) */}
        {permissionDeniedMsg && (
          <div className="mx-6 my-2 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-xs text-red-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>Permission is blocked in browser settings</span>
            </div>
            <p className="text-[11px] text-red-300/90 leading-relaxed">
              To enable: click the lock icon 🔒 in your browser address bar, set Notifications to "Allow", and reload.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 pt-4 flex flex-col sm:flex-row items-center gap-3">
          <button
            id="not-now-btn"
            onClick={handleNotNow}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-stone-700 bg-stone-800/80 hover:bg-stone-750 text-stone-300 font-semibold text-sm transition-colors text-center"
          >
            Not Now
          </button>

          <button
            id="enable-notifications-btn"
            onClick={handleEnable}
            disabled={isRequesting}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Enable Notifications</span>
              </>
            )}
          </button>
        </div>

        <div className="pb-4 px-6 text-center text-[11px] text-stone-500 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3 text-stone-500" />
          <span>No spam. You can manage or disable categories anytime in settings.</span>
        </div>

      </div>
    </div>
  );
};
