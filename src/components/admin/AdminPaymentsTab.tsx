import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Settings,
  Eye,
  X,
  Loader2,
  Copy,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import type { BusinessSettings, PaymentTransaction, RazorpayMode } from '../../types.ts';
import {
  checkAdminRazorpayStatus,
  downloadAdminPaymentsCsv,
  fetchAdminPayments,
  fetchAdminPaymentSettings,
  saveAdminPaymentSettings,
  type AdminPaymentSettingsResponse,
  type AdminPaymentsSummary,
} from '../../lib/customerPaymentApi.ts';
import { generatePaymentReceiptPDF } from '../../lib/pdfGenerator.ts';

interface AdminPaymentsTabProps {
  settings?: BusinessSettings | null;
  showToast: (msg: string) => void;
}

export const AdminPaymentsTab: React.FC<AdminPaymentsTabProps> = ({ settings, showToast }) => {
  const [subTab, setSubTab] = useState<'transactions' | 'settings'>('transactions');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [summary, setSummary] = useState<AdminPaymentsSummary>({
    totalTransactions: 0,
    totalRevenueInr: 0,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    refundedCount: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment & OTP Settings
  const [configData, setConfigData] = useState<AdminPaymentSettingsResponse | null>(null);
  const [selectedMode, setSelectedMode] = useState<RazorpayMode>('test');
  const [checkoutBrandName, setCheckoutBrandName] = useState('Jai Hanuman Door');
  const [checkoutDescription, setCheckoutDescription] = useState(
    'Handcrafted Doors, Frames & Wood Scan Services'
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminPayments({
        search: search.trim() || undefined,
        status: statusFilter,
        mode: modeFilter,
      });
      if (!res.success) {
        setError(res.error || 'Failed to load payments.');
      } else {
        setPayments(res.payments || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load Razorpay payments.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, modeFilter]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetchAdminPaymentSettings();
      if (res.success && res.paymentSettings) {
        setConfigData(res);
        setSelectedMode(res.paymentSettings.mode);
        setCheckoutBrandName(res.paymentSettings.checkoutBrandName || 'Jai Hanuman Door');
        setCheckoutDescription(res.paymentSettings.checkoutDescription || '');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load payment settings.');
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleCheckRazorpayStatus = async (payment: PaymentTransaction) => {
    setSyncingId(payment.id);
    setError(null);
    try {
      const res = await checkAdminRazorpayStatus(payment.id);
      if (!res.success) {
        setError(res.error || 'Unable to check status with Razorpay.');
      } else {
        showToast(
          `Razorpay status checked (${res.gatewayLatestStatus || res.payment?.status || 'synced'}).`
        );
        await loadPayments();
        if (selectedPayment && res.payment && selectedPayment.id === res.payment.id) {
          setSelectedPayment(res.payment);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Status sync error.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      await downloadAdminPaymentsCsv({
        search: search.trim() || undefined,
        status: statusFilter,
        mode: modeFilter,
      });
      showToast('Payment report CSV downloaded.');
    } catch (err: any) {
      setError(err?.message || 'Failed to export payment CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    try {
      const res = await saveAdminPaymentSettings({
        mode: selectedMode,
        checkoutBrandName: checkoutBrandName.trim(),
        checkoutDescription: checkoutDescription.trim(),
      });
      if (!res.success) {
        setError(res.error || 'Failed to update payment settings.');
      } else {
        showToast(`Payment settings saved (${selectedMode.toUpperCase()} mode active).`);
        await loadSettings();
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const webhookFullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/payments/webhook`
      : '/api/payments/webhook';

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookFullUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // ignore
    }
  };

  const renderStatusText = (status: PaymentTransaction['status']) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Paid
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 text-stone-600 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    }
    if (status === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
          <RefreshCw className="w-3.5 h-3.5" />
          Refunded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
        <Clock className="w-3.5 h-3.5" />
        Pending
      </span>
    );
  };

  return (
    <div id="admin-payments-tab" className="space-y-6">
      {/* Header + Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#C89211]" />
            <span>Razorpay Payments &amp; OTP Gateway</span>
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Monitor verified customer payments, reconcile Razorpay orders, export CSV reports, and verify server credentials.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-[#E5E5E5] self-start">
          <button
            id="admin-payments-subtab-transactions"
            type="button"
            onClick={() => setSubTab('transactions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'transactions'
                ? 'bg-white text-[#1A1A1A] shadow-xs'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            Transactions ({summary.totalTransactions})
          </button>
          <button
            id="admin-payments-subtab-settings"
            type="button"
            onClick={() => setSubTab('settings')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'settings'
                ? 'bg-white text-[#1A1A1A] shadow-xs'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Payment &amp; OTP Settings</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {subTab === 'transactions' ? (
        <div className="space-y-5">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
              <div className="text-xs text-[#666666]">Verified Revenue</div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#1A1A1A] mt-1">
                ₹{summary.totalRevenueInr.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-[#666666] mt-0.5">
                {configData?.paymentSettings.mode === 'live' ? 'Live Mode' : 'Test Mode Active'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
              <div className="text-xs text-[#666666]">Successful</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {summary.paidCount}
              </div>
              <div className="text-[11px] text-[#666666] mt-0.5">Signature verified</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
              <div className="text-xs text-[#666666]">Pending</div>
              <div className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                {summary.pendingCount}
              </div>
              <div className="text-[11px] text-[#666666] mt-0.5">Awaiting capture</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
              <div className="text-xs text-[#666666]">Failed</div>
              <div className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1">
                {summary.failedCount}
              </div>
              <div className="text-[11px] text-[#666666] mt-0.5">Declined / invalid</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
              <div className="text-xs text-[#666666]">Cancelled</div>
              <div className="text-xl font-bold font-mono tabular-nums text-stone-700 mt-1">
                {summary.cancelledCount}
              </div>
              <div className="text-[11px] text-[#666666] mt-0.5">Checkout dismissed</div>
            </div>
          </div>

          {/* Search, Filters & Export Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-payment-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mobile number, transaction ID, Razorpay order/payment ID..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-[#E5E5E5]">
                {(['all', 'paid', 'pending', 'failed', 'cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-[#1A1A1A] shadow-xs font-semibold'
                        : 'text-[#666666] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                aria-label="Filter by payment mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-medium text-[#1A1A1A]"
              >
                <option value="all">All Modes</option>
                <option value="test">Test Mode</option>
                <option value="live">Live Mode</option>
              </select>

              <button
                type="button"
                onClick={loadPayments}
                className="px-3 py-2 rounded-xl border border-[#E5E5E5] bg-white hover:bg-stone-50 text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                id="admin-export-payments-csv"
                type="button"
                disabled={exporting}
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#E6B33A]" />
                )}
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-xs text-[#666666] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#C89211]" />
                <span>Loading payment transactions...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-10 text-center space-y-1.5">
                <div className="text-sm font-semibold text-[#1A1A1A]">No payment transactions found</div>
                <p className="text-xs text-[#666666]">
                  Verified Razorpay payments created by customers will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F8F6] border-b border-[#E5E5E5] text-[#666666]">
                      <th className="py-3 px-4 font-semibold">Transaction / Order</th>
                      <th className="py-3 px-4 font-semibold">Customer</th>
                      <th className="py-3 px-4 font-semibold">Product / Package</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEFEF]">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-3 px-4 align-top">
                          <div className="font-mono font-semibold text-[#1A1A1A]">{p.transactionId}</div>
                          <div className="font-mono text-[11px] text-[#666666] mt-0.5">
                            {p.razorpayOrderId}
                          </div>
                          {p.razorpayPaymentId && (
                            <div className="font-mono text-[11px] text-emerald-700">
                              {p.razorpayPaymentId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="font-semibold text-[#1A1A1A]">{p.customerName}</div>
                          <div className="font-mono text-[11px] text-[#666666]">
                            +91 {p.customerMobile}
                          </div>
                          {p.customerCity && (
                            <div className="text-[11px] text-[#888888]">{p.customerCity}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top max-w-[240px]">
                          <div className="font-medium text-[#1A1A1A] line-clamp-2">{p.productName}</div>
                          <div className="text-[11px] text-[#666666] mt-0.5">
                            {p.mode.toUpperCase()} · {p.itemType.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top text-right font-mono tabular-nums font-bold text-[#1A1A1A]">
                          ₹{Number(p.amountInr || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 align-top">
                          {renderStatusText(p.status)}
                          {p.failureReason && p.status !== 'paid' && (
                            <div className="text-[10px] text-rose-700 mt-0.5 max-w-[160px] line-clamp-2">
                              {p.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top text-[#666666] whitespace-nowrap font-mono tabular-nums text-[11px]">
                          {new Date(p.paidAt || p.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 align-top text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPayment(p)}
                              title="View full transaction & customer details"
                              className="px-2.5 py-1.5 rounded-lg border border-[#E5E5E5] hover:bg-stone-100 text-[#1A1A1A] font-medium inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              disabled={syncingId === p.id}
                              onClick={() => handleCheckRazorpayStatus(p)}
                              title="Check live status from Razorpay API"
                              className="px-2.5 py-1.5 rounded-lg border border-[#E5E5E5] hover:bg-stone-100 text-[#1A1A1A] font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${syncingId === p.id ? 'animate-spin' : ''}`}
                              />
                              <span>Check</span>
                            </button>
                            {p.status === 'paid' && (
                              <button
                                type="button"
                                onClick={() => generatePaymentReceiptPDF(p, settings || undefined)}
                                title="Download PDF receipt"
                                className="px-2.5 py-1.5 rounded-lg bg-[#FFF7E3] border border-[#C89211]/40 text-[#A0700B] hover:bg-[#FCEEC8] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Payment & OTP Settings Sub-Tab (Zero secrets exposed) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center gap-2 border-b border-[#EFEFEF] pb-3">
              <SlidersHorizontal className="w-4 h-4 text-[#C89211]" />
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Razorpay Mode &amp; Checkout Preferences
              </h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1A1A1A]">Active Gateway Mode</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="btn-razorpay-mode-test"
                  type="button"
                  onClick={() => setSelectedMode('test')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'test'
                      ? 'border-[#C89211] bg-[#FFF8E8] ring-2 ring-[#C89211]/20'
                      : 'border-[#E5E5E5] bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1A1A]">Test Mode (Default)</div>
                  <div className="text-[11px] text-[#666666] mt-0.5">
                    Uses RAZORPAY_TEST_KEY_ID &amp; SECRET
                  </div>
                </button>

                <button
                  id="btn-razorpay-mode-live"
                  type="button"
                  onClick={() => setSelectedMode('live')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'live'
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                      : 'border-[#E5E5E5] bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1A1A]">Live Mode</div>
                  <div className="text-[11px] text-[#666666] mt-0.5">
                    Requires verified RAZORPAY_LIVE keys
                  </div>
                </button>
              </div>
              <p className="text-[11px] text-[#666666]">
                Switching to Live Mode is blocked on the server until valid <code>rzp_live_*</code> credentials are configured in environment secrets.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                Checkout Display Brand Name
              </label>
              <input
                type="text"
                value={checkoutBrandName}
                onChange={(e) => setCheckoutBrandName(e.target.value)}
                maxLength={80}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                Checkout Description
              </label>
              <input
                type="text"
                value={checkoutDescription}
                onChange={(e) => setCheckoutDescription(e.target.value)}
                maxLength={140}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs text-[#1A1A1A]"
              />
            </div>

            <button
              id="btn-save-payment-settings"
              type="submit"
              disabled={savingSettings}
              className="w-full py-2.5 px-4 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Save Gateway Preferences</span>
            </button>
          </form>

          {/* Server Secrets Status Card (Read-Only, Masked) */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#EFEFEF] pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Server Environment Secret Status
              </h3>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              API secrets are never stored in browser code or exposed in the Admin Panel. Configure them strictly in server environment variables or Cloud Run Secrets.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-[#F2F2F2]">
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Razorpay Test Keys</div>
                  <div className="font-mono text-[11px] text-[#666666]">
                    RAZORPAY_TEST_KEY_ID / RAZORPAY_TEST_KEY_SECRET
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    configData?.paymentSettings.credentialsStatus.testModeReady
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {configData?.paymentSettings.credentialsStatus.testModeReady
                    ? `Configured (${configData.paymentSettings.credentialsStatus.testKeyIdMasked})`
                    : 'Not Configured'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#F2F2F2]">
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Razorpay Live Keys</div>
                  <div className="font-mono text-[11px] text-[#666666]">
                    RAZORPAY_LIVE_KEY_ID / RAZORPAY_LIVE_KEY_SECRET
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    configData?.paymentSettings.credentialsStatus.liveModeReady
                      ? 'text-emerald-700'
                      : 'text-stone-500'
                  }`}
                >
                  {configData?.paymentSettings.credentialsStatus.liveModeReady
                    ? `Configured (${configData.paymentSettings.credentialsStatus.liveKeyIdMasked})`
                    : 'Not Configured'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#F2F2F2]">
                <div>
                  <div className="font-semibold text-[#1A1A1A]">Razorpay Webhook Secret</div>
                  <div className="font-mono text-[11px] text-[#666666]">RAZORPAY_WEBHOOK_SECRET</div>
                </div>
                <span
                  className={`font-semibold ${
                    configData?.paymentSettings.credentialsStatus.webhookSecretSet
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {configData?.paymentSettings.credentialsStatus.webhookSecretSet
                    ? 'Configured'
                    : 'Not Configured'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-semibold text-[#1A1A1A]">APITXT SMS OTP Provider</div>
                  <div className="font-mono text-[11px] text-[#666666]">
                    APITXT_API_KEY
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    configData?.smsProvider.configured ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {configData?.smsProvider.configured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
            </div>

            {/* Webhook Endpoint URL */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E5E5E5] space-y-1.5">
              <div className="text-[11px] font-semibold text-[#1A1A1A]">
                Razorpay Webhook Endpoint URL
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono bg-white border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-[#1A1A1A] break-all">
                  {webhookFullUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E5E5E5] bg-white hover:bg-stone-100 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#666666]">
                Subscribe events: <code>payment.captured</code>, <code>order.paid</code>, <code>payment.failed</code>, <code>refund.processed</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal for Single Transaction */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E5E5] bg-[#FAF8F4] flex items-center justify-between">
              <div>
                <h4 className="font-serif text-base font-bold text-[#1A1A1A]">
                  Payment Transaction Details
                </h4>
                <div className="text-xs font-mono text-[#666666]">{selectedPayment.transactionId}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 rounded-lg hover:bg-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[#666666]">Customer Name</div>
                  <div className="font-semibold text-[#1A1A1A]">{selectedPayment.customerName}</div>
                </div>
                <div>
                  <div className="text-[#666666]">Mobile Number</div>
                  <div className="font-mono font-semibold text-[#1A1A1A]">
                    +91 {selectedPayment.customerMobile}
                  </div>
                </div>
                <div>
                  <div className="text-[#666666]">Amount</div>
                  <div className="font-mono font-bold text-base text-[#C89211]">
                    ₹{Number(selectedPayment.amountInr).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[#666666]">Status &amp; Mode</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    {renderStatusText(selectedPayment.status)}
                    <span className="text-[#666666]">· {selectedPayment.mode.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFEFEF] space-y-1.5">
                <div>
                  <span className="text-[#666666]">Product: </span>
                  <span className="font-semibold text-[#1A1A1A]">{selectedPayment.productName}</span>
                </div>
                {selectedPayment.productDescription && (
                  <div className="text-[#666666]">{selectedPayment.productDescription}</div>
                )}
                <div className="font-mono text-[11px] text-[#555555]">
                  Razorpay Order ID: {selectedPayment.razorpayOrderId}
                </div>
                <div className="font-mono text-[11px] text-[#555555]">
                  Razorpay Payment ID: {selectedPayment.razorpayPaymentId || 'Not yet captured'}
                </div>
                {selectedPayment.receiptNumber && (
                  <div className="font-mono text-[11px] text-emerald-700">
                    Receipt Number: {selectedPayment.receiptNumber}
                  </div>
                )}
                <div className="text-[11px] text-[#555555]">
                  Signature Verified: {selectedPayment.razorpaySignatureVerified ? 'Yes (HMAC-SHA256)' : 'No'}
                  {selectedPayment.webhookVerified ? ' · Webhook Confirmed' : ''}
                </div>
                {selectedPayment.failureReason && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                    Failure Reason: {selectedPayment.failureReason}
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                {selectedPayment.status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => generatePaymentReceiptPDF(selectedPayment, settings || undefined)}
                    className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Receipt PDF</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
