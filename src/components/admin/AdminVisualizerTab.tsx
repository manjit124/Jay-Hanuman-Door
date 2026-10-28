import React, { useState, useRef } from 'react';
import {
  Box,
  Upload,
  Sparkles,
  Camera,
  Check,
  X,
  Trash2,
  Edit2,
  ExternalLink,
  Eye,
  Sliders,
  AlertCircle,
  FileCheck,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Door, DoorModel3DConfig, WoodColorTone, DoorDesignStyle } from '../../types.ts';
import { upload3DModel, updateDoor3DConfig, uploadImage, updateDoor, resolveImageUrl } from '../../lib/api.ts';
import { removeBackgroundFromImage } from '../../lib/transparentDoorUtils.ts';
import { Door3DScene } from '../visualizer/Door3DScene.tsx';

interface AdminVisualizerTabProps {
  doors: Door[];
  onDoorUpdated: () => void;
  showToast: (msg: string) => void;
}

export const AdminVisualizerTab: React.FC<AdminVisualizerTabProps> = ({
  doors,
  onDoorUpdated,
  showToast,
}) => {
  const [selectedDoor, setSelectedDoor] = useState<Door | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArOnly, setFilterArOnly] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DoorModel3DConfig & { transparentPngUrl?: string }>({});
  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const [isUploadingTexture, setIsUploadingTexture] = useState(false);
  const [isUploadingPng, setIsUploadingPng] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const modelFileInputRef = useRef<HTMLInputElement | null>(null);
  const textureFileInputRef = useRef<HTMLInputElement | null>(null);
  const pngFileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter doors
  const filteredDoors = doors.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAr = !filterArOnly || d.model3d?.arEnabled !== false;
    return matchesSearch && matchesAr;
  });

  const handleOpenEdit = (door: Door) => {
    setSelectedDoor(door);
    setEditingConfig({
      modelUrl: door.model3d?.modelUrl || '',
      textureUrl: door.model3d?.textureUrl || door.images?.[0] || '',
      transparentPngUrl: door.transparentPngUrl || door.model3d?.transparentPngUrl || '',
      defaultWoodType: door.model3d?.defaultWoodType || 'Sagwan',
      defaultFinish: door.model3d?.defaultFinish || 'Teak Polish',
      defaultColor: door.model3d?.defaultColor || 'golden_teak',
      defaultStyle: door.model3d?.defaultStyle || 'carving',
      defaultWidthInch: door.model3d?.defaultWidthInch || 36,
      defaultHeightInch: door.model3d?.defaultHeightInch || 78,
      defaultThicknessInch: door.model3d?.defaultThicknessInch || 1.5,
      frameWidthInch: door.model3d?.frameWidthInch || 4,
      frameDepthInch: door.model3d?.frameDepthInch || 2.75,
      arEnabled: door.model3d?.arEnabled !== false,
      allowDoubleDoor: door.model3d?.allowDoubleDoor || false,
      isPublished: door.model3d?.isPublished !== false,
      notes: door.model3d?.notes || '',
    });
    setUploadError(null);
    setIsEditModalOpen(true);
  };

  // Upload 3D Model file (.glb or .gltf)
  const handleUploadModelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      setUploadError('Only .glb and .gltf 3D model files are supported.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds 50MB limit.');
      return;
    }

    setIsUploadingModel(true);
    setUploadError(null);

    try {
      const res = await upload3DModel(file);
      setEditingConfig(prev => ({
        ...prev,
        modelUrl: res.url,
      }));
      showToast('3D Model uploaded and mirrored to persistent storage successfully!');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload 3D model.');
    } finally {
      setIsUploadingModel(false);
    }
  };

  // Upload High-Res Texture
  const handleUploadTextureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTexture(true);
    setUploadError(null);

    try {
      const res = await upload3DModel(file);
      setEditingConfig(prev => ({
        ...prev,
        textureUrl: res.url,
      }));
      showToast('High-resolution texture uploaded successfully!');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload texture.');
    } finally {
      setIsUploadingTexture(false);
    }
  };

  // Upload Transparent PNG file (.png, .webp)
  const handleUploadPngFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPng(true);
    setUploadError(null);

    try {
      const res = await uploadImage(file);
      setEditingConfig(prev => ({
        ...prev,
        transparentPngUrl: res.url,
      }));
      showToast('Transparent PNG cutout uploaded successfully!');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload transparent PNG.');
    } finally {
      setIsUploadingPng(false);
    }
  };

  // Auto-generate Transparent PNG from door catalogue image
  const handleAutoGeneratePng = async () => {
    if (!selectedDoor?.images?.[0]) return;
    setIsGeneratingPng(true);
    setUploadError(null);

    try {
      const transparentDataUrl = await removeBackgroundFromImage(selectedDoor.images[0]);
      const blob = await (await fetch(transparentDataUrl)).blob();
      const file = new File([blob], `door-${selectedDoor.id}-transparent.png`, { type: 'image/png' });
      const res = await uploadImage(file);
      setEditingConfig(prev => ({
        ...prev,
        transparentPngUrl: res.url,
      }));
      showToast('Transparent PNG auto-generated and saved!');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to auto-remove background.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // Save 3D Config & Transparent Cutout to Door
  const handleSaveConfig = async () => {
    if (!selectedDoor) return;
    setIsSaving(true);
    try {
      await updateDoor(selectedDoor.id, {
        transparentPngUrl: editingConfig.transparentPngUrl,
        model3d: {
          ...editingConfig,
          updatedAt: new Date().toISOString(),
        },
      });
      showToast(`3D & AR settings updated for ${selectedDoor.name}`);
      setIsEditModalOpen(false);
      onDoorUpdated();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save 3D settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Box className="w-6 h-6 text-[#C89211]" />
            <span>3D &amp; AR Design Management</span>
          </h3>
          <p className="text-xs text-[#666666] mt-1">
            Upload CAD models (.glb, .gltf), high-res wood textures, configure default dimensions, and manage AR camera support for catalog doors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search door designs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] placeholder-stone-500 focus:outline-none focus:border-[#C89211] w-48 sm:w-60"
            />
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Catalog Doors 3D Table */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8F8F6] border-b border-[#E5E5E5] text-[#666666] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Door Design</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">3D Status</th>
                <th className="py-3 px-4">AR Fitting</th>
                <th className="py-3 px-4">Model File / Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {filteredDoors.map(d => {
                const hasGlb = Boolean(d.model3d?.modelUrl);
                const isArActive = d.model3d?.arEnabled !== false;

                return (
                  <tr key={d.id} className="hover:bg-[#F7F7F7]/60 transition-colors">
                    {/* Design name & thumb */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveImageUrl(d.image || d.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80')}
                          alt={d.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80') {
                              target.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80';
                            }
                          }}
                          className="w-10 h-14 object-cover rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[#1A1A1A] text-sm">{d.name}</div>
                          <div className="text-[11px] text-[#666666]">
                            From ₹{d.startingPrice?.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-[#1A1A1A]">{d.category}</td>

                    {/* 3D Status */}
                    <td className="py-3 px-4">
                      {hasGlb ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          <span>Custom GLB CAD</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                          <Sparkles className="w-3 h-3" />
                          <span>Procedural 3D Ready</span>
                        </span>
                      )}
                    </td>

                    {/* AR Status */}
                    <td className="py-3 px-4">
                      {isArActive ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Enabled</span>
                        </span>
                      ) : (
                        <span className="text-[#666666]">Disabled</span>
                      )}
                    </td>

                    {/* Model Source */}
                    <td className="py-3 px-4 text-[#666666] font-mono text-[11px] max-w-[200px] truncate">
                      {d.model3d?.modelUrl ? (
                        <span className="text-[#C89211]" title={d.model3d.modelUrl}>
                          {d.model3d.modelUrl.split('/').pop()}
                        </span>
                      ) : (
                        <span>Catalog 2D Texture</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(d)}
                        className="px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs transition inline-flex items-center gap-1.5 shadow"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Configure 3D</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit 3D Config & Model Upload Modal */}
      {isEditModalOpen && selectedDoor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F8F8F6]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl text-[#1A1A1A] overflow-hidden my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5] bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-[#C89211]" />
                <h3 className="font-serif text-lg font-bold text-white">
                  3D &amp; AR Configuration: {selectedDoor.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-[#666666] hover:text-white hover:bg-[#F8F8F6] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
              {uploadError && (
                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Two Column Layout: Settings & Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Configuration Form */}
                <div className="space-y-4">
                  {/* Model File Upload (.glb / .gltf) */}
                  <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] block">
                      Custom 3D CAD Model (.glb, .gltf)
                    </label>

                    {editingConfig.modelUrl ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-emerald-500/30 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate text-[#1A1A1A] font-mono">
                            {editingConfig.modelUrl.split('/').pop()}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingConfig(prev => ({ ...prev, modelUrl: '' }))}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remove custom model and use procedural 3D door"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-[#666666] leading-relaxed">
                        No custom .glb uploaded. The app automatically constructs an interactive procedural 3D architectural door using the catalog photo.
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => modelFileInputRef.current?.click()}
                        disabled={isUploadingModel}
                        className="py-2 px-3 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold flex items-center gap-2 border border-[#E5E5E5] transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C89211]" />
                        <span>{isUploadingModel ? 'Uploading...' : 'Upload .glb / .gltf Model'}</span>
                      </button>
                    </div>

                    <input
                      ref={modelFileInputRef}
                      type="file"
                      accept=".glb,.gltf"
                      className="hidden"
                      onChange={handleUploadModelFile}
                    />
                  </div>

                  {/* High-Resolution Texture Upload */}
                  <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] block">
                      High-Resolution Door Texture
                    </label>

                    <div className="flex items-center gap-3">
                      <img
                        src={resolveImageUrl(editingConfig.textureUrl || selectedDoor.image || selectedDoor.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80')}
                        alt="Preview"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80') {
                            target.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80';
                          }
                        }}
                        className="w-12 h-16 object-cover rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]"
                      />
                      <button
                        type="button"
                        onClick={() => textureFileInputRef.current?.click()}
                        disabled={isUploadingTexture}
                        className="py-2 px-3 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold flex items-center gap-2 border border-[#E5E5E5] transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C89211]" />
                        <span>{isUploadingTexture ? 'Uploading...' : 'Replace Texture Image'}</span>
                      </button>
                    </div>

                    <input
                      ref={textureFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadTextureFile}
                    />
                  </div>

                  {/* Transparent PNG Door Cutout (.png) - For Fit in Entrance */}
                  <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] block">
                        Transparent PNG Cutout (.png) - For Fit in Entrance
                      </label>
                      {editingConfig.transparentPngUrl && (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Cutout Ready
                        </span>
                      )}
                    </div>

                    {editingConfig.transparentPngUrl ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-emerald-500/30 text-xs">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-14 rounded bg-[repeating-conic-gradient(#262626_0_25%,#1c1c1c_0_50%)] bg-[size:8px_8px] p-1 flex items-center justify-center border border-[#E5E5E5] shrink-0">
                            <img
                              src={resolveImageUrl(editingConfig.transparentPngUrl)}
                              alt="Transparent Cutout"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                              }}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="truncate">
                            <span className="text-[#1A1A1A] font-mono text-xs truncate block max-w-xs">
                              {editingConfig.transparentPngUrl.split('/').pop()}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold">
                              Used in Fit in Entrance
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingConfig(prev => ({ ...prev, transparentPngUrl: '' }))}
                          className="text-red-400 hover:text-red-300 p-1 rounded"
                          title="Remove transparent PNG"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-[#666666] leading-relaxed">
                        No custom transparent PNG uploaded. The app automatically isolates and removes the background from the catalogue photo, or you can upload/generate one below.
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => pngFileInputRef.current?.click()}
                        disabled={isUploadingPng}
                        className="py-2 px-3 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold flex items-center gap-2 border border-[#E5E5E5] transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C89211]" />
                        <span>{isUploadingPng ? 'Uploading...' : 'Upload Transparent PNG'}</span>
                      </button>

                      {selectedDoor.images?.[0] && (
                        <button
                          type="button"
                          disabled={isGeneratingPng}
                          onClick={handleAutoGeneratePng}
                          className="py-2 px-3 rounded-lg bg-[#FFF7E3] hover:bg-amber-600/30 text-[#C89211] text-xs font-semibold flex items-center gap-2 border border-[#C89211]/40 transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isGeneratingPng ? 'Generating...' : '⚡ Auto-Remove Background from Photo'}</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={pngFileInputRef}
                      type="file"
                      accept=".png,.webp"
                      className="hidden"
                      onChange={handleUploadPngFile}
                    />
                  </div>

                  {/* Dimensions & Frame Settings */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[#1A1A1A] font-semibold block mb-1">Default Width (Inches):</label>
                      <input
                        type="number"
                        value={editingConfig.defaultWidthInch || 36}
                        onChange={e => setEditingConfig(prev => ({ ...prev, defaultWidthInch: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A] font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[#1A1A1A] font-semibold block mb-1">Default Height (Inches):</label>
                      <input
                        type="number"
                        value={editingConfig.defaultHeightInch || 78}
                        onChange={e => setEditingConfig(prev => ({ ...prev, defaultHeightInch: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#E5E5E5] rounded-lg text-[#1A1A1A] font-mono"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-2 text-xs">
                    <label className="flex items-center gap-2 text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingConfig.arEnabled !== false}
                        onChange={e => setEditingConfig(prev => ({ ...prev, arEnabled: e.target.checked }))}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span>Enable AR Fitting (Camera &amp; Photo) for this door</span>
                    </label>

                    <label className="flex items-center gap-2 text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingConfig.allowDoubleDoor)}
                        onChange={e => setEditingConfig(prev => ({ ...prev, allowDoubleDoor: e.target.checked }))}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span>Allow Double Door variation</span>
                    </label>
                  </div>
                </div>

                {/* Right: Live Interactive 3D Model Preview */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] block">
                    Live 3D Test Preview
                  </label>
                  <div className="h-[360px] rounded-xl overflow-hidden border border-[#E5E5E5] bg-[#F8F8F6]">
                    <Door3DScene
                      door={{
                        ...selectedDoor,
                        model3d: editingConfig,
                      }}
                      fittingState={{
                        doorId: selectedDoor.id,
                        woodType: editingConfig.defaultWoodType || 'Sagwan',
                        woodMaterialId: 'mat-1',
                        finishId: 'fin-1',
                        finishName: editingConfig.defaultFinish || 'Teak Polish',
                        colorTone: editingConfig.defaultColor || 'golden_teak',
                        designStyle: editingConfig.defaultStyle || 'carving',
                        widthInch: editingConfig.defaultWidthInch || 36,
                        heightInch: editingConfig.defaultHeightInch || 78,
                        thicknessInch: editingConfig.defaultThicknessInch || 1.5,
                        isDoubleDoor: false,
                        frameId: 'frm-1',
                        frameName: 'Normal Frame',
                        hardwareId: 'hwd-1',
                        hardwareName: 'Single Aldrop',
                        hardwareQty: 1,
                        handleStyle: 'brass_royal',
                        doorOpenAngle: 15,
                        lightingIntensity: 1.0,
                      }}
                      className="h-full"
                    />
                  </div>
                  <p className="text-[11px] text-[#666666]">
                    Drag inside the preview box to rotate and inspect the door model before publishing.
                  </p>
                </div>
              </div>

              {/* Save CTA */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#1A1A1A] hover:text-white hover:bg-[#F8F8F6] text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer"
                >
                  {isSaving ? 'Saving Changes...' : 'Save 3D Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
