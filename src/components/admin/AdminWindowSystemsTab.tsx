import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Plus,
  Save,
  Sliders,
  Trash2,
} from 'lucide-react';
import type {
  WindowCuttingPreset,
  WindowIllustrationType,
  WindowProfileSeriesConfig,
  WindowRuleBaseDimension,
  WindowSectionCategory,
  WindowSectionFormulaRule,
  WindowSystemCategoryId,
  WindowSystemDefinition,
} from '../../types.ts';
import {
  WINDOW_SYSTEM_CATEGORIES,
  isWindowSystemFormulaReady,
} from '../../data/indianWindowSystemsDefaults.ts';
import {
  createAdminWindowSystem,
  deleteAdminWindowSystem,
  fetchAdminWindowSystems,
  updateAdminWindowSystem,
} from '../../lib/windowSystemApi.ts';
import { calculateWindowSystemCutting } from '../../lib/windowSystemEngine.ts';
import { WindowSystemIllustration } from '../window-systems/WindowSystemIllustration.tsx';

interface AdminWindowSystemsTabProps {
  onSystemsUpdated?: () => void;
  showToast: (msg: string) => void;
}

const ILLUSTRATION_OPTIONS: { value: WindowIllustrationType; label: string }[] = [
  { value: '2-track', label: '2-Track Sliding' },
  { value: '3-track', label: '3-Track Sliding + Net' },
  { value: '4-track', label: '4-Track Sliding' },
  { value: '18-50', label: '18/50 Sliding Series' },
  { value: 'heavy-sliding', label: 'Heavy Sliding Series' },
  { value: 'dhumal', label: 'Dhumal Window' },
  { value: 'indian-standard', label: 'Indian Standard Sliding' },
  { value: 'aluminium-section', label: 'Aluminium Section' },
  { value: 'local-fabrication', label: 'Local Fabrication' },
  { value: 'custom-profile', label: 'Custom Profile' },
  { value: 'fixed-glass', label: 'Fixed Glass' },
  { value: 'openable', label: 'Openable Casement' },
  { value: 'combination', label: 'Combination Window' },
  { value: 'ventilator', label: 'Ventilator' },
  { value: 'mosquito-net', label: 'Mosquito Net' },
];

const SECTION_CATEGORY_OPTIONS: { value: WindowSectionCategory; label: string }[] = [
  { value: 'top_track', label: 'Top Track / Frame' },
  { value: 'bottom_track', label: 'Bottom Track / Frame' },
  { value: 'side_frame', label: 'Side Frame' },
  { value: 'interlock', label: 'Interlock' },
  { value: 'handle', label: 'Handle Section' },
  { value: 'shutter_rail', label: 'Shutter Rail' },
  { value: 'bearing', label: 'Bearing Section' },
  { value: 'other', label: 'Other Aluminium Section' },
];

const BASE_DIMENSION_OPTIONS: { value: WindowRuleBaseDimension; label: string }[] = [
  { value: 'width', label: 'Overall Width (W)' },
  { value: 'height', label: 'Overall Height (H)' },
  { value: 'width_divided_by_shutters', label: 'Width / Shutters' },
  { value: 'height_minus_handle', label: 'Handle Cut Height' },
];

function parseOptionalNumber(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseIntCsv(raw: string, fallback: number[]): number[] {
  const list = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12)
    )
  ).sort((a, b) => a - b);
  return list.length > 0 ? list : fallback;
}

