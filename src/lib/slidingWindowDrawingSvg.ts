import type {
  CalculatedPanelDimension,
  SlidingWindowCalculationResult,
  WindowMeasurementUnit,
} from '../types.ts';
import { formatInchDecimal, formatInchFraction, formatMeasurement } from './slidingWindowEngine.ts';

export interface TechnicalDrawingMeta {
  projectName?: string;
  customerName?: string;
  businessName?: string;
  generatedDate?: string;
}

function escapeXml(raw: string | number | undefined | null): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxLen: number): string {
  const s = String(text || '').trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

function fmtDimWithInch(
  displayVal: number | undefined,
  inchVal: number | undefined,
  unit: WindowMeasurementUnit
): string {
  if (displayVal === undefined || !Number.isFinite(displayVal)) return '—';
  const primary = formatMeasurement(displayVal, unit);
  if (unit === 'inch' || inchVal === undefined || !Number.isFinite(inchVal)) {
    return primary;
  }
  return `${primary} (${formatInchDecimal(inchVal)}")`;
}

function fmtDimSchedule(
  displayVal: number | undefined,
  inchVal: number | undefined,
  unit: WindowMeasurementUnit
): string {
  if (displayVal === undefined || !Number.isFinite(displayVal)) return '—';
  const primary = formatMeasurement(displayVal, unit);
  if (unit === 'inch' && inchVal !== undefined && Number.isFinite(inchVal)) {
    const frac = formatInchFraction(inchVal, true);
    return frac ? `${primary} (${frac})` : primary;
  }
  if (inchVal === undefined || !Number.isFinite(inchVal)) {
    return primary;
  }
  return `${primary} (${formatInchDecimal(inchVal)}")`;
}

function fmtPanelDims(panel: CalculatedPanelDimension, unit: WindowMeasurementUnit): string {
  const base = `${formatMeasurement(panel.widthDisplay, unit)} × ${formatMeasurement(panel.heightDisplay, unit)}`;
  if (unit === 'inch') return base;
  return `${base} (${formatInchDecimal(panel.widthInch)}"×${formatInchDecimal(panel.heightInch)}")`;
}

/**
 * Generates an engineering-grade architectural SVG front-view blueprint
 * driven strictly by the live SlidingWindowCalculationResult.
 */
export function buildTechnicalDrawingSvgMarkup(
  result: SlidingWindowCalculationResult,
  meta: TechnicalDrawingMeta = {}
): string {
  const W = 1120;
  const H = 760;
  const u = result.displayUnit || 'inch';
  const brand = meta.businessName || 'WINDOWCUT PRO';
  const project = truncateText(meta.projectName || 'Sliding Window Project', 34);
  const customer = truncateText(meta.customerName || 'Walk-in Client', 30);
  const dateStr = meta.generatedDate || new Date().toLocaleDateString('en-IN');

  const topTrackStr = fmtDimWithInch(result.fabrication.topTrackDisplay, result.fabrication.topTrackInch, u);
  const bottomTrackStr = fmtDimWithInch(result.fabrication.bottomTrackDisplay, result.fabrication.bottomTrackInch, u);
  const handleStr = fmtDimWithInch(result.fabrication.handleDisplay, result.fabrication.handleInch, u);
  const interlockStr = fmtDimWithInch(result.fabrication.interlockDisplay, result.fabrication.interlockInch, u);
  const topBearingStr = fmtDimWithInch(
    result.fabrication.topBearingDisplay,
    result.fabrication.topBearingInch,
    u
  );
  const bottomBearingStr = fmtDimWithInch(
    result.fabrication.bottomBearingDisplay,
    result.fabrication.bottomBearingInch,
    u
  );

  const topTrackSched = fmtDimSchedule(result.fabrication.topTrackDisplay, result.fabrication.topTrackInch, u);
  const bottomTrackSched = fmtDimSchedule(result.fabrication.bottomTrackDisplay, result.fabrication.bottomTrackInch, u);
  const handleSched = fmtDimSchedule(result.fabrication.handleDisplay, result.fabrication.handleInch, u);
  const interlockSched = fmtDimSchedule(result.fabrication.interlockDisplay, result.fabrication.interlockInch, u);
  const topBearingSched = fmtDimSchedule(
    result.fabrication.topBearingDisplay,
    result.fabrication.topBearingInch,
    u
  );
  const bottomBearingSched = fmtDimSchedule(
    result.fabrication.bottomBearingDisplay,
    result.fabrication.bottomBearingInch,
    u
  );

  const origWStr = fmtDimWithInch(result.original.width, result.original.widthInch, u);
  const origHStr = fmtDimWithInch(result.original.height, result.original.heightInch, u);

  // Proportional frame scaling inside left elevation area
  const viewportX = 128;
  const viewportY = 148;
  const viewportW = 490;
  const viewportH = 380;

  const wInch = Math.max(12, result.original.widthInch || 36);
  const hInch = Math.max(12, result.original.heightInch || 48);
  const rawRatio = Math.max(0.55, Math.min(2.1, wInch / hInch));

  let frameW = viewportW;
  let frameH = frameW / rawRatio;
  if (frameH > viewportH) {
    frameH = viewportH;
    frameW = frameH * rawRatio;
  }

  const frameX = Math.round(viewportX + (viewportW - frameW) / 2);
  const frameY = Math.round(viewportY + (viewportH - frameH) / 2);
  frameW = Math.round(frameW);
  frameH = Math.round(frameH);

  const trackBarH = 14;
  const sideJambW = 10;
  const innerX = frameX + sideJambW;
  const innerY = frameY + trackBarH;
  const innerW = frameW - sideJambW * 2;
  const innerH = frameH - trackBarH * 2;

  const glassPanels = result.glassPanels || [];
  const netPanels = result.mosquitoNetPanels || [];
  const hasNet = result.original.trackType === '3-track' && netPanels.length > 0;
  const totalDrawPanels = glassPanels.length + (hasNet ? netPanels.length : 0);

  // Compute non-overlapping visual bay rectangles so all Glass + Net shutters remain readable
  interface VisualBay {
    x: number;
    y: number;
    w: number;
    h: number;
    kind: 'glass' | 'mosquito_net';
    panel: CalculatedPanelDimension;
    shortTitle: string;
    trackNum: number;
  }

  const bays: VisualBay[] = [];
  if (hasNet && glassPanels.length >= 2) {
    // 3-Track arrangement: show Glass 1, Glass 2, and Mosquito Net clearly across 3 track planes
    const count = Math.min(4, glassPanels.length + netPanels.length);
    const overlap = 12;
    const bayW = (innerW + overlap * (count - 1)) / count;
    glassPanels.slice(0, 2).forEach((gp, idx) => {
      const bx = innerX + idx * (bayW - overlap);
      bays.push({
        x: bx,
        y: innerY + (idx % 2 === 0 ? 4 : 2),
        w: bayW,
        h: innerH - 6,
        kind: 'glass',
        panel: gp,
        shortTitle: `GLASS ${idx + 1}`,
        trackNum: idx + 1,
      });
    });
    netPanels.slice(0, Math.max(1, count - 2)).forEach((np, idx) => {
      const slotIdx = 2 + idx;
      const bx = innerX + slotIdx * (bayW - overlap);
      bays.push({
        x: bx,
        y: innerY + 6,
        w: bayW,
        h: innerH - 8,
        kind: 'mosquito_net',
        panel: np,
        shortTitle: netPanels.length > 1 ? `NET ${idx + 1}` : 'MOSQUITO NET',
        trackNum: 3,
      });
    });
  } else {
    // 2-Track or All-Glass arrangement
    const count = Math.max(1, glassPanels.length);
    const overlap = count > 1 ? 18 : 0;
    const bayW = (innerW + overlap * (count - 1)) / count;
    glassPanels.forEach((gp, idx) => {
      const bx = innerX + idx * (bayW - overlap);
      bays.push({
        x: bx,
        y: innerY + (idx % 2 === 0 ? 3 : 6),
        w: bayW,
        h: innerH - 8,
        kind: 'glass',
        panel: gp,
        shortTitle: `GLASS ${idx + 1}`,
        trackNum: (idx % 2) + 1,
      });
    });
  }

  // Bearing mark horizontal span (proportional visual span from jamb)
  const bearingSpanX1 = innerX;
  const bearingSpanX2 = Math.round(innerX + Math.min(innerW * 0.48, Math.max(85, frameW * 0.44)));

  // Schedule panel right-side coordinates
  const specX = 758;
  const specY = 92;
  const specW = 336;
  const specH = 576;

  // Plan cross-section strip beneath Bottom Track
  const planY = frameY + frameH + 54;
  const railSpacing = hasNet ? 13 : 16;

  // Helper SVG elements
  const renderBaysMarkup = bays
    .map((bay, idx) => {
      const isNet = bay.kind === 'mosquito_net';
      const fillUrl = isNet ? 'url(#jhdMeshFill)' : 'url(#jhdGlassTint)';
      const borderStroke = isNet ? '#15803D' : '#0369A1';
      const stileW = 8;
      const cx = Math.round(bay.x + bay.w / 2);
      const cy = Math.round(bay.y + bay.h / 2);
      const sizeStr = fmtPanelDims(bay.panel, u);
      const arrowDir = idx === 0 ? '→' : idx === bays.length - 1 ? '←' : '↔';

      return `
        <g>
          <!-- Panel background fill -->
          <rect x="${bay.x.toFixed(1)}" y="${bay.y.toFixed(1)}" width="${bay.w.toFixed(1)}" height="${bay.h.toFixed(1)}"
                fill="${fillUrl}" stroke="${borderStroke}" stroke-width="1.6" />
          ${
            !isNet
              ? `
            <!-- Glazing diagonal shine lines -->
            <line x1="${(bay.x + 16).toFixed(1)}" y1="${(bay.y + 38).toFixed(1)}" x2="${(bay.x + 48).toFixed(1)}" y2="${(bay.y + 12).toFixed(1)}" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.7" />
            <line x1="${(bay.x + 18).toFixed(1)}" y1="${(bay.y + 58).toFixed(1)}" x2="${(bay.x + 68).toFixed(1)}" y2="${(bay.y + 16).toFixed(1)}" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.55" />
          `
              : `
            <!-- Mesh reinforcement cross bar -->
            <line x1="${(bay.x + stileW).toFixed(1)}" y1="${(bay.y + bay.h * 0.84).toFixed(1)}" x2="${(bay.x + bay.w - stileW).toFixed(1)}" y2="${(bay.y + bay.h * 0.84).toFixed(1)}" stroke="#166534" stroke-width="1" stroke-dasharray="3 2" opacity="0.45" />
          `
          }
          <!-- Left aluminium sash stile -->
          <rect x="${bay.x.toFixed(1)}" y="${bay.y.toFixed(1)}" width="${stileW}" height="${bay.h.toFixed(1)}"
                fill="${idx === 0 ? '#334155' : '#B45309'}" fill-opacity="0.9" />
          <!-- Right aluminium sash stile -->
          <rect x="${(bay.x + bay.w - stileW).toFixed(1)}" y="${bay.y.toFixed(1)}" width="${stileW}" height="${bay.h.toFixed(1)}"
                fill="${idx === bays.length - 1 ? '#334155' : '#B45309'}" fill-opacity="0.9" />

          <!-- Handle grip bar on outer stiles -->
          ${
            idx === 0
              ? `<rect x="${(bay.x + 2).toFixed(1)}" y="${(cy - 18).toFixed(1)}" width="4" height="36" rx="1" fill="#FBBF24" />`
              : ''
          }
          ${
            idx === bays.length - 1
              ? `<rect x="${(bay.x + bay.w - 6).toFixed(1)}" y="${(cy - 18).toFixed(1)}" width="4" height="36" rx="1" fill="#FBBF24" />`
              : ''
          }

          <!-- Technical label card centered inside pane -->
          <rect x="${cx - Math.min(72, Math.round((bay.w - 18) / 2))}" y="${cy - 28}"
                width="${Math.min(144, Math.max(82, Math.round(bay.w - 18)))}" height="56" rx="4"
                fill="#FFFFFF" fill-opacity="0.93" stroke="${isNet ? '#86EFAC' : '#BAE6FD'}" stroke-width="1" />
          <text x="${cx}" y="${cy - 11}" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif"
                font-size="10" font-weight="700" fill="${isNet ? '#166534' : '#0C4A6E'}">${escapeXml(bay.shortTitle)}</text>
          <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="Courier New, monospace"
                font-size="10.5" font-weight="700" fill="#1A1A1A">${escapeXml(sizeStr)}</text>
          <text x="${cx}" y="${cy + 19}" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif"
                font-size="9" font-weight="600" fill="#64748B">Track ${bay.trackNum}  ${arrowDir}</text>
        </g>
      `;
    })
    .join('');

  // Interlock marker callout position (between Bay 1 and Bay 2)
  const interlockX =
    bays.length >= 2 ? Math.round((bays[0].x + bays[0].w + bays[1].x) / 2) : innerX + Math.round(innerW / 2);

  // Track plan lines beneath Bottom Track
  const trackPlanRows = bays.slice(0, 3).map((bay, idx) => {
    const ry = planY + 18 + idx * railSpacing;
    const isNet = bay.kind === 'mosquito_net';
    return `
      <line x1="${frameX}" y1="${ry}" x2="${frameX + frameW}" y2="${ry}" stroke="#CBD5E1" stroke-width="1.5" />
      <rect x="${bay.x.toFixed(1)}" y="${ry - 3.5}" width="${bay.w.toFixed(1)}" height="7" rx="1.5"
            fill="${isNet ? '#16A34A' : '#0284C7'}" fill-opacity="0.85" />
      <text x="${frameX - 6}" y="${ry + 3}" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif"
            font-size="8.5" font-weight="700" fill="#475569">T${idx + 1}</text>
    `;
  });

  // Schedule rows right sidebar
  const glassRowsHtml = glassPanels
    .map((gp, i) => {
      const rowY = specY + 382 + i * 24;
      if (rowY > specY + specH - 70) return '';
      return `
        <text x="${specX + 14}" y="${rowY}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#334155">${escapeXml(truncateText(gp.label, 18))}</text>
        <text x="${specX + specW - 14}" y="${rowY}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#0C4A6E">${escapeXml(fmtPanelDims(gp, u))}</text>
      `;
    })
    .join('');

  const netSectionStart = specY + 382 + Math.min(glassPanels.length, 3) * 24 + 14;
  const netRowsHtml = hasNet
    ? `
      <line x1="${specX + 14}" y1="${netSectionStart - 8}" x2="${specX + specW - 14}" y2="${netSectionStart - 8}" stroke="#E2E8F0" stroke-width="1" />
      <text x="${specX + 14}" y="${netSectionStart + 8}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#166534">MOSQUITO NET PANEL(S)</text>
      ${netPanels
        .slice(0, 2)
        .map((np, i) => {
          const ry = netSectionStart + 26 + i * 20;
          return `
            <text x="${specX + 14}" y="${ry}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#14532D">${escapeXml(truncateText(np.label, 18))}</text>
            <text x="${specX + specW - 14}" y="${ry}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#166534">${escapeXml(fmtPanelDims(np, u))}</text>
          `;
        })
        .join('')}
    `
    : `
      <line x1="${specX + 14}" y1="${netSectionStart - 8}" x2="${specX + specW - 14}" y2="${netSectionStart - 8}" stroke="#E2E8F0" stroke-width="1" />
      <text x="${specX + 14}" y="${netSectionStart + 10}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10" fill="#64748B">Mosquito Net: Not Required (${escapeXml(result.original.trackType.toUpperCase())})</text>
    `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Technical Window Drawing for ${escapeXml(result.windowNumber)}">
  <defs>
    <!-- Glass tint fill -->
    <linearGradient id="jhdGlassTint" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2FE" />
      <stop offset="55%" stop-color="#BAE6FD" />
      <stop offset="100%" stop-color="#E0F2FE" />
    </linearGradient>

    <!-- Mosquito Net wire mesh cross-hatch pattern -->
    <pattern id="jhdMeshFill" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#ECFDF5" />
      <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#16A34A" stroke-width="0.65" stroke-opacity="0.45" />
      <path d="M 4 0 L 4 8 M 0 4 L 8 4" stroke="#64748B" stroke-width="0.4" stroke-opacity="0.3" />
    </pattern>

    <!-- Engineering grid dot background -->
    <pattern id="jhdGridBg" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.7" fill="#CBD5E1" opacity="0.55" />
    </pattern>

    <!-- Dimension arrow markers -->
    <marker id="jhdArrowEnd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#1E293B" />
    </marker>
    <marker id="jhdArrowStart" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#1E293B" />
    </marker>
    <marker id="jhdGoldArrowEnd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#B45309" />
    </marker>
    <marker id="jhdGoldArrowStart" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill="#B45309" />
    </marker>
  </defs>

  <!-- White Engineering Sheet Background -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8" />
  <rect x="20" y="76" width="722" height="592" fill="url(#jhdGridBg)" stroke="#E2E8F0" stroke-width="1" />

  <!-- Top Brand Header Strip -->
  <rect x="14" y="14" width="${W - 28}" height="52" fill="#1A1A1A" />
  <text x="32" y="38" font-family="Georgia, serif" font-size="16" font-weight="700" fill="#FFFFFF">${escapeXml(brand.toUpperCase())}</text>
  <text x="32" y="54" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1.2" fill="#E6B33A">SLIDING WINDOW FABRICATION TECHNICAL DRAWING</text>
  <text x="${W - 32}" y="37" text-anchor="end" font-family="Courier New, monospace" font-size="12" font-weight="700" fill="#FFFFFF">WINDOW: ${escapeXml(result.windowNumber)}  |  ${escapeXml(result.original.trackType.toUpperCase())}</text>
  <text x="${W - 32}" y="54" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10" fill="#D4D4D8">${escapeXml(result.original.configuration)}  ·  Date: ${escapeXml(dateStr)}</text>

  <!-- ================================================================ -->
  <!-- DIMENSION LINES: TOP OVERALL WIDTH                               -->
  <!-- ================================================================ -->
  <line x1="${frameX}" y1="${frameY - 46}" x2="${frameX}" y2="${frameY - 6}" stroke="#64748B" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${frameX + frameW}" y1="${frameY - 46}" x2="${frameX + frameW}" y2="${frameY - 6}" stroke="#64748B" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${frameX + 2}" y1="${frameY - 40}" x2="${frameX + frameW - 2}" y2="${frameY - 40}"
        stroke="#1E293B" stroke-width="1.4" marker-start="url(#jhdArrowStart)" marker-end="url(#jhdArrowEnd)" />
  <rect x="${Math.round(frameX + frameW / 2 - 95)}" y="${frameY - 51}" width="190" height="18" fill="#FFFFFF" />
  <text x="${Math.round(frameX + frameW / 2)}" y="${frameY - 38}" text-anchor="middle"
        font-family="Courier New, monospace" font-size="11.5" font-weight="700" fill="#1A1A1A">WIDTH: ${escapeXml(origWStr)}</text>

  <!-- TOP TRACK (T.B.) BEARING MEASUREMENT CALLOUT ABOVE TOP TRACK -->
  <line x1="${bearingSpanX1}" y1="${frameY - 22}" x2="${bearingSpanX1}" y2="${frameY + 6}" stroke="#B45309" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${bearingSpanX2}" y1="${frameY - 22}" x2="${bearingSpanX2}" y2="${frameY + 7}" stroke="#B45309" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${bearingSpanX1 + 2}" y1="${frameY - 16}" x2="${bearingSpanX2 - 2}" y2="${frameY - 16}"
        stroke="#B45309" stroke-width="1.3" marker-start="url(#jhdGoldArrowStart)" marker-end="url(#jhdGoldArrowEnd)" />
  <text x="${bearingSpanX2 + 8}" y="${frameY - 12}" font-family="Courier New, monospace" font-size="10.5" font-weight="700" fill="#9A3412">
    TOP BEARING (T.B.): ${escapeXml(topBearingStr)}
  </text>

  <!-- ================================================================ -->
  <!-- DIMENSION LINE: LEFT OVERALL WINDOW HEIGHT                       -->
  <!-- ================================================================ -->
  <line x1="${frameX - 46}" y1="${frameY}" x2="${frameX - 6}" y2="${frameY}" stroke="#64748B" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${frameX - 46}" y1="${frameY + frameH}" x2="${frameX - 6}" y2="${frameY + frameH}" stroke="#64748B" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${frameX - 38}" y1="${frameY + 2}" x2="${frameX - 38}" y2="${frameY + frameH - 2}"
        stroke="#1E293B" stroke-width="1.4" marker-start="url(#jhdArrowStart)" marker-end="url(#jhdArrowEnd)" />
  <text x="${frameX - 48}" y="${Math.round(frameY + frameH / 2)}" text-anchor="middle"
        transform="rotate(-90 ${frameX - 48} ${Math.round(frameY + frameH / 2)})"
        font-family="Courier New, monospace" font-size="11.5" font-weight="700" fill="#1A1A1A">HEIGHT: ${escapeXml(origHStr)}</text>

  <!-- ================================================================ -->
  <!-- DIMENSION LINES: RIGHT HANDLE & INTERLOCK VERTICAL CUT SIZES     -->
  <!-- ================================================================ -->
  <line x1="${frameX + frameW + 4}" y1="${innerY}" x2="${frameX + frameW + 30}" y2="${innerY}" stroke="#64748B" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${frameX + frameW + 4}" y1="${innerY + innerH}" x2="${frameX + frameW + 30}" y2="${innerY + innerH}" stroke="#64748B" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${frameX + frameW + 22}" y1="${innerY + 2}" x2="${frameX + frameW + 22}" y2="${innerY + innerH - 2}"
        stroke="#1E293B" stroke-width="1.3" marker-start="url(#jhdArrowStart)" marker-end="url(#jhdArrowEnd)" />
  <text x="${frameX + frameW + 36}" y="${Math.round(innerY + innerH / 2 - 6)}" text-anchor="middle"
        transform="rotate(90 ${frameX + frameW + 36} ${Math.round(innerY + innerH / 2 - 6)})"
        font-family="Courier New, monospace" font-size="10" font-weight="700" fill="#1E293B">HANDLE: ${escapeXml(handleStr)}</text>
  <text x="${frameX + frameW + 52}" y="${Math.round(innerY + innerH / 2 - 6)}" text-anchor="middle"
        transform="rotate(90 ${frameX + frameW + 52} ${Math.round(innerY + innerH / 2 - 6)})"
        font-family="Courier New, monospace" font-size="10" font-weight="700" fill="#B45309">INTERLOCK: ${escapeXml(interlockStr)}</text>

  <!-- ================================================================ -->
  <!-- WINDOW ARCHITECTURAL FRAME, TRACKS, PANELS & BEARINGS            -->
  <!-- ================================================================ -->
  <!-- Outer Aluminium Frame -->
  <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" fill="#F8FAFC" stroke="#1E293B" stroke-width="2.4" />

  <!-- Top Track (T.B.) Aluminium Rail -->
  <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${trackBarH}" fill="#CBD5E1" stroke="#1E293B" stroke-width="1.5" />
  <line x1="${frameX + 4}" y1="${frameY + 5}" x2="${frameX + frameW - 4}" y2="${frameY + 5}" stroke="#475569" stroke-width="0.9" />
  <line x1="${frameX + 4}" y1="${frameY + 9}" x2="${frameX + frameW - 4}" y2="${frameY + 9}" stroke="#475569" stroke-width="0.9" />
  <text x="${frameX + 10}" y="${frameY + 10}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="8" font-weight="700" fill="#0F172A">TOP TRACK (T.B.): ${escapeXml(topTrackStr)}</text>

  <!-- Bottom Track (T.B.) Aluminium Rail -->
  <rect x="${frameX}" y="${frameY + frameH - trackBarH}" width="${frameW}" height="${trackBarH}" fill="#CBD5E1" stroke="#1E293B" stroke-width="1.5" />
  <line x1="${frameX + 4}" y1="${frameY + frameH - 9}" x2="${frameX + frameW - 4}" y2="${frameY + frameH - 9}" stroke="#475569" stroke-width="0.9" />
  <line x1="${frameX + 4}" y1="${frameY + frameH - 5}" x2="${frameX + frameW - 4}" y2="${frameY + frameH - 5}" stroke="#475569" stroke-width="0.9" />
  ${
    hasNet
      ? `<line x1="${frameX + 4}" y1="${frameY + frameH - 12}" x2="${frameX + frameW - 4}" y2="${frameY + frameH - 12}" stroke="#15803D" stroke-width="0.9" />`
      : ''
  }
  <text x="${frameX + 10}" y="${frameY + frameH - 4}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="8" font-weight="700" fill="#0F172A">BOTTOM TRACK (T.B.): ${escapeXml(bottomTrackStr)}</text>

  <!-- Left & Right Outer Vertical Jambs -->
  <rect x="${frameX}" y="${frameY}" width="${sideJambW}" height="${frameH}" fill="#94A3B8" stroke="#1E293B" stroke-width="1.4" />
  <rect x="${frameX + frameW - sideJambW}" y="${frameY}" width="${sideJambW}" height="${frameH}" fill="#94A3B8" stroke="#1E293B" stroke-width="1.4" />

  <!-- Sliding Panels (Glass + Mosquito Net) -->
  ${renderBaysMarkup}

  <!-- Interlock vertical callout indicator -->
  <line x1="${interlockX}" y1="${innerY}" x2="${interlockX}" y2="${innerY + innerH}" stroke="#B45309" stroke-width="1.2" stroke-dasharray="4 3" />
  <circle cx="${interlockX}" cy="${innerY + 14}" r="3.5" fill="#B45309" />

  <!-- Roller Bearing Wheel Symbols on Top & Bottom Tracks -->
  <circle cx="${bearingSpanX1 + 14}" cy="${frameY + 7}" r="4.5" fill="#FFFBEB" stroke="#B45309" stroke-width="1.5" />
  <circle cx="${bearingSpanX2 - 10}" cy="${frameY + 7}" r="4.5" fill="#FFFBEB" stroke="#B45309" stroke-width="1.5" />
  <circle cx="${bearingSpanX1 + 14}" cy="${frameY + frameH - 7}" r="4.5" fill="#FFFBEB" stroke="#B45309" stroke-width="1.5" />
  <circle cx="${bearingSpanX2 - 10}" cy="${frameY + frameH - 7}" r="4.5" fill="#FFFBEB" stroke="#B45309" stroke-width="1.5" />

  <!-- BOTTOM TRACK (T.B.) BEARING MEASUREMENT CALLOUT -->
  <line x1="${bearingSpanX1}" y1="${frameY + frameH - 2}" x2="${bearingSpanX1}" y2="${frameY + frameH + 28}" stroke="#B45309" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${bearingSpanX2}" y1="${frameY + frameH - 2}" x2="${bearingSpanX2}" y2="${frameY + frameH + 28}" stroke="#B45309" stroke-width="0.9" stroke-dasharray="2 2" />
  <line x1="${bearingSpanX1 + 2}" y1="${frameY + frameH + 22}" x2="${bearingSpanX2 - 2}" y2="${frameY + frameH + 22}"
        stroke="#B45309" stroke-width="1.3" marker-start="url(#jhdGoldArrowStart)" marker-end="url(#jhdGoldArrowEnd)" />
  <text x="${bearingSpanX2 + 8}" y="${frameY + frameH + 26}" font-family="Courier New, monospace" font-size="10.5" font-weight="700" fill="#9A3412">
    BOTTOM BEARING (T.B.): ${escapeXml(bottomBearingStr)}
  </text>

  <!-- ================================================================ -->
  <!-- TRACK ARRANGEMENT PLAN VIEW STRIP (SHOWING 2-TRACK OR 3-TRACK)   -->
  <!-- ================================================================ -->
  <text x="${frameX}" y="${planY + 6}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#334155">
    TRACK PLAN SECTION (${totalDrawPanels} ${hasNet ? 'SHUTTER / 3-TRACK' : 'GLASS / 2-TRACK'} ARRANGEMENT):
  </text>
  ${trackPlanRows.join('')}

  <!-- ================================================================ -->
  <!-- RIGHT-HAND ENGINEERING SPECIFICATION & MEASUREMENT SCHEDULE       -->
  <!-- ================================================================ -->
  <rect x="${specX}" y="${specY}" width="${specW}" height="${specH}" rx="4" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.3" />
  <rect x="${specX}" y="${specY}" width="${specW}" height="30" fill="#1E293B" />
  <text x="${specX + 14}" y="${specY + 19}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">FABRICATION CUTTING SCHEDULE</text>

  <!-- Meta rows -->
  <text x="${specX + 14}" y="${specY + 50}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#64748B">PROJECT</text>
  <text x="${specX + specW - 14}" y="${specY + 50}" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="700" fill="#0F172A">${escapeXml(project)}</text>

  <text x="${specX + 14}" y="${specY + 68}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#64748B">CUSTOMER</text>
  <text x="${specX + specW - 14}" y="${specY + 68}" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#0F172A">${escapeXml(customer)}</text>

  <text x="${specX + 14}" y="${specY + 86}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#64748B">WINDOW / GLASS</text>
  <text x="${specX + specW - 14}" y="${specY + 86}" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10" font-weight="600" fill="#0F172A">${escapeXml(result.windowNumber)} · ${escapeXml(truncateText(result.original.glassThickness, 22))}</text>

  <text x="${specX + 14}" y="${specY + 104}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#64748B">PROFILE</text>
  <text x="${specX + specW - 14}" y="${specY + 104}" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10" font-weight="600" fill="#B45309">${escapeXml(truncateText(result.profileUsed.name, 26))}</text>

  <line x1="${specX + 14}" y1="${specY + 116}" x2="${specX + specW - 14}" y2="${specY + 116}" stroke="#CBD5E1" stroke-width="1" />

  <!-- Aluminium Track & Section Cuts -->
  <text x="${specX + 14}" y="${specY + 134}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#475569">ALUMINIUM SECTIONS</text>

  <text x="${specX + 14}" y="${specY + 154}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" fill="#334155">Top Track (T.B.)</text>
  <text x="${specX + specW - 14}" y="${specY + 154}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#0F172A">${escapeXml(topTrackSched)}</text>

  <text x="${specX + 14}" y="${specY + 174}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" fill="#334155">Bottom Track (T.B.)</text>
  <text x="${specX + specW - 14}" y="${specY + 174}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#0F172A">${escapeXml(bottomTrackSched)}</text>

  <text x="${specX + 14}" y="${specY + 194}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" fill="#334155">Handle Section</text>
  <text x="${specX + specW - 14}" y="${specY + 194}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#0F172A">${escapeXml(handleSched)}</text>

  <text x="${specX + 14}" y="${specY + 214}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" fill="#334155">Interlock Section</text>
  <text x="${specX + specW - 14}" y="${specY + 214}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#0F172A">${escapeXml(interlockSched)}</text>

  <!-- Dedicated Bearing Measurement Box -->
  <rect x="${specX + 10}" y="${specY + 228}" width="${specW - 20}" height="82" rx="4" fill="#FFFBEB" stroke="#F59E0B" stroke-width="1.1" />
  <text x="${specX + 20}" y="${specY + 246}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#92400E">BEARING MEASUREMENT (T.B.)</text>

  <text x="${specX + 20}" y="${specY + 266}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#78350F">1. Top Track (T.B.) Bearing</text>
  <text x="${specX + specW - 20}" y="${specY + 266}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#78350F">${escapeXml(topBearingSched)}</text>

  <text x="${specX + 20}" y="${specY + 286}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#78350F">2. Bottom Track (T.B.) Bearing</text>
  <text x="${specX + specW - 20}" y="${specY + 286}" text-anchor="end" font-family="Courier New, monospace" font-size="11" font-weight="700" fill="#78350F">${escapeXml(bottomBearingSched)}</text>

  <text x="${specX + 20}" y="${specY + 302}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="8.5" fill="#B45309">Independent of Glass Width</text>

  <line x1="${specX + 14}" y1="${specY + 344}" x2="${specX + specW - 14}" y2="${specY + 344}" stroke="#CBD5E1" stroke-width="1" />
  <text x="${specX + 14}" y="${specY + 362}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#0369A1">GLASS CUTTING SIZES (W × H)</text>
  ${glassRowsHtml}
  ${netRowsHtml}

  <!-- Legend Strip bottom-left of viewport -->
  <rect x="30" y="624" width="12" height="12" fill="url(#jhdGlassTint)" stroke="#0369A1" stroke-width="1" />
  <text x="48" y="634" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="600" fill="#334155">Glass Panel</text>
  <rect x="128" y="624" width="12" height="12" fill="url(#jhdMeshFill)" stroke="#15803D" stroke-width="1" />
  <text x="146" y="634" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="600" fill="#334155">Mosquito Net</text>
  <circle cx="238" cy="630" r="4.5" fill="#FFFBEB" stroke="#B45309" stroke-width="1.4" />
  <text x="249" y="634" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="600" fill="#334155">T.B. Bearing Position</text>
  <line x1="376" y1="630" x2="392" y2="630" stroke="#B45309" stroke-width="2" stroke-dasharray="3 2" />
  <text x="398" y="634" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" font-weight="600" fill="#334155">Interlock Joint</text>

  <!-- ================================================================ -->
  <!-- ENGINEERING TITLE BLOCK FOOTER                                   -->
  <!-- ================================================================ -->
  <rect x="20" y="680" width="${W - 40}" height="52" fill="#F8F8F6" stroke="#1E293B" stroke-width="1.2" />
  <text x="34" y="702" font-family="Georgia, serif" font-size="13" font-weight="700" fill="#1A1A1A">${escapeXml(brand.toUpperCase())}</text>
  <text x="34" y="719" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9.5" fill="#555555">Title: Sliding Window Fabrication Drawing  ·  Original Opening: ${escapeXml(origWStr)} × ${escapeXml(origHStr)}</text>
  <text x="${W - 34}" y="702" text-anchor="end" font-family="Courier New, monospace" font-size="10.5" font-weight="700" fill="#1A1A1A">DWG NO: JHD-${escapeXml(result.windowNumber)}</text>
  <text x="${W - 34}" y="719" text-anchor="end" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9" fill="#666666">Generated from verified workshop profile rules (${escapeXml(dateStr)})</text>
</svg>`;
}

/**
 * Rasterizes the pure SVG drawing into a high-resolution (2x) PNG Data URL
 * using a clean white background canvas so it works seamlessly for PNG downloads
 * and multi-page Bulk Technical Drawing PDF exports.
 */
export async function renderTechnicalDrawingPngDataUrl(
  result: SlidingWindowCalculationResult,
  meta: TechnicalDrawingMeta = {}
): Promise<string> {
  const svgMarkup = buildTechnicalDrawingSvgMarkup(result, meta);
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not render SVG drawing to image canvas.'));
      image.src = blobUrl;
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = 1120 * scale;
    canvas.height = 760 * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png', 1.0);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Triggers a PNG file download of the technical window drawing.
 */
export async function downloadTechnicalDrawingPNG(
  result: SlidingWindowCalculationResult,
  meta: TechnicalDrawingMeta = {}
): Promise<void> {
  const pngUrl = await renderTechnicalDrawingPngDataUrl(result, meta);
  const safeWin = String(result.windowNumber || 'W1').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safeProj = String(meta.projectName || 'Window').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const link = document.createElement('a');
  link.href = pngUrl;
  link.download = `JHD_Drawing_${safeProj}_${safeWin}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
