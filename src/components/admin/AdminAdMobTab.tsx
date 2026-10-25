import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  DollarSign,
  Layers,
  FileText,
  Smartphone,
  Eye,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { BusinessSettings, AdMobSettings } from '../../types.ts';
import {
  ADMOB_TEST_IDS,
  ADMOB_PUBLISHER_ID,
  DEFAULT_ADMOB_SETTINGS,
  getActiveAdMobSettings,
  saveLocalAdMobSettings,
  validateAdMobIdMismatch,
} from '../../lib/admob/admobConfig.ts';
import { adMobService } from '../../lib/admob/admobService.ts';

interface AdminAdMobTabProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => Promise<void>;
}

export const AdminAdMobTab: React.FC<AdminAdMobTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentAdSettings: AdMobSettings = settings.adSettings || getActiveAdMobSettings();
  const [form, setForm] = useState<AdMobSettings>({
    enabled: currentAdSettings.enabled ?? true,
    testMode: currentAdSettings.testMode ?? true,
    appId: currentAdSettings.appId || ADMOB_TEST_IDS.APP_ID,
    bannerAdUnitId: currentAdSettings.bannerAdUnitId || ADMOB_TEST_IDS.BANNER,
    interstitialAdUnitId: currentAdSettings.interstitialAdUnitId || ADMOB_TEST_IDS.INTERSTITIAL,
    nativeAdUnitId: currentAdSettings.nativeAdUnitId || ADMOB_TEST_IDS.NATIVE,
    enableBanners: currentAdSettings.enableBanners ?? true,
    enableInterstitials: currentAdSettings.enableInterstitials ?? true,
    enableCatalogNativeAds: currentAdSettings.enableCatalogNativeAds ?? true,
    catalogNativeAdFrequency: currentAdSettings.catalogNativeAdFrequency || 6,
    interstitialMinIntervalSeconds: currentAdSettings.interstitialMinIntervalSeconds || 45,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setTestStatus(null);
    try {
      const updatedBusinessSettings: BusinessSettings = {
        ...settings,
        adSettings: form,
      };
      await onUpdateSettings(updatedBusinessSettings);
      saveLocalAdMobSettings(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      alert('Failed to save AdMob settings: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleResetToTestDefaults = () => {
    setForm({
      ...DEFAULT_ADMOB_SETTINGS,
      testMode: true,
    });
  };

  const handleTestInterstitial = async () => {
    setTestStatus('Testing interstitial ad...');
    try {
      await adMobService.showQuotationInterstitial(() => {
        setTestStatus('✅ Quotation ad dismissed/completed. Callback executed successfully!');
      }, form);
    } catch (err: any) {
      setTestStatus('❌ Interstitial test error: ' + (err.message || err));
    }
  };

  const handlePreloadNow = async () => {
    setTestStatus('Requesting AdMob preload...');
    const ok = await adMobService.preloadInterstitial(form);
    setTestStatus(ok ? '✅ Interstitial successfully preloaded and ready in memory.' : '⚠️ Preload request sent (check device connectivity).');
  };

  const status = adMobService.getStatus();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF7E3] border border-[#C89211]/30 text-[#C89211] text-xs font-semibold uppercase mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#C89211]" />
            <span>Monetization &amp; Revenue</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A]">
            Google AdMob Configuration
          </h3>
          <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
            Configure mobile ads, quotation interstitial frequency, catalog native card spacing, and Ad Unit IDs for Android.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToTestDefaults}
            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] text-xs font-semibold border border-[#E5E5E5] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Use Google Test IDs</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#b07d08] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            {saving ? 'Saving...' : 'Save AdMob Settings'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>AdMob settings updated and synchronized successfully!</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Controls & Toggles */}
        <div className="lg:col-span-2 space-y-6">

          {/* Master Toggles Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C89211]" />
              <span>AdMob Master Controls</span>
            </h4>

            <div className="space-y-3 divide-y divide-stone-100 text-xs">
              
              {/* Global Enable */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Enable Ads Globally</p>
                  <p className="text-[#666666] text-[11px]">Master on/off switch for all mobile advertisements</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={e => setForm({ ...form, enabled: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Test Mode */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                    <span>AdMob Test Mode</span>
                    {form.testMode && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Safe For Dev
                      </span>
                    )}
                  </p>
                  <p className="text-[#666666] text-[11px]">
                    Uses Google's official sample IDs to prevent account invalid click strikes. Disable only in production release.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.testMode}
                  onChange={e => setForm({ ...form, testMode: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Quotation Interstitial Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Door Calculator Quotation Interstitial</p>
                  <p className="text-[#666666] text-[11px]">
                    Displays an interstitial ad at the natural transition when user generates an official quotation PDF
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableInterstitials}
                  onChange={e => setForm({ ...form, enableInterstitials: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Catalog Native Ads Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Product Catalog Native Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Inserts clearly labelled sponsored editorial cards in the scrolling door catalog
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableCatalogNativeAds}
                  onChange={e => setForm({ ...form, enableCatalogNativeAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Banners Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Adaptive Banner Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Displays adaptive banners with safe layout clearance above bottom navigation
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableBanners}
                  onChange={e => setForm({ ...form, enableBanners: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

            </div>
          </div>

          {/* Frequencies & Intervals Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C89211]" />
              <span>Ad Frequency &amp; Policy Spacing</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Catalog Native Card Frequency
                </label>
                <select
                  value={form.catalogNativeAdFrequency}
                  onChange={e => setForm({ ...form, catalogNativeAdFrequency: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                >
                  <option value={4}>Every 4 doors</option>
                  <option value={6}>Every 6 doors (Recommended)</option>
                  <option value={8}>Every 8 doors</option>
                  <option value={10}>Every 10 doors</option>
                </select>
                <p className="text-[11px] text-[#666666] mt-1">
                  Calculated dynamically from product list; never duplicates on rerenders.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Quotation Interstitial Frequency Cap
                </label>
                <select
                  value={form.interstitialMinIntervalSeconds}
                  onChange={e => setForm({ ...form, interstitialMinIntervalSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                >
                  <option value={30}>Minimum 30 seconds</option>
                  <option value={45}>Minimum 45 seconds (Recommended)</option>
                  <option value={60}>Minimum 60 seconds</option>
                  <option value={90}>Minimum 90 seconds</option>
                  <option value={120}>Minimum 2 minutes</option>
                </select>
                <p className="text-[11px] text-[#666666] mt-1">
                  Prevents back-to-back interstitials if user generates multiple quotes in a row.
                </p>
              </div>

            </div>
          </div>

          {/* Ad Unit IDs Configuration */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#C89211]" />
                <span>AdMob Android Ad Unit IDs</span>
              </h4>
              <span className="text-[11px] text-[#666666]">Package: com.doorstudio.ai</span>
            </div>

            <div className="space-y-3 text-xs">
              
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  AdMob Android App ID:
                </label>
                <input
                  type="text"
                  value={form.appId}
                  onChange={e => setForm({ ...form, appId: e.target.value.trim() })}
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                {validateAdMobIdMismatch('appId', form.appId) && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validateAdMobIdMismatch('appId', form.appId)}</span>
                  </p>
                )}
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Synced with <code className="text-stone-700">android/app/src/main/res/values/strings.xml</code> (<code className="text-stone-700">admob_app_id</code>). Format uses <code className="text-[#C89211]">~</code>.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Interstitial Ad Unit ID (Door Quotation):
                </label>
                <input
                  type="text"
                  value={form.interstitialAdUnitId}
                  onChange={e => setForm({ ...form, interstitialAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                {validateAdMobIdMismatch('adUnit', form.interstitialAdUnitId) && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validateAdMobIdMismatch('adUnit', form.interstitialAdUnitId)}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Adaptive Banner Ad Unit ID:
                </label>
                <input
                  type="text"
                  value={form.bannerAdUnitId}
                  onChange={e => setForm({ ...form, bannerAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                {validateAdMobIdMismatch('adUnit', form.bannerAdUnitId) && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validateAdMobIdMismatch('adUnit', form.bannerAdUnitId)}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Native Advanced Ad Unit ID (Catalog Cards):
                </label>
                <input
                  type="text"
                  value={form.nativeAdUnitId}
                  onChange={e => setForm({ ...form, nativeAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                {validateAdMobIdMismatch('adUnit', form.nativeAdUnitId) && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validateAdMobIdMismatch('adUnit', form.nativeAdUnitId)}</span>
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* app-ads.txt Deployment & Verification Status */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorized Digital Sellers (app-ads.txt)</span>
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Configured
              </span>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Google AdMob crawls your developer website at <strong className="text-[#1A1A1A]">https://jaihanumandoor.com/app-ads.txt</strong> to verify authorized ad inventory.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 break-all select-all">
              google.com, {ADMOB_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <a
                href="https://jaihanumandoor.com/app-ads.txt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#C89211] hover:underline font-semibold"
              >
                <span>View Live app-ads.txt</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-stone-300">•</span>
              <a
                href="https://apps.admob.com/v2/apps/app-ads-txt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium"
              >
                <span>AdMob Console app-ads.txt Status</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Right Column: Live Diagnostic Status & Testing */}
        <div className="space-y-6">
          
          <div className="p-5 rounded-2xl bg-stone-900 text-stone-100 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" />
              <span>Diagnostic Tester</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Environment:</span>
                <span className="font-semibold text-stone-200">
                  {status.isNative ? 'Android Native (Capacitor)' : 'Web Browser / Preview'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">SDK Initialized:</span>
                <span className={status.isInitialized ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {status.isInitialized ? 'Yes (Active)' : 'Pending Launch'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Interstitial Preloaded:</span>
                <span className={status.isInterstitialLoaded ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
                  {status.isInterstitialLoaded ? 'Ready' : (status.isInterstitialLoading ? 'Loading...' : 'Not Loaded')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Active Banner:</span>
                <span className="text-stone-300">
                  {status.activeBannerPosition || 'None'}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handlePreloadNow}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              >
                <span>Preload Interstitial Ad</span>
              </button>

              <button
                type="button"
                onClick={handleTestInterstitial}
                className="w-full py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-98"
              >
                <span>Test Quotation Interstitial Ad</span>
              </button>
            </div>

            {testStatus && (
              <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-300 font-mono leading-relaxed break-words">
                {testStatus}
              </div>
            )}
          </div>

          {/* Policy Compliance Guidelines */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Google Play &amp; AdMob Policy Compliance</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-amber-900 leading-relaxed list-disc list-inside">
              <li>Ads are placed strictly at natural transition points (e.g., Quotation generation).</li>
              <li>Camera &amp; AI Lakdi captures are never interrupted by ads.</li>
              <li>Catalog native ads are prominently badged as "Ad" / "Sponsored".</li>
              <li>Adaptive banners preserve safe 72px clearance above bottom navigation.</li>
              <li>Safety timeout (3.5s) ensures the customer never loses their quotation if an ad fails.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