export const AdminWindowSystemsTab: React.FC<AdminWindowSystemsTabProps> = ({
  onSystemsUpdated,
  showToast,
}) => {
  const [systems, setSystems] = useState<WindowSystemDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<WindowSystemCategoryId | 'all'>('all');

  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [draft, setDraft] = useState<WindowSystemDefinition | null>(null);
  const [selectedSeriesIdx, setSelectedSeriesIdx] = useState<number>(0);

  // Add New Window System Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<WindowSystemCategoryId>('indian_aluminium');
  const [newDescription, setNewDescription] = useState('');
  const [newIllustration, setNewIllustration] = useState<WindowIllustrationType>('custom-profile');
  const [newSupportsTracks, setNewSupportsTracks] = useState(true);
  const [newSupportsNet, setNewSupportsNet] = useState(true);

  // Test Preview Dimensions
  const [testW, setTestW] = useState(48);
  const [testH, setTestH] = useState(48);

  const loadSystems = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminWindowSystems();
      setSystems(list);
      if (list.length > 0 && !selectedSystemId) {
        setSelectedSystemId(list[0].id);
        setDraft(structuredClone(list[0]));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load window systems.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystems();
  }, []);

  const handleSelectSystem = (sys: WindowSystemDefinition) => {
    setSelectedSystemId(sys.id);
    setDraft(structuredClone(sys));
    setSelectedSeriesIdx(0);
    setError(null);
  };

  const filteredSystems = useMemo(() => {
    if (filterCategory === 'all') return systems;
    return systems.filter((s) => s.categoryId === filterCategory);
  }, [systems, filterCategory]);

  const activeSeries: WindowProfileSeriesConfig | null = useMemo(() => {
    if (!draft || !draft.profileSeries.length) return null;
    return draft.profileSeries[selectedSeriesIdx] || draft.profileSeries[0];
  }, [draft, selectedSeriesIdx]);

  const previewResult = useMemo(() => {
    if (!draft || !activeSeries) return null;
    const simulatedDraft: WindowSystemDefinition = {
      ...draft,
      formulaConfigured:
        Boolean(draft.usesLegacySlidingEngine) ||
        draft.profileSeries.some((p) => p.isConfigured),
    };
    return calculateWindowSystemCutting(simulatedDraft, {
      systemId: draft.id,
      profileSeriesId: activeSeries.id,
      width: testW,
      height: testH,
      unit: 'inch',
      quantity: 1,
      trackCount: draft.defaultTrackCount,
      shutterCount: draft.defaultShutterCount,
      includeMosquitoNet: draft.supportsMosquitoNet,
    });
  }, [draft, activeSeries, testW, testH]);

  const handleCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createAdminWindowSystem({
        name: newName.trim(),
        categoryId: newCategory,
        shortDescription: newDescription.trim(),
        illustrationType: newIllustration,
        supportsTracks: newSupportsTracks,
        defaultTrackCount: newSupportsTracks ? 2 : 1,
        allowedTrackCounts: newSupportsTracks ? [2, 3, 4] : [1],
        defaultShutterCount: 2,
        allowedShutterCounts: [1, 2, 3, 4],
        supportsMosquitoNet: newSupportsNet,
        defaultMosquitoNet: false,
        enabled: true,
      });
      setSystems((prev) => [...prev, created]);
      handleSelectSystem(created);
      setShowAddForm(false);
      setNewName('');
      setNewDescription('');
      showToast(`Added "${created.name}" window system`);
      onSystemsUpdated?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to add window system.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminWindowSystem(draft.id, draft);
      setSystems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setDraft(structuredClone(updated));
      showToast(`Saved "${updated.name}" profile & formula settings`);
      onSystemsUpdated?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save window system.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (sys: WindowSystemDefinition) => {
    setSaving(true);
    try {
      const updated = await updateAdminWindowSystem(sys.id, { enabled: !sys.enabled });
      setSystems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (draft?.id === updated.id) {
        setDraft(structuredClone(updated));
      }
      showToast(`${updated.name} ${updated.enabled ? 'enabled' : 'disabled'}`);
      onSystemsUpdated?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle system status.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSystem = async (sys: WindowSystemDefinition) => {
    if (sys.usesLegacySlidingEngine) return;
    setSaving(true);
    try {
      await deleteAdminWindowSystem(sys.id);
      const remaining = systems.filter((s) => s.id !== sys.id);
      setSystems(remaining);
      if (remaining.length > 0) {
        handleSelectSystem(remaining[0]);
      } else {
        setDraft(null);
      }
      showToast(`Deleted "${sys.name}"`);
      onSystemsUpdated?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete window system.');
    } finally {
      setSaving(false);
    }
  };

  const updateActiveSeries = (patch: Partial<WindowProfileSeriesConfig>) => {
    if (!draft) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const nextSeries = prev.profileSeries.map((s, idx) =>
        idx === selectedSeriesIdx ? { ...s, ...patch } : s
      );
      return { ...prev, profileSeries: nextSeries };
    });
  };

  const handleAddProfileSeries = () => {
    if (!draft) return;
    const count = draft.profileSeries.length + 1;
    const newSeries: WindowProfileSeriesConfig = {
      id: `ps-${Date.now()}`,
      name: `${draft.name} Series ${count}`,
      code: `SER-${count}`,
      sectionDimensions: '',
      isConfigured: false,
      topTrackDeductionInch: null,
      topTrackAdditionInch: null,
      bottomTrackDeductionInch: null,
      bottomTrackAdditionInch: null,
      sideFrameDeductionInch: null,
      sideFrameAdditionInch: null,
      interlockDeductionInch: null,
      interlockAdditionInch: null,
      handleDeductionInch: null,
      handleAdditionInch: null,
      glassWidthDeductionInch: null,
      glassWidthAdditionInch: null,
      glassHeightDeductionInch: null,
      glassHeightAdditionInch: null,
      mosquitoNetWidthDeductionInch: null,
      mosquitoNetWidthAdditionInch: null,
      mosquitoNetHeightDeductionInch: null,
      mosquitoNetHeightAdditionInch: null,
      additionalSections: [],
    };
    const nextList = [...draft.profileSeries, newSeries];
    setDraft({ ...draft, profileSeries: nextList });
    setSelectedSeriesIdx(nextList.length - 1);
  };

  const handleRemoveProfileSeries = (idxToRemove: number) => {
    if (!draft || draft.profileSeries.length <= 1) return;
    const nextList = draft.profileSeries.filter((_, idx) => idx !== idxToRemove);
    setDraft({ ...draft, profileSeries: nextList });
    setSelectedSeriesIdx(0);
  };

  const handleAddSectionRule = () => {
    if (!activeSeries) return;
    const newRule: WindowSectionFormulaRule = {
      id: `sec-${Date.now()}`,
      name: 'New Aluminium Section',
      sectionCode: '',
      sectionDimensionSpec: '',
      category: 'other',
      baseDimension: 'width',
      divisor: 1,
      useShutterCountAsDivisor: false,
      minusDeductionInch: 0,
      plusAdditionInch: 0,
      piecesPerWindow: 2,
      multiplyPiecesByShutters: false,
      requiresMosquitoNet: false,
      notes: '',
    };
    updateActiveSeries({
      additionalSections: [...(activeSeries.additionalSections || []), newRule],
    });
  };

  const handleUpdateSectionRule = (
    ruleIdx: number,
    patch: Partial<WindowSectionFormulaRule>
  ) => {
    if (!activeSeries) return;
    const next = (activeSeries.additionalSections || []).map((r, i) =>
      i === ruleIdx ? { ...r, ...patch } : r
    );
    updateActiveSeries({ additionalSections: next });
  };

  const handleRemoveSectionRule = (ruleIdx: number) => {
    if (!activeSeries) return;
    updateActiveSeries({
      additionalSections: (activeSeries.additionalSections || []).filter((_, i) => i !== ruleIdx),
    });
  };

  const handleAddPreset = () => {
    if (!draft || !activeSeries) return;
    const newPreset: WindowCuttingPreset = {
      id: `preset-${Date.now()}`,
      name: `${draft.defaultTrackCount}T - ${draft.defaultShutterCount} Shutters`,
      profileSeriesId: activeSeries.id,
      trackCount: draft.defaultTrackCount,
      shutterCount: draft.defaultShutterCount,
      includeMosquitoNet: draft.defaultMosquitoNet,
      notes: '',
    };
    setDraft({ ...draft, presets: [...(draft.presets || []), newPreset] });
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-[#64748B]">
        <Loader2 className="w-4 h-4 animate-spin text-[#0B5ED7]" />
        <span>Loading Indian Window Systems &amp; Formulas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#0A2540]">
            Window Systems, Profiles &amp; Cutting Formulas
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure separate cutting rules for 4-Track, 18/50, Dhumal, Indian Standard, Fixed, Openable, Ventilator &amp; custom systems. Verified 2-Track &amp; 3-Track formulas stay protected.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="h-9 px-3.5 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Window System</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Add New Window System Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateSystem}
          className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 space-y-3"
        >
          <div className="text-sm font-extrabold text-[#0A2540]">Add New Window System</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#475569] mb-1">System Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. 27mm Domal Heavy Sliding"
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0A2540]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#475569] mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as WindowSystemCategoryId)}
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0A2540]"
              >
                {WINDOW_SYSTEM_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}. {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#475569] mb-1">Window Illustration</label>
              <select
                value={newIllustration}
                onChange={(e) => setNewIllustration(e.target.value as WindowIllustrationType)}
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0A2540]"
              >
                {ILLUSTRATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#475569] mb-1">Short Description</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief workshop description shown on homepage cards"
              className="w-full h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0A2540]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#334155]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newSupportsTracks}
                onChange={(e) => setNewSupportsTracks(e.target.checked)}
              />
              <span>Supports Sliding Tracks</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newSupportsNet}
                onChange={(e) => setNewSupportsNet(e.target.checked)}
              />
              <span>Supports Mosquito Net Option</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-[#0B5ED7] text-white text-xs font-bold cursor-pointer"
            >
              {saving ? 'Creating...' : 'Create Window System'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#475569] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Main Split: Left Systems List, Right Formula & Profile Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT LIST */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex flex-wrap gap-1">
            {(['all', 'sliding', 'indian_aluminium', 'special'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-[#0A2540] text-white'
                    : 'bg-[#F1F5F9] text-[#475569] hover:text-[#0A2540]'
                }`}
              >
                {cat === 'all'
                  ? `All (${systems.length})`
                  : cat === 'sliding'
                    ? 'Sliding'
                    : cat === 'indian_aluminium'
                      ? 'Indian Alu'
                      : 'Special'}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredSystems.map((sys) => {
              const selected = draft?.id === sys.id;
              const ready = isWindowSystemFormulaReady(sys);
              return (
                <div
                  key={sys.id}
                  onClick={() => handleSelectSystem(sys)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selected
                      ? 'bg-[#EFF6FF] border-[#0B5ED7]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-12 shrink-0 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1">
                      <WindowSystemIllustration type={sys.illustrationType} className="w-full h-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#0A2540] truncate">{sys.name}</div>
                      <div className="text-[10px] font-semibold flex items-center gap-1.5 mt-0.5">
                        {ready ? (
                          <span className="text-[#059669]">Configured</span>
                        ) : (
                          <span className="text-[#D97706]">Setup Required</span>
                        )}
                        <span className="text-[#CBD5E1]">·</span>
                        <span className={sys.enabled ? 'text-[#0B5ED7]' : 'text-[#94A3B8]'}>
                          {sys.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleEnabled(sys);
                    }}
                    title={sys.enabled ? 'Disable system' : 'Enable system'}
                    className="p-1.5 rounded-lg hover:bg-white text-[#64748B] hover:text-[#0A2540] cursor-pointer"
                  >
                    {sys.enabled ? <Eye className="w-4 h-4 text-[#0B5ED7]" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT EDITOR */}
        {draft && (
          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 space-y-5">
            {/* Editor Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#F97316]">
                  Editing Window System
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-[#0A2540]">{draft.name}</h4>
              </div>
              <div className="flex items-center gap-2">
                {!draft.usesLegacySlidingEngine && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSystem(draft)}
                    disabled={saving}
                    className="h-9 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="h-9 px-4 rounded-lg bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

            {/* 1. General System Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Window System Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#0A2540]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Category</label>
                <select
                  value={draft.categoryId}
                  onChange={(e) =>
                    setDraft({ ...draft, categoryId: e.target.value as WindowSystemCategoryId })
                  }
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#0A2540]"
                >
                  {WINDOW_SYSTEM_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}. {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Short Description</label>
                <input
                  type="text"
                  value={draft.shortDescription}
                  onChange={(e) => setDraft({ ...draft, shortDescription: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0A2540]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Allowed Track Counts (comma separated)
                </label>
                <input
                  type="text"
                  value={draft.allowedTrackCounts.join(', ')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      allowedTrackCounts: parseIntCsv(e.target.value, draft.allowedTrackCounts),
                    })
                  }
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono text-[#0A2540]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Allowed Shutter Counts (comma separated)
                </label>
                <input
                  type="text"
                  value={draft.allowedShutterCounts.join(', ')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      allowedShutterCounts: parseIntCsv(e.target.value, draft.allowedShutterCounts),
                    })
                  }
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono text-[#0A2540]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#334155]">
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                />
                <span>Enabled on Homepage</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={draft.supportsTracks}
                  onChange={(e) => setDraft({ ...draft, supportsTracks: e.target.checked })}
                />
                <span>Supports Sliding Tracks</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={draft.supportsMosquitoNet}
                  onChange={(e) => setDraft({ ...draft, supportsMosquitoNet: e.target.checked })}
                />
                <span>Supports Mosquito Net</span>
              </label>
            </div>

            {/* Protected Verified 2-Track / 3-Track Notice */}
            {draft.usesLegacySlidingEngine ? (
              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified {draft.usesLegacySlidingEngine.toUpperCase()} Sliding Window Engine Active</span>
                </div>
                <p>
                  This system uses WindowCut Pro&apos;s verified existing {draft.usesLegacySlidingEngine} sliding calculation formulas unchanged. You can update its display name, description, visibility, or quick presets here without altering the verified deduction math.
                </p>
              </div>
            ) : (
              /* 2. Profile Series & Formula Rules Editor */
              <div className="space-y-4 border-t border-[#E2E8F0] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#0A2540]">
                    <Sliders className="w-4 h-4 text-[#0B5ED7]" />
                    <span>Profile Series &amp; Deduction Formulas (Inches)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProfileSeries}
                    className="h-8 px-3 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0B5ED7] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Profile Series</span>
                  </button>
                </div>

                {/* Series Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {draft.profileSeries.map((ps, idx) => (
                    <button
                      key={ps.id}
                      type="button"
                      onClick={() => setSelectedSeriesIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        idx === selectedSeriesIdx
                          ? 'bg-[#0A2540] text-white border-[#0A2540]'
                          : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]'
                      }`}
                    >
                      {ps.name} {ps.isConfigured ? '✓' : '(Setup)'}
                    </button>
                  ))}
                </div>

                {activeSeries && (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1">Series Name</label>
                        <input
                          type="text"
                          value={activeSeries.name}
                          onChange={(e) => updateActiveSeries({ name: e.target.value })}
                          className="w-full h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1">Profile Code</label>
                        <input
                          type="text"
                          value={activeSeries.code}
                          onChange={(e) => updateActiveSeries({ code: e.target.value })}
                          className="w-full h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1">Section Dimensions Spec</label>
                        <input
                          type="text"
                          value={activeSeries.sectionDimensions || ''}
                          onChange={(e) => updateActiveSeries({ sectionDimensions: e.target.value })}
                          placeholder="e.g. 18x50mm / 27x65mm"
                          className="w-full h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs"
                        />
                      </div>
                    </div>

                    {/* Activate Formula Switch */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-white border border-[#CBD5E1]">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0A2540] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeSeries.isConfigured}
                          onChange={(e) => updateActiveSeries({ isConfigured: e.target.checked })}
                          className="w-4 h-4 accent-[#059669]"
                        />
                        <span>Mark this Profile Series Formula as Verified &amp; Active (removes &ldquo;Setup Required&rdquo;)</span>
                      </label>
                      {draft.profileSeries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProfileSeries(selectedSeriesIdx)}
                          className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                        >
                          Remove Series
                        </button>
                      )}
                    </div>

                    {/* Core Minus & Plus Deduction Inputs (Inches) */}
                    <div>
                      <div className="text-xs font-bold text-[#0A2540] mb-2">
                        Core Section Deductions (−) &amp; Additions (+) in Inches
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { label: 'Top Track / Frame (−)', key: 'topTrackDeductionInch' as const },
                          { label: 'Top Track / Frame (+)', key: 'topTrackAdditionInch' as const },
                          { label: 'Bottom Track / Frame (−)', key: 'bottomTrackDeductionInch' as const },
                          { label: 'Bottom Track / Frame (+)', key: 'bottomTrackAdditionInch' as const },
                          { label: 'Side Frame (−)', key: 'sideFrameDeductionInch' as const },
                          { label: 'Side Frame (+)', key: 'sideFrameAdditionInch' as const },
                          { label: 'Handle Height (−)', key: 'handleDeductionInch' as const },
                          { label: 'Handle Height (+)', key: 'handleAdditionInch' as const },
                          { label: 'Interlock Height (−)', key: 'interlockDeductionInch' as const },
                          { label: 'Interlock Height (+)', key: 'interlockAdditionInch' as const },
                          { label: 'Glass Width Deduction (−)', key: 'glassWidthDeductionInch' as const },
                          { label: 'Glass Width Allowance (+)', key: 'glassWidthAdditionInch' as const },
                          { label: 'Glass Height Deduction (−)', key: 'glassHeightDeductionInch' as const },
                          { label: 'Glass Height Allowance (+)', key: 'glassHeightAdditionInch' as const },
                          { label: 'Mosquito Net Width (−)', key: 'mosquitoNetWidthDeductionInch' as const },
                          { label: 'Mosquito Net Width (+)', key: 'mosquitoNetWidthAdditionInch' as const },
                          { label: 'Mosquito Net Height (−)', key: 'mosquitoNetHeightDeductionInch' as const },
                          { label: 'Mosquito Net Height (+)', key: 'mosquitoNetHeightAdditionInch' as const },
                        ].map((item) => (
                          <div key={item.key}>
                            <label className="block text-[10px] font-bold text-[#475569] mb-0.5">
                              {item.label}
                            </label>
                            <input
                              type="number"
                              step="0.0625"
                              min="0"
                              placeholder="Not set"
                              value={activeSeries[item.key] ?? ''}
                              onChange={(e) =>
                                updateActiveSeries({
                                  [item.key]: parseOptionalNumber(e.target.value),
                                })
                              }
                              className="w-full h-8 px-2.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono text-[#0A2540]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Custom Aluminium Sections */}
                    <div className="space-y-2.5 border-t border-[#E2E8F0] pt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-[#0A2540]">
                          Additional Aluminium Sections (Bearing Rail, Mullion, Beading, Sub-Frame)
                        </div>
                        <button
                          type="button"
                          onClick={handleAddSectionRule}
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#CBD5E1] text-[11px] font-bold text-[#0B5ED7] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Section</span>
                        </button>
                      </div>

                      {(activeSeries.additionalSections || []).map((rule, rIdx) => (
                        <div
                          key={rule.id}
                          className="p-3 rounded-lg bg-white border border-[#CBD5E1] grid grid-cols-2 sm:grid-cols-4 gap-2 items-end"
                        >
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#475569]">Section Name</label>
                            <input
                              type="text"
                              value={rule.name}
                              onChange={(e) => handleUpdateSectionRule(rIdx, { name: e.target.value })}
                              className="w-full h-8 px-2 rounded border border-[#CBD5E1] text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569]">Category</label>
                            <select
                              value={rule.category}
                              onChange={(e) =>
                                handleUpdateSectionRule(rIdx, {
                                  category: e.target.value as WindowSectionCategory,
                                })
                              }
                              className="w-full h-8 px-2 rounded border border-[#CBD5E1] text-xs"
                            >
                              {SECTION_CATEGORY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569]">Base Dimension</label>
                            <select
                              value={rule.baseDimension}
                              onChange={(e) =>
                                handleUpdateSectionRule(rIdx, {
                                  baseDimension: e.target.value as WindowRuleBaseDimension,
                                })
                              }
                              className="w-full h-8 px-2 rounded border border-[#CBD5E1] text-xs"
                            >
                              {BASE_DIMENSION_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569]">Minus (− in)</label>
                            <input
                              type="number"
                              step="0.0625"
                              min="0"
                              value={rule.minusDeductionInch}
                              onChange={(e) =>
                                handleUpdateSectionRule(rIdx, {
                                  minusDeductionInch: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full h-8 px-2 rounded border border-[#CBD5E1] text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569]">Plus (+ in)</label>
                            <input
                              type="number"
                              step="0.0625"
                              min="0"
                              value={rule.plusAdditionInch}
                              onChange={(e) =>
                                handleUpdateSectionRule(rIdx, {
                                  plusAdditionInch: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full h-8 px-2 rounded border border-[#CBD5E1] text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#475569]">Divisor / Pcs</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                min="1"
                                max="12"
                                title="Divisor"
                                value={rule.divisor}
                                onChange={(e) =>
                                  handleUpdateSectionRule(rIdx, {
                                    divisor: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                                className="w-1/2 h-8 px-2 rounded border border-[#CBD5E1] text-xs font-mono"
                              />
                              <input
                                type="number"
                                min="1"
                                max="50"
                                title="Pieces per window"
                                value={rule.piecesPerWindow}
                                onChange={(e) =>
                                  handleUpdateSectionRule(rIdx, {
                                    piecesPerWindow: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                                className="w-1/2 h-8 px-2 rounded border border-[#CBD5E1] text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveSectionRule(rIdx)}
                              className="h-8 px-2.5 rounded bg-red-50 text-red-600 text-xs font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live Formula Test Preview */}
                    <div className="bg-white border border-[#CBD5E1] rounded-xl p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-extrabold text-[#0A2540]">
                          Live Formula Test Preview
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span>W:</span>
                          <input
                            type="number"
                            value={testW}
                            onChange={(e) => setTestW(Number(e.target.value) || 48)}
                            className="w-16 h-7 px-2 rounded border border-[#CBD5E1]"
                          />
                          <span>H:</span>
                          <input
                            type="number"
                            value={testH}
                            onChange={(e) => setTestH(Number(e.target.value) || 48)}
                            className="w-16 h-7 px-2 rounded border border-[#CBD5E1]"
                          />
                        </div>
                      </div>
                      {previewResult?.status === 'calculated' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                          {previewResult.aluminiumSections.map((r) => (
                            <div key={r.id} className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                              <div className="font-sans text-[10px] font-bold text-[#64748B]">{r.name}</div>
                              <div className="font-bold text-[#0B5ED7]">{r.lengthDecimalFormatted}</div>
                            </div>
                          ))}
                          {previewResult.glassCutting.map((g) => (
                            <div key={g.id} className="p-2 rounded bg-[#EFF6FF] border border-[#BFDBFE]">
                              <div className="font-sans text-[10px] font-bold text-[#0B5ED7]">{g.name}</div>
                              <div className="font-bold text-[#0A2540]">
                                {g.widthDecimalFormatted} × {g.heightDecimalFormatted}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#D97706] font-semibold">
                          {previewResult?.status === 'setup_required'
                            ? 'Setup Required: Enter deductions above and check "Mark this Profile Series Formula as Verified & Active" to preview results.'
                            : previewResult?.errors.join(' ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Reusable Cutting Presets */}
            <div className="space-y-2.5 border-t border-[#E2E8F0] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#0A2540]">
                  <Layers className="w-4 h-4 text-[#F97316]" />
                  <span>Reusable Cutting Presets</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddPreset}
                  className="h-8 px-3 rounded-lg bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Preset</span>
                </button>
              </div>
              {(draft.presets || []).length === 0 ? (
                <p className="text-xs text-[#64748B]">No presets added yet.</p>
              ) : (
                <div className="space-y-2">
                  {(draft.presets || []).map((preset, pIdx) => (
                    <div
                      key={preset.id}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-5 gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={preset.name}
                        onChange={(e) => {
                          const next = draft.presets.map((p, i) =>
                            i === pIdx ? { ...p, name: e.target.value } : p
                          );
                          setDraft({ ...draft, presets: next });
                        }}
                        className="col-span-2 h-8 px-2.5 rounded bg-white border border-[#CBD5E1] text-xs font-semibold"
                      />
                      <input
                        type="number"
                        min="1"
                        max="8"
                        title="Tracks"
                        value={preset.trackCount}
                        onChange={(e) => {
                          const next = draft.presets.map((p, i) =>
                            i === pIdx ? { ...p, trackCount: Number(e.target.value) || 2 } : p
                          );
                          setDraft({ ...draft, presets: next });
                        }}
                        className="h-8 px-2 rounded bg-white border border-[#CBD5E1] text-xs font-mono"
                      />
                      <input
                        type="number"
                        min="1"
                        max="12"
                        title="Shutters"
                        value={preset.shutterCount}
                        onChange={(e) => {
                          const next = draft.presets.map((p, i) =>
                            i === pIdx ? { ...p, shutterCount: Number(e.target.value) || 2 } : p
                          );
                          setDraft({ ...draft, presets: next });
                        }}
                        className="h-8 px-2 rounded bg-white border border-[#CBD5E1] text-xs font-mono"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preset.includeMosquitoNet}
                            onChange={(e) => {
                              const next = draft.presets.map((p, i) =>
                                i === pIdx ? { ...p, includeMosquitoNet: e.target.checked } : p
                              );
                              setDraft({ ...draft, presets: next });
                            }}
                          />
                          <span>Net</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              presets: draft.presets.filter((_, i) => i !== pIdx),
                            })
                          }
                          className="text-red-600 text-xs font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
