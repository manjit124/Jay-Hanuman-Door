import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Tag,
  DollarSign,
  BookOpen,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  XCircle,
  RefreshCw,
  Eye,
  Info,
  Layers,
  ChevronRight,
  Upload,
} from 'lucide-react';
import {
  Door,
  NotificationCategory,
  NotificationTargetAudience,
  NotificationCampaign,
  NotificationStats,
} from '../types.ts';
import {
  fetchAdminNotificationStats,
  fetchAdminNotificationCampaigns,
  sendAdminNotification,
  cancelAdminScheduledNotification,
  deleteAdminNotificationCampaign,
  uploadImage,
} from '../lib/api.ts';

interface AdminNotificationsTabProps {
  doors: Door[];
  onShowToast: (msg: string) => void;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  doors,
  onShowToast,
}) => {
  // Stats & History
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Composer Form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('new_designs');
  const [targetAudience, setTargetAudience] = useState<NotificationTargetAudience>('all');
  const [actionType, setActionType] = useState<'catalog' | 'door' | 'calculator' | 'articles' | 'custom'>('catalog');
  const [selectedDoorId, setSelectedDoorId] = useState<string>('');
  const [customLink, setCustomLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Delivery Timing
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Confirmation & Sending State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, campaignsData] = await Promise.all([
        fetchAdminNotificationStats(),
        fetchAdminNotificationCampaigns(),
      ]);
      setStats(statsData);
      setCampaigns(campaignsData);
    } catch (err: any) {
      console.error('Failed to load notification admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute calculated deep link
  const getDeepLink = (): string => {
    switch (actionType) {
      case 'catalog':
        return '/catalog';
      case 'door':
        return selectedDoorId ? `/catalog?doorId=${selectedDoorId}` : '/catalog';
      case 'calculator':
        return '/calculator';
      case 'articles':
        return '/articles';
      case 'custom':
        return customLink || '/';
      default:
        return '/';
    }
  };

  // Image Upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const res = await uploadImage(file);
      if (res.url) {
        setImageUrl(res.url);
        onShowToast('Image uploaded successfully');
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      onShowToast('Failed to upload notification banner');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Select image from catalog doors
  const handleSelectDoorImage = (door: Door) => {
    if (door.images && door.images[0]) {
      setImageUrl(door.images[0]);
    }
    setSelectedDoorId(door.id);
    setActionType('door');
    if (!title) setTitle(`New Arrival: ${door.name}`);
    if (!message) setMessage(`Explore our handcrafted ${door.material || 'timber'} door. Custom sizing and live calculation available.`);
  };

  // Target audience count estimate
  const getAudienceCount = (): number => {
    if (!stats) return 0;
    if (targetAudience === 'all') return stats.activeSubscribers;
    return stats.categorySubscribers[targetAudience] ?? 0;
  };

  // Pre-Send validation & open modal
  const handleValidateAndOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onShowToast('Please enter a notification title');
      return;
    }
    if (!message.trim()) {
      onShowToast('Please enter a notification message');
      return;
    }

    if (deliveryMode === 'schedule') {
      if (!scheduleDate || !scheduleTime) {
        onShowToast('Please choose schedule date and time');
        return;
      }
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
      if (scheduledDateTime.getTime() <= Date.now()) {
        onShowToast('Schedule time must be in the future');
        return;
      }
    }

    setConfigNotice(null);
    setIsConfirmModalOpen(true);
  };

  // Dispatch notification
  const handleExecuteSend = async () => {
    setIsSending(true);
    setConfigNotice(null);

    let scheduleDateTimeString: string | undefined = undefined;
    if (deliveryMode === 'schedule') {
      scheduleDateTimeString = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    }

    try {
      const res = await sendAdminNotification({
        title: title.trim(),
        message: message.trim(),
        image: imageUrl || undefined,
        category,
        targetAudience,
        deepLink: getDeepLink(),
        doorId: selectedDoorId || undefined,
        scheduleTime: scheduleDateTimeString,
      });

      setIsConfirmModalOpen(false);
      onShowToast(res.message || 'Notification processed successfully');

      // Reset form
      setTitle('');
      setMessage('');
      setImageUrl('');
      setDeliveryMode('now');
      setScheduleDate('');
      setScheduleTime('');

      // Refresh data
      loadData();
    } catch (err: any) {
      console.error('Error sending campaign:', err);
      const errMsg = err?.message || 'Unable to send notification. Please try again.';
      if (errMsg.includes('not configured')) {
        setConfigNotice(errMsg);
      } else {
        onShowToast(errMsg);
        setIsConfirmModalOpen(false);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Cancel scheduled
  const handleCancelScheduled = async (id: string) => {
    try {
      await cancelAdminScheduledNotification(id);
      onShowToast('Scheduled notification cancelled');
      loadData();
    } catch (err) {
      onShowToast('Failed to cancel scheduled notification');
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Delete this notification record from history?')) return;
    try {
      await deleteAdminNotificationCampaign(id);
      onShowToast('Notification record deleted');
      loadData();
    } catch (err) {
      onShowToast('Failed to delete campaign');
    }
  };

  return (
    <div id="admin-notifications-section" className="space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <span>Push Notifications</span>
          </h2>
          <p className="text-stone-400 text-xs mt-1">
            Send customer broadcast alerts, new door design announcements, and festival offers directly to mobile phones and browsers.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 2. FCM Configuration Status Card */}
      {stats && (
        <div className={`p-4 rounded-2xl border text-xs ${
          stats.isFcmConfigured
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
            : 'bg-amber-950/25 border-amber-800/50 text-amber-200'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {stats.isFcmConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  {stats.isFcmConfigured
                    ? `FCM Service Ready (${stats.fcmConfigDetails?.projectId || 'Connected'})`
                    : 'Firebase Cloud Messaging (FCM) Credentials Required'}
                </span>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {stats.isFcmConfigured
                    ? 'Firebase Admin SDK is active. Real-time Web Push and Android FCM notifications are enabled.'
                    : 'To send live push notifications over the Firebase network, add the credentials below to your environment variables.'}
                </p>
                {!stats.isFcmConfigured && (
                  <div className="mt-2 pt-2 border-t border-amber-800/40 font-mono text-[10px] text-amber-300/90 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <div>• FIREBASE_PROJECT_ID</div>
                    <div>• FIREBASE_CLIENT_EMAIL</div>
                    <div>• FIREBASE_PRIVATE_KEY</div>
                    <div>• VITE_FIREBASE_VAPID_KEY</div>
                  </div>
                )}
              </div>
            </div>

            <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider bg-stone-900/60 border border-current flex-shrink-0">
              {stats.isFcmConfigured ? 'Active' : 'Setup Required'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Notification Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
            <span className="text-xs text-stone-400 font-medium block">Total Subscribers</span>
            <div className="text-2xl font-bold text-stone-100 mt-1">{stats.totalSubscribers}</div>
            <span className="text-[10px] text-stone-500 mt-0.5 block">Registered devices</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
            <span className="text-xs text-stone-400 font-medium block">Active Subscribers</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.activeSubscribers}</div>
            <span className="text-[10px] text-stone-500 mt-0.5 block">Permission granted</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
            <span className="text-xs text-stone-400 font-medium block">Campaigns Sent</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.campaignsCount}</div>
            <span className="text-[10px] text-stone-500 mt-0.5 block">All time broadcasts</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
            <span className="text-xs text-stone-400 font-medium block">Offers Audience</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {stats.categorySubscribers?.offers ?? 0}
            </div>
            <span className="text-[10px] text-stone-500 mt-0.5 block">Subscribed to deals</span>
          </div>
        </div>
      )}

      {/* 4. Notification Composer & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Notification Composer (7 cols) */}
        <div className="lg:col-span-7 bg-stone-850 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-500" />
              <span>Compose Push Notification</span>
            </h3>
            <span className="text-[11px] text-stone-400">
              Targeting: <strong className="text-amber-400">{getAudienceCount()} devices</strong>
            </span>
          </div>

          <form onSubmit={handleValidateAndOpenConfirm} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Notification Title <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Royal Sagwan Carved Doors Added"
                maxLength={65}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <div className="flex justify-between items-center text-[10px] text-stone-500 mt-1">
                <span>Keep under 50 characters for clean mobile lockscreen display</span>
                <span>{title.length}/65</span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Message Body <span className="text-amber-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Explore our 5 new handcrafted entrance designs with 35mm Sagwan core. Get instant quotes now."
                rows={3}
                maxLength={180}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
              <div className="flex justify-between items-center text-[10px] text-stone-500 mt-1">
                <span>Deliver clear value or call-to-action</span>
                <span>{message.length}/180</span>
              </div>
            </div>

            {/* Category & Target Audience row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="new_designs">✨ New Door Designs</option>
                  <option value="offers">🏷️ Offers & Deals</option>
                  <option value="price_updates">💰 Price Updates</option>
                  <option value="door_tips">🪵 Door & Wood Tips</option>
                  <option value="important_updates">📢 Important Updates</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as NotificationTargetAudience)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Active Subscribers ({stats?.activeSubscribers ?? 0})</option>
                  <option value="new_designs">Subscribed to New Designs ({stats?.categorySubscribers?.new_designs ?? 0})</option>
                  <option value="offers">Subscribed to Offers & Deals ({stats?.categorySubscribers?.offers ?? 0})</option>
                  <option value="price_updates">Subscribed to Price Updates ({stats?.categorySubscribers?.price_updates ?? 0})</option>
                  <option value="door_tips">Subscribed to Wood Tips ({stats?.categorySubscribers?.door_tips ?? 0})</option>
                  <option value="important_updates">Subscribed to Important Updates ({stats?.categorySubscribers?.important_updates ?? 0})</option>
                </select>
              </div>
            </div>

            {/* Deep Link Action */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <label className="block text-xs font-semibold text-stone-300">
                Action / Tap Destination (Deep Link)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActionType('catalog')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    actionType === 'catalog'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-stone-900 border-stone-750 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  🚪 Open Catalog
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('door')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    actionType === 'door'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-stone-900 border-stone-750 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  🎯 Specific Door
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('calculator')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    actionType === 'calculator'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-stone-900 border-stone-750 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  🧮 Price Calculator
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('articles')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    actionType === 'articles'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-stone-900 border-stone-750 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  📖 Door Articles
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('custom')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    actionType === 'custom'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-stone-900 border-stone-750 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  🔗 Custom Link
                </button>
              </div>

              {/* Specific Door selector */}
              {actionType === 'door' && (
                <div className="pt-2">
                  <label className="block text-[11px] text-stone-400 mb-1">Select Catalog Door:</label>
                  <select
                    value={selectedDoorId}
                    onChange={(e) => setSelectedDoorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose a door from catalog --</option>
                    {doors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.woodType} - ₹{d.basePrice})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Link input */}
              {actionType === 'custom' && (
                <div className="pt-2">
                  <label className="block text-[11px] text-stone-400 mb-1">Relative path or URL:</label>
                  <input
                    type="text"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="/catalog?category=sagwan"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Notification Image */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <label className="block text-xs font-semibold text-stone-300">
                Optional Banner Image
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                </label>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                  >
                    Clear Image
                  </button>
                )}
              </div>

              {/* Quick Door Thumbnail Selector */}
              <div className="pt-1">
                <span className="text-[11px] text-stone-400 block mb-1">Or pick from existing door designs:</span>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {doors.slice(0, 8).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSelectDoorImage(d)}
                      className="flex-shrink-0 relative rounded-xl overflow-hidden border border-stone-750 hover:border-amber-500 group transition-all"
                    >
                      <img
                        src={d.image || d.images?.[0] || '/assets/app-icon.svg'}
                        alt={d.name}
                        className="w-14 h-14 object-cover"
                      />
                      <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[9px] text-amber-300 font-bold px-1 text-center line-clamp-1">
                          Use
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Delivery Timing: Send Now vs Schedule */}
            <div className="space-y-3 pt-3 border-t border-stone-800">
              <label className="block text-xs font-semibold text-stone-300">
                Delivery Schedule (Asia/Kolkata IST)
              </label>

              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-stone-200">
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="now"
                    checked={deliveryMode === 'now'}
                    onChange={() => setDeliveryMode('now')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Send Immediately</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-stone-200">
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="schedule"
                    checked={deliveryMode === 'schedule'}
                    onChange={() => setDeliveryMode('schedule')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Schedule for Later (IST)</span>
                </label>
              </div>

              {deliveryMode === 'schedule' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-900 border border-stone-750 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Date:</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-850 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Time (IST):</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-850 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                {deliveryMode === 'schedule' ? (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Notification</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Review & Send Notification</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: Live Mobile Notification Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-850 border border-stone-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Device Preview</span>
              </span>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-mono">Mobile / PWA</span>
            </div>

            {/* Mock Android / Web Push Lockscreen Card */}
            <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800 shadow-inner space-y-3">
              
              {/* Header inside mock notification */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-amber-600 flex items-center justify-center text-stone-950 font-bold text-[10px]">
                    🚪
                  </div>
                  <span className="text-xs font-semibold text-stone-200">Jai Hanuman Door</span>
                  <span className="text-[10px] text-stone-500">• now</span>
                </div>

                <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                  {category === 'new_designs' ? 'New Designs' : category === 'offers' ? 'Offers' : category}
                </span>
              </div>

              {/* Title & Body */}
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-stone-100">
                  {title || 'New Teak Door Designs Arrived'}
                </h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {message || 'Explore our latest 2026 Sagar & Sagwan carved wood collection with instant pricing.'}
                </p>
              </div>

              {/* Optional Image Banner Preview */}
              {imageUrl && (
                <div className="rounded-xl overflow-hidden border border-stone-800 mt-2">
                  <img
                    src={imageUrl}
                    alt="Notification Banner Preview"
                    className="w-full h-36 object-cover"
                  />
                </div>
              )}

              {/* Action Buttons inside mock notification */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-850 text-[11px]">
                <span className="text-amber-400 font-semibold px-2 py-1 rounded bg-stone-900 border border-stone-800 flex items-center gap-1">
                  <span>View Details</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
                <span className="text-stone-400 px-2 py-1">Dismiss</span>
              </div>

            </div>

            {/* Deep link info pill */}
            <div className="mt-3 text-[11px] text-stone-400 flex items-center justify-between p-2 rounded-xl bg-stone-900 border border-stone-800">
              <span>Target link:</span>
              <span className="font-mono text-amber-400 truncate max-w-[180px]">{getDeepLink()}</span>
            </div>

          </div>

          {/* Quick Guidance Box */}
          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 text-xs text-stone-400 space-y-2">
            <div className="flex items-center gap-2 text-stone-200 font-semibold">
              <Info className="w-4 h-4 text-amber-500" />
              <span>Production Best Practices</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-stone-400">
              <li>Keep titles punchy and avoid excessive punctuation.</li>
              <li>Customers who opted out of specific categories won't receive irrelevant notifications.</li>
              <li>Invalid tokens or uninstalled devices are pruned automatically upon delivery.</li>
            </ul>
          </div>

        </div>

      </div>

      {/* 5. Notification Campaign History Table */}
      <div className="bg-stone-850 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Campaign Delivery History ({campaigns.length})</span>
          </h3>
          <span className="text-xs text-stone-400">Recent broadcasts & scheduled dispatches</span>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs">
            No notifications sent yet. Use the composer above to broadcast your first announcement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-900 text-stone-400 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Notification</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Audience</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Recipients</th>
                  <th className="p-3">Sent / Scheduled</th>
                  <th className="p-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-stone-800/40 transition-colors">
                    
                    {/* Title & Message */}
                    <td className="p-3 max-w-xs">
                      <div className="font-bold text-stone-100 line-clamp-1">{camp.title}</div>
                      <div className="text-stone-400 text-[11px] line-clamp-1 mt-0.5">{camp.message}</div>
                      {camp.deepLink && (
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">{camp.deepLink}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[10px] font-medium text-stone-300">
                        {camp.category}
                      </span>
                    </td>

                    {/* Audience */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-[11px] text-stone-300">
                        {camp.targetAudience === 'all' ? 'All Subscribers' : camp.targetAudience}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      {camp.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Sent
                        </span>
                      )}
                      {camp.status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                          <Calendar className="w-3 h-3" /> Scheduled
                        </span>
                      )}
                      {camp.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[10px]">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                      {camp.status === 'draft' && (
                        <span className="px-2 py-0.5 rounded-full bg-stone-700 text-stone-300 text-[10px]">
                          Draft
                        </span>
                      )}
                    </td>

                    {/* Recipients & Stats */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-stone-200">
                        {camp.recipientCount ?? 0} devices
                      </div>
                      {camp.status === 'sent' && (
                        <div className="text-[10px] text-stone-400">
                          {camp.successCount ?? 0} delivered
                        </div>
                      )}
                    </td>

                    {/* Sent / Scheduled Date */}
                    <td className="p-3 whitespace-nowrap text-[11px] text-stone-400">
                      {camp.sentAt
                        ? new Date(camp.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                        : camp.scheduledAt
                        ? `Scheduled for: ${new Date(camp.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                        : new Date(camp.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="p-3 whitespace-nowrap text-right space-x-2">
                      {camp.status === 'scheduled' && (
                        <button
                          onClick={() => handleCancelScheduled(camp.id)}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Pre-Send Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-100">
                  {deliveryMode === 'schedule' ? 'Confirm Scheduled Notification' : 'Send Push Notification?'}
                </h3>
                <p className="text-xs text-stone-300 mt-1">
                  {deliveryMode === 'schedule'
                    ? `Schedule this notification for ${new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (Asia/Kolkata)?`
                    : `Send this notification to ${getAudienceCount()} subscriber${getAudienceCount() === 1 ? '' : 's'}?`}
                </p>
              </div>
            </div>

            {/* Notification Snapshot */}
            <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 text-xs space-y-1.5">
              <div className="font-bold text-stone-200">{title}</div>
              <div className="text-stone-400 text-[11px] leading-relaxed">{message}</div>
              <div className="pt-1 flex items-center gap-2 text-[10px] text-amber-400 font-medium">
                <span>Destination: {getDeepLink()}</span>
              </div>
            </div>

            {/* Error Guidance if FCM not configured */}
            {configNotice && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>Configuration Error</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {configNotice}
                </p>
                <div className="pt-2 font-mono text-[10px] text-red-300 space-y-0.5">
                  <div>Required environment variables:</div>
                  <div>• FIREBASE_PROJECT_ID</div>
                  <div>• FIREBASE_CLIENT_EMAIL</div>
                  <div>• FIREBASE_PRIVATE_KEY</div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-950/40 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{deliveryMode === 'schedule' ? 'Confirm Schedule' : 'Send Now'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
