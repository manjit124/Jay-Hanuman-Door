import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  Tag,
  DollarSign,
  BookOpen,
  AlertCircle,
  X,
  Check,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { NotificationPreferences } from '../types.ts';
import {
  getDeviceId,
  getStoredFcmToken,
  getNotificationPermissionState,
  setupPushNotifications,
  notifyForegroundListeners,
} from '../lib/notifications.ts';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '../lib/api.ts';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    newDesigns: true,
    offers: true,
    priceUpdates: true,
    doorTips: true,
    importantUpdates: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!isOpen) return;

    setPermissionState(getNotificationPermissionState());

    const loadPrefs = async () => {
      setIsLoading(true);
      try {
        const deviceId = getDeviceId();
        const res = await fetchNotificationPreferences(deviceId);
        if (res.preferences) {
          setPreferences(res.preferences);
        }
      } catch (err) {
        console.error('Error loading notification preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrefs();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updated);

    // If turning on master switch and permission not granted, request it
    if (key === 'enabled' && updated.enabled && permissionState !== 'granted') {
      const setupRes = await setupPushNotifications(updated);
      setPermissionState(getNotificationPermissionState());
      if (setupRes.success && onShowToast) {
        onShowToast('Push notifications enabled for this device');
      }
    }

    // Auto-save to backend
    try {
      setIsSaving(true);
      const deviceId = getDeviceId();
      const token = getStoredFcmToken() || undefined;
      await updateNotificationPreferences({
        deviceId,
        token,
        preferences: updated,
      });
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnablePermission = async () => {
    const res = await setupPushNotifications(preferences);
    setPermissionState(getNotificationPermissionState());
    if (res.success && onShowToast) {
      onShowToast('✓ Notifications enabled successfully!');
    }
  };

  const handleSendTestNotification = () => {
    notifyForegroundListeners({
      title: '🔔 Test Notification: Sagwan Doors',
      message: 'This is how live door updates and festival offers will appear on your device.',
      category: 'new_designs',
      deepLink: '/catalog',
    });
    if (onShowToast) {
      onShowToast('Sent test notification banner!');
    }
  };

  return (
    <div
      id="notification-preferences-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white text-[#1A1A1A] rounded-3xl max-w-lg w-full border border-[#E5E5E5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Push Notification Settings</h3>
              <p className="text-xs text-[#666666]">Choose what updates you want to receive</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Permission Status Banner */}
          {permissionState === 'denied' ? (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-[#C62828] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#C62828] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#C62828] block mb-1">Browser Notifications Blocked</span>
                <p className="text-[#666666] text-[11px] leading-relaxed">
                  Your browser or phone has blocked notifications for this site. Click the site settings or lock icon 🔒 in your address bar to allow notifications.
                </p>
              </div>
            </div>
          ) : permissionState === 'default' ? (
            <div className="p-3.5 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 text-xs text-[#1A1A1A] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#C89211] flex-shrink-0" />
                <div>
                  <span className="font-bold text-[#1A1A1A] block">Device Permission Needed</span>
                  <p className="text-[#666666] text-[11px]">Grant permission to receive alerts on this phone/computer.</p>
                </div>
              </div>
              <button
                onClick={handleEnablePermission}
                className="px-3 py-1.5 rounded-xl bg-[#C89211] hover:bg-amber-600 text-white font-bold text-xs flex-shrink-0 shadow transition-all"
              >
                Allow
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#16803A] flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#16803A] flex-shrink-0" />
              <span>✓ Notifications enabled for this device. Active and ready.</span>
            </div>
          )}

          {/* Master Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5]">
            <div>
              <span className="font-bold text-[#1A1A1A] text-sm block">Push Notifications</span>
              <span className="text-xs text-[#666666]">Master switch to enable or pause all door notifications</span>
            </div>
            <button
              onClick={() => handleToggle('enabled')}
              className={`w-13 h-7 rounded-full transition-colors relative flex items-center px-1 ${
                preferences.enabled ? 'bg-[#C89211]' : 'bg-stone-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  preferences.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Individual Category Toggles */}
          <div className={`space-y-3 transition-opacity ${preferences.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <h4 className="text-xs font-bold text-[#666666] uppercase tracking-wider px-1">
              Notification Categories
            </h4>

            {/* 1. New Designs */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-[#1A1A1A] text-xs block">New Door Designs</span>
                  <span className="text-[11px] text-[#666666]">Alerts when new carved Sagwan or modern doors launch</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle('newDesigns')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  preferences.newDesigns ? 'bg-[#C89211]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    preferences.newDesigns ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Offers & Deals */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#16803A] flex items-center justify-center flex-shrink-0 border border-emerald-200">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-[#1A1A1A] text-xs block">Offers & Deals</span>
                  <span className="text-[11px] text-[#666666]">Festival discounts, bundled hardware & polish offers</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle('offers')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  preferences.offers ? 'bg-[#C89211]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    preferences.offers ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Price Updates */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-200">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-[#1A1A1A] text-xs block">Price Updates</span>
                  <span className="text-[11px] text-[#666666]">Timber rate adjustments and price drop alerts</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle('priceUpdates')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  preferences.priceUpdates ? 'bg-[#C89211]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    preferences.priceUpdates ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. Door & Wood Tips */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-200">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-[#1A1A1A] text-xs block">Door & Wood Tips</span>
                  <span className="text-[11px] text-[#666666]">Sagwan vs Pine guides, termite prevention, polish care</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle('doorTips')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  preferences.doorTips ? 'bg-[#C89211]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    preferences.doorTips ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 5. Important Updates */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0 border border-stone-200">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-[#1A1A1A] text-xs block">Important Updates</span>
                  <span className="text-[11px] text-[#666666]">Workshop holiday notices and quotation order updates</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle('importantUpdates')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  preferences.importantUpdates ? 'bg-[#C89211]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    preferences.importantUpdates ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Test notification trigger */}
          <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
            <span className="text-xs text-[#666666]">Verify in-app delivery on this screen:</span>
            <button
              onClick={handleSendTestNotification}
              className="px-3 py-1.5 rounded-xl border border-[#E5E5E5] hover:bg-[#F8F8F6] text-[#1A1A1A] text-xs font-medium transition-colors"
            >
              Test Preview
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] bg-[#F8F8F6] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
