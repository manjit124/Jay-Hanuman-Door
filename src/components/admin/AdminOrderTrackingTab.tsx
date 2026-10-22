import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Copy,
  Check,
  MessageCircle,
  Upload,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  Wrench,
  Download,
  Printer,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  FileText,
  Building2,
  Lock,
  History,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import {
  TrackingOrder,
  OrderStageRecord,
  TrackingMediaItem,
  TrackingStageId,
  StageStatus,
  OrderStatus,
  ORDER_TRACKING_STAGES,
  Quotation,
  CustomerEnquiry,
} from '../../types.ts';
import {
  fetchAdminTrackingOrders,
  createAdminTrackingOrder,
  updateAdminTrackingOrder,
  updateAdminTrackingStage,
  uploadAdminTrackingMedia,
  deleteAdminTrackingMedia,
  updateAdminTrackingDelivery,
  deliverAdminTrackingOrder,
  cancelAdminTrackingOrder,
  deleteAdminTrackingOrder,
} from '../../lib/api.ts';
import { getWhatsAppUrl } from '../../lib/contactUtils.ts';

interface AdminOrderTrackingTabProps {
  quotes?: Quotation[];
  enquiries?: CustomerEnquiry[];
  officialWhatsApp?: string;
}

export const AdminOrderTrackingTab: React.FC<AdminOrderTrackingTabProps> = ({
  quotes = [],
  enquiries = [],
  officialWhatsApp = '7887412884',
}) => {
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TrackingOrder | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sub-actions in modal
  const [activeStageEdit, setActiveStageEdit] = useState<TrackingStageId | null>(null);
  const [stageStatusInput, setStageStatusInput] = useState<StageStatus>('in_progress');
  const [stageCustomerNote, setStageCustomerNote] = useState('');
  const [stageAdminNote, setStageAdminNote] = useState('');
  const [stageNaReason, setStageNaReason] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaIsCustomerVisible, setMediaIsCustomerVisible] = useState(true);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Delivery Edit State
  const [deliveryEdit, setDeliveryEdit] = useState({
    deliveryPartnerName: '',
    transportCompany: '',
    lrNumber: '',
    trackingUrl: '',
    dispatchedAt: '',
    estimatedDeliveryAt: '',
    showroomTransferDate: '',
  });

  // Cancel & Delivery Confirmation Dialogs
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [showDeliverDialog, setShowDeliverDialog] = useState(false);
  const [deliverNotesInput, setDeliverNotesInput] = useState('');

  // Create Form State
  const [createForm, setCreateForm] = useState<{
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerCity: string;
    customerAddress: string;
    productName: string;
    productCategory: string;
    woodType: string;
    finishType: string;
    quantity: number;
    widthInch: number;
    heightInch: number;
    totalAmount: number;
    advancePaid: number;
    linkedQuotationId: string;
    linkedEnquiryId: string;
    estimatedCompletionDate: string;
    expectedDispatchDate: string;
    workshopNotes: string;
    adminInternalNotes: string;
  }>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCity: 'Pune',
    customerAddress: '',
    productName: 'Royal Sagwan Carved Main Door',
    productCategory: 'Sagwan Door',
    woodType: 'Sagwan (CP Teak)',
    finishType: 'Natural Teak Wood Polish',
    quantity: 1,
    widthInch: 36,
    heightInch: 78,
    totalAmount: 16000,
    advancePaid: 8000,
    linkedQuotationId: '',
    linkedEnquiryId: '',
    estimatedCompletionDate: '',
    expectedDispatchDate: '',
    workshopNotes: '',
    adminInternalNotes: '',
  });

  // Load orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminTrackingOrders();
      setOrders(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tracking orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Sync selected order when orders update
  useEffect(() => {
    if (selectedOrder) {
      const refreshed = orders.find(o => o.id === selectedOrder.id);
      if (refreshed) {
        setSelectedOrder(refreshed);
        setDeliveryEdit({
          deliveryPartnerName: refreshed.delivery?.deliveryPartnerName || '',
          transportCompany: refreshed.delivery?.transportCompany || '',
          lrNumber: refreshed.delivery?.lrNumber || '',
          trackingUrl: refreshed.delivery?.trackingUrl || '',
          dispatchedAt: refreshed.delivery?.dispatchedAt ? refreshed.delivery.dispatchedAt.slice(0, 10) : '',
          estimatedDeliveryAt: refreshed.delivery?.estimatedDeliveryAt ? refreshed.delivery.estimatedDeliveryAt.slice(0, 10) : '',
          showroomTransferDate: refreshed.delivery?.showroomTransferDate ? refreshed.delivery.showroomTransferDate.slice(0, 10) : '',
        });
      }
    }
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (stageFilter !== 'all' && o.currentStageId !== stageFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          o.trackingId.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          (o.customerCity && o.customerCity.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, statusFilter, stageFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: orders.length,
      manufacturing: orders.filter(o => o.status === 'active' && o.manufacturingPercent < 100).length,
      showroom: orders.filter(o => o.currentStageId === 'transferred_to_showroom').length,
      dispatched: orders.filter(
        o => o.currentStageId === 'dispatched' || o.currentStageId === 'on_the_way'
      ).length,
      delivered: orders.filter(o => o.status === 'completed' || o.currentStageId === 'delivered').length,
    };
  }, [orders]);

  // Handle Quotation Auto-fill
  const handleLinkQuotation = (quoteId: string) => {
    const q = quotes.find(item => item.id === quoteId);
    if (!q) return;
    setCreateForm(prev => ({
      ...prev,
      linkedQuotationId: q.id,
      customerName: q.customerName || prev.customerName,
      customerPhone: q.customerPhone || prev.customerPhone,
      customerCity: q.customerCity || prev.customerCity,
      productName: q.doorName || prev.productName,
      widthInch: q.widthInch || prev.widthInch,
      heightInch: q.heightInch || prev.heightInch,
      woodType: q.materialName || prev.woodType,
      finishType: q.finishName || prev.finishType,
      totalAmount: q.total || prev.totalAmount,
      advancePaid: Math.round((q.total || 0) * 0.5),
    }));
  };

  // Submit Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customerName.trim() || !createForm.productName.trim()) {
      alert('Please provide customer name and product name');
      return;
    }

    try {
      const sqFt = Math.round(((createForm.widthInch * createForm.heightInch) / 144) * 100) / 100;
      const newOrder = await createAdminTrackingOrder({
        ...createForm,
        dimensions: {
          widthInch: createForm.widthInch,
          heightInch: createForm.heightInch,
          sqFt,
        },
      });
      setShowCreateModal(false);
      showToast(`Order created successfully with Tracking ID: ${newOrder.trackingId}`);
      await loadOrders();
      setSelectedOrder(newOrder);
    } catch (err: any) {
      alert(err.message || 'Failed to create order');
    }
  };

  // Stage Edit Open
  const openStageEditor = (stage: OrderStageRecord) => {
    setActiveStageEdit(stage.id);
    setStageStatusInput(stage.status);
    setStageCustomerNote(stage.customerNote || '');
    setStageAdminNote(stage.adminNote || '');
    setStageNaReason(stage.notApplicableReason || '');
  };

  // Save Stage Edit
  const handleSaveStage = async (moveNext = false) => {
    if (!selectedOrder || !activeStageEdit) return;

    try {
      const updated = await updateAdminTrackingStage(selectedOrder.id, {
        stageId: activeStageEdit,
        status: stageStatusInput,
        customerNote: stageCustomerNote.trim() || undefined,
        adminNote: stageAdminNote.trim() || undefined,
        notApplicableReason: stageStatusInput === 'not_applicable' ? stageNaReason.trim() : undefined,
        moveNext,
      });

      setSelectedOrder(updated);
      setActiveStageEdit(null);
      showToast('Stage updated successfully');
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update stage');
    }
  };

  // Upload Stage Media
  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !mediaFile || !activeStageEdit) return;

    setUploadingMedia(true);
    try {
      const res = await uploadAdminTrackingMedia(selectedOrder.id, mediaFile, {
        stageId: activeStageEdit,
        caption: mediaCaption,
        isCustomerVisible: mediaIsCustomerVisible,
      });
      setSelectedOrder(res.order);
      setMediaFile(null);
      setMediaCaption('');
      showToast('Progress photo/video uploaded successfully');
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to upload media');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Delete Media
  const handleDeleteMedia = async (mediaId: string) => {
    if (!selectedOrder) return;
    if (!confirm('Are you sure you want to delete this media item?')) return;

    try {
      const updated = await deleteAdminTrackingMedia(selectedOrder.id, mediaId);
      setSelectedOrder(updated);
      showToast('Media removed');
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to delete media');
    }
  };

  // Save Delivery Info
  const handleSaveDeliveryInfo = async () => {
    if (!selectedOrder) return;

    try {
      const updated = await updateAdminTrackingDelivery(selectedOrder.id, {
        ...deliveryEdit,
        dispatchedAt: deliveryEdit.dispatchedAt ? new Date(deliveryEdit.dispatchedAt).toISOString() : undefined,
        estimatedDeliveryAt: deliveryEdit.estimatedDeliveryAt ? new Date(deliveryEdit.estimatedDeliveryAt).toISOString() : undefined,
        showroomTransferDate: deliveryEdit.showroomTransferDate ? new Date(deliveryEdit.showroomTransferDate).toISOString() : undefined,
      });
      setSelectedOrder(updated);
      showToast('Delivery and transport details updated');
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update delivery info');
    }
  };

  // Mark Delivered
  const handleConfirmDeliver = async () => {
    if (!selectedOrder) return;
    try {
      const updated = await deliverAdminTrackingOrder(selectedOrder.id, deliverNotesInput);
      setSelectedOrder(updated);
      setShowDeliverDialog(false);
      showToast('Order successfully marked as DELIVERED!');
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to deliver order');
    }
  };

  // Cancel Order
  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    if (!cancelReasonInput.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }
    try {
      const updated = await cancelAdminTrackingOrder(selectedOrder.id, cancelReasonInput);
      setSelectedOrder(updated);
      setShowCancelDialog(false);
      showToast('Order marked as Cancelled');
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    }
  };

  // Delete Order Permanent
  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    if (!confirm(`Are you absolutely sure you want to permanently delete order ${selectedOrder.trackingId}?`)) return;

    try {
      await deleteAdminTrackingOrder(selectedOrder.id);
      setSelectedOrder(null);
      showToast('Order deleted successfully');
      loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to delete order');
    }
  };

  // Copy Tracking ID
  const copyTrackingId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // WhatsApp Customer Message Generator
  const getCustomerWhatsAppMessage = (order: TrackingOrder) => {
    const trackingUrl = `https://jaihanumandoor.com?tracking=${order.trackingId}`;
    return `Namaste ${order.customerName}! Aapka order Jai Hanuman Door par confirm ho gaya hai.

Aapki Tracking ID: ${order.trackingId}
Product: ${order.productName} (${order.woodType || 'Sagwan'})
Current Status: ${order.deliveryStatusText} (${order.manufacturingPercent}% Manufacturing Completed)

Aap apne door ki live manufacturing aur delivery progress yahan check kar sakte hain:
${trackingUrl}

Dhanyavaad,
Jai Hanuman Door
Pune, Maharashtra`;
  };

  const copyWhatsAppMessage = (order: TrackingOrder) => {
    const text = getCustomerWhatsAppMessage(order);
    navigator.clipboard.writeText(text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const shareWhatsApp = (order: TrackingOrder) => {
    const text = getCustomerWhatsAppMessage(order);
    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const url = getWhatsAppUrl(cleanPhone || officialWhatsApp, text);
    window.open(url, '_blank');
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = [
      'Tracking ID',
      'Customer Name',
      'Phone',
      'City',
      'Product',
      'Wood Type',
      'Quantity',
      'Manufacturing %',
      'Current Stage',
      'Delivery Status',
      'Order Status',
      'Total Amount',
      'Advance Paid',
      'Created Date',
    ];

    const rows = orders.map(o => [
      `"${o.trackingId}"`,
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      `"${o.customerCity || ''}"`,
      `"${o.productName}"`,
      `"${o.woodType || ''}"`,
      o.quantity,
      `${o.manufacturingPercent}%`,
      `"${o.currentStageId}"`,
      `"${o.deliveryStatusText}"`,
      `"${o.status}"`,
      o.totalAmount || 0,
      o.advancePaid || 0,
      `"${new Date(o.createdAt).toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jai-hanuman-door-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-[#C89211] text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Main Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#C89211]" />
            <span>Order Tracking & Manufacturing Progress</span>
          </h2>
          <p className="text-[#666666] text-xs sm:text-sm mt-1">
            Manage 15-stage craftsmanship milestones, upload progress proof photos, and update transport delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={exportToCSV}
            className="px-3 py-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#E5E5E5]"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={loadOrders}
            className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] hover:text-white transition-colors border border-[#E5E5E5]"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Trackable Order</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider block">Total Orders</span>
          <span className="text-xl font-bold font-mono text-white mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-[#C89211] uppercase tracking-wider block">In Workshop</span>
          <span className="text-xl font-bold font-mono text-[#C89211] mt-1 block">{stats.manufacturing}</span>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block">At Showroom</span>
          <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">{stats.showroom}</span>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">Dispatched / Way</span>
          <span className="text-xl font-bold font-mono text-indigo-400 mt-1 block">{stats.dispatched}</span>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-3.5 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Delivered</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{stats.delivered}</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#666666] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Tracking ID, customer name, phone, product, city..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-xs text-[#1A1A1A] placeholder-stone-500 focus:outline-none focus:border-[#C89211]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed / Delivered</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C89211] max-w-[180px]"
          >
            <option value="all">All 15 Stages</option>
            {ORDER_TRACKING_STAGES.map(s => (
              <option key={s.id} value={s.id}>
                {s.stepNumber}. {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table / List */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-[#666666] text-xs">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-[#666666] text-xs">
            No trackable orders found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F8F6] border-b border-[#E5E5E5] text-[#666666] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Door Product</th>
                  <th className="py-3 px-4">Mfg. Progress</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]/80">
                {filteredOrders.map(order => {
                  const currentStageObj =
                    ORDER_TRACKING_STAGES.find(s => s.id === order.currentStageId) || ORDER_TRACKING_STAGES[0];
                  return (
                    <tr key={order.id} className="hover:bg-[#F7F7F7]/50 transition-colors">
                      {/* Tracking ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#C89211]">
                        <div className="flex items-center gap-1.5">
                          <span>{order.trackingId}</span>
                          <button
                            onClick={() => copyTrackingId(order.trackingId)}
                            className="p-1 rounded hover:bg-[#F8F8F6] text-[#666666] hover:text-[#1A1A1A]"
                            title="Copy ID"
                          >
                            {copiedId === order.trackingId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#1A1A1A] block">{order.customerName}</span>
                        <span className="text-[11px] text-[#666666]">{order.customerPhone}</span>
                        {order.customerCity && (
                          <span className="text-[10px] text-[#C89211]/80 block">📍 {order.customerCity}</span>
                        )}
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#1A1A1A] block line-clamp-1">{order.productName}</span>
                        <span className="text-[11px] text-[#666666]">
                          {order.woodType || 'Sagwan'} • Qty: {order.quantity}
                        </span>
                      </td>

                      {/* Mfg Progress */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F8F8F6] rounded-full h-2 border border-[#E5E5E5] overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                              style={{ width: `${order.manufacturingPercent}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[#C89211]">{order.manufacturingPercent}%</span>
                        </div>
                      </td>

                      {/* Current Stage */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F8F8F6] text-[#C89211] border border-[#E5E5E5] block truncate max-w-[150px]">
                          {currentStageObj.stepNumber}. {currentStageObj.name}
                        </span>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            order.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : order.status === 'on_hold'
                              ? 'bg-[#FFF7E3] text-[#C89211] border-[#C89211]/30'
                              : order.status === 'cancelled'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {order.deliveryStatusText}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => shareWhatsApp(order)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs transition-colors cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-2xl my-8">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-[#666666] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-[#C89211]" />
              <span>Create New Trackable Order</span>
            </h3>

            {/* Quick Quotation Link Selector */}
            {quotes.length > 0 && (
              <div className="mb-5 p-3 bg-[#FFF7E3] border border-[#C89211]/30 rounded-xl text-xs">
                <span className="font-semibold text-[#C89211] block mb-1">
                  Optional: Fast auto-fill from customer quotation
                </span>
                <select
                  onChange={e => handleLinkQuotation(e.target.value)}
                  className="w-full mt-1 p-2 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A] text-xs"
                >
                  <option value="">-- Choose an existing quotation to copy details --</option>
                  {quotes.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.quoteNumber || q.id} - {q.customerName} ({q.doorName} • ₹{q.total?.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.customerName}
                    onChange={e => setCreateForm({ ...createForm, customerName: e.target.value })}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Phone Number (with WhatsApp)</label>
                  <input
                    type="text"
                    value={createForm.customerPhone}
                    onChange={e => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                    placeholder="e.g. +91 98220 12345"
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Delivery City</label>
                  <input
                    type="text"
                    value={createForm.customerCity}
                    onChange={e => setCreateForm({ ...createForm, customerCity: e.target.value })}
                    placeholder="e.g. Pune / Mumbai / Nashik"
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Full Delivery Address (Private)</label>
                  <input
                    type="text"
                    value={createForm.customerAddress}
                    onChange={e => setCreateForm({ ...createForm, customerAddress: e.target.value })}
                    placeholder="Bungalow / Plot / Street details"
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Door Product Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.productName}
                    onChange={e => setCreateForm({ ...createForm, productName: e.target.value })}
                    placeholder="e.g. Royal Sagwan Carved Main Door"
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Wood Timber Species</label>
                  <input
                    type="text"
                    value={createForm.woodType}
                    onChange={e => setCreateForm({ ...createForm, woodType: e.target.value })}
                    placeholder="e.g. Sagwan (CP Teak)"
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Width (Inch)</label>
                  <input
                    type="number"
                    value={createForm.widthInch}
                    onChange={e => setCreateForm({ ...createForm, widthInch: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Height (Inch)</label>
                  <input
                    type="number"
                    value={createForm.heightInch}
                    onChange={e => setCreateForm({ ...createForm, heightInch: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.quantity}
                    onChange={e => setCreateForm({ ...createForm, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Expected Completion Date</label>
                  <input
                    type="date"
                    value={createForm.estimatedCompletionDate}
                    onChange={e => setCreateForm({ ...createForm, estimatedCompletionDate: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Expected Dispatch Date</label>
                  <input
                    type="date"
                    value={createForm.expectedDispatchDate}
                    onChange={e => setCreateForm({ ...createForm, expectedDispatchDate: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#1A1A1A] font-semibold block mb-1">Admin Internal Notes (Private)</label>
                <textarea
                  rows={2}
                  value={createForm.adminInternalNotes}
                  onChange={e => setCreateForm({ ...createForm, adminInternalNotes: e.target.value })}
                  placeholder="Advance payment details, workshop artisan assignment, internal remarks..."
                  className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold shadow-md cursor-pointer"
                >
                  Generate Tracking ID & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative max-w-4xl w-full bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-7 shadow-2xl my-6 max-h-[92vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-[#666666] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono text-[#666666]">Order Tracking</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedOrder.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : selectedOrder.status === 'cancelled'
                        ? 'bg-red-500/20 text-red-400'
                        : selectedOrder.status === 'on_hold'
                        ? 'bg-[#FFF7E3] text-[#C89211]'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="font-mono text-xl sm:text-2xl font-bold text-[#C89211]">
                    {selectedOrder.trackingId}
                  </h3>
                  <button
                    onClick={() => copyTrackingId(selectedOrder.trackingId)}
                    className="p-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A]"
                  >
                    {copiedId === selectedOrder.trackingId ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => copyWhatsAppMessage(selectedOrder)}
                  className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] hover:text-white font-semibold flex items-center gap-1.5"
                >
                  {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMsg ? 'Message Copied!' : 'Copy WhatsApp Update'}</span>
                </button>

                <button
                  onClick={() => shareWhatsApp(selectedOrder)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send on WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#F8F8F6] p-4 rounded-xl border border-[#E5E5E5]">
              <div>
                <span className="text-[#666666] block mb-0.5">Customer</span>
                <span className="font-bold text-[#1A1A1A]">{selectedOrder.customerName}</span>
                <span className="text-[11px] text-[#666666] block">{selectedOrder.customerPhone}</span>
              </div>
              <div>
                <span className="text-[#666666] block mb-0.5">Product</span>
                <span className="font-bold text-[#1A1A1A]">{selectedOrder.productName}</span>
                <span className="text-[11px] text-[#C89211] block">
                  {selectedOrder.woodType} ({selectedOrder.dimensions?.widthInch}×
                  {selectedOrder.dimensions?.heightInch}")
                </span>
              </div>
              <div>
                <span className="text-[#666666] block mb-0.5">Manufacturing</span>
                <span className="font-bold text-[#C89211] text-sm font-mono">
                  {selectedOrder.manufacturingPercent}% Milestone
                </span>
                <span className="text-[11px] text-[#666666] block">
                  {selectedOrder.manufacturingPercent === 100 ? 'Door 100% Ready' : 'In Craftsmanship'}
                </span>
              </div>
              <div>
                <span className="text-[#666666] block mb-0.5">Logistics Status</span>
                <span className="font-bold text-blue-400 block text-xs">{selectedOrder.deliveryStatusText}</span>
                <span className="text-[11px] text-[#666666] block">
                  {selectedOrder.delivery?.transportCompany || 'Pending Dispatch'}
                </span>
              </div>
            </div>

            {/* 15 STAGES INTERACTIVE MANAGER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#C89211]" />
                  <span>Interactive 15-Stage Timeline Management</span>
                </h4>
                <span className="text-[11px] text-[#666666]">Click any stage to update status, notes or media</span>
              </div>

              <div className="space-y-2">
                {selectedOrder.stages.map((st, idx) => {
                  const isCurrent = selectedOrder.currentStageId === st.id;
                  const isEditing = activeStageEdit === st.id;
                  const stageMedia = (selectedOrder.media || []).filter(m => m.stageId === st.id);

                  return (
                    <div
                      key={st.id}
                      className={`rounded-xl border transition-all ${
                        isEditing
                          ? 'bg-[#F8F8F6] border-amber-500 ring-2 ring-amber-500/20 p-4'
                          : isCurrent
                          ? 'bg-amber-500/5 border-[#C89211]/30 p-3 hover:bg-[#F7F7F7]'
                          : 'bg-[#F8F8F6] border-[#E5E5E5] p-3 hover:bg-[#F7F7F7]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          onClick={() => (isEditing ? setActiveStageEdit(null) : openStageEditor(st))}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                              st.status === 'completed'
                                ? 'bg-[#C89211] text-white'
                                : st.status === 'in_progress'
                                ? 'bg-amber-500/30 text-[#C89211] border border-amber-500'
                                : st.status === 'not_applicable'
                                ? 'bg-[#F8F8F6] text-[#666666]'
                                : 'bg-white text-[#666666] border border-[#E5E5E5]'
                            }`}
                          >
                            {st.status === 'completed' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                          </span>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isCurrent ? 'text-[#C89211]' : 'text-[#1A1A1A]'
                                }`}
                              >
                                {st.name}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 uppercase">
                                  Current
                                </span>
                              )}
                              {st.isMilestone && (
                                <span className="text-[10px] font-mono text-[#C89211]/80 font-bold">
                                  ({st.milestonePercent}%)
                                </span>
                              )}
                            </div>
                            {st.customerNote && (
                              <p className="text-[11px] text-[#666666] line-clamp-1 italic">
                                Note: {st.customerNote}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              st.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : st.status === 'in_progress'
                                ? 'bg-[#FFF7E3] text-[#C89211]'
                                : st.status === 'not_applicable'
                                ? 'bg-[#F8F8F6] text-[#666666]'
                                : 'bg-[#F8F8F6] text-[#666666]'
                            }`}
                          >
                            {st.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => (isEditing ? setActiveStageEdit(null) : openStageEditor(st))}
                            className="p-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs"
                          >
                            {isEditing ? 'Close' : 'Edit'}
                          </button>
                        </div>
                      </div>

                      {/* EDIT PANEL FOR ACTIVE STAGE */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-[#E5E5E5] space-y-4 text-xs animate-in fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[#1A1A1A] font-semibold block mb-1">Stage Status *</label>
                              <select
                                value={stageStatusInput}
                                onChange={e => setStageStatusInput(e.target.value as StageStatus)}
                                className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                                <option value="not_applicable">Not Applicable (Skip)</option>
                              </select>
                            </div>

                            {stageStatusInput === 'not_applicable' && (
                              <div>
                                <label className="text-[#1A1A1A] font-semibold block mb-1">
                                  Not Applicable Reason
                                </label>
                                <input
                                  type="text"
                                  value={stageNaReason}
                                  onChange={e => setStageNaReason(e.target.value)}
                                  placeholder="e.g. No carving requested on plain flush teak door"
                                  className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-[#1A1A1A] font-semibold block mb-1">
                              Customer Visible Progress Note (Shown on Public Tracker)
                            </label>
                            <input
                              type="text"
                              value={stageCustomerNote}
                              onChange={e => setStageCustomerNote(e.target.value)}
                              placeholder="e.g. Timber moisture tested at 11%, joints planed to precision."
                              className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                            />
                          </div>

                          <div>
                            <label className="text-[#1A1A1A] font-semibold block mb-1 flex items-center gap-1.5 text-[#666666]">
                              <Lock className="w-3.5 h-3.5 text-[#C89211]" />
                              <span>Private Internal Admin Note (Never shown to customer)</span>
                            </label>
                            <input
                              type="text"
                              value={stageAdminNote}
                              onChange={e => setStageAdminNote(e.target.value)}
                              placeholder="Artisan remarks, cost notes, quality checklist..."
                              className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                            />
                          </div>

                          {/* Action Buttons for Stage */}
                          <div className="flex items-center justify-between gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => handleSaveStage(false)}
                              className="px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold"
                            >
                              Save Stage Changes
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setStageStatusInput('completed');
                                handleSaveStage(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                            >
                              <span>Complete & Advance to Next Stage</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Upload Photo/Video for this Stage */}
                          <div className="mt-4 pt-4 border-t border-[#E5E5E5] bg-white p-3.5 rounded-xl">
                            <span className="font-semibold text-[#1A1A1A] block mb-2 flex items-center gap-1.5">
                              <Upload className="w-4 h-4 text-[#C89211]" />
                              <span>Upload Progress Proof Photo / Video for {st.name}</span>
                            </span>

                            <form onSubmit={handleUploadMedia} className="space-y-2.5">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  onChange={e => setMediaFile(e.target.files?.[0] || null)}
                                  className="text-[#1A1A1A] text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F8F8F6] file:text-[#C89211]"
                                />

                                <input
                                  type="text"
                                  value={mediaCaption}
                                  onChange={e => setMediaCaption(e.target.value)}
                                  placeholder="Caption (e.g. Teak plank inspection)"
                                  className="flex-1 p-1.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer text-[#1A1A1A]">
                                  <input
                                    type="checkbox"
                                    checked={mediaIsCustomerVisible}
                                    onChange={e => setMediaIsCustomerVisible(e.target.checked)}
                                    className="rounded border-[#E5E5E5] text-[#C89211] focus:ring-0"
                                  />
                                  <span>Customer Visible on Tracking Page</span>
                                </label>

                                <button
                                  type="submit"
                                  disabled={!mediaFile || uploadingMedia}
                                  className="px-4 py-1.5 bg-[#C89211] text-white font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50"
                                >
                                  {uploadingMedia ? 'Uploading...' : 'Upload Media'}
                                </button>
                              </div>
                            </form>

                            {/* Existing stage media */}
                            {stageMedia.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#E5E5E5] grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {stageMedia.map(m => (
                                  <div
                                    key={m.id}
                                    className="relative aspect-video rounded-lg overflow-hidden border border-[#E5E5E5] group bg-black"
                                  >
                                    {m.type === 'video' ? (
                                      <video src={m.url} className="w-full h-full object-cover" />
                                    ) : (
                                      <img src={m.url} alt="Proof" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMedia(m.id)}
                                      className="absolute top-1 right-1 p-1 rounded bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DELIVERY & DISPATCH INFORMATION SECTION */}
            <div className="bg-[#F8F8F6] p-5 rounded-xl border border-[#E5E5E5] space-y-4 text-xs">
              <h4 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Delivery Partner & Dispatch Management</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Delivery Partner Name</label>
                  <input
                    type="text"
                    value={deliveryEdit.deliveryPartnerName}
                    onChange={e => setDeliveryEdit({ ...deliveryEdit, deliveryPartnerName: e.target.value })}
                    placeholder="e.g. Ramesh Transport / BlueDart"
                    className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Transport Company</label>
                  <input
                    type="text"
                    value={deliveryEdit.transportCompany}
                    onChange={e => setDeliveryEdit({ ...deliveryEdit, transportCompany: e.target.value })}
                    placeholder="e.g. VRL Logistics / Local Tempo"
                    className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">LR / Bilty / Receipt No.</label>
                  <input
                    type="text"
                    value={deliveryEdit.lrNumber}
                    onChange={e => setDeliveryEdit({ ...deliveryEdit, lrNumber: e.target.value })}
                    placeholder="e.g. PUNE-LR-99812"
                    className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">External Tracking Link</label>
                  <input
                    type="url"
                    value={deliveryEdit.trackingUrl}
                    onChange={e => setDeliveryEdit({ ...deliveryEdit, trackingUrl: e.target.value })}
                    placeholder="https://transport.com/track/..."
                    className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Dispatched Date</label>
                  <input
                    type="date"
                    value={deliveryEdit.dispatchedAt}
                    onChange={e => setDeliveryEdit({ ...deliveryEdit, dispatchedAt: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="text-[#1A1A1A] font-semibold block mb-1">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryEdit.estimatedDeliveryAt}
                    onChange={e => setDeliveryEdit({ ...deliveryEdit, estimatedDeliveryAt: e.target.value })}
                    className="w-full p-2 bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveDeliveryInfo}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Delivery & Dispatch Info
                </button>
              </div>
            </div>

            {/* AUDIT LOG & IMPORTANT ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeliverDialog(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Delivered</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCancelDialog(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#F8F8F6] hover:bg-red-950 text-red-400 border border-red-500/20 text-xs font-semibold"
                >
                  Cancel Order
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-red-900/40 text-[#666666] hover:text-red-400 border border-[#E5E5E5] transition-colors"
                  title="Delete Order Permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>

            {/* AUDIT HISTORY LIST */}
            {selectedOrder.auditHistory && selectedOrder.auditHistory.length > 0 && (
              <div className="pt-4 border-t border-[#E5E5E5]">
                <span className="font-semibold text-[#666666] text-xs uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#C89211]" />
                  <span>Audit History (Admin Activity Record)</span>
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {selectedOrder.auditHistory
                    .slice()
                    .reverse()
                    .map(aud => (
                      <div
                        key={aud.id}
                        className="text-[11px] p-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] flex items-start justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold text-[#C89211]">{aud.action}</span>: {aud.details}
                        </div>
                        <span className="text-[10px] text-[#666666] shrink-0 font-mono">
                          {new Date(aud.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                          {new Date(aud.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION DIALOG */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-red-500/30 rounded-2xl p-6 shadow-2xl">
            <h4 className="font-serif text-lg font-bold text-red-400 flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Confirm Order Cancellation</span>
            </h4>
            <p className="text-xs text-[#666666] mb-4 leading-relaxed">
              Are you sure you want to cancel order <strong>{selectedOrder?.trackingId}</strong>? Please provide a
              cancellation reason for audit records.
            </p>
            <textarea
              rows={3}
              value={cancelReasonInput}
              onChange={e => setCancelReasonInput(e.target.value)}
              placeholder="e.g. Customer requested cancellation due to site delay..."
              className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-xs text-[#1A1A1A] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 rounded-xl bg-[#F8F8F6] text-[#1A1A1A] text-xs font-semibold"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVER CONFIRMATION DIALOG */}
      {showDeliverDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
            <h4 className="font-serif text-lg font-bold text-emerald-400 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Confirm Delivery Completion</span>
            </h4>
            <p className="text-xs text-[#666666] mb-4 leading-relaxed">
              Mark order <strong>{selectedOrder?.trackingId}</strong> as successfully delivered to{' '}
              {selectedOrder?.customerName}?
            </p>
            <input
              type="text"
              value={deliverNotesInput}
              onChange={e => setDeliverNotesInput(e.target.value)}
              placeholder="Optional delivery handover note (e.g. Received by client on site)"
              className="w-full p-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-xs text-[#1A1A1A] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeliverDialog(false)}
                className="px-4 py-2 rounded-xl bg-[#F8F8F6] text-[#1A1A1A] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeliver}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Confirm Delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
