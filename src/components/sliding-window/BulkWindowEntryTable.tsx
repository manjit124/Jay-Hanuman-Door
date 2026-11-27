import React, { useState } from 'react';
import {
  Plus,
  Calculator,
  Save,
  Edit3,
  Copy,
  Trash2,
  Download,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Search,
  Eye,
  FileImage,
} from 'lucide-react';
import type {
  FabricationProfile,
  SlidingTrackType,
  SlidingWindowCalculationResult,
  SlidingWindowInput,
  WindowMeasurementUnit,
} from '../../types.ts';
import {
  GLASS_THICKNESS_OPTIONS,
  WINDOW_CONFIGURATION_OPTIONS,
} from '../../data/slidingWindowDefaults.ts';
import { formatMeasurement } from '../../lib/slidingWindowEngine.ts';
import { MeasurementInput } from './MeasurementInput.tsx';

interface BulkWindowEntryTableProps {
  windows: SlidingWindowInput[];
  resultsById: Record<string, SlidingWindowCalculationResult>;
  profiles: FabricationProfile[];
  defaultUnit: WindowMeasurementUnit;
  onAddWindows: (count: number) => void;
  onUpdateWindow: (id: string, updates: Partial<SlidingWindowInput>) => void;
  onDuplicateWindow: (id: string) => void;
  onDeleteWindow: (id: string) => void;
  onCalculateSingle: (id: string) => void;
  onCalculateAll: () => void;
  onOpenDrawing: (id: string) => void;
  onSaveProject: () => void;
  onDownloadPdf: () => void;
  onExportAllDrawingsPdf: () => void;
  onExportExcel: () => void;
  isSavingProject?: boolean;
  hasValidResults?: boolean;
}

