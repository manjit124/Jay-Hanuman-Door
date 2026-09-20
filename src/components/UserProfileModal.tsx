import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  History,
  Calculator,
  Eye,
  Trash2,
  Calendar,
  TreePine,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Bell,
  Sparkles,
} from 'lucide-react';
import {
  UserCalculationRecord,
  Door,
  BusinessSettings,
  NotificationPreferences,
} from '../types.ts';
import {
  fetchUserFavorites,
  toggleUserFavorite,
  fetchUserCalculations,
  deleteUserCalculation,
  clearUserCalculations,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '../lib/api.ts';
import { ProtectedImage } from './ProtectedImage.tsx';
import {
  getDeviceId,
  getNotificationPermissionState,
  setupPushNotifications,
} from '../lib/notifications.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  doors?: Door[];
  settings?: BusinessSettings;
  onSelectDoor?: (door: Door) => void;
  onSelectDoorForDetail?: (door: Door) => void;
  onCalculateDoor?: (door: Door) => void;
  onLoadCalculation?: (record: UserCalculationRecord) => void;
  onLoadCalculationIntoCalculator?: (record: UserCalculationRecord) => void;
  initialTab?: 'favorites' | 'history' | 'notifications';
  defaultTab?: 'favorites' | 'history' | 'notifications';
  // Optional legacy props maintained for seamless backwards compatibility
  currentUser?: any;
  user?: any;
  onUserUpdated?: (user: any) => void;
  onUpdateProfile?: (user: any) => void;
  onLogout?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  doors = [],
  settings,
  onSelectDoor,
  onSelectDoorForDetail,
  onCalculateDoor,
  onLoadCalculation,
  onLoadCalculationIntoCalculator,
  initialTab,
  defaultTab,
}) => {
  const resolvedTab = initialTab || defaultTab || 'favorites';
  const handleSelectDoor = onSelectDoor || onSelectDoorForDetail || (() => {});
  const handleCalculate = onCalculateDoor || (() => {});
  const handleLoadCalculation = onLoadCalculation || onLoadCalculationIntoCalculator || (() => {});

  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'notifications'>(
    resolvedTab === 'notifications' || resolvedTab === 'history' ? resolvedTab : 'favorites'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Notification Preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enabled: true,
    newDesigns: true,
    offers: true,
    priceUpdates: true,
    doorTips: true,
    importantUpdates: true,
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  // Favorites state
  const [favoriteDoors, setFavoriteDoors] = useState<Door[]>([]);

  // Calculation History state
  const [history, setHistory] = useState<UserCalculationRecord[]>([]);

  // Reload data whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab || defaultTab) {
        const t = initialTab || defaultTab;
        if (t === 'history' || t === 'notifications' || t === 'favorites') {
          setActiveTab(t);
        }
      }
      loadUserData();
    }
  }, [isOpen, initialTab, defaultTab]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [favs, calcs] = await Promise.all([
        fetchUserFavorites(),
        fetchUserCalculations(),
      ]);
      setFavoriteDoors(favs);
      setHistory(calcs);

      // Load push notification preferences if available
      try {
        const deviceId = getDeviceId();
        const notifRes = await fetchNotificationPreferences(deviceId).catch(() => null);
        if (notifRes?.preferences) {
          setNotificationPrefs(notifRes.preferences);
        }
        setNotifPermission(getNotificationPermissionState());
      } catch {
        // ignore notification prefs error
      }
    } catch (err: any) {
      console.error('Error loading saved items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifPref = async (key: keyof NotificationPreferences) => {
    const updated = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key],
    };
    setNotificationPrefs(updated);

    if (key === 'enabled' && updated.enabled && notifPermission !== 'granted') {
      await setupPushNotifications(updated);
      setNotifPermission(getNotificationPermissionState());
    }

    try {
      const deviceId = getDeviceId();
      await updateNotificationPreferences({
        deviceId,
        preferences: updated,
      });
      setSuccessMsg('Notification preferences saved');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  if (!isOpen) return null;

  const handleRemoveFavorite = async (doorId: string) => {
    try {
      await toggleUserFavorite(doorId);
      setFavoriteDoors(prev => prev.filter(d => d.id !== doorId));
      setSuccessMsg('Removed from saved doors');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove favorite');
    }
  };

  const handleDeleteCalculation = async (calcId: string) => {
    try {
      const updated = await deleteUserCalculation(calcId);
      setHistory(updated);
      setSuccessMsg('Calculation removed from saved estimates');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete calculation');
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your saved calculation history?')) return;
    try {
      await clearUserCalculations();
      setHistory([]);
      setSuccessMsg('All saved calculation history cleared');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clear history');
    }
  };

  const handleWhatsAppShare = (calc: UserCalculationRecord) => {
    const r = calc.result;
    const msg = `*Shivshahi Door Estimate Inquiry*\n\n` +
      `*Door:* ${calc.doorName || 'Custom Engineered Sagwan Door'}\n` +
      `*Dimensions:* ${r.widthInch}" W × ${r.heightInch}" H (${r.sqFt} sq.ft)\n` +
      `*Wood:* ${r.materialName}\n` +
      `*Finish:* ${r.finishName}\n` +
      `*Frame:* ${r.frameName}\n` +
      `*Estimated Cost:* ₹${r.total.toLocaleString('en-IN')}\n\n` +
      `I would like to verify this design and discuss factory delivery.`;

    const url = getWhatsAppUrl(settings?.whatsappNumber, msg);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        id="user-profile-modal-card"
        className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl text-stone-100 overflow-hidden my-6 max-h-[92vh] flex flex-col"
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-700 flex items-center justify-center text-stone-950 font-bold text-lg shadow-md">
              <Heart className="w-5 h-5 text-stone-950 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                  My Saved Doors & Estimates
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Local Browser Storage
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Your bookmarks and calculated door quotes are saved on this device — no login required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="close-profile-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-stone-800 bg-stone-900 flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <button
            id="tab-user-favorites"
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Saved Doors</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-300">
              {favoriteDoors.length}
            </span>
          </button>

          <button
            id="tab-user-history"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Saved Estimates</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-300">
              {history.length}
            </span>
          </button>

          <button
            id="tab-user-notifications"
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Push Notifications</span>
          </button>
        </div>

        {/* Global Notifications inside modal */}
        {(error || successMsg) && (
          <div className="px-6 pt-3">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 flex items-center gap-2 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/50 flex items-center gap-2 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Tab Body */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-6">
          
          {/* TAB 1: SAVED DOORS (FAVORITES) */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">Your Saved Doors</h3>
                  <p className="text-xs text-stone-400">
                    Bookmark your preferred Sagwan, Teak, and carved door designs to calculate prices or share anytime.
                  </p>
                </div>
              </div>

              {favoriteDoors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteDoors.map(door => (
                    <div
                      key={door.id}
                      className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all flex flex-col group"
                    >
                      <div className="relative aspect-[3/4] bg-stone-900 overflow-hidden">
                        <ProtectedImage
                          src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                          alt={door.name}
                          watermarkSettings={settings?.contentProtection}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          containerClassName="w-full h-full"
                        />
                        <button
                          onClick={() => handleRemoveFavorite(door.id)}
                          title="Remove from Saved Doors"
                          className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-stone-900/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="absolute bottom-2 left-2 z-30 px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-900/90 text-amber-300 border border-stone-700">
                          {door.category}
                        </span>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-stone-100 text-sm line-clamp-1">{door.name}</h4>
                          <p className="text-xs text-stone-400 mt-0.5">{door.material || 'Sagwan Wood'}</p>
                          <p className="text-xs font-semibold text-amber-400 mt-2">
                            Starts from ₹{door.startingPrice?.toLocaleString('en-IN') || '15,000'}
                          </p>
                        </div>

                        <div className="mt-3 pt-3 border-t border-stone-800 flex items-center gap-2">
                          <button
                            onClick={() => {
                              onClose();
                              handleSelectDoor(door);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Specs</span>
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              handleCalculate(door);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Calculate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-stone-800 bg-stone-950/40">
                  <Heart className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-stone-300">No Saved Doors Yet</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                    Click the heart icon on any door design in the Door Gallery to save it here for quick reference.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CALCULATION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">Your Saved Door Price Estimates</h3>
                  <p className="text-xs text-stone-400">
                    Review and reload your past calculations, compare sizes, or share directly on WhatsApp.
                  </p>
                </div>
                {history.length > 0 && (
                  <button
                    id="btn-clear-history"
                    onClick={handleClearAllHistory}
                    className="px-3 py-1.5 rounded-lg border border-rose-600/30 text-rose-300 hover:bg-rose-950/40 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {history.length > 0 ? (
                <div className="space-y-3.5">
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="bg-stone-950 border border-stone-800 rounded-xl p-4 hover:border-stone-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {item.doorImage ? (
                            <ProtectedImage
                              src={item.doorImage}
                              alt=""
                              showWatermark={false}
                              watermarkSettings={settings?.contentProtection}
                              className="w-12 h-16 object-cover rounded-lg border border-stone-800 shrink-0"
                              containerClassName="w-12 h-16 shrink-0 rounded-lg overflow-hidden"
                            />
                          ) : (
                            <div className="w-12 h-16 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 shrink-0">
                              <TreePine className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-stone-100 text-sm sm:text-base">
                                {item.doorName || 'Custom Engineered Door'}
                              </h4>
                              {item.quotationId && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Quoted
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right sm:self-center">
                          <span className="text-[11px] text-stone-400 block">Calculated Total</span>
                          <span className="font-serif text-lg sm:text-xl font-bold text-amber-400">
                            ₹{item.result.total?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Specs pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-900 text-xs">
                        <div className="bg-stone-900/60 p-2 rounded-lg border border-stone-800/60">
                          <span className="text-[10px] text-stone-500 block uppercase font-medium">Dimensions</span>
                          <span className="font-semibold text-stone-200">
                            {item.result.widthInch}" × {item.result.heightInch}" ({item.result.sqFt})
                          </span>
                        </div>
                        <div className="bg-stone-900/60 p-2 rounded-lg border border-stone-800/60">
                          <span className="text-[10px] text-stone-500 block uppercase font-medium">Timber Wood</span>
                          <span className="font-semibold text-stone-200 truncate block" title={item.result.materialName}>
                            {item.result.materialName}
                          </span>
                        </div>
                        <div className="bg-stone-900/60 p-2 rounded-lg border border-stone-800/60">
                          <span className="text-[10px] text-stone-500 block uppercase font-medium">Finish Polish</span>
                          <span className="font-semibold text-stone-200 truncate block" title={item.result.finishName}>
                            {item.result.finishName}
                          </span>
                        </div>
                        <div className="bg-stone-900/60 p-2 rounded-lg border border-stone-800/60">
                          <span className="text-[10px] text-stone-500 block uppercase font-medium">Chaukhat & Fit</span>
                          <span className="font-semibold text-stone-200 truncate block" title={item.result.frameName}>
                            {item.result.frameName}
                          </span>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-stone-400 bg-stone-900/30 p-2 rounded-lg italic">
                          "{item.notes}"
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-900">
                        <button
                          onClick={() => handleDeleteCalculation(item.id)}
                          className="text-stone-500 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleWhatsAppShare(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/30 text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              handleLoadCalculation(item);
                            }}
                            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Load in Calculator</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-stone-800 bg-stone-950/40">
                  <Calculator className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-stone-300">No Saved Estimates Yet</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                    Whenever you calculate a door price in the Price Calculator, click "Save Calculation" to save it here for later comparison.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Push Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div>
                  <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <span>Push Notification Preferences</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Control which updates and alerts you receive on this device
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.enabled}
                    onChange={() => handleToggleNotifPref('enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {notificationPrefs.enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800/80">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-200">New Door Designs</h4>
                      <p className="text-[11px] text-stone-400">Get notified when new Sagwan carving models and modern patterns arrive</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.newDesigns}
                      onChange={() => handleToggleNotifPref('newDesigns')}
                      className="w-4 h-4 rounded text-amber-600 bg-stone-900 border-stone-700 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800/80">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-200">Factory Discounts & Festive Offers</h4>
                      <p className="text-[11px] text-stone-400">Special seasonal discounts, bundle rates, and festive promotions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.offers}
                      onChange={() => handleToggleNotifPref('offers')}
                      className="w-4 h-4 rounded text-amber-600 bg-stone-900 border-stone-700 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800/80">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-200">Wood Pricing Updates</h4>
                      <p className="text-[11px] text-stone-400">Notifies when timber rates (CP Teak, Sal, Meranti) are revised</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.priceUpdates}
                      onChange={() => handleToggleNotifPref('priceUpdates')}
                      className="w-4 h-4 rounded text-amber-600 bg-stone-900 border-stone-700 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800/80">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-200">Door Care & Maintenance Tips</h4>
                      <p className="text-[11px] text-stone-400">Expert guides on Sagwan wood preservation, polish maintenance, and weatherproofing</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.doorTips}
                      onChange={() => handleToggleNotifPref('doorTips')}
                      className="w-4 h-4 rounded text-amber-600 bg-stone-900 border-stone-700 focus:ring-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center">
                  <p className="text-xs text-stone-400">
                    Notifications are disabled. Toggle the switch above to receive alerts on new designs and factory offers.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
