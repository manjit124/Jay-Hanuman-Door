import { jsPDF } from 'jspdf';
import type {
  BusinessSettings,
  WindowSystemCalculationResult,
} from '../types.ts';

function sanitizeFileSegment(val: string, fallback: string): string {
  const cleaned = String(val || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

/**
 * Generates and downloads a clean WindowCut Pro Fabrication Cutting List PDF
 * for any Indian Aluminium Window System calculation.
 */
export function downloadWindowSystemCuttingPDF(params: {
  result: WindowSystemCalculationResult;
  projectName?: string;
  customerName?: string;
  settings?: BusinessSettings;
}): void {
  const { result, projectName, customerName, settings } = params;
  if (result.status !== 'calculated') return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(10, 37, 64); // #0A2540 Navy
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(settings?.businessName || 'WindowCut Pro', margin, 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(249, 115, 22); // #F97316 Orange
    doc.text('ALUMINIUM WINDOW FABRICATION CUTTING LIST', margin, 18.5);

    doc.setTextColor(220, 226, 236);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, 11.5, { align: 'right' });
    doc.text(`Page ${pageNum}`, pageWidth - margin, 18.5, { align: 'right' });
  };

  let pageNumber = 1;
  drawHeader(pageNumber);
  let y = 34;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      pageNumber += 1;
      drawHeader(pageNumber);
      y = 34;
    }
  };

  // Window & Project Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setTextColor(10, 37, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${result.systemName}  —  ${result.input.windowLabel}`, margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const dimLine = `Overall Size: ${result.input.widthDecimalFormatted}${result.input.widthFractionFormatted ? ` (${result.input.widthFractionFormatted})` : ''} W × ${result.input.heightDecimalFormatted}${result.input.heightFractionFormatted ? ` (${result.input.heightFractionFormatted})` : ''} H  (${result.input.widthMm} × ${result.input.heightMm} mm)`;
  doc.text(dimLine, margin + 4, y + 13.5);

  const metaLine = `Profile: ${result.profileSeriesName}   |   Qty: ${result.input.quantity}   |   Tracks: ${result.input.trackCount}   |   Shutters: ${result.input.shutterCount}   |   Net: ${result.input.includeMosquitoNet ? 'Yes' : 'No'}`;
  doc.text(metaLine, margin + 4, y + 19.5);
  y += 28;

  if (projectName || customerName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Project: ${projectName || 'Workshop Order'}   |   Customer: ${customerName || 'Walk-in Fabricator'}`,
      margin,
      y
    );
    y += 6;
  }

  // Helper to draw section table
  const drawTable = (
    title: string,
    accentRgb: [number, number, number],
    headers: string[],
    colXs: number[],
    rows: string[][]
  ) => {
    if (rows.length === 0) return;
    ensureSpace(18);
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, margin + 3, y + 5.2);
    y += 9.5;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    headers.forEach((h, i) => doc.text(h, colXs[i], y + 4.5));
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    rows.forEach((cells, rIdx) => {
      ensureSpace(7.5);
      if (rIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }
      doc.setTextColor(30, 41, 59);
      cells.forEach((c, i) => doc.text(String(c).slice(0, 44), colXs[i], y + 4.5));
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);
      y += 6.5;
    });
    y += 5;
  };

  // 1. Aluminium Cutting Measurements
  drawTable(
    'ALUMINIUM SECTION CUTTING MEASUREMENTS',
    [11, 94, 215],
    ['Section Name', 'Inches (Decimal)', 'Inches (Fraction)', 'MM', 'Per Win', 'Total Pcs'],
    [margin + 2, margin + 58, margin + 94, margin + 128, margin + 148, margin + 165],
    result.aluminiumSections.map((r) => [
      r.name,
      r.lengthDecimalFormatted,
      r.lengthFractionFormatted || '—',
      `${r.lengthMm} mm`,
      String(r.piecesPerWindow),
      String(r.totalPieces),
    ])
  );

  // 2. Glass Cutting Measurements
  drawTable(
    'GLASS CUTTING MEASUREMENTS',
    [10, 37, 64],
    ['Panel', 'Width (in)', 'Height (in)', 'Fraction Size', 'MM Size', 'Total Pcs'],
    [margin + 2, margin + 48, margin + 74, margin + 100, margin + 138, margin + 168],
    result.glassCutting.map((r) => [
      r.name,
      r.widthDecimalFormatted || '—',
      r.heightDecimalFormatted || '—',
      r.lengthFractionFormatted || '—',
      `${r.widthMm || 0} × ${r.heightMm || 0}`,
      String(r.totalPieces),
    ])
  );

  // 3. Mosquito Net Cutting Measurements
  if (result.mosquitoNetCutting.length > 0) {
    drawTable(
      'MOSQUITO NET CUTTING MEASUREMENTS',
      [249, 115, 22],
      ['Component', 'Width (in)', 'Height (in)', 'Fraction Size', 'MM Size', 'Total Pcs'],
      [margin + 2, margin + 48, margin + 74, margin + 100, margin + 138, margin + 168],
      result.mosquitoNetCutting.map((r) => [
        r.name,
        r.widthDecimalFormatted || '—',
        r.heightDecimalFormatted || '—',
        r.lengthFractionFormatted || '—',
        `${r.widthMm || 0} × ${r.heightMm || 0}`,
        String(r.totalPieces),
      ])
    );
  }

  // 4. Total Material Cutting List Summary
  drawTable(
    `TOTAL MATERIAL CUTTING LIST (QTY: ${result.input.quantity})`,
    [15, 118, 110],
    ['Material / Section', 'Cut Dimension', 'Total Pieces', 'Total Running / Area'],
    [margin + 2, margin + 62, margin + 122, margin + 148],
    result.materialSummary.map((m) => [
      m.name,
      m.cutSizeDisplay,
      `${m.totalPieces} pcs`,
      m.totalRunningFeet !== undefined
        ? `${m.totalRunningFeet} ft (${m.totalRunningInches}")`
        : m.totalAreaSqFt !== undefined
          ? `${m.totalAreaSqFt} sq.ft`
          : '—',
    ])
  );

  ensureSpace(12);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Generated by WindowCut Pro. Verify site opening tolerances and aluminium die clearances prior to cutting.',
    margin,
    y + 2
  );

  const safeSys = sanitizeFileSegment(result.systemName, 'window');
  const safeLbl = sanitizeFileSegment(result.input.windowLabel, 'W1');
  doc.save(`WindowCutPro_${safeSys}_${safeLbl}_CuttingList.pdf`);
}
