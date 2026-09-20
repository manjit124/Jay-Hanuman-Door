import React, { useEffect, useState } from 'react';
import { Bell, X, ArrowRight, Sparkles, Tag, DollarSign, BookOpen, AlertCircle } from 'lucide-react';
import { subscribeToForegroundNotifications } from '../lib/notifications.ts';

interface ForegroundNotification {
  id: string;
  title: string;
  message: string;
  category?: string;
  image?: string;
  deepLink?: string;
  doorId?: string;
}

interface ForegroundNotificationBannerProps {
  onNavigateToDeepLink: (deepLink?: string, doorId?: string) => void;
}

export const ForegroundNotificationBanner: React.FC<ForegroundNotificationBannerProps> = ({
  onNavigateToDeepLink,
}) => {
  const [currentNotification, setCurrentNotification] = useState<ForegroundNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToForegroundNotifications((payload) => {
      const item: ForegroundNotification = {
        id: 'fg_' + Date.now(),
        ...payload,
      };
      setCurrentNotification(item);
      setIsVisible(true);

      // Auto-dismiss after 9 seconds if not clicked
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 9000);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  if (!currentNotification || !isVisible) return null;

  const getCategoryMeta = (category?: string) => {
    switch (category) {
      case 'new_designs':
        return { label: 'New Door Designs', icon: Sparkles, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'offers':
        return { label: 'Offers & Deals', icon: Tag, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'price_updates':
        return { label: 'Price Updates', icon: DollarSign, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'door_tips':
        return { label: 'Door & Wood Tips', icon: BookOpen, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      default:
        return { label: 'Important Updates', icon: AlertCircle, color: 'bg-stone-500/20 text-stone-300 border-stone-500/30' };
    }
  };

  const meta = getCategoryMeta(currentNotification.category);
  const IconComp = meta.icon;

  const handleActionClick = () => {
    setIsVisible(false);
    onNavigateToDeepLink(currentNotification.deepLink, currentNotification.doorId);
  };

  return (
    <div
      id="foreground-notification-banner"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="bg-stone-900/95 backdrop-blur-md text-stone-100 rounded-2xl p-4 border border-amber-500/40 shadow-2xl shadow-stone-950/80">
        
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
              <IconComp className="w-3 h-3" />
              {meta.label}
            </span>
            <span className="text-[10px] text-stone-400">Just now</span>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss notification"
            className="text-stone-400 hover:text-stone-100 p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content row */}
        <div className="flex gap-3 items-start">
          {currentNotification.image ? (
            <img
              src={currentNotification.image}
              alt=""
              className="w-14 h-14 object-cover rounded-xl border border-stone-700 bg-stone-800 flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center flex-shrink-0 text-stone-950 shadow-md">
              <Bell className="w-5 h-5 text-amber-100" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-stone-100 line-clamp-1 leading-snug">
              {currentNotification.title}
            </h4>
            <p className="text-xs text-stone-300 line-clamp-2 mt-0.5 leading-relaxed">
              {currentNotification.message}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
          <span className="text-[10px] text-stone-400 font-medium">Jai Hanuman Door</span>
          <button
            onClick={handleActionClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
