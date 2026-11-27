import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileImage,
  Ruler,
} from 'lucide-react';
import type {
  BusinessSettings,
  SlidingWindowCalculationResult,
  WindowMeasurementUnit,
} from '../../types.ts';
import {
  formatInchDecimal,
  formatInchFraction,
  formatMeasurement,
} from '../../lib/slidingWindowEngine.ts';
import { WindowTechnicalDrawing } from './WindowTechnicalDrawing.tsx';

interface CuttingListReportViewProps {
  results: SlidingWindowCalculationResult[];
  projectName: string;
  customerName: string;
  settings?: BusinessSettings;
  showMmReference?: boolean;
  onDownloadPdf?: () => void;
  onExportExcel?: () => void;
  onExportAllDrawingsPdf?: () => void;
}

function formatInchWithOptionalFrac(inchVal: number): string {
  const dec = `${formatInchDecimal(inchVal)}"`;
  const frac = formatInchFraction(inchVal, true);
  return frac ? `${dec} (${frac})` : dec;
}

function formatPrimaryAndRef(
  displayVal: number,
  inchVal: number,
  mmVal: number,
  unit: WindowMeasurementUnit,
  showMm: boolean
): string {
  const primary = formatMeasurement(displayVal, unit);
  const frac = formatInchFraction(inchVal, true);
  if (!showMm) {
    return unit === 'inch' && frac ? `${primary} (${frac})` : primary;
  }
  if (unit === 'mm') return `${primary} (${formatInchWithOptionalFrac(inchVal)})`;
  if (unit === 'inch') {
    return frac ? `${primary} (${frac} · ${mmVal} mm)` : `${primary} (${mmVal} mm)`;
  }
  return `${primary} (${formatInchWithOptionalFrac(inchVal)} · ${mmVal} mm)`;
}

