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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white text-[#1A1A1A] rounded-3xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={handleNotNow}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Visual with Door & Bell */}
        <div className="pt-8 pb-4 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C89211] to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-md text-white">
            <Bell className="w-8 h-8 text-white animate-bounce" />
          </div>

          <h3 className="text-xl font-bold text-[#1A1A1A] font-serif">
            🔔 Get Door Updates
          </h3>
          <p className="text-[#666666] text-sm mt-2 leading-relaxed max-w-xs mx-auto">
            Stay updated with new door designs, offers, price updates and useful door tips.
          </p>
        </div>

        {/* Feature Points */}
        <div className="px-6 py-3 space-y-2.5">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-xs">
            <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[#1A1A1A]">New Door Designs</span>
              <p className="text-[#666666] text-[11px]">Instant alerts when new handcrafted designs are added</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#16803A] flex items-center justify-center flex-shrink-0 border border-emerald-200">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[#1A1A1A]">Offers & Deals</span>
              <p className="text-[#666666] text-[11px]">Exclusive festival discounts on Teak & Sagwan woodwork</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-200">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[#1A1A1A]">Price & Timber Rate Updates</span>
              <p className="text-[#666666] text-[11px]">Get notified when wood material rates change</p>
            </div>
          </div>
        </div>

        {/* Permission Denied Guide (if blocked by browser) */}
        {permissionDeniedMsg && (
          <div className="mx-6 my-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C62828] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#C62828]">
              <AlertCircle className="w-4 h-4 text-[#C62828] flex-shrink-0" />
              <span>Permission is blocked in browser settings</span>
            </div>
            <p className="text-[11px] text-[#C62828]/90 leading-relaxed">
              To enable: click the lock icon 🔒 in your browser address bar, set Notifications to "Allow", and reload.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 pt-4 flex flex-col sm:flex-row items-center gap-3">
          <button
            id="not-now-btn"
            onClick={handleNotNow}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-[#E5E5E5] bg-[#F8F8F6] hover:bg-[#E5E5E5] text-[#1A1A1A] font-semibold text-sm transition-colors text-center"
          >
            Not Now
          </button>

          <button
            id="enable-notifications-btn"
            onClick={handleEnable}
            disabled={isRequesting}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-[#C89211] hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

        <div className="pb-4 px-6 text-center text-[11px] text-[#666666] flex items-center justify-center gap-1">
          <Shield className="w-3 h-3 text-[#666666]" />
          <span>No spam. You can manage or disable categories anytime in settings.</span>
        </div>

      </div>
    </div>
  );
};