export const BulkWindowEntryTable: React.FC<BulkWindowEntryTableProps> = ({
  windows,
  resultsById,
  profiles,
  defaultUnit,
  onAddWindows,
  onUpdateWindow,
  onDuplicateWindow,
  onDeleteWindow,
  onCalculateSingle,
  onCalculateAll,
  onOpenDrawing,
  onSaveProject,
  onDownloadPdf,
  onExportAllDrawingsPdf,
  onExportExcel,
  isSavingProject = false,
  hasValidResults = false,
}) => {
  const [editAllMode, setEditAllMode] = useState<boolean>(true);
  const [editingRowIds, setEditingRowIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWindowId, setSelectedWindowId] = useState<string>('');

  const isRowEditing = (id: string) => editAllMode || Boolean(editingRowIds[id]);

  const toggleRowEdit = (id: string) => {
    if (editAllMode) {
      setEditAllMode(false);
      const next: Record<string, boolean> = {};
      windows.forEach(w => {
        if (w.id !== id) next[w.id] = false;
      });
      next[id] = true;
      setEditingRowIds(next);
      return;
    }
    setEditingRowIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTrackChange = (w: SlidingWindowInput, nextTrack: SlidingTrackType) => {
    const matchingProfile =
      profiles.find(p => p.trackType === nextTrack && p.isDefault) ||
      profiles.find(p => p.trackType === nextTrack) ||
      profiles[0];
    const nextConfig = WINDOW_CONFIGURATION_OPTIONS[nextTrack][0];
    onUpdateWindow(w.id, {
      trackType: nextTrack,
      profileId: matchingProfile?.id || w.profileId,
      configuration: nextConfig,
      mosquitoNetRequired: nextTrack === '3-track' ? true : false,
    });
  };

  const filteredWindows = windows.filter(w => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.windowNumber.toLowerCase().includes(q) ||
      w.configuration.toLowerCase().includes(q) ||
      w.trackType.toLowerCase().includes(q) ||
      (w.notes || '').toLowerCase().includes(q)
    );
  });

  const duplicateSelectedOrLast = () => {
    const targetId = selectedWindowId || windows[windows.length - 1]?.id;
    if (targetId) onDuplicateWindow(targetId);
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
      {/* Bulk Action Toolbar */}
      <div className="px-4 py-3.5 bg-[#F8F8F6] border-b border-[#E5E5E5] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAddWindows(1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A1A1A] hover:bg-black text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E6B33A]" />
            Add Window
          </button>

          <button
            type="button"
            onClick={() => onAddWindows(5)}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            +5 Rows
          </button>

          <button
            type="button"
            onClick={() => onAddWindows(10)}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            +10 Rows
          </button>

          <button
            type="button"
            onClick={onCalculateAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C89211] hover:bg-[#A6780E] text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
            Calculate All ({windows.length})
          </button>

          <button
            type="button"
            onClick={onSaveProject}
            disabled={isSavingProject || windows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#FFF7E3] text-[#1A1A1A] border border-[#C89211]/50 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-[#C89211]" />
            {isSavingProject ? 'Saving...' : 'Save Project'}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditAllMode(prev => !prev);
              setEditingRowIds({});
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              editAllMode
                ? 'bg-[#FFF7E3] text-[#8E6506] border-[#C89211]/50'
                : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-[#F3F3F0]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editAllMode ? 'Editing All' : 'Edit All'}
          </button>

          <button
            type="button"
            onClick={duplicateSelectedOrLast}
            disabled={windows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F3F3F0] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5 text-[#666666]" />
            Duplicate Window
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none sm:w-44">
            <Search className="w-3.5 h-3.5 text-[#777777] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter W1, 3-track..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#E5E5E5] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
            />
          </div>

          <button
            type="button"
            onClick={onExportAllDrawingsPdf}
            disabled={!hasValidResults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#C89211] hover:bg-[#A6780E] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40"
          >
            <FileImage className="w-3.5 h-3.5" />
            Export All Drawings
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={!hasValidResults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A1A1A] hover:bg-black text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#E6B33A]" />
            Cutting PDF
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={!hasValidResults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F3F3F0] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#1D6F42]" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Bulk Entry Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[1040px]">
          <thead className="sticky top-0 z-10 bg-[#F8F8F6] border-b border-[#E5E5E5]">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              <th className="py-2.5 px-3 w-24">Window No.</th>
              <th className="py-2.5 px-2.5 w-24">Width</th>
              <th className="py-2.5 px-2.5 w-24">Height</th>
              <th className="py-2.5 px-2 w-20">Unit</th>
              <th className="py-2.5 px-2.5 w-28">Track</th>
              <th className="py-2.5 px-2.5 w-48">Configuration &amp; Profile</th>
              <th className="py-2.5 px-2 w-24">Glass / Net</th>
              <th className="py-2.5 px-3 min-w-[240px]">Calculated Fabrication Summary</th>
              <th className="py-2.5 px-3 text-right w-40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFECE6] text-xs">
            {filteredWindows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-[#666666]">
                  No windows match your filter. Click <strong>Add Window</strong> to add entries.
                </td>
              </tr>
            ) : (
              filteredWindows.map(win => {
                const editing = isRowEditing(win.id);
                const result = resultsById[win.id];
                const isSelected = selectedWindowId === win.id;
                const trackProfiles = profiles.filter(p => p.trackType === win.trackType);
                const configOptions = WINDOW_CONFIGURATION_OPTIONS[win.trackType];
                const activeProfile =
                  profiles.find(p => p.id === win.profileId) || trackProfiles[0] || profiles[0];

                return (
                  <tr
                    key={win.id}
                    onClick={() => setSelectedWindowId(win.id)}
                    className={`transition-colors ${
                      isSelected ? 'bg-[#FFFBF0]' : 'hover:bg-[#FAFAFA]'
                    }`}
                  >
                    {/* Window No. */}
                    <td className="py-2.5 px-3 align-top">
                      {editing ? (
                        <input
                          type="text"
                          value={win.windowNumber}
                          onChange={e => onUpdateWindow(win.id, { windowNumber: e.target.value })}
                          className="w-full px-2 py-1.5 border border-[#DCDCDC] rounded-md text-xs font-semibold text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                        />
                      ) : (
                        <span className="font-bold text-[#1A1A1A] font-mono">{win.windowNumber}</span>
                      )}
                    </td>

                    {/* Width */}
                    <td className="py-2.5 px-2.5 align-top">
                      {editing ? (
                        <MeasurementInput
                          value={win.width}
                          unit={win.unit}
                          ariaLabel={`Width for ${win.windowNumber}`}
                          placeholder={win.unit === 'inch' ? '36 1/2' : 'Width'}
                          onValueChange={val => onUpdateWindow(win.id, { width: val ?? 0 })}
                          className="w-full px-2 py-1.5 border border-[#DCDCDC] rounded-md text-xs font-mono tabular-nums text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                        />
                      ) : (
                        <span className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                          {formatMeasurement(win.width, win.unit)}
                        </span>
                      )}
                    </td>

                    {/* Height */}
                    <td className="py-2.5 px-2.5 align-top">
                      {editing ? (
                        <MeasurementInput
                          value={win.height}
                          unit={win.unit}
                          ariaLabel={`Height for ${win.windowNumber}`}
                          placeholder={win.unit === 'inch' ? '48 1/4' : 'Height'}
                          onValueChange={val => onUpdateWindow(win.id, { height: val ?? 0 })}
                          className="w-full px-2 py-1.5 border border-[#DCDCDC] rounded-md text-xs font-mono tabular-nums text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                        />
                      ) : (
                        <span className="font-mono tabular-nums font-semibold text-[#1A1A1A]">
                          {formatMeasurement(win.height, win.unit)}
                        </span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2 align-top">
                      {editing ? (
                        <select
                          value={win.unit || defaultUnit}
                          onChange={e =>
                            onUpdateWindow(win.id, {
                              unit: e.target.value as WindowMeasurementUnit,
                            })
                          }
                          className="w-full px-1.5 py-1.5 border border-[#DCDCDC] rounded-md text-xs text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                        >
                          <option value="inch">Inch</option>
                          <option value="feet">Feet</option>
                          <option value="mm">MM</option>
                        </select>
                      ) : (
                        <span className="text-[#555555] uppercase text-[11px] font-semibold">
                          {win.unit}
                        </span>
                      )}
                    </td>

                    {/* Track Type */}
                    <td className="py-2.5 px-2.5 align-top">
                      {editing ? (
                        <select
                          value={win.trackType}
                          onChange={e =>
                            handleTrackChange(win, e.target.value as SlidingTrackType)
                          }
                          className="w-full px-2 py-1.5 border border-[#DCDCDC] rounded-md text-xs font-semibold text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                        >
                          <option value="2-track">2 Track</option>
                          <option value="3-track">3 Track</option>
                        </select>
                      ) : (
                        <span className="font-semibold text-[#1A1A1A]">
                          {win.trackType === '3-track' ? '3 Track' : '2 Track'}
                        </span>
                      )}
                    </td>

                    {/* Configuration & Profile */}
                    <td className="py-2.5 px-2.5 align-top space-y-1.5">
                      {editing ? (
                        <>
                          <select
                            value={win.configuration}
                            onChange={e =>
                              onUpdateWindow(win.id, { configuration: e.target.value })
                            }
                            className="w-full px-2 py-1 border border-[#DCDCDC] rounded-md text-[11px] text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                          >
                            {configOptions.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <select
                            value={activeProfile?.id || ''}
                            onChange={e => onUpdateWindow(win.id, { profileId: e.target.value })}
                            className="w-full px-2 py-1 border border-[#DCDCDC] rounded-md text-[11px] text-[#555555] bg-[#F8F8F6] focus:outline-none focus:border-[#C89211]"
                          >
                            {(trackProfiles.length > 0 ? trackProfiles : profiles).map(prof => (
                              <option key={prof.id} value={prof.id}>
                                Profile: {prof.name}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{win.configuration}</div>
                          <div className="text-[11px] text-[#666666] mt-0.5">
                            {activeProfile?.name || 'Default Profile'}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Glass Thickness & Mosquito Net */}
                    <td className="py-2.5 px-2 align-top space-y-1.5">
                      {editing ? (
                        <>
                          <select
                            value={win.glassThickness}
                            onChange={e =>
                              onUpdateWindow(win.id, { glassThickness: e.target.value })
                            }
                            className="w-full px-1.5 py-1 border border-[#DCDCDC] rounded-md text-[11px] text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                          >
                            {GLASS_THICKNESS_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1.5 text-[11px] text-[#444444] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={win.mosquitoNetRequired}
                              onChange={e =>
                                onUpdateWindow(win.id, {
                                  mosquitoNetRequired: e.target.checked,
                                })
                              }
                              className="rounded border-[#CCCCCC] accent-[#C89211]"
                            />
                            Net: {win.mosquitoNetRequired ? 'Yes' : 'No'}
                          </label>
                        </>
                      ) : (
                        <div className="text-[11px] text-[#444444]">
                          <div>{win.glassThickness}</div>
                          <div className="text-[#666666]">
                            Net: {win.mosquitoNetRequired ? 'Yes' : 'No'}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Inline Calculated Output Summary */}
                    <td className="py-2.5 px-3 align-top">
                      {!result ? (
                        <span className="text-[11px] text-[#888888]">
                          Not calculated yet
                        </span>
                      ) : !result.isValid ? (
                        <div className="flex items-start gap-1.5 text-[11px] text-[#B42318]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{result.errors[0]}</span>
                        </div>
                      ) : (
                        <div className="space-y-1 text-[11px] font-mono tabular-nums">
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[#1A1A1A]">
                            <span>
                              <strong className="font-sans text-[#666666]">Track:</strong>{' '}
                              {formatMeasurement(result.fabrication.topTrackDisplay, result.displayUnit)}
                              {result.fabrication.topTrackDisplay !==
                              result.fabrication.bottomTrackDisplay
                                ? ` / ${formatMeasurement(
                                    result.fabrication.bottomTrackDisplay,
                                    result.displayUnit
                                  )}`
                                : ''}
                            </span>
                            <span>
                              <strong className="font-sans text-[#666666]">Hdl/Int:</strong>{' '}
                              {formatMeasurement(result.fabrication.handleDisplay, result.displayUnit)}
                              {result.fabrication.handleDisplay !==
                              result.fabrication.interlockDisplay
                                ? ` / ${formatMeasurement(
                                    result.fabrication.interlockDisplay,
                                    result.displayUnit
                                  )}`
                                : ''}
                            </span>
                          </div>
                          {Number.isFinite(result.fabrication.topBearingDisplay) && (
                            <div className="text-[#92400E]">
                              <strong className="font-sans">T.B. Bearing (T/B):</strong>{' '}
                              {formatMeasurement(result.fabrication.topBearingDisplay, result.displayUnit)}
                              {result.fabrication.topBearingDisplay !==
                              result.fabrication.bottomBearingDisplay
                                ? ` / ${formatMeasurement(
                                    result.fabrication.bottomBearingDisplay,
                                    result.displayUnit
                                  )}`
                                : ''}
                            </div>
                          )}
                          {result.glassPanels.length > 0 && (
                            <div className="text-[#0F5132]">
                              <strong className="font-sans">Glass ({result.glassPanels.length}x):</strong>{' '}
                              {formatMeasurement(result.glassPanels[0].widthDisplay, result.displayUnit)} ×{' '}
                              {formatMeasurement(result.glassPanels[0].heightDisplay, result.displayUnit)}
                            </div>
                          )}
                          {result.mosquitoNetPanels.length > 0 && (
                            <div className="text-[#8E6506]">
                              <strong className="font-sans">Net ({result.mosquitoNetPanels.length}x):</strong>{' '}
                              {formatMeasurement(
                                result.mosquitoNetPanels[0].widthDisplay,
                                result.displayUnit
                              )}{' '}
                              ×{' '}
                              {formatMeasurement(
                                result.mosquitoNetPanels[0].heightDisplay,
                                result.displayUnit
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td className="py-2.5 px-3 align-top text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onCalculateSingle(win.id);
                          }}
                          title="Calculate this window"
                          className="p-1.5 rounded-md bg-[#FFF7E3] hover:bg-[#C89211] text-[#8E6506] hover:text-white border border-[#C89211]/40 transition-colors cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onOpenDrawing(win.id);
                          }}
                          title="Open Technical Window Drawing"
                          className="p-1.5 rounded-md bg-[#EFF6FF] hover:bg-[#0284C7] text-[#0369A1] hover:text-white border border-[#BAE6FD] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            toggleRowEdit(win.id);
                          }}
                          title={editing ? 'Done editing row' : 'Edit row'}
                          className="p-1.5 rounded-md bg-white hover:bg-[#F3F3F0] text-[#444444] border border-[#E5E5E5] transition-colors cursor-pointer"
                        >
                          {editing ? <Check className="w-3.5 h-3.5 text-[#0F5132]" /> : <Edit3 className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDuplicateWindow(win.id);
                          }}
                          title="Duplicate window"
                          className="p-1.5 rounded-md bg-white hover:bg-[#F3F3F0] text-[#444444] border border-[#E5E5E5] transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteWindow(win.id);
                          }}
                          title="Delete window"
                          disabled={windows.length <= 1}
                          className="p-1.5 rounded-md bg-white hover:bg-[#FEF3F2] text-[#B42318] border border-[#E5E5E5] transition-colors cursor-pointer disabled:opacity-35"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info strip */}
      <div className="px-4 py-2.5 bg-[#F8F8F6] border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#666666]">
        <span>
          Showing <strong className="text-[#1A1A1A]">{filteredWindows.length}</strong> of{' '}
          <strong className="text-[#1A1A1A]">{windows.length}</strong> window entries (supports 50+ windows per project)
        </span>
        <span>
          Every row computes directly from its selected saved profile rules — zero hardcoded deductions.
        </span>
      </div>
    </div>
  );
};
