import React, { useState, useMemo } from 'react';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Upload,
  Search,
  ShieldCheck,
  Package,
  Calendar,
  AlertCircle,
  Save,
  X,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { IndiaDeliveryState, DeliveryStory } from '../../types.ts';
import {
  adminToggleStateDelivery,
  adminUpdateStateDelivery,
  adminCreateDeliveryStory,
  adminUpdateDeliveryStory,
  adminDeleteDeliveryStory,
  uploadImage,
} from '../../lib/api.ts';

interface AdminDeliveryTabProps {
  states: IndiaDeliveryState[];
  stories: DeliveryStory[];
  onRefresh: () => void;
  showToast: (msg: string) => void;
}

export const AdminDeliveryTab: React.FC<AdminDeliveryTabProps> = ({
  states,
  stories,
  onRefresh,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'stories' | 'states'>('stories');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VERIFIED' | 'DEMO' | 'PUBLISHED' | 'DRAFT'>('ALL');

  // Modal state for adding/editing a delivery story
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<DeliveryStory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'door' | 'delivery' | null>(null);

  // Form fields
  const [formData, setFormData] = useState<{
    stateName: string;
    cityName: string;
    customerName: string;
    orderDescription: string;
    deliveryDate: string;
    deliveryStatus: 'Delivered' | 'In Transit' | 'Dispatched';
    customerReview: string;
    isVerifiedCustomer: boolean;
    published: boolean;
    doorPhotoUrl: string;
    deliveryPhotoUrl: string;
  }>({
    stateName: 'Maharashtra',
    cityName: '',
    customerName: '',
    orderDescription: '100% Sagwan Main Door',
    deliveryDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    deliveryStatus: 'Delivered',
    customerReview: '',
    isVerifiedCustomer: true,
    published: true,
    doorPhotoUrl: '',
    deliveryPhotoUrl: '',
  });

  // State details edit modal
  const [editingState, setEditingState] = useState<IndiaDeliveryState | null>(null);
  const [stateForm, setStateForm] = useState({
    estimatedDays: '',
    deliveryTier: '',
    majorCitiesStr: '',
    available: true,
  });

  // Open Story modal for creation or edit
  const openStoryModal = (story?: DeliveryStory) => {
    if (story) {
      setEditingStory(story);
      setFormData({
        stateName: story.stateName || 'Maharashtra',
        cityName: story.cityName || '',
        customerName: story.customerName || '',
        orderDescription: story.orderDescription || '',
        deliveryDate: story.deliveryDate || '',
        deliveryStatus: story.deliveryStatus || 'Delivered',
        customerReview: story.customerReview || '',
        isVerifiedCustomer: !!story.isVerifiedCustomer,
        published: story.published !== false,
        doorPhotoUrl: story.doorPhotoUrl || '',
        deliveryPhotoUrl: story.deliveryPhotoUrl || '',
      });
    } else {
      setEditingStory(null);
      setFormData({
        stateName: states[0]?.name || 'Maharashtra',
        cityName: '',
        customerName: '',
        orderDescription: '100% Sagwan Main Door',
        deliveryDate: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        deliveryStatus: 'Delivered',
        customerReview: '',
        isVerifiedCustomer: true,
        published: true,
        doorPhotoUrl: '',
        deliveryPhotoUrl: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'door' | 'delivery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate supported formats: JPG, JPEG, PNG, WebP
    const validExtensions = /\.(jpe?g|png|webp)$/i;
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isSupported = validMimes.includes(file.type.toLowerCase()) || validExtensions.test(file.name);

    if (!isSupported) {
      showToast('Please select a JPG, JPEG, PNG, or WebP image file.');
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast('Image size exceeds 20MB limit. Please upload a smaller image.');
      e.target.value = '';
      return;
    }

    try {
      setUploadingImage(field);
      const res = await uploadImage(file);

      // Extract permanent URL from upload API response, avoiding [object Object]
      let uploadedUrl = '';
      if (typeof res === 'string') {
        uploadedUrl = res;
      } else if (res && typeof res.url === 'string') {
        uploadedUrl = res.url;
      } else if (res && typeof (res as any).path === 'string') {
        uploadedUrl = (res as any).path;
      } else if (res && (res as any).data && typeof (res as any).data.url === 'string') {
        uploadedUrl = (res as any).data.url;
      }

      if (!uploadedUrl || typeof uploadedUrl !== 'string') {
        throw new Error('Server did not return a valid image URL');
      }

      uploadedUrl = uploadedUrl.trim();

      if (field === 'door') {
        setFormData(prev => ({ ...prev, doorPhotoUrl: uploadedUrl }));
      } else {
        setFormData(prev => ({ ...prev, deliveryPhotoUrl: uploadedUrl }));
      }
      showToast(`${field === 'door' ? 'Door' : 'Delivery proof'} photo uploaded to persistent R2 storage!`);
    } catch (err: any) {
      showToast(`Upload failed: ${err.message || 'Error uploading image'}`);
    } finally {
      setUploadingImage(null);
      e.target.value = '';
    }
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cityName.trim() || !formData.customerName.trim()) {
      showToast('City and customer name are required.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Omit<DeliveryStory, 'id' | 'createdAt'> = {
        stateName: formData.stateName,
        cityName: formData.cityName.trim(),
        customerName: formData.customerName.trim(),
        orderDescription: (formData.orderDescription || '').trim(),
        deliveryDate: (formData.deliveryDate || '').trim(),
        deliveryStatus: formData.deliveryStatus,
        customerReview: (formData.customerReview || '').trim(),
        isVerifiedCustomer: formData.isVerifiedCustomer,
        published: formData.published,
        // Ensure clean string URLs, never [object Object]
        doorPhotoUrl: typeof formData.doorPhotoUrl === 'string' && formData.doorPhotoUrl !== '[object Object]' ? formData.doorPhotoUrl.trim() : '',
        deliveryPhotoUrl: typeof formData.deliveryPhotoUrl === 'string' && formData.deliveryPhotoUrl !== '[object Object]' ? formData.deliveryPhotoUrl.trim() : '',
      };

      if (editingStory) {
        await adminUpdateDeliveryStory(editingStory.id, payload);
        showToast('Delivery story updated successfully!');
      } else {
        await adminCreateDeliveryStory(payload);
        showToast('New delivery story created successfully!');
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed to save delivery story: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete delivery story for "${name}"?`)) {
      return;
    }
    try {
      await adminDeleteDeliveryStory(id);
      showToast('Delivery story deleted successfully.');
      onRefresh();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleStoryPublish = async (story: DeliveryStory) => {
    try {
      const nextPub = story.published === false ? true : false;
      await adminUpdateDeliveryStory(story.id, { published: nextPub });
      showToast(nextPub ? 'Story published' : 'Story set to draft');
      onRefresh();
    } catch (err: any) {
      showToast(`Toggle failed: ${err.message}`);
    }
  };

  const handleToggleState = async (stateId: string) => {
    try {
      await adminToggleStateDelivery(stateId);
      showToast('State delivery status toggled');
      onRefresh();
    } catch (err: any) {
      showToast(`State update failed: ${err.message}`);
    }
  };

  const openStateEdit = (st: IndiaDeliveryState) => {
    setEditingState(st);
    setStateForm({
      estimatedDays: st.estimatedDays || st.deliveryDays || '4-7 Days',
      deliveryTier: st.deliveryTier || st.deliveryNote || 'Express Workshop Dispatch',
      majorCitiesStr: (st.majorCities || st.citiesServed || []).join(', '),
      available: st.available,
    });
  };

  const handleSaveState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingState) return;

    try {
      const cities = stateForm.majorCitiesStr
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      await adminUpdateStateDelivery(editingState.id, {
        deliveryDays: stateForm.estimatedDays,
        estimatedDays: stateForm.estimatedDays,
        deliveryTier: stateForm.deliveryTier,
        deliveryNote: stateForm.deliveryTier,
        citiesServed: cities,
        majorCities: cities,
        available: stateForm.available,
      });

      showToast(`State "${editingState.name}" updated successfully.`);
      setEditingState(null);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed to update state: ${err.message}`);
    }
  };

  // Filter stories
  const filteredStories = useMemo(() => {
    return stories.filter(story => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        story.customerName?.toLowerCase().includes(q) ||
        story.cityName?.toLowerCase().includes(q) ||
        story.stateName?.toLowerCase().includes(q) ||
        story.orderDescription?.toLowerCase().includes(q);

      const matchState = filterState === 'ALL' || story.stateName === filterState;

      let matchStatus = true;
      if (filterStatus === 'VERIFIED') matchStatus = !!story.isVerifiedCustomer;
      else if (filterStatus === 'DEMO') matchStatus = !story.isVerifiedCustomer;
      else if (filterStatus === 'PUBLISHED') matchStatus = story.published !== false;
      else if (filterStatus === 'DRAFT') matchStatus = story.published === false;

      return matchQuery && matchState && matchStatus;
    });
  }, [stories, searchQuery, filterState, filterStatus]);

  // Filter states
  const filteredStates = useMemo(() => {
    return states.filter(st => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.code.toLowerCase().includes(q) ||
        st.majorCities?.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [states, searchQuery]);

  const verifiedCount = stories.filter(s => s.isVerifiedCustomer).length;
  const publishedCount = stories.filter(s => s.published !== false).length;
  const availableStatesCount = states.filter(s => s.available).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-stone-50 to-amber-50/50 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/90 text-[#8B6508] text-xs font-bold uppercase tracking-wider mb-2">
              <Truck className="w-3.5 h-3.5" />
              All India Delivery Operations 🇮🇳
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
              India Delivery Stories &amp; State Logistics
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
              Manage real customer delivery reviews, dispatch photos, and delivery availability across all 36 Indian states &amp; union territories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openStoryModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#b07f0e] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Delivery Story
            </button>
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-amber-200/50 text-stone-700 text-xs sm:text-sm">
          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-amber-100">
            <span className="text-stone-500 block text-[11px]">Active Delivery States</span>
            <span className="font-bold text-base text-stone-900">
              {availableStatesCount} / {states.length}
            </span>
          </div>
          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-amber-100">
            <span className="text-stone-500 block text-[11px]">Total Stories</span>
            <span className="font-bold text-base text-stone-900">{stories.length}</span>
          </div>
          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-emerald-100">
            <span className="text-emerald-700 block text-[11px]">Verified Customers</span>
            <span className="font-bold text-base text-emerald-700">{verifiedCount}</span>
          </div>
          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-amber-100">
            <span className="text-stone-500 block text-[11px]">Published Live</span>
            <span className="font-bold text-base text-stone-900">{publishedCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setSubTab('stories')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors flex items-center gap-2 ${
            subTab === 'stories'
              ? 'bg-[#C89211] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Delivery Stories ({stories.length})
        </button>
        <button
          onClick={() => setSubTab('states')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors flex items-center gap-2 ${
            subTab === 'states'
              ? 'bg-[#C89211] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          States &amp; Coverage ({states.length})
        </button>
      </div>

      {/* SUB-TAB 1: DELIVERY STORIES */}
      {subTab === 'stories' && (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search by city, customer name, order type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C89211]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterState}
                onChange={e => setFilterState(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C89211]"
              >
                <option value="ALL">All States</option>
                {states.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C89211]"
              >
                <option value="ALL">All Status</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="DEMO">Demo/Sample Only</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          {/* Stories Grid */}
          {filteredStories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-8">
              <Truck className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-800 text-base">No delivery stories match your search</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                Create a new customer delivery story to showcase real door manufacturing deliveries across India.
              </p>
              <button
                onClick={() => openStoryModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C89211] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add First Story
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStories.map(story => (
                <div
                  key={story.id}
                  className={`bg-white rounded-2xl border transition-all hover:shadow-md overflow-hidden flex flex-col justify-between ${
                    story.published === false
                      ? 'border-dashed border-stone-300 opacity-75'
                      : 'border-stone-200'
                  }`}
                >
                  {/* Card Media Header */}
                  <div className="relative h-44 bg-stone-100 overflow-hidden">
                    {story.deliveryPhotoUrl || story.doorPhotoUrl ? (
                      <img
                        src={story.deliveryPhotoUrl || story.doorPhotoUrl}
                        alt={story.orderDescription}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-100">
                        <ImageIcon className="w-10 h-10 mb-1" />
                        <span className="text-[11px]">No Photo Uploaded</span>
                      </div>
                    )}

                    {/* Status & Verification Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      {story.isVerifiedCustomer ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified Customer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                          <AlertCircle className="w-3 h-3" />
                          Demo Preview
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs">
                        <MapPin className="w-2.5 h-2.5" />
                        {story.cityName}, {story.stateName}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        story.published === false ? 'bg-stone-800 text-stone-200' : 'bg-white/90 text-stone-800'
                      }`}>
                        {story.published === false ? 'Draft' : 'Live'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-stone-900 text-sm">{story.customerName}</h4>
                        <span className="text-[11px] text-stone-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {story.deliveryDate}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-[#8B6508] mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#C89211]" />
                        {story.orderDescription}
                      </div>

                      {story.customerReview && (
                        <p className="text-xs text-stone-600 italic bg-stone-50 p-2.5 rounded-xl border border-stone-100 line-clamp-3">
                          "{story.customerReview}"
                        </p>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-stone-100 text-xs">
                      <button
                        onClick={() => handleToggleStoryPublish(story)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                          story.published === false
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                        title={story.published === false ? 'Publish this story' : 'Unpublish to draft'}
                      >
                        {story.published === false ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Publish
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Unpublish
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openStoryModal(story)}
                          className="p-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 cursor-pointer"
                          title="Edit Story"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStory(story.id, story.customerName)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete Story"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: STATES & COVERAGE */}
      {subTab === 'states' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search state by name, code or major city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C89211]"
              />
            </div>
            <div className="text-xs font-semibold text-stone-600">
              Showing {filteredStates.length} of {states.length} States &amp; UTs
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">State / UT</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Estimated Transit</th>
                    <th className="py-3 px-4">Service Tier</th>
                    <th className="py-3 px-4">Major Cities</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredStates.map(st => (
                    <tr key={st.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-[#8B6508] font-bold text-xs flex items-center justify-center">
                            {st.code}
                          </span>
                          <div>
                            <span className="block font-bold">{st.name}</span>
                            <span className="text-[10px] text-stone-400 uppercase font-mono">{st.code}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleState(st.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                            st.available
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${st.available ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                          {st.available ? 'Available' : 'Paused'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-stone-700">
                        {st.estimatedDays || '3-5 Days'}
                      </td>

                      <td className="py-3 px-4 text-stone-600">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-stone-100 text-[11px] font-medium">
                          {st.deliveryTier || 'Express Workshop Dispatch'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                        {st.majorCities && st.majorCities.length > 0
                          ? st.majorCities.slice(0, 3).join(', ') + (st.majorCities.length > 3 ? ` +${st.majorCities.length - 3}` : '')
                          : 'Major Cities Across State'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openStateEdit(st)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DELIVERY STORY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-stone-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#8B6508] flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900 font-serif">
                    {editingStory ? 'Edit Delivery Story' : 'Add New Delivery Story'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Showcase real door deliveries with photo proof across India.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStory} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    State / UT *
                  </label>
                  <select
                    value={formData.stateName}
                    onChange={e => setFormData({ ...formData, stateName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                    required
                  >
                    {states.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    City Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pune, Jaipur, Bengaluru"
                    value={formData.cityName}
                    onChange={e => setFormData({ ...formData, cityName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Customer Name (First name + Initial) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul P., Sunita M."
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                    required
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    Privacy safe: First name and last initial only.
                  </span>
                </div>

                {/* Delivery Date */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Delivery Month &amp; Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sep 2026, Oct 2026"
                    value={formData.deliveryDate}
                    onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                  />
                </div>
              </div>

              {/* Order Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Order Details / Door Type *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% Sagwan Main Door, Carved Double Door"
                  value={formData.orderDescription}
                  onChange={e => setFormData({ ...formData, orderDescription: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                  required
                />
              </div>

              {/* Delivery Status */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Delivery Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Delivered', 'In Transit', 'Dispatched'] as const).map(st => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setFormData({ ...formData, deliveryStatus: st })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors border ${
                        formData.deliveryStatus === st
                          ? 'bg-[#C89211] text-white border-[#C89211]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Review / Testimony */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Customer Review / Feedback Note
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Door was delivered in solid wooden crate packing. Wood quality and natural polish are fantastic!"
                  value={formData.customerReview}
                  onChange={e => setFormData({ ...formData, customerReview: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                />
              </div>

              {/* Photo Uploads: Door Photo & Delivery Proof Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* 1. Door / Product Photo */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-stone-800">
                        Door / Product Photo
                      </span>
                      <span className="block text-[11px] text-stone-500">
                        Optional • JPG, PNG, WebP
                      </span>
                    </div>
                    {formData.doorPhotoUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Attached
                      </span>
                    )}
                  </div>

                  {formData.doorPhotoUrl ? (
                    /* Image Preview with Replace & Remove */
                    <div className="space-y-2">
                      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-stone-200 bg-white group shadow-xs">
                        <img
                          src={formData.doorPhotoUrl}
                          alt="Door / Product Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, doorPhotoUrl: '' }))}
                          title="Remove Photo"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold cursor-pointer transition-colors shadow-xs">
                          {uploadingImage === 'door' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C89211]" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Edit2 className="w-3.5 h-3.5 text-[#C89211]" />
                              <span>Change / Replace Photo</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            onChange={e => handleImageUpload(e, 'door')}
                            className="hidden"
                            disabled={uploadingImage !== null}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, doorPhotoUrl: '' }))}
                          className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty State: Direct Upload Button */
                    <div className="w-full h-44 rounded-xl border-2 border-dashed border-stone-300 hover:border-[#C89211] bg-white flex flex-col items-center justify-center p-4 text-center transition-colors">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-[#C89211] flex items-center justify-center mb-2">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-stone-700 mb-0.5">
                        No product photo added
                      </span>
                      <span className="text-[11px] text-stone-400 mb-3">
                        Choose photo from device
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs active:scale-95">
                        {uploadingImage === 'door' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading to R2...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Door Photo</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={e => handleImageUpload(e, 'door')}
                          className="hidden"
                          disabled={uploadingImage !== null}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* 2. Delivery / Unboxing Proof Photo */}
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-stone-800">
                        Delivery / Unboxing Proof Photo
                      </span>
                      <span className="block text-[11px] text-stone-500">
                        Optional • JPG, PNG, WebP
                      </span>
                    </div>
                    {formData.deliveryPhotoUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Attached
                      </span>
                    )}
                  </div>

                  {formData.deliveryPhotoUrl ? (
                    /* Image Preview with Replace & Remove */
                    <div className="space-y-2">
                      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-stone-200 bg-white group shadow-xs">
                        <img
                          src={formData.deliveryPhotoUrl}
                          alt="Delivery / Proof Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, deliveryPhotoUrl: '' }))}
                          title="Remove Photo"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold cursor-pointer transition-colors shadow-xs">
                          {uploadingImage === 'delivery' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C89211]" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Edit2 className="w-3.5 h-3.5 text-[#C89211]" />
                              <span>Change / Replace Photo</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            onChange={e => handleImageUpload(e, 'delivery')}
                            className="hidden"
                            disabled={uploadingImage !== null}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, deliveryPhotoUrl: '' }))}
                          className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty State: Direct Upload Button */
                    <div className="w-full h-44 rounded-xl border-2 border-dashed border-stone-300 hover:border-[#C89211] bg-white flex flex-col items-center justify-center p-4 text-center transition-colors">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-[#C89211] flex items-center justify-center mb-2">
                        <Truck className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-stone-700 mb-0.5">
                        No delivery proof photo added
                      </span>
                      <span className="text-[11px] text-stone-400 mb-3">
                        Choose photo from device
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs active:scale-95">
                        {uploadingImage === 'delivery' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading to R2...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Proof Photo</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={e => handleImageUpload(e, 'delivery')}
                          className="hidden"
                          disabled={uploadingImage !== null}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-stone-200 space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="block text-xs font-bold text-stone-900">
                        Mark as Verified Customer Order
                      </span>
                      <span className="block text-[11px] text-stone-600">
                        When enabled, displays official green verification badge. When disabled, shows "Demo / Sample Preview".
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isVerifiedCustomer}
                    onChange={e => setFormData({ ...formData, isVerifiedCustomer: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-5 h-5 text-[#C89211]" />
                    <div>
                      <span className="block text-xs font-bold text-stone-900">
                        Publish to Public Website
                      </span>
                      <span className="block text-[11px] text-stone-500">
                        Immediately displays this story inside the "All India Delivery" section modal.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={e => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 text-[#C89211] rounded focus:ring-amber-500"
                  />
                </label>
              </div>

              {/* Footer CTA */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#b07f0e] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : editingStory ? 'Update Story' : 'Save Delivery Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STATE DETAILS */}
      {editingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-stone-900 font-serif">
                  Edit State: {editingState.name} ({editingState.code})
                </h3>
                <p className="text-[11px] text-stone-500">Configure logistics, delivery duration &amp; active hubs.</p>
              </div>
              <button
                onClick={() => setEditingState(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveState} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Estimated Transit Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3-5 Business Days"
                  value={stateForm.estimatedDays}
                  onChange={e => setStateForm({ ...stateForm, estimatedDays: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Service / Logistics Tier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Express Workshop Dispatch, Standard Road Freight"
                  value={stateForm.deliveryTier}
                  onChange={e => setStateForm({ ...stateForm, deliveryTier: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Major Served Cities (comma-separated)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Mumbai, Pune, Nagpur, Nashik, Aurangabad"
                  value={stateForm.majorCitiesStr}
                  onChange={e => setStateForm({ ...stateForm, majorCitiesStr: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89211]"
                />
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
                <span className="text-xs font-bold text-stone-800">
                  Delivery Available for this State
                </span>
                <input
                  type="checkbox"
                  checked={stateForm.available}
                  onChange={e => setStateForm({ ...stateForm, available: e.target.checked })}
                  className="w-4 h-4 text-[#C89211] rounded focus:ring-amber-500"
                />
              </label>

              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingState(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#b07f0e] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
