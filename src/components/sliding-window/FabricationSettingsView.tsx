import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Copy,
  Trash2,
  Check,
  RotateCcw,
  Edit2,
  Save,
  Star,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react';
import type {
  FabricationProfile,
  FabricationRuleCategory,
  FabricationRuleKey,
  FabricationRuleSetting,
  PanelArrangementRule,
  RuleOperator,
  SlidingTrackType,
  WindowMeasurementUnit,
} from '../../types.ts';
import { getDefaultRuleResetValues } from '../../data/slidingWindowDefaults.ts';
import {
  formatInchFraction,
  formatRuleNumber,
  parseMeasurementInput,
} from '../../lib/slidingWindowEngine.ts';
import { MeasurementInput } from './MeasurementInput.tsx';

interface FabricationSettingsViewProps {
  profiles: FabricationProfile[];
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (payload: Partial<FabricationProfile>) => Promise<void>;
  onUpdateProfile: (id: string, updates: Partial<FabricationProfile>) => Promise<void>;
  onDuplicateProfile: (id: string, newName?: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onSetDefaultProfile: (id: string) => Promise<void>;
  onResetProfile: (id: string) => Promise<void>;
  isSaving?: boolean;
}

const CATEGORY_TABS: Array<{ id: 'all' | FabricationRuleCategory; label: string }> = [
  { id: 'all', label: 'All Rules' },
  { id: '2-track', label: '2 Track' },
  { id: '3-track', label: '3 Track' },
  { id: 'glass', label: 'Glass' },
  { id: 'mosquito-net', label: 'Mosquito Net' },
  { id: 'handle', label: 'Handle' },
  { id: 'interlock', label: 'Interlock' },
  { id: 'top-track', label: 'Top Track' },
  { id: 'bottom-track', label: 'Bottom Track' },
  { id: 'bearing', label: 'Bearing (T.B.)' },
];

const RULE_ORDER: FabricationRuleKey[] = [
  'glassWidthDeduction',
  'glassWidthAddition',
  'glassHeightDeduction',
  'mosquitoNetWidthDeduction',
  'mosquitoNetWidthAddition',
  'mosquitoNetHeightDeduction',
  'handleHeightDeduction',
  'interlockHeightDeduction',
  'topTrackAdjustment',
  'bottomTrackAdjustment',
  'bearingWidthDeduction',
  'topBearingAdjustment',
  'bottomBearingAdjustment',
];

export const FabricationSettingsView: React.FC<FabricationSettingsViewProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onSetDefaultProfile,
  onResetProfile,
  isSaving = false,
}) => {
  const activeProfile =
    profiles.find(p => p.id === selectedProfileId) || profiles[0] || null;

  const [categoryFilter, setCategoryFilter] = useState<'all' | FabricationRuleCategory>('all');
  const [editingRuleKey, setEditingRuleKey] = useState<FabricationRuleKey | null>(null);
  const [ruleDraft, setRuleDraft] = useState<{
    valueStr: string;
    unit: WindowMeasurementUnit;
    operator: RuleOperator;
  } | null>(null);

  // Profile Rename / New Profile UI states
  const [showNewProfileForm, setShowNewProfileForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileTrack, setNewProfileTrack] = useState<SlidingTrackType>('2-track');
  const [newProfileDesc, setNewProfileDesc] = useState('');

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Panel arrangement draft state
  const [panelsDraft, setPanelsDraft] = useState<PanelArrangementRule[]>([]);
  const [glassDivisorDraft, setGlassDivisorDraft] = useState<string>('2');
  const [netDivisorDraft, setNetDivisorDraft] = useState<string>('2');
  const [bearingDivisorDraft, setBearingDivisorDraft] = useState<string>('2');
  const [panelsDirty, setPanelsDirty] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeProfile) {
      setPanelsDraft(JSON.parse(JSON.stringify(activeProfile.panelArrangements || [])));
      setGlassDivisorDraft(String(activeProfile.glassWidthDivisor || 2));
      setNetDivisorDraft(String(activeProfile.mosquitoNetWidthDivisor || 2));
      setBearingDivisorDraft(String(activeProfile.bearingDivisor || 2));
      setPanelsDirty(false);
      setEditingRuleKey(null);
      setRuleDraft(null);
      setIsRenaming(false);
      setRenameValue(activeProfile.name);
    }
  }, [activeProfile?.id, activeProfile?.updatedAt]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(prev => (prev?.text === text ? null : prev)), 4000);
  };

  if (!activeProfile) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center">
        <p className="text-sm text-[#666666]">Loading fabrication profiles...</p>
      </div>
    );
  }

  const startEditRule = (rule: FabricationRuleSetting) => {
    setEditingRuleKey(rule.key);
    setRuleDraft({
      valueStr: formatRuleNumber(rule.value, rule.unit),
      unit: rule.unit,
      operator: rule.operator,
    });
  };

  const handleSaveSingleRule = async (key: FabricationRuleKey) => {
    if (!ruleDraft) return;
    const parsedVal = parseMeasurementInput(ruleDraft.valueStr);
    if (parsedVal === null || !Number.isFinite(parsedVal) || parsedVal < 0) {
      showToast('error', 'Please enter a valid non-negative decimal or fraction (e.g., 6.250, 6 1/4, 1.500, 5/8).');
      return;
    }
    try {
      const updatedRules = {
        ...activeProfile.rules,
        [key]: {
          ...activeProfile.rules[key],
          value: parsedVal,
          unit: ruleDraft.unit,
          operator: ruleDraft.operator,
        },
      };
      await onUpdateProfile(activeProfile.id, { rules: updatedRules });
      setEditingRuleKey(null);
      setRuleDraft(null);
      showToast(
        'success',
        `Saved "${activeProfile.rules[key].name}" (${ruleDraft.operator} ${formatRuleNumber(parsedVal, ruleDraft.unit)} ${ruleDraft.unit}).`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save rule setting.');
    }
  };

  const handleResetSingleRule = async (key: FabricationRuleKey) => {
    const stdDefaults = getDefaultRuleResetValues(activeProfile.trackType);
    const resetItem = stdDefaults[key];
    if (!resetItem) return;
    try {
      const updatedRules = {
        ...activeProfile.rules,
        [key]: { ...resetItem },
      };
      await onUpdateProfile(activeProfile.id, { rules: updatedRules });
      if (editingRuleKey === key) {
        setEditingRuleKey(null);
        setRuleDraft(null);
      }
      showToast(
        'success',
        `Reset "${resetItem.name}" to default (${resetItem.operator} ${formatRuleNumber(resetItem.defaultValue, resetItem.defaultUnit)} ${resetItem.defaultUnit}).`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to reset rule.');
    }
  };

  const handleCreateNewProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      showToast('error', 'Please enter a profile name (e.g., "2 Track Custom" or "3 Track Heavy").');
      return;
    }
    try {
      await onCreateProfile({
        name: trimmed,
        trackType: newProfileTrack,
        description: newProfileDesc.trim(),
        rules: getDefaultRuleResetValues(newProfileTrack),
        isDefault: false,
      });
      setShowNewProfileForm(false);
      setNewProfileName('');
      setNewProfileDesc('');
      showToast('success', `Created new profile "${trimmed}".`);
    } catch (err: any) {
      showToast('error', err?.message || 'Could not create profile.');
    }
  };

  const handleSaveRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    try {
      await onUpdateProfile(activeProfile.id, { name: trimmed });
      setIsRenaming(false);
      showToast('success', `Renamed profile to "${trimmed}".`);
    } catch (err: any) {
      showToast('error', err?.message || 'Rename failed.');
    }
  };

  const handleDuplicate = async () => {
    try {
      await onDuplicateProfile(activeProfile.id, `${activeProfile.name} Custom`);
      showToast('success', `Duplicated "${activeProfile.name}".`);
    } catch (err: any) {
      showToast('error', err?.message || 'Duplicate failed.');
    }
  };

  const handleDelete = async () => {
    try {
      await onDeleteProfile(activeProfile.id);
      showToast('success', 'Profile deleted.');
    } catch (err: any) {
      showToast('error', err?.message || 'Cannot delete this profile.');
    }
  };

  const handleSetDefault = async () => {
    try {
      await onSetDefaultProfile(activeProfile.id);
      showToast('success', `"${activeProfile.name}" is now your default ${activeProfile.trackType.toUpperCase()} profile.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update default profile.');
    }
  };

  const handleResetAllRules = async () => {
    try {
      await onResetProfile(activeProfile.id);
      showToast('success', `Reset all rules in "${activeProfile.name}" to standard defaults.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Reset failed.');
    }
  };

  const handleAddPanel = (panelType: 'glass' | 'mosquito_net') => {
    const existingCount = panelsDraft.filter(p => p.panelType === panelType).length;
    const nextPanel: PanelArrangementRule = {
      id: `${panelType}-${Date.now()}`,
      label: panelType === 'glass' ? `Glass Panel ${existingCount + 1}` : `Mosquito Net Panel ${existingCount + 1}`,
      panelType,
      widthDivisor: panelType === 'glass' ? Number(glassDivisorDraft) || 2 : Number(netDivisorDraft) || 2,
      extraWidthAdjustment: 0,
      extraWidthOperator: '+',
      extraHeightAdjustment: 0,
      extraHeightOperator: '-',
      adjustmentUnit: 'inch',
    };
    setPanelsDraft(prev => [...prev, nextPanel]);
    setPanelsDirty(true);
  };

  const handleSavePanels = async () => {
    const gDiv = Number(glassDivisorDraft);
    const nDiv = Number(netDivisorDraft);
    const bDiv = Number(bearingDivisorDraft);
    if (
      !Number.isFinite(gDiv) ||
      gDiv <= 0 ||
      !Number.isFinite(nDiv) ||
      nDiv <= 0 ||
      !Number.isFinite(bDiv) ||
      bDiv <= 0
    ) {
      showToast('error', 'Panel and bearing width divisors must be greater than 0.');
      return;
    }
    try {
      await onUpdateProfile(activeProfile.id, {
        glassWidthDivisor: gDiv,
        mosquitoNetWidthDivisor: nDiv,
        bearingDivisor: bDiv,
        glassPanelCount: Math.max(1, panelsDraft.filter(p => p.panelType === 'glass').length),
        mosquitoNetPanelCount: panelsDraft.filter(p => p.panelType === 'mosquito_net').length,
        panelArrangements: panelsDraft,
      });
      setPanelsDirty(false);
      showToast('success', 'Saved panel arrangements, divisors & bearing settings.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save panel arrangements.');
    }
  };

  const visibleRules = RULE_ORDER.map(key => activeProfile.rules[key])
    .filter(Boolean)
    .filter(rule => {
      if (categoryFilter === 'all') {
        return activeProfile.trackType === '3-track' || rule.appliesTo !== '3-track';
      }
      if (categoryFilter === '2-track') {
        return rule.appliesTo !== '3-track';
      }
      if (categoryFilter === '3-track') {
        return true;
      }
      return rule.category === categoryFilter;
    });

  return (
    <div className="space-y-6">
      {/* Status Toast */}
      {statusBanner && (
        <div
          className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 ${
            statusBanner.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Profile Management Bar */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EFEFEF]">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#1A1A1A]">
              Fabrication Profiles &amp; Editable Rules
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Every deduction and addition is driven by your saved profiles. Editing a profile never changes old saved project calculations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewProfileForm(prev => !prev)}
            className="px-4 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C89211]" />
            <span>Save New Profile</span>
          </button>
        </div>

        {/* Create New Profile Form */}
        {showNewProfileForm && (
          <form
            onSubmit={handleCreateNewProfile}
            className="mt-5 p-4 bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1A1A1A]">Create New Fabrication Profile</h3>
              <button
                type="button"
                onClick={() => setShowNewProfileForm(false)}
                className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">Profile Name</label>
                <input
                  type="text"
                  required
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  placeholder="e.g., 2 Track Custom or 3 Track Domal"
                  className="w-full px-3 py-2 bg-white border border-[#D4D4D4] rounded-lg text-sm text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">Track System</label>
                <select
                  value={newProfileTrack}
                  onChange={e => setNewProfileTrack(e.target.value as SlidingTrackType)}
                  className="w-full px-3 py-2 bg-white border border-[#D4D4D4] rounded-lg text-sm text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                >
                  <option value="2-track">2 Track System</option>
                  <option value="3-track">3 Track System (with Mosquito Net rules)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">Notes / Series (Optional)</label>
                <input
                  type="text"
                  value={newProfileDesc}
                  onChange={e => setNewProfileDesc(e.target.value)}
                  placeholder="e.g., 18mm × 50mm Jindal Section"
                  className="w-full px-3 py-2 bg-white border border-[#D4D4D4] rounded-lg text-sm text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewProfileForm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-[#C89211] hover:bg-[#A8780D] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Create Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* Saved Profiles List */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map(prof => {
            const isSelected = prof.id === activeProfile.id;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => onSelectProfile(prof.id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFFDF7] border-[#C89211] ring-1 ring-[#C89211]/30'
                    : 'bg-white border-[#E5E5E5] hover:border-[#C89211]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#1A1A1A] truncate">{prof.name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#666666]">
                      <span>{prof.trackType === '2-track' ? '2 Track' : '3 Track'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{prof.glassPanelCount} Glass</span>
                      {prof.trackType === '3-track' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{prof.mosquitoNetPanelCount} Net</span>
                        </>
                      )}
                      {prof.isDefault && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#C89211]">Default</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#C89211] shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Profile Action Controls */}
        <div className="mt-5 pt-4 border-t border-[#EFEFEF] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="px-3 py-1.5 border border-[#C89211] rounded-lg text-sm text-[#1A1A1A] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveRename}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg bg-[#C89211] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Name
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenaming(false);
                    setRenameValue(activeProfile.name);
                  }}
                  className="px-2.5 py-1.5 text-xs text-[#666666] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <div className="text-sm font-bold text-[#1A1A1A]">{activeProfile.name}</div>
                <div className="text-xs text-[#666666]">
                  {activeProfile.trackType === '2-track' ? '2 Track System' : '3 Track System'}
                  {' · '}
                  {activeProfile.isDefault ? 'Active Default Profile' : 'Custom Profile'}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isRenaming && (
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                className="px-3 py-2 rounded-lg bg-[#F8F8F6] hover:bg-[#EFEFEF] border border-[#E5E5E5] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={isSaving}
              className="px-3 py-2 rounded-lg bg-[#F8F8F6] hover:bg-[#EFEFEF] border border-[#E5E5E5] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            {!activeProfile.isDefault && (
              <button
                type="button"
                onClick={handleSetDefault}
                disabled={isSaving}
                className="px-3 py-2 rounded-lg bg-[#FFF7E3] hover:bg-[#FDECC4] border border-[#C89211]/40 text-xs font-semibold text-[#9A6E09] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Star className="w-3.5 h-3.5" />
                <span>Set Default</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetAllRules}
              disabled={isSaving}
              className="px-3 py-2 rounded-lg bg-[#F8F8F6] hover:bg-[#EFEFEF] border border-[#E5E5E5] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Profile to Default</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="px-3 py-2 rounded-lg bg-white hover:bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter + Editable Rules Table */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EFEFEF]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C89211]" />
            <h3 className="text-base font-bold text-[#1A1A1A]">
              Editable Deduction &amp; Addition Rules ({activeProfile.name})
            </h3>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar bg-[#F8F8F6] p-1 rounded-lg border border-[#E5E5E5]">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  categoryFilter === tab.id
                    ? 'bg-white text-[#1A1A1A] font-semibold shadow-xs border border-[#E5E5E5]'
                    : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeProfile.trackType === '2-track' && categoryFilter === 'mosquito-net' && (
          <div className="mt-4 p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              You are viewing a <strong>2 Track</strong> profile. Switch to a <strong>3 Track</strong> profile above to configure Mosquito Net rules separately from Glass Panel rules.
            </span>
          </div>
        )}

        <div className="mt-4 divide-y divide-[#EFEFEF]">
          {visibleRules.map(rule => {
            const isEditing = editingRuleKey === rule.key && ruleDraft;
            return (
              <div
                key={rule.key}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#1A1A1A]">{rule.name}</span>
                    <span className="text-xs text-[#777777] font-mono tabular-nums">
                      · Default: {rule.defaultOperator}{' '}
                      {formatRuleNumber(rule.defaultValue, rule.defaultUnit)} {rule.defaultUnit}
                      {rule.defaultUnit === 'inch' && formatInchFraction(rule.defaultValue, true)
                        ? ` (${formatInchFraction(rule.defaultValue, true)})`
                        : ''}
                    </span>
                  </div>
                  <p className="text-xs text-[#666666] mt-0.5 leading-relaxed">{rule.description}</p>
                </div>

                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Plus / Minus Selector */}
                    <div className="inline-flex rounded-lg border border-[#D4D4D4] overflow-hidden bg-[#F8F8F6]">
                      <button
                        type="button"
                        onClick={() => setRuleDraft({ ...ruleDraft, operator: '-' })}
                        className={`px-3 py-2 text-xs font-bold cursor-pointer ${
                          ruleDraft.operator === '-'
                            ? 'bg-[#1A1A1A] text-white'
                            : 'text-[#555555] hover:bg-[#EFEFEF]'
                        }`}
                      >
                        − Minus
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleDraft({ ...ruleDraft, operator: '+' })}
                        className={`px-3 py-2 text-xs font-bold cursor-pointer ${
                          ruleDraft.operator === '+'
                            ? 'bg-[#16803A] text-white'
                            : 'text-[#555555] hover:bg-[#EFEFEF]'
                        }`}
                      >
                        + Plus
                      </button>
                    </div>

                    {/* Decimal or Fraction Value Input */}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ruleDraft.valueStr}
                      onChange={e => setRuleDraft({ ...ruleDraft, valueStr: e.target.value })}
                      placeholder={ruleDraft.unit === 'inch' ? '6.250 or 6 1/4' : 'Value'}
                      className="w-32 px-3 py-2 bg-white border border-[#C89211] rounded-lg text-sm font-mono tabular-nums text-[#1A1A1A] focus:outline-none"
                      aria-label={`${rule.name} value`}
                    />

                    {/* Unit Selector */}
                    <select
                      value={ruleDraft.unit}
                      onChange={e =>
                        setRuleDraft({ ...ruleDraft, unit: e.target.value as WindowMeasurementUnit })
                      }
                      className="px-2.5 py-2 bg-white border border-[#D4D4D4] rounded-lg text-xs font-semibold text-[#1A1A1A]"
                      aria-label={`${rule.name} unit`}
                    >
                      <option value="inch">Inch</option>
                      <option value="mm">MM</option>
                      <option value="feet">Feet</option>
                    </select>

                    {/* Save Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveSingleRule(rule.key)}
                      disabled={isSaving}
                      className="px-3.5 py-2 rounded-lg bg-[#C89211] hover:bg-[#A8780D] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingRuleKey(null);
                        setRuleDraft(null);
                      }}
                      className="px-2.5 py-2 text-xs font-medium text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <div className="px-3.5 py-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] min-w-[140px] text-right">
                      <span
                        className={`font-mono tabular-nums text-sm font-bold ${
                          rule.operator === '+' ? 'text-[#16803A]' : 'text-[#1A1A1A]'
                        }`}
                      >
                        {rule.operator} {formatRuleNumber(rule.value, rule.unit)}
                      </span>
                      <span className="ml-1.5 text-xs text-[#666666]">{rule.unit}</span>
                      {rule.unit === 'inch' && formatInchFraction(rule.value, true) && (
                        <div className="text-[10px] font-mono text-[#8A6108]">
                          ({formatInchFraction(rule.value, true)})
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => startEditRule(rule)}
                      className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#FFF7E3] border border-[#D4D4D4] hover:border-[#C89211] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#C89211]" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetSingleRule(rule.key)}
                      disabled={isSaving}
                      className="px-3 py-2 rounded-lg bg-[#F8F8F6] hover:bg-[#EFEFEF] border border-[#E5E5E5] text-xs font-medium text-[#555555] hover:text-[#1A1A1A] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      title="Reset this setting to standard default"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Default</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Panel Arrangement & Individual Panel Overrides (Section 9) */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EFEFEF]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C89211]" />
              <h3 className="text-base font-bold text-[#1A1A1A]">
                Panel Arrangement &amp; Individual Panel Deductions
              </h3>
            </div>
            <p className="text-xs text-[#666666] mt-1">
              Customize panel split divisors (e.g. divide by 2 or 3) or apply unique width/height offsets to individual panels so unequal splits calculate accurately.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddPanel('glass')}
              className="px-3 py-2 rounded-lg bg-[#F8F8F6] hover:bg-[#EFEFEF] border border-[#E5E5E5] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Glass Panel</span>
            </button>
            {activeProfile.trackType === '3-track' && (
              <button
                type="button"
                onClick={() => handleAddPanel('mosquito_net')}
                className="px-3 py-2 rounded-lg bg-[#F8F8F6] hover:bg-[#EFEFEF] border border-[#E5E5E5] text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Net Panel</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[#EFEFEF]">
          <div>
            <label className="block text-xs font-semibold text-[#333333] mb-1">
              Default Glass Panel Width Divisor
            </label>
            <input
              type="number"
              step="any"
              min="0.5"
              value={glassDivisorDraft}
              onChange={e => {
                setGlassDivisorDraft(e.target.value);
                setPanelsDirty(true);
              }}
              className="w-full sm:w-44 px-3 py-2 bg-[#F8F8F6] border border-[#D4D4D4] rounded-lg text-sm font-mono tabular-nums text-[#1A1A1A] focus:bg-white focus:border-[#C89211] focus:outline-none"
            />
          </div>
          {activeProfile.trackType === '3-track' && (
            <div>
              <label className="block text-xs font-semibold text-[#333333] mb-1">
                Default Mosquito Net Width Divisor
              </label>
              <input
                type="number"
                step="any"
                min="0.5"
                value={netDivisorDraft}
                onChange={e => {
                  setNetDivisorDraft(e.target.value);
                  setPanelsDirty(true);
                }}
                className="w-full sm:w-44 px-3 py-2 bg-[#F8F8F6] border border-[#D4D4D4] rounded-lg text-sm font-mono tabular-nums text-[#1A1A1A] focus:bg-white focus:border-[#C89211] focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#333333] mb-1">
              Bearing Measurement (T.B.) Divisor
            </label>
            <input
              type="number"
              step="any"
              min="0.5"
              value={bearingDivisorDraft}
              onChange={e => {
                setBearingDivisorDraft(e.target.value);
                setPanelsDirty(true);
              }}
              className="w-full sm:w-44 px-3 py-2 bg-[#F8F8F6] border border-[#D4D4D4] rounded-lg text-sm font-mono tabular-nums text-[#1A1A1A] focus:bg-white focus:border-[#C89211] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-xs font-semibold text-[#666666]">
                <th className="py-2 pr-3">Panel Label</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">Width Divisor</th>
                <th className="py-2 px-2">Extra Width Offset</th>
                <th className="py-2 px-2">Extra Height Offset</th>
                <th className="py-2 px-2">Unit</th>
                <th className="py-2 pl-2 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFEF] text-xs">
              {panelsDraft.map((panel, idx) => (
                <tr key={panel.id}>
                  <td className="py-2.5 pr-3">
                    <input
                      type="text"
                      value={panel.label}
                      onChange={e => {
                        const next = [...panelsDraft];
                        next[idx] = { ...panel, label: e.target.value };
                        setPanelsDraft(next);
                        setPanelsDirty(true);
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#D4D4D4] rounded-lg text-xs text-[#1A1A1A]"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-[#555555] whitespace-nowrap">
                    {panel.panelType === 'glass' ? 'Glass Panel' : 'Mosquito Net'}
                  </td>
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      step="any"
                      min="0.5"
                      value={panel.widthDivisor}
                      onChange={e => {
                        const next = [...panelsDraft];
                        next[idx] = { ...panel, widthDivisor: Number(e.target.value) || 1 };
                        setPanelsDraft(next);
                        setPanelsDirty(true);
                      }}
                      className="w-20 px-2 py-1.5 border border-[#D4D4D4] rounded-lg font-mono tabular-nums text-xs"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={panel.extraWidthOperator}
                        onChange={e => {
                          const next = [...panelsDraft];
                          next[idx] = { ...panel, extraWidthOperator: e.target.value as RuleOperator };
                          setPanelsDraft(next);
                          setPanelsDirty(true);
                        }}
                        className="px-1.5 py-1.5 border border-[#D4D4D4] rounded-lg text-xs font-bold"
                      >
                        <option value="+">+</option>
                        <option value="-">−</option>
                      </select>
                      <div className="w-24">
                        <MeasurementInput
                          value={panel.extraWidthAdjustment}
                          unit={panel.adjustmentUnit}
                          allowZero
                          onValueChange={val => {
                            const next = [...panelsDraft];
                            next[idx] = { ...panel, extraWidthAdjustment: val ?? 0 };
                            setPanelsDraft(next);
                            setPanelsDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border border-[#D4D4D4] rounded-lg font-mono tabular-nums text-xs"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={panel.extraHeightOperator}
                        onChange={e => {
                          const next = [...panelsDraft];
                          next[idx] = { ...panel, extraHeightOperator: e.target.value as RuleOperator };
                          setPanelsDraft(next);
                          setPanelsDirty(true);
                        }}
                        className="px-1.5 py-1.5 border border-[#D4D4D4] rounded-lg text-xs font-bold"
                      >
                        <option value="-">−</option>
                        <option value="+">+</option>
                      </select>
                      <div className="w-24">
                        <MeasurementInput
                          value={panel.extraHeightAdjustment}
                          unit={panel.adjustmentUnit}
                          allowZero
                          onValueChange={val => {
                            const next = [...panelsDraft];
                            next[idx] = { ...panel, extraHeightAdjustment: val ?? 0 };
                            setPanelsDraft(next);
                            setPanelsDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border border-[#D4D4D4] rounded-lg font-mono tabular-nums text-xs"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      value={panel.adjustmentUnit}
                      onChange={e => {
                        const next = [...panelsDraft];
                        next[idx] = { ...panel, adjustmentUnit: e.target.value as WindowMeasurementUnit };
                        setPanelsDraft(next);
                        setPanelsDirty(true);
                      }}
                      className="px-2 py-1.5 border border-[#D4D4D4] rounded-lg text-xs"
                    >
                      <option value="inch">in</option>
                      <option value="mm">mm</option>
                      <option value="feet">ft</option>
                    </select>
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    <button
                      type="button"
                      disabled={panelsDraft.filter(p => p.panelType === 'glass').length <= 1 && panel.panelType === 'glass'}
                      onClick={() => {
                        setPanelsDraft(prev => prev.filter((_, i) => i !== idx));
                        setPanelsDirty(true);
                      }}
                      className="p-1.5 text-[#777777] hover:text-[#B91C1C] disabled:opacity-30 cursor-pointer"
                      aria-label={`Remove ${panel.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {panelsDirty && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSavePanels}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-[#C89211] hover:bg-[#A8780D] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Panel Arrangement</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