export const CuttingListReportView: React.FC<CuttingListReportViewProps> = ({
  results,
  projectName,
  customerName,
  settings,
  showMmReference = true,
  onDownloadPdf,
  onExportExcel,
  onExportAllDrawingsPdf,
}) => {
  const [expandedBreakdownIds, setExpandedBreakdownIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (results.length === 1) {
      initial[results[0].windowId] = true;
    }
    return initial;
  });

  const [hiddenDrawingIds, setHiddenDrawingIds] = useState<Record<string, boolean>>({});

  const toggleBreakdown = (id: string) => {
    setExpandedBreakdownIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDrawing = (id: string) => {
    setHiddenDrawingIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (results.length === 0) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center">
        <Ruler className="w-8 h-8 text-[#C89211] mx-auto mb-2" />
        <h3 className="text-base font-bold text-[#1A1A1A]">No Fabrication Report Calculated Yet</h3>
        <p className="text-xs sm:text-sm text-[#666666] mt-1">
          Enter window dimensions and click Calculate to generate Top Track, Bottom Track, Handle, Interlock, Glass, and Mosquito Net cutting sizes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Report Toolbar */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A]">
            Final Fabrication Cutting Report
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#666666]">
            <span>{projectName || 'Window Fabrication Project'}</span>
            {customerName && (
              <>
                <span aria-hidden="true">·</span>
                <span>Customer: {customerName}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{results.length} Window{results.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onExportAllDrawingsPdf && (
            <button
              type="button"
              onClick={onExportAllDrawingsPdf}
              className="px-3.5 py-2 rounded-lg bg-[#C89211] hover:bg-[#A6780E] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Export All Drawings (PDF)</span>
            </button>
          )}
          {onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="px-3.5 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Download Cutting PDF</span>
            </button>
          )}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#D4D4D4] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#16803A]" />
              <span>Export Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Individual Window Report Cards */}
      {results.map(res => {
        const u = res.displayUnit;
        const isBreakdownOpen = Boolean(expandedBreakdownIds[res.windowId]);
        const isDrawingVisible = !hiddenDrawingIds[res.windowId];
        const hasBearing =
          Number.isFinite(res.fabrication.topBearingInch) &&
          Number.isFinite(res.fabrication.bottomBearingInch);

        return (
          <div
            key={res.windowId}
            className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden"
          >
            {/* Window Title Row */}
            <div className="px-5 py-4 bg-[#F8F8F6] border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">
                  Window {res.windowNumber}
                </h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#555555]">
                  <span>{res.original.trackType === '2-track' ? '2 Track System' : '3 Track System'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{res.original.configuration}</span>
                  <span aria-hidden="true">·</span>
                  <span>Glass: {res.original.glassThickness}</span>
                  <span aria-hidden="true">·</span>
                  <span>Profile: {res.profileUsed.name}</span>
                </div>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#1A1A1A] font-semibold">
                Opening: {formatMeasurement(res.original.width, u)} × {formatMeasurement(res.original.height, u)}
              </div>
            </div>

            {/* Validation Errors */}
            {!res.isValid && res.errors.length > 0 && (
              <div className="p-5 bg-[#FEF2F2] border-b border-[#FECACA] text-xs text-[#991B1B] space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Calculation Blocked — Missing or Invalid Measurements</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {res.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {res.warnings.length > 0 && (
              <div className="px-5 py-3 bg-[#FFFBEB] border-b border-[#FDE68A] text-xs text-[#92400E] space-y-1">
                {res.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {res.isValid && (
              <div className="p-5 space-y-6">
                {/* 1. Original Window Measurements */}
                <div>
                  <h4 className="text-xs font-bold text-[#666666] tracking-wide mb-2.5">
                    01. Original Window Measurements
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#EFEFEF]">
                    <div>
                      <div className="text-xs text-[#666666]">Window Number</div>
                      <div className="text-sm font-bold text-[#1A1A1A] font-mono tabular-nums mt-0.5">
                        {res.windowNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#666666]">Original Width</div>
                      <div className="text-sm font-bold text-[#1A1A1A] font-mono tabular-nums mt-0.5">
                        {formatPrimaryAndRef(res.original.width, res.original.widthInch, res.original.widthMm, u, showMmReference)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#666666]">Original Height</div>
                      <div className="text-sm font-bold text-[#1A1A1A] font-mono tabular-nums mt-0.5">
                        {formatPrimaryAndRef(res.original.height, res.original.heightInch, res.original.heightMm, u, showMmReference)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#666666]">Track &amp; Net</div>
                      <div className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                        {res.original.trackType === '2-track' ? '2 Track' : '3 Track'} · Net: {res.original.mosquitoNetRequired ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Calculated Fabrication Measurements (Aluminium Sections) */}
                <div>
                  <h4 className="text-xs font-bold text-[#666666] tracking-wide mb-2.5">
                    02. Calculated Fabrication Measurements (Aluminium Sections)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#EFEFEF]">
                    <div className="p-3.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]">
                      <div className="text-xs text-[#666666]">1. Top Track Size</div>
                      <div className="text-lg font-bold text-[#1A1A1A] font-mono tabular-nums mt-1">
                        {formatMeasurement(res.fabrication.topTrackDisplay, u)}
                      </div>
                      <div className="text-[11px] text-[#666666] font-mono tabular-nums mt-0.5">
                        {formatInchWithOptionalFrac(res.fabrication.topTrackInch)}
                        {showMmReference ? ` · ${res.fabrication.topTrackMm} mm` : ''}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]">
                      <div className="text-xs text-[#666666]">2. Bottom Track Size</div>
                      <div className="text-lg font-bold text-[#1A1A1A] font-mono tabular-nums mt-1">
                        {formatMeasurement(res.fabrication.bottomTrackDisplay, u)}
                      </div>
                      <div className="text-[11px] text-[#666666] font-mono tabular-nums mt-0.5">
                        {formatInchWithOptionalFrac(res.fabrication.bottomTrackInch)}
                        {showMmReference ? ` · ${res.fabrication.bottomTrackMm} mm` : ''}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#FFFDF7] border border-[#E6D3A3]">
                      <div className="text-xs text-[#8A6108] font-medium">Handle Cutting Size</div>
                      <div className="text-lg font-bold text-[#1A1A1A] font-mono tabular-nums mt-1">
                        {formatMeasurement(res.fabrication.handleDisplay, u)}
                      </div>
                      <div className="text-[11px] text-[#666666] font-mono tabular-nums mt-0.5">
                        {formatInchWithOptionalFrac(res.fabrication.handleInch)}
                        {showMmReference ? ` · ${res.fabrication.handleMm} mm` : ''}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#FFFDF7] border border-[#E6D3A3]">
                      <div className="text-xs text-[#8A6108] font-medium">Interlock Cutting Size</div>
                      <div className="text-lg font-bold text-[#1A1A1A] font-mono tabular-nums mt-1">
                        {formatMeasurement(res.fabrication.interlockDisplay, u)}
                      </div>
                      <div className="text-[11px] text-[#666666] font-mono tabular-nums mt-0.5">
                        {formatInchWithOptionalFrac(res.fabrication.interlockInch)}
                        {showMmReference ? ` · ${res.fabrication.interlockMm} mm` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. BEARING MEASUREMENT – Top & Bottom Track (T.B.) */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                    <h4 className="text-xs font-bold text-[#9A6E09] tracking-wide">
                      03. BEARING MEASUREMENT — Top &amp; Bottom Track (T.B.)
                    </h4>
                    <span className="text-[11px] text-[#666666]">
                      Independent of glass width · Separately editable Top &amp; Bottom rules
                    </span>
                  </div>

                  {hasBearing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EFEFEF]">
                      <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#F59E0B]/40">
                        <div className="text-xs font-semibold text-[#92400E]">
                          1. Top Track (T.B.) Bearing Measurement
                        </div>
                        <div className="text-xl font-bold text-[#78350F] font-mono tabular-nums mt-1">
                          {formatMeasurement(res.fabrication.topBearingDisplay, u)}
                        </div>
                        <div className="text-[11px] text-[#92400E] font-mono tabular-nums mt-1">
                          {formatInchWithOptionalFrac(res.fabrication.topBearingInch)}
                          {showMmReference ? ` · ${res.fabrication.topBearingMm} mm` : ''}
                          {Number.isFinite(res.fabrication.bearingRemainingInch)
                            ? ` · Remaining Base: ${formatInchWithOptionalFrac(res.fabrication.bearingRemainingInch)}`
                            : ''}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#F59E0B]/40">
                        <div className="text-xs font-semibold text-[#92400E]">
                          2. Bottom Track (T.B.) Bearing Measurement
                        </div>
                        <div className="text-xl font-bold text-[#78350F] font-mono tabular-nums mt-1">
                          {formatMeasurement(res.fabrication.bottomBearingDisplay, u)}
                        </div>
                        <div className="text-[11px] text-[#92400E] font-mono tabular-nums mt-1">
                          {formatInchWithOptionalFrac(res.fabrication.bottomBearingInch)}
                          {showMmReference ? ` · ${res.fabrication.bottomBearingMm} mm` : ''}
                          {Number.isFinite(res.fabrication.bearingRemainingInch)
                            ? ` · Remaining Base: ${formatInchWithOptionalFrac(res.fabrication.bearingRemainingInch)}`
                            : ''}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-xs text-[#666666]">
                      Bearing measurement was not stored on this legacy snapshot. Re-calculate to compute Top &amp; Bottom T.B. bearings.
                    </div>
                  )}
                </div>

                {/* 4. Final Glass Cutting Measurements */}
                <div>
                  <h4 className="text-xs font-bold text-[#666666] tracking-wide mb-2.5">
                    04. Final Glass Cutting Measurements (Width × Height)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-[#EFEFEF]">
                    {res.glassPanels.map(gp => {
                      const wFrac = formatInchFraction(gp.widthInch, true);
                      const hFrac = formatInchFraction(gp.heightInch, true);
                      return (
                        <div
                          key={gp.id}
                          className="p-4 rounded-lg bg-white border border-[#D4D4D4]"
                        >
                          <div className="text-xs font-semibold text-[#555555]">{gp.label}</div>
                          <div className="text-xl font-bold text-[#1A1A1A] font-mono tabular-nums mt-1">
                            {formatMeasurement(gp.widthDisplay, u)} × {formatMeasurement(gp.heightDisplay, u)}
                          </div>
                          {(wFrac || hFrac) && (
                            <div className="text-[11px] text-[#8A6108] font-mono tabular-nums mt-0.5">
                              Fraction: {wFrac || `${formatInchDecimal(gp.widthInch)}"`} × {hFrac || `${formatInchDecimal(gp.heightInch)}"`}
                            </div>
                          )}
                          <div className="text-xs text-[#666666] font-mono tabular-nums mt-1">
                            {formatInchDecimal(gp.widthInch)}&quot; × {formatInchDecimal(gp.heightInch)}&quot;
                            {showMmReference ? ` · ${gp.widthMm} × ${gp.heightMm} mm` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Final Mosquito Net Cutting Measurements */}
                {res.mosquitoNetPanels.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#166534] tracking-wide mb-2.5">
                      05. Final Mosquito Net Cutting Measurements (Independent Net Rules · Width × Height)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-[#DCFCE7]">
                      {res.mosquitoNetPanels.map(np => {
                        const wFrac = formatInchFraction(np.widthInch, true);
                        const hFrac = formatInchFraction(np.heightInch, true);
                        return (
                          <div
                            key={np.id}
                            className="p-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]"
                          >
                            <div className="text-xs font-semibold text-[#166534]">{np.label}</div>
                            <div className="text-xl font-bold text-[#14532D] font-mono tabular-nums mt-1">
                              {formatMeasurement(np.widthDisplay, u)} × {formatMeasurement(np.heightDisplay, u)}
                            </div>
                            {(wFrac || hFrac) && (
                              <div className="text-[11px] text-[#15803D] font-mono tabular-nums mt-0.5">
                                Fraction: {wFrac || `${formatInchDecimal(np.widthInch)}"`} × {hFrac || `${formatInchDecimal(np.heightInch)}"`}
                              </div>
                            )}
                            <div className="text-xs text-[#166534] font-mono tabular-nums mt-1">
                              {formatInchDecimal(np.widthInch)}&quot; × {formatInchDecimal(np.heightInch)}&quot;
                              {showMmReference ? ` · ${np.widthMm} × ${np.heightMm} mm` : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Automatic Technical Window Drawing */}
                <div className="pt-2 border-t border-[#EFEFEF]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-[#666666] tracking-wide">
                      06. Automatic Technical Window Drawing (Elevation &amp; Dimension Callouts)
                    </h4>
                    <button
                      type="button"
                      onClick={() => toggleDrawing(res.windowId)}
                      className="text-xs font-semibold text-[#C89211] hover:underline cursor-pointer"
                    >
                      {isDrawingVisible ? 'Hide Drawing' : 'Show Drawing'}
                    </button>
                  </div>

                  {isDrawingVisible && (
                    <WindowTechnicalDrawing
                      result={res}
                      projectName={projectName}
                      customerName={customerName}
                      settings={settings}
                      compact={results.length > 1}
                    />
                  )}
                </div>

                {/* Step-by-Step Calculation Breakdown */}
                <div className="pt-2 border-t border-[#EFEFEF]">
                  <button
                    type="button"
                    onClick={() => toggleBreakdown(res.windowId)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-[#1A1A1A] hover:text-[#C89211] py-1 cursor-pointer"
                  >
                    <span>Step-by-Step Calculation Breakdown (Verify Every Deduction &amp; Addition)</span>
                    {isBreakdownOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isBreakdownOpen && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#E5E5E5] text-[#666666]">
                            <th className="py-2 pr-3 font-semibold">Step</th>
                            <th className="py-2 px-3 font-semibold">Applied Formula</th>
                            <th className="py-2 pl-3 text-right font-semibold">Result ({u})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2F2F2]">
                          {res.breakdown.map((step, sIdx) => {
                            const stepFrac = u === 'inch' ? formatInchFraction(step.valueInch, true) : null;
                            return (
                              <tr key={sIdx}>
                                <td className="py-2 pr-3 font-medium text-[#1A1A1A]">{step.label}</td>
                                <td className="py-2 px-3 font-mono tabular-nums text-[#555555]">{step.formula}</td>
                                <td className="py-2 pl-3 text-right font-mono tabular-nums font-bold text-[#1A1A1A] whitespace-nowrap">
                                  {formatMeasurement(step.valueDisplay, u)}
                                  {stepFrac && (
                                    <span className="ml-1.5 font-normal text-[11px] text-[#8A6108]">
                                      ({stepFrac})
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
