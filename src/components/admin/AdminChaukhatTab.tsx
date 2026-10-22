import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Upload,
  Eye,
  X,
  ArrowUp,
  ArrowDown,
  Layers,
  Ruler,
  TreePine,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  ChaukhatProduct,
  ChaukhatSectionSize,
  ChaukhatDimensionPreset,
  ChaukhatWoodType,
  ChaukhatFrame,
  ChaukhatPricingMethod,
} from '../../types.ts';
import {
  fetchAdminChaukhatAll,
  saveAdminChaukhatProduct,
  deleteAdminChaukhatProduct,
  reorderAdminChaukhatProducts,
  saveAdminChaukhatSectionSize,
  deleteAdminChaukhatSectionSize,
  uploadImage,
} from '../../lib/api.ts';

interface AdminChaukhatTabProps {
  legacyFrames: ChaukhatFrame[];
  onLegacyFrameSave: (frame: Partial<ChaukhatFrame>) => Promise<void>;
  onLegacyFrameDelete: (id: string) => Promise<void>;
  showToast: (msg: string) => void;
  onDataUpdated: () => void;
}

export const AdminChaukhatTab: React.FC<AdminChaukhatTabProps> = ({
  legacyFrames,
  onLegacyFrameSave,
  onLegacyFrameDelete,
  showToast,
  onDataUpdated,
}) => {
  // Navigation Sub-tab
  const [subTab, setSubTab] = useState<'products' | 'sections' | 'legacy'>('products');

  // Chaukhat Data
  const [products, setProducts] = useState<ChaukhatProduct[]>([]);
  const [sectionSizes, setSectionSizes] = useState<ChaukhatSectionSize[]>([]);
  const [presets, setPresets] = useState<ChaukhatDimensionPreset[]>([]);
  const [woodTypes, setWoodTypes] = useState<ChaukhatWoodType[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Product Modal / Form
  const [editingProduct, setEditingProduct] = useState<Partial<ChaukhatProduct> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);

  // Edit Section Modal / Form
  const [editingSection, setEditingSection] = useState<Partial<ChaukhatSectionSize> | null>(null);

  // Edit Legacy Frame Modal
  const [editingLegacyFrame, setEditingLegacyFrame] = useState<Partial<ChaukhatFrame> | null>(null);

  // Preview Image Modal
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);

  // Fetch chaukhat data
  const loadChaukhatData = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminChaukhatAll();
      setProducts(data.products || []);
      setSectionSizes(data.sectionSizes || []);
      setPresets(data.dimensionPresets || []);
      setWoodTypes(data.woodTypes || []);
    } catch (err: any) {
      console.error('Failed to load chaukhat data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChaukhatData();
  }, []);

  // Upload helper for phone / computer file picker
  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onComplete: (url: string) => void,
    key: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImageKey(key);
    try {
      const res = await uploadImage(file);
      onComplete(res.url);
      showToast('Chaukhat image uploaded successfully');
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingImageKey(null);
    }
  };

  // Save Chaukhat Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name) {
      alert('Product name is required');
      return;
    }
    setIsSavingProduct(true);
    try {
      await saveAdminChaukhatProduct(editingProduct);
      showToast('Chaukhat product saved permanently to database');
      setEditingProduct(null);
      await loadChaukhatData();
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Chaukhat Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteAdminChaukhatProduct(id);
      showToast('Product deleted');
      await loadChaukhatData();
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Reorder Products
  const handleMoveProduct = async (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= products.length) return;
    const reordered = [...products];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);
    setProducts(reordered);
    try {
      await reorderAdminChaukhatProducts(reordered.map(p => p.id));
      showToast('Product order updated');
      onDataUpdated();
    } catch (err: any) {
      alert('Failed to reorder products');
      loadChaukhatData();
    }
  };

  // Save Section Size
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection?.name) {
      alert('Section name is required');
      return;
    }
    try {
      await saveAdminChaukhatSectionSize(editingSection);
      showToast('Section size saved');
      setEditingSection(null);
      await loadChaukhatData();
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to save section size');
    }
  };

  // Delete Section Size
  const handleDeleteSection = async (id: string, name: string) => {
    if (!confirm(`Delete section size "${name}"?`)) return;
    try {
      await deleteAdminChaukhatSectionSize(id);
      showToast('Section size removed');
      await loadChaukhatData();
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete section size');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-[#C89211] text-xs font-bold border border-amber-200/80 mb-1.5">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Dedicated Frame Management System</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Chaukhat & Frame Management
          </h2>
          <p className="text-xs text-[#666666] mt-0.5 max-w-2xl">
            Configure independent Chaukhat products, pricing methods (Running Foot, Cubic Foot, Fixed), base timber rates, Plain/Diamond/Hand-carved designs, cross-section sizes, and uploaded product images.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 bg-[#F8F8F6] p-1 rounded-xl border border-[#E5E5E5] text-xs">
          <button
            type="button"
            onClick={() => setSubTab('products')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === 'products'
                ? 'bg-[#C89211] text-white shadow-sm'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            Chaukhat Products ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('sections')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === 'sections'
                ? 'bg-[#C89211] text-white shadow-sm'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            Section Sizes ({sectionSizes.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('legacy')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === 'legacy'
                ? 'bg-[#C89211] text-white shadow-sm'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            Door Calculator Frames ({legacyFrames.length})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: CHAUKHAT PRODUCTS */}
      {/* ============================================================== */}
      {subTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#666666]">
              Products displayed to customers in the Chaukhat Price Calculator (Option B)
            </span>
            <button
              type="button"
              onClick={() =>
                setEditingProduct({
                  name: 'New Timber Chaukhat Frame',
                  description: 'Kiln-seasoned solid wood chaukhat frame with precision rebates.',
                  pricingMethod: 'running_foot',
                  baseMaterialRate: 450,
                  plainCarvingCharge: 0,
                  diamondCarvingCharge: 120,
                  handCarvedCharge: 280,
                  plainImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
                  diamondImage: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80',
                  handCarvedImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
                  active: true,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Chaukhat Product</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            {products.map((prod, idx) => (
              <div
                key={prod.id}
                className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm hover:border-[#C89211]/40 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-[#E5E5E5] shrink-0">
                      <img
                        src={prod.plainImage || 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80'}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[#1A1A1A]">{prod.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            prod.active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-500 border-stone-200'
                          }`}
                        >
                          {prod.active ? 'Active' : 'Disabled'}
                        </span>
                        <span className="bg-amber-50 text-[#C89211] px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border border-amber-200">
                          {prod.pricingMethod.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#666666] mt-1 max-w-2xl">{prod.description}</p>
                    </div>
                  </div>

                  {/* Actions & Reordering */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveProduct(idx, 'up')}
                      className="p-1.5 rounded-lg border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === products.length - 1}
                      onClick={() => handleMoveProduct(idx, 'down')}
                      className="p-1.5 rounded-lg border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(prod)}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#C89211]" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rates & Image Slots Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E5E5E5] text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60">
                    <span className="text-[#888888] block text-[10px] uppercase font-bold">Base Material Rate</span>
                    <span className="font-mono font-bold text-sm text-[#1A1A1A]">
                      ₹{prod.baseMaterialRate} {prod.pricingMethod === 'running_foot' ? '/ Rft' : prod.pricingMethod === 'cubic_foot' ? '/ Cu.ft' : 'Fixed'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[#888888] block text-[10px] uppercase font-bold">Plain Chaukhat</span>
                      <span className="font-mono font-bold text-xs text-[#1A1A1A]">
                        +₹{prod.plainCarvingCharge || 0}
                      </span>
                    </div>
                    {prod.plainImage && (
                      <button
                        type="button"
                        onClick={() => setPreviewZoomUrl(prod.plainImage || null)}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-[#E5E5E5] shrink-0"
                      >
                        <img src={prod.plainImage} alt="Plain" className="w-full h-full object-cover" />
                      </button>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[#888888] block text-[10px] uppercase font-bold">Diamond Designer</span>
                      <span className="font-mono font-bold text-xs text-[#C89211]">
                        +₹{prod.diamondCarvingCharge || 120} / Rft
                      </span>
                    </div>
                    {prod.diamondImage && (
                      <button
                        type="button"
                        onClick={() => setPreviewZoomUrl(prod.diamondImage || null)}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-[#E5E5E5] shrink-0"
                      >
                        <img src={prod.diamondImage} alt="Diamond" className="w-full h-full object-cover" />
                      </button>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[#888888] block text-[10px] uppercase font-bold">Hand-Carved</span>
                      <span className="font-mono font-bold text-xs text-[#C89211]">
                        +₹{prod.handCarvedCharge || 280} / Rft
                      </span>
                    </div>
                    {prod.handCarvedImage && (
                      <button
                        type="button"
                        onClick={() => setPreviewZoomUrl(prod.handCarvedImage || null)}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-[#E5E5E5] shrink-0"
                      >
                        <img src={prod.handCarvedImage} alt="Hand-Carved" className="w-full h-full object-cover" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: SECTION SIZES MANAGEMENT (Step 2 configuration) */}
      {/* ============================================================== */}
      {subTab === 'sections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-[#1A1A1A]">Cross-Sectional Timber Dimensions</span>
              <p className="text-xs text-[#666666]">
                Configure standard cross-sectional timber sizes available for customer selection in Step 2.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingSection({
                  name: '5 inches × 4 inches',
                  widthInch: 5,
                  depthInch: 4,
                  description: 'Heavy Grade profile for entrance frames',
                  isPopular: false,
                  active: true,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section Size</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sectionSizes.map(sec => (
              <div
                key={sec.id}
                className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1A1A1A]">{sec.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sec.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {sec.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#C89211] font-bold mt-1">
                    {sec.widthInch}" Width × {sec.depthInch}" Depth ({sec.widthInch * sec.depthInch} sq.in)
                  </div>
                  <p className="text-xs text-[#666666] mt-1">{sec.description || 'Standard timber section'}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                  <button
                    type="button"
                    onClick={() => setEditingSection(sec)}
                    className="px-2.5 py-1 rounded bg-stone-100 text-[#1A1A1A] text-xs font-semibold hover:bg-stone-200 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(sec.id, sec.name)}
                    className="p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: LEGACY DOOR CALCULATOR FRAMES (Step 5 options) */}
      {/* ============================================================== */}
      {subTab === 'legacy' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-[#1A1A1A]">Fixed Shutter Frames (Door Calculator Option A)</span>
              <p className="text-xs text-[#666666]">
                These fixed frame prices are used when customers configure an optional frame in Option A: Door Price Calculator.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingLegacyFrame({
                  name: 'Designer Frame',
                  price: 11025,
                  description: '5×3 inch section with stepped moldings',
                  active: true,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fixed Frame</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {legacyFrames.map(frm => (
              <div
                key={frm.id}
                className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start gap-3">
                  {frm.image ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#E5E5E5] shrink-0">
                      <img src={frm.image} alt={frm.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5 text-stone-400" />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-sm text-[#1A1A1A] block">{frm.name}</span>
                    <span className="font-mono font-bold text-xs text-[#C89211]">
                      ₹{frm.price.toLocaleString('en-IN')}
                    </span>
                    <p className="text-[11px] text-[#666666] line-clamp-2 mt-0.5">{frm.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                  <button
                    type="button"
                    onClick={() => setEditingLegacyFrame(frm)}
                    className="px-2.5 py-1 rounded bg-stone-100 text-[#1A1A1A] text-xs font-semibold hover:bg-stone-200 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onLegacyFrameDelete(frm.id)}
                    className="p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT CHAUKHAT PRODUCT MODAL */}
      {/* ============================================================== */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-3xl p-6 shadow-2xl space-y-5 my-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1A1A1A]">
                  {editingProduct.id ? 'Edit Chaukhat Product' : 'Add New Chaukhat Product'}
                </h3>
                <p className="text-xs text-[#666666]">Configure pricing method, rates, and actual workshop images</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-[#666666] hover:text-[#1A1A1A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#1A1A1A] font-semibold mb-1">
                    Product Name <span className="text-[#C89211]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="e.g. Master CP Sagwan Chaukhat Frame"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] focus:border-[#C89211]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#1A1A1A] font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editingProduct.description || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    placeholder="e.g. Custom handcrafted seasoned solid timber door frame with moisture-lock treatment"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] focus:border-[#C89211]"
                  />
                </div>

                {/* Pricing Method */}
                <div>
                  <label className="block text-[#1A1A1A] font-semibold mb-1">
                    Pricing Method <span className="text-[#C89211]">*</span>
                  </label>
                  <select
                    value={editingProduct.pricingMethod || 'running_foot'}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        pricingMethod: e.target.value as ChaukhatPricingMethod,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-medium"
                  >
                    <option value="running_foot">Per Running Foot (2H + W length based)</option>
                    <option value="cubic_foot">Per Cubic Foot (Timber volume based)</option>
                    <option value="fixed">Fixed Price per Frame</option>
                  </select>
                </div>

                {/* Base Rate */}
                <div>
                  <label className="block text-[#1A1A1A] font-semibold mb-1">
                    Base Material Rate (₹) <span className="text-[#C89211]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.baseMaterialRate || 450}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        baseMaterialRate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono font-bold"
                  />
                </div>

                {/* Design Carving Charges */}
                <div>
                  <label className="block text-[#1A1A1A] font-semibold mb-1">
                    Plain Chaukhat Charge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.plainCarvingCharge || 0}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        plainCarvingCharge: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#1A1A1A] font-semibold mb-1">
                    Diamond Designer Charge (₹/Rft)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.diamondCarvingCharge || 120}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        diamondCarvingCharge: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#1A1A1A] font-semibold mb-1">
                    Hand-Carved Designer Charge (₹/Rft)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.handCarvedCharge || 280}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        handCarvedCharge: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                  />
                </div>
              </div>

              {/* THREE DEDICATED IMAGE UPLOAD SLOTS */}
              <div className="space-y-3 pt-2 border-t border-[#E5E5E5]">
                <span className="font-bold text-sm text-[#1A1A1A] block">
                  Product Images per Design (Direct Phone / Computer Upload)
                </span>

                {/* Slot 1: Plain Chaukhat Photo */}
                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-[#1A1A1A]">1. Plain / Simple Chaukhat Photo</span>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImageKey === 'plain' ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImageKey !== null}
                          onChange={e =>
                            handleUploadImage(
                              e,
                              url => setEditingProduct({ ...editingProduct, plainImage: url }),
                              'plain'
                            )
                          }
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="or paste URL"
                        value={editingProduct.plainImage || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, plainImage: e.target.value })}
                        className="px-2.5 py-1 rounded bg-white border border-[#E5E5E5] text-xs font-mono w-48 text-[#1A1A1A]"
                      />
                    </div>
                  </div>

                  {editingProduct.plainImage && (
                    <div className="relative group w-14 h-14 rounded-lg overflow-hidden border border-[#C89211] shrink-0">
                      <img src={editingProduct.plainImage} alt="Plain preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPreviewZoomUrl(editingProduct.plainImage || null)}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Slot 2: Diamond Designer Photo */}
                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-[#1A1A1A]">2. Diamond Designer Chaukhat Photo</span>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImageKey === 'diamond' ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImageKey !== null}
                          onChange={e =>
                            handleUploadImage(
                              e,
                              url => setEditingProduct({ ...editingProduct, diamondImage: url }),
                              'diamond'
                            )
                          }
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="or paste URL"
                        value={editingProduct.diamondImage || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, diamondImage: e.target.value })}
                        className="px-2.5 py-1 rounded bg-white border border-[#E5E5E5] text-xs font-mono w-48 text-[#1A1A1A]"
                      />
                    </div>
                  </div>

                  {editingProduct.diamondImage && (
                    <div className="relative group w-14 h-14 rounded-lg overflow-hidden border border-[#C89211] shrink-0">
                      <img src={editingProduct.diamondImage} alt="Diamond preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPreviewZoomUrl(editingProduct.diamondImage || null)}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Slot 3: Hand-Carved Designer Photo */}
                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-[#1A1A1A]">3. Hand-Carved Designer Chaukhat Photo</span>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImageKey === 'handCarved' ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImageKey !== null}
                          onChange={e =>
                            handleUploadImage(
                              e,
                              url => setEditingProduct({ ...editingProduct, handCarvedImage: url }),
                              'handCarved'
                            )
                          }
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="or paste URL"
                        value={editingProduct.handCarvedImage || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, handCarvedImage: e.target.value })}
                        className="px-2.5 py-1 rounded bg-white border border-[#E5E5E5] text-xs font-mono w-48 text-[#1A1A1A]"
                      />
                    </div>
                  </div>

                  {editingProduct.handCarvedImage && (
                    <div className="relative group w-14 h-14 rounded-lg overflow-hidden border border-[#C89211] shrink-0">
                      <img src={editingProduct.handCarvedImage} alt="Hand carved preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPreviewZoomUrl(editingProduct.handCarvedImage || null)}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.active !== false}
                    onChange={e => setEditingProduct({ ...editingProduct, active: e.target.checked })}
                    className="rounded accent-[#C89211]"
                  />
                  <span className="font-semibold text-stone-900">
                    Active (Display in Chaukhat Price Calculator)
                  </span>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProduct ? 'Saving to Database...' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT SECTION SIZE MODAL */}
      {/* ============================================================== */}
      {editingSection && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingSection(null)}
        >
          <div
            className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                {editingSection.id ? 'Edit Cross-Section Size' : 'Add Cross-Section Size'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="text-[#666666] hover:text-[#1A1A1A] font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Display Label</label>
                <input
                  type="text"
                  required
                  value={editingSection.name || ''}
                  onChange={e => setEditingSection({ ...editingSection, name: e.target.value })}
                  placeholder='e.g. 5 inches × 4 inches'
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1A1A1A] font-semibold mb-1">Width (inches)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={editingSection.widthInch || 5}
                    onChange={e => setEditingSection({ ...editingSection, widthInch: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#1A1A1A] font-semibold mb-1">Depth (inches)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={editingSection.depthInch || 4}
                    onChange={e => setEditingSection({ ...editingSection, depthInch: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Description / Grade</label>
                <input
                  type="text"
                  value={editingSection.description || ''}
                  onChange={e => setEditingSection({ ...editingSection, description: e.target.value })}
                  placeholder="e.g. Heavy Grade for Main Entrance with double rebate"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5]"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSection.isPopular}
                    onChange={e => setEditingSection({ ...editingSection, isPopular: e.target.checked })}
                    className="rounded accent-[#C89211]"
                  />
                  <span>Show "Recommended Choice" Badge</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer block">
                  <input
                    type="checkbox"
                    checked={editingSection.active !== false}
                    onChange={e => setEditingSection({ ...editingSection, active: e.target.checked })}
                    className="rounded accent-[#C89211]"
                  />
                  <span>Active for customer selection</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C89211] text-white font-bold"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT LEGACY FRAME MODAL */}
      {/* ============================================================== */}
      {editingLegacyFrame && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingLegacyFrame(null)}
        >
          <div
            className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                {editingLegacyFrame.id ? 'Edit Fixed Frame' : 'Add Fixed Frame'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLegacyFrame(null)}
                className="text-[#666666] hover:text-[#1A1A1A] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Frame Name</label>
                <input
                  type="text"
                  value={editingLegacyFrame.name || ''}
                  onChange={e => setEditingLegacyFrame({ ...editingLegacyFrame, name: e.target.value })}
                  placeholder="e.g. Normal Frame"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5]"
                />
              </div>

              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Fixed Price (₹)</label>
                <input
                  type="number"
                  value={editingLegacyFrame.price || 0}
                  onChange={e => setEditingLegacyFrame({ ...editingLegacyFrame, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={editingLegacyFrame.description || ''}
                  onChange={e => setEditingLegacyFrame({ ...editingLegacyFrame, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5]"
                />
              </div>

              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingLegacyFrame.image || ''}
                  onChange={e => setEditingLegacyFrame({ ...editingLegacyFrame, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setEditingLegacyFrame(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingLegacyFrame.name) return;
                    await onLegacyFrameSave(editingLegacyFrame);
                    setEditingLegacyFrame(null);
                    showToast('Fixed frame saved');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#C89211] text-white font-bold"
                >
                  Save Fixed Frame
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ZOOM PREVIEW MODAL */}
      {/* ============================================================== */}
      {previewZoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewZoomUrl(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 border-b border-stone-200 flex items-center justify-between">
              <span className="font-bold text-sm text-stone-900">Uploaded Product Photo Preview</span>
              <button
                type="button"
                onClick={() => setPreviewZoomUrl(null)}
                className="text-stone-400 hover:text-stone-900 font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-stone-950 flex items-center justify-center">
              <img
                src={previewZoomUrl}
                alt="Product zoom"
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
