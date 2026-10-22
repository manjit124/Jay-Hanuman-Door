import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Copy,
  Check,
  MessageCircle,
  ArrowLeft,
  Calendar,
  Layers,
  Wrench,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  X,
  Play,
  FileText,
  Building2,
  MapPin,
} from 'lucide-react';
import { PublicTrackingView, TrackingStageId, StageStatus } from '../types.ts';
import { fetchPublicTracking } from '../lib/api.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface CustomerOrderTrackingProps {
  initialTrackingId?: string;
  onNavigateHome: () => void;
  onSelectDoor?: (doorId: string) => void;
}

export const CustomerOrderTracking: React.FC<CustomerOrderTrackingProps> = ({
  initialTrackingId,
  onNavigateHome,
}) => {
  const [searchInput, setSearchInput] = useState(initialTrackingId || '');
  const [trackingData, setTrackingData] = useState<PublicTrackingView | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [activeMediaModal, setActiveMediaModal] = useState<{
    url: string;
    type: 'image' | 'video';
    caption?: string;
  } | null>(null);

  // If initialTrackingId provided, auto-search
  useEffect(() => {
    if (initialTrackingId && initialTrackingId.trim()) {
      setSearchInput(initialTrackingId.trim());
      handleSearch(initialTrackingId.trim());
    }
  }, [initialTrackingId]);

  const handleSearch = async (trackingIdToSearch?: string) => {
    const id = (trackingIdToSearch || searchInput).trim();
    if (!id) {
      setErrorMsg('Please enter a valid Tracking ID.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchPublicTracking(id);
      setTrackingData(data);
    } catch (err: any) {
      setTrackingData(null);
      setErrorMsg(err.message || 'No order found with this Tracking ID. Please double check the ID.');
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Helper for WhatsApp inquiry
  const getInquiryWhatsAppUrl = (id?: string) => {
    const phone = trackingData?.officialWhatsApp || '7887412884';
    const text = id
      ? `Hello Jai Hanuman Door, I am inquiring about my order Tracking ID: ${id}. Please provide an update.`
      : `Hello Jai Hanuman Door, I would like to inquire about my door order progress.`;
    return getWhatsAppUrl(phone, text);
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] pb-20 pt-4 sm:pt-6">
      {/* Top Header / Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-[#666666] hover:text-[#C89211] text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Order Tracker</span>
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Hero Card & Search Bar */}
        <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-2xl p-5 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C89211]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center max-w-xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 text-xs font-semibold uppercase tracking-wider mb-3">
              <Package className="w-3.5 h-3.5" />
              <span>Realtime Manufacturing & Dispatch</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
              Track Your Door Order
            </h1>
            <p className="text-[#666666] text-xs sm:text-sm mt-2 leading-relaxed">
              Enter your unique Tracking ID to inspect live workshop craftsmanship milestones, polishing progress, and delivery status.
            </p>
          </div>

          {/* Search Input Box */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSearch();
            }}
            className="max-w-md mx-auto"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value.toUpperCase())}
                placeholder="e.g. JHD-2026-H8K24"
                className="w-full pl-11 pr-28 py-3.5 bg-white border border-[#E5E5E5] rounded-xl text-[#1A1A1A] placeholder-[#666666] text-sm font-mono tracking-wider focus:outline-none focus:border-[#C89211] focus:ring-2 focus:ring-[#C89211]/20 transition-all shadow-sm"
              />
              <Search className="w-5 h-5 text-[#666666] absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 px-4 py-2 bg-[#C89211] hover:bg-[#b07d08] text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {loading ? 'Searching...' : 'Track'}
              </button>
            </div>

            {/* Quick Sample Clicker for Testing */}
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[#666666]">
              <span>Try sample:</span>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('JHD-2026-H8K24');
                  handleSearch('JHD-2026-H8K24');
                }}
                className="text-[#C89211] hover:underline font-mono cursor-pointer font-semibold"
              >
                JHD-2026-H8K24
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="max-w-md mx-auto mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Results View */}
        {trackingData && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Status Indicators (2 Distinct Metrics: Manufacturing & Delivery) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Metric 1: Manufacturing Progress */}
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                      <Wrench className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
                        Manufacturing Progress
                      </h3>
                      <p className="text-lg font-bold text-[#1A1A1A] font-serif">
                        {trackingData.manufacturingPercent}% Completed
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-extrabold font-mono text-[#C89211]">
                    {trackingData.manufacturingPercent}%
                  </span>
                </div>

                {/* Linear Milestone Progress Bar */}
                <div className="w-full bg-[#F8F8F6] rounded-full h-3 border border-[#E5E5E5] overflow-hidden relative mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#C89211] to-amber-500 transition-all duration-700 ease-out"
                    style={{ width: `${trackingData.manufacturingPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#666666] font-mono">
                  <span>Start</span>
                  <span className={trackingData.manufacturingPercent >= 25 ? 'text-[#C89211] font-bold' : ''}>25%</span>
                  <span className={trackingData.manufacturingPercent >= 50 ? 'text-[#C89211] font-bold' : ''}>50%</span>
                  <span className={trackingData.manufacturingPercent >= 75 ? 'text-[#C89211] font-bold' : ''}>75%</span>
                  <span className={trackingData.manufacturingPercent >= 100 ? 'text-emerald-600 font-bold' : ''}>100%</span>
                </div>
              </div>

              {/* Metric 2: Order Delivery Status */}
              <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                      <Truck className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
                        Order & Logistics Status
                      </h3>
                      <p className="text-lg font-bold text-[#1A1A1A] font-serif">
                        {trackingData.deliveryStatusText}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      trackingData.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : trackingData.status === 'on_hold'
                        ? 'bg-[#FFF7E3] text-[#C89211] border-[#C89211]/30'
                        : trackingData.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {trackingData.status === 'completed'
                      ? 'Delivered'
                      : trackingData.status === 'on_hold'
                      ? 'On Hold'
                      : trackingData.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Active'}
                  </span>
                </div>

                <div className="text-xs text-[#1A1A1A] bg-[#F8F8F6] p-2.5 rounded-xl border border-[#E5E5E5] flex items-center justify-between">
                  <span className="text-[#666666]">Current Phase:</span>
                  <span className="font-semibold text-[#C89211]">{trackingData.currentStage.name}</span>
                </div>
              </div>
            </div>

            {/* Order Overview Card */}
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
                <div>
                  <span className="text-xs text-[#666666] uppercase tracking-wider font-semibold">Tracking ID</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg sm:text-xl font-bold font-mono text-[#C89211]">
                      {trackingData.trackingId}
                    </span>
                    <button
                      onClick={() => copyTrackingId(trackingData.trackingId)}
                      className="p-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-200 border border-[#E5E5E5] text-[#1A1A1A] transition-colors"
                      title="Copy Tracking ID"
                    >
                      {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {copiedId && <span className="text-xs text-emerald-600 font-medium">Copied!</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={getInquiryWhatsAppUrl(trackingData.trackingId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Inquire on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Product Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-[#666666] block mb-1">Product</span>
                  <span className="font-semibold text-[#1A1A1A] text-sm line-clamp-1">
                    {trackingData.productName}
                  </span>
                  {trackingData.productCategory && (
                    <span className="text-[11px] text-[#C89211] font-medium">{trackingData.productCategory}</span>
                  )}
                </div>

                <div>
                  <span className="text-[#666666] block mb-1">Material / Wood</span>
                  <span className="font-semibold text-[#1A1A1A] text-sm">
                    {trackingData.woodType || 'Sagwan (Teak Wood)'}
                  </span>
                  {trackingData.finishType && (
                    <span className="text-[11px] text-[#666666] block">{trackingData.finishType}</span>
                  )}
                </div>

                <div>
                  <span className="text-[#666666] block mb-1">Dimensions</span>
                  <span className="font-semibold text-[#1A1A1A] text-sm">
                    {trackingData.dimensions?.widthInch && trackingData.dimensions?.heightInch
                      ? `${trackingData.dimensions.widthInch} × ${trackingData.dimensions.heightInch} inch`
                      : 'Custom Specified'}
                  </span>
                  {trackingData.dimensions?.sqFt && (
                    <span className="text-[11px] text-[#666666] block">
                      ({trackingData.dimensions.sqFt.toFixed(2)} sq.ft)
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[#666666] block mb-1">Destination City</span>
                  <span className="font-semibold text-[#1A1A1A] text-sm">
                    {trackingData.customerCity || 'Maharashtra'}
                  </span>
                  <span className="text-[11px] text-[#666666] block">Qty: {trackingData.quantity} door(s)</span>
                </div>
              </div>

              {/* Estimated Logistics Dates (If Entered by Admin) */}
              {(trackingData.estimatedCompletionDate ||
                trackingData.expectedDispatchDate ||
                trackingData.delivery?.transportCompany ||
                trackingData.delivery?.lrNumber) && (
                <div className="mt-4 pt-4 border-t border-[#E5E5E5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#F8F8F6] p-3 rounded-xl border border-[#E5E5E5]">
                  {trackingData.estimatedCompletionDate && (
                    <div>
                      <span className="text-[#666666] flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#C89211]" />
                        <span>Expected Completion:</span>
                      </span>
                      <span className="font-semibold text-[#1A1A1A]">
                        {new Date(trackingData.estimatedCompletionDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {trackingData.expectedDispatchDate && (
                    <div>
                      <span className="text-[#666666] flex items-center gap-1.5 mb-1">
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Expected Dispatch:</span>
                      </span>
                      <span className="font-semibold text-[#1A1A1A]">
                        {new Date(trackingData.expectedDispatchDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {(trackingData.delivery?.transportCompany || trackingData.delivery?.lrNumber) && (
                    <div>
                      <span className="text-[#666666] flex items-center gap-1.5 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Transport & LR No:</span>
                      </span>
                      <span className="font-semibold text-[#1A1A1A]">
                        {trackingData.delivery.transportCompany || 'Transport'}
                        {trackingData.delivery.lrNumber ? ` (LR: ${trackingData.delivery.lrNumber})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vertical Progress Timeline (All 15 Stages) */}
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#C89211]" />
                    <span>Manufacturing & Delivery Timeline</span>
                  </h2>
                  <p className="text-[#666666] text-xs mt-1">
                    Follow every verified stage from wood seasoning at our workshop to doorstep delivery.
                  </p>
                </div>
              </div>

              {/* Timeline Container */}
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E5E5]">
                {trackingData.stages.map((stage, idx) => {
                  const isCurrent = trackingData.currentStage.id === stage.id;
                  const isCompleted = stage.status === 'completed';
                  const isInProgress = stage.status === 'in_progress';
                  const isNotApplicable = stage.status === 'not_applicable';
                  const isOnHold = stage.status === 'on_hold';

                  // Stage media photos/videos
                  const stageMedia = (trackingData.media || []).filter(m => m.stageId === stage.id);

                  return (
                    <div key={stage.id} className="relative group">
                      {/* Step Circle Marker */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                          isCompleted
                            ? 'bg-[#C89211] text-white border-2 border-white ring-2 ring-[#C89211]/30'
                            : isInProgress
                            ? 'bg-[#C89211] text-white border-2 border-white ring-4 ring-[#C89211]/30 animate-pulse'
                            : isNotApplicable
                            ? 'bg-stone-200 text-stone-500 border border-stone-300'
                            : isOnHold
                            ? 'bg-red-600 text-white border border-red-400'
                            : 'bg-[#F8F8F6] text-[#666666] border border-[#E5E5E5]'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <span>{stage.stepNumber}</span>
                        )}
                      </div>

                      {/* Content Card */}
                      <div
                        className={`p-4 sm:p-5 rounded-xl border transition-all ${
                          isInProgress
                            ? 'bg-[#FFF7E3] border-[#C89211]/40 ring-1 ring-[#C89211]/20 shadow-sm'
                            : isCompleted
                            ? 'bg-white border-[#E5E5E5] shadow-xs'
                            : isNotApplicable
                            ? 'bg-[#F8F8F6] border-[#E5E5E5] opacity-60'
                            : 'bg-[#F8F8F6] border-[#E5E5E5]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm sm:text-base font-bold ${
                                isCompleted
                                  ? 'text-[#1A1A1A]'
                                  : isInProgress
                                  ? 'text-[#C89211]'
                                  : 'text-[#666666]'
                              }`}
                            >
                              {stage.name}
                            </h4>

                            {stage.isMilestone && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 font-mono">
                                Milestone {stage.milestonePercent}%
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                  : isInProgress
                                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 animate-pulse'
                                  : isNotApplicable
                                  ? 'bg-stone-200 text-stone-600 border border-stone-300'
                                  : isOnHold
                                  ? 'bg-rose-50 text-rose-700 border border-rose-300'
                                  : 'bg-stone-100 text-[#666666] border border-[#E5E5E5]'
                              }`}
                            >
                              {isCompleted
                                ? 'Completed'
                                : isInProgress
                                ? 'In Progress'
                                : isNotApplicable
                                ? 'Not Applicable'
                                : isOnHold
                                ? 'On Hold'
                                : 'Pending'}
                            </span>

                            {stage.completedAt && (
                              <span className="text-[11px] text-[#666666] hidden sm:inline">
                                {new Date(stage.completedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Customer-facing Description */}
                        <p className="text-xs text-[#666666] leading-relaxed">
                          {stage.customerDescription}
                        </p>

                        {/* Reason if Not Applicable */}
                        {isNotApplicable && stage.notApplicableReason && (
                          <div className="mt-2 text-[11px] text-[#666666] italic bg-white p-2 rounded-lg border border-[#E5E5E5]">
                            Reason: {stage.notApplicableReason}
                          </div>
                        )}

                        {/* Customer Visible Stage Notes */}
                        {stage.customerNote && (
                          <div className="mt-3 p-3 bg-[#FFF7E3] border border-[#C89211]/30 rounded-lg text-xs text-[#1A1A1A] flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-[#C89211] shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-[#C89211] block text-[11px] uppercase tracking-wider">
                                Workshop Progress Note:
                              </span>
                              <span>{stage.customerNote}</span>
                            </div>
                          </div>
                        )}

                        {/* Progress Photos & Videos for this stage */}
                        {stageMedia.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                            <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider block mb-2">
                              Stage Progress Proof:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {stageMedia.map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setActiveMediaModal(m)}
                                  className="relative aspect-video rounded-lg overflow-hidden border border-[#E5E5E5] hover:border-[#C89211]/50 group focus:outline-none transition-all cursor-pointer bg-[#F8F8F6]"
                                >
                                  {m.type === 'video' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#F8F8F6] text-[#C89211]">
                                      <Play className="w-6 h-6 fill-[#C89211]" />
                                      <span className="text-[9px] mt-1 font-semibold text-[#1A1A1A]">Watch Clip</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={m.url}
                                      alt={m.caption || 'Progress proof'}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      loading="lazy"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Need Help / Contact Card */}
            <div className="bg-[#FFF7E3] border border-[#C89211]/30 rounded-2xl p-6 text-center shadow-sm">
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Have questions regarding your custom door order?
              </h3>
              <p className="text-[#666666] text-xs sm:text-sm mt-1 max-w-lg mx-auto">
                Our factory supervisors and technical team are available to discuss wood seasoning, carving adjustments, and delivery scheduling.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <a
                  href={getInquiryWhatsAppUrl(trackingData.trackingId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp (+91 78874 12884)</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Enlargement Modal */}
      {activeMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setActiveMediaModal(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 hover:bg-black text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-2 sm:p-4 flex items-center justify-center bg-black min-h-[300px]">
              {activeMediaModal.type === 'video' ? (
                <video
                  src={activeMediaModal.url}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-full rounded-lg"
                />
              ) : (
                <img
                  src={activeMediaModal.url}
                  alt={activeMediaModal.caption || 'Enlarged progress proof'}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
                />
              )}
            </div>

            {activeMediaModal.caption && (
              <div className="p-4 bg-white text-xs text-[#666666] border-t border-[#E5E5E5]">
                <p className="font-semibold text-[#1A1A1A]">Progress Detail:</p>
                <p className="mt-0.5">{activeMediaModal.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
