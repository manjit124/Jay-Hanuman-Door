import { jsPDF } from 'jspdf';
import type {
  BusinessSettings,
  SlidingWindowCalculationResult,
  WindowMeasurementUnit,
} from '../types.ts';
import { formatInchDecimal, formatInchFraction, formatMeasurement } from './slidingWindowEngine.ts';
import { renderTechnicalDrawingPngDataUrl } from './slidingWindowDrawingSvg.ts';

function sanitizeFileSegment(val: string, fallback: string): string {
  const cleaned = String(val || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function escapeCsvCell(val: string | number | undefined | null): string {
  const str = String(val ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtSize(w: number, h: number, unit: WindowMeasurementUnit): string {
  return `${formatMeasurement(w, unit)} x ${formatMeasurement(h, unit)}`;
}

/**
 * Generates and downloads a multi-page Jai Hanuman Door Fabrication Cutting Sheet PDF
 * for one or many calculated sliding windows.
 */
export function downloadSlidingWindowCuttingPDF(params: {
  projectName: string;
  customerName: string;
  results: SlidingWindowCalculationResult[];
  settings?: BusinessSettings;
}): void {
  const { projectName, customerName, results, settings } = params;
  const validResults = results.filter(r => r.isValid);
  if (validResults.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(10, 37, 64);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(settings?.businessName || 'WindowCut Pro', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(249, 115, 22);
    doc.text('SLIDING WINDOW FABRICATION CUTTING LIST', margin, 18.5);

    doc.setTextColor(210, 210, 210);
    doc.setFontSize(8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, 11, { align: 'right' });
    doc.text(`Page ${pageNum}`, pageWidth - margin, 18.5, { align: 'right' });
  };

  let pageNumber = 1;
  drawHeader(pageNumber);
  let y = 34;

  // Project Summary Strip
  doc.setFillColor(248, 248, 246);
  doc.setDrawColor(229, 229, 229);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Project: ${projectName || 'Untitled Window Project'}`, margin + 4, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Customer: ${customerName || 'Walk-in Client'}   |   Total Windows: ${validResults.length}`,
    margin + 4,
    y + 12.5
  );
  y += 22;

  validResults.forEach((res, idx) => {
    const neededHeight = 58 + (res.glassPanels.length + res.mosquitoNetPanels.length) * 6;
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      pageNumber += 1;
      drawHeader(pageNumber);
      y = 34;
    }

    const u = res.displayUnit;

    // Window Heading Bar
    doc.setFillColor(255, 247, 227);
    doc.setDrawColor(200, 146, 17);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, 'FD');
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      `${idx + 1}. Window ${res.windowNumber} — ${res.original.trackType.toUpperCase()} (${res.original.configuration})`,
      margin + 3,
      y + 6.5
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 80, 20);
    doc.text(`Profile: ${res.profileUsed.name}`, pageWidth - margin - 3, y + 6.5, { align: 'right' });
    y += 13;

    const fmtInchRef = (inchVal: number): string => {
      const dec = `${formatInchDecimal(inchVal)}"`;
      const frac = formatInchFraction(inchVal, true);
      return frac ? `${dec} (${frac})` : dec;
    };

    // Section A: Original Measurements
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('ORIGINAL MEASUREMENTS:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 26, 26);
    doc.text(
      `Width: ${formatMeasurement(res.original.width, u)} (${fmtInchRef(res.original.widthInch)} / ${res.original.widthMm}mm)  |  Height: ${formatMeasurement(res.original.height, u)} (${fmtInchRef(res.original.heightInch)} / ${res.original.heightMm}mm)  |  Glass: ${res.original.glassThickness}`,
      margin + 42,
      y
    );
    y += 6;

    // Cutting Table Header
    doc.setFillColor(38, 38, 38);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Component', margin + 3, y + 4.5);
    doc.text('Category', margin + 62, y + 4.5);
    doc.text(`Cutting Size (${u})`, margin + 102, y + 4.5);
    doc.text('Reference (Inch / MM)', margin + 142, y + 4.5);
    y += 6.5;

    const hasBearing =
      Number.isFinite(res.fabrication.topBearingInch) &&
      Number.isFinite(res.fabrication.bottomBearingInch);

    const rows: Array<[string, string, string, string]> = [
      [
        'Top Track',
        'Aluminium Track',
        formatMeasurement(res.fabrication.topTrackDisplay, u),
        `${fmtInchRef(res.fabrication.topTrackInch)} / ${res.fabrication.topTrackMm} mm`,
      ],
      [
        'Bottom Track',
        'Aluminium Track',
        formatMeasurement(res.fabrication.bottomTrackDisplay, u),
        `${fmtInchRef(res.fabrication.bottomTrackInch)} / ${res.fabrication.bottomTrackMm} mm`,
      ],
      ...(hasBearing
        ? ([
            [
              'Top Track (T.B.) Bearing',
              'Bearing Measurement',
              formatMeasurement(res.fabrication.topBearingDisplay, u),
              `${fmtInchRef(res.fabrication.topBearingInch)} / ${res.fabrication.topBearingMm} mm`,
            ],
            [
              'Bottom Track (T.B.) Bearing',
              'Bearing Measurement',
              formatMeasurement(res.fabrication.bottomBearingDisplay, u),
              `${fmtInchRef(res.fabrication.bottomBearingInch)} / ${res.fabrication.bottomBearingMm} mm`,
            ],
          ] as Array<[string, string, string, string]>)
        : []),
      [
        'Handle Section',
        'Shutter Vertical',
        formatMeasurement(res.fabrication.handleDisplay, u),
        `${fmtInchRef(res.fabrication.handleInch)} / ${res.fabrication.handleMm} mm`,
      ],
      [
        'Interlock Section',
        'Shutter Vertical',
        formatMeasurement(res.fabrication.interlockDisplay, u),
        `${fmtInchRef(res.fabrication.interlockInch)} / ${res.fabrication.interlockMm} mm`,
      ],
      ...res.glassPanels.map((gp): [string, string, string, string] => [
        gp.label,
        'Final Glass Cutting',
        fmtSize(gp.widthDisplay, gp.heightDisplay, u),
        `${formatInchDecimal(gp.widthInch)}" x ${formatInchDecimal(gp.heightInch)}" (${gp.widthMm}x${gp.heightMm}mm)`,
      ]),
      ...res.mosquitoNetPanels.map((np): [string, string, string, string] => [
        np.label,
        'Mosquito Net Cutting',
        fmtSize(np.widthDisplay, np.heightDisplay, u),
        `${formatInchDecimal(np.widthInch)}" x ${formatInchDecimal(np.heightInch)}" (${np.widthMm}x${np.heightMm}mm)`,
      ]),
    ];

    rows.forEach((row, rIdx) => {
      if (rIdx % 2 === 1) {
        doc.setFillColor(249, 249, 248);
        doc.rect(margin, y, contentWidth, 5.8, 'F');
      }
      doc.setDrawColor(235, 235, 235);
      doc.line(margin, y + 5.8, margin + contentWidth, y + 5.8);
      const isHighlightRow = row[1] === 'Final Glass Cutting' || row[1] === 'Mosquito Net Cutting';
      doc.setFont('helvetica', isHighlightRow ? 'bold' : 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(26, 26, 26);
      doc.text(row[0], margin + 3, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(95, 95, 95);
      doc.text(row[1], margin + 62, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text(row[2], margin + 102, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(row[3], margin + 142, y + 4);
      y += 5.8;
    });

    y += 8;
  });

  const fileName = `JHD_Window_Fabrication_${sanitizeFileSegment(projectName, 'Project')}.pdf`;
  doc.save(fileName);
}

/**
 * Exports all calculated windows to an Excel-compatible CSV (.csv with UTF-8 BOM so Microsoft Excel
 * opens columns, symbols, and decimals cleanly without corruption).
 */
export function exportSlidingWindowExcelCSV(params: {
  projectName: string;
  customerName: string;
  results: SlidingWindowCalculationResult[];
}): void {
  const { projectName, customerName, results } = params;
  const validResults = results.filter(r => r.isValid);
  if (validResults.length === 0) return;

  const headers = [
    'Project Name',
    'Customer Name',
    'Window No.',
    'Track Type',
    'Configuration',
    'Profile Used',
    'Glass Thickness',
    'Mosquito Net',
    'Input Unit',
    'Original Width',
    'Original Height',
    'Top Track Size',
    'Bottom Track Size',
    'Top Bearing (T.B.)',
    'Bottom Bearing (T.B.)',
    'Handle Cutting Size',
    'Interlock Cutting Size',
    'Glass Panel 1 (W x H)',
    'Glass Panel 2 (W x H)',
    'Extra Glass Panels',
    'Mosquito Net Panel (W x H)',
    'Glass Size (MM)',
    'Mosquito Net Size (MM)',
  ];

  const rows = validResults.map(r => {
    const u = r.displayUnit;
    const g1 = r.glassPanels[0];
    const g2 = r.glassPanels[1];
    const extraGlass = r.glassPanels
      .slice(2)
      .map(g => `${g.label}: ${fmtSize(g.widthDisplay, g.heightDisplay, u)}`)
      .join(' | ');
    const netText = r.mosquitoNetPanels
      .map(n => fmtSize(n.widthDisplay, n.heightDisplay, u))
      .join(' | ');
    const netMm = r.mosquitoNetPanels
      .map(n => `${n.widthMm} x ${n.heightMm} mm`)
      .join(' | ');

    return [
      projectName || 'Window Project',
      customerName || '',
      r.windowNumber,
      r.original.trackType,
      r.original.configuration,
      r.profileUsed.name,
      r.original.glassThickness,
      r.original.mosquitoNetRequired ? 'Yes' : 'No',
      u,
      formatMeasurement(r.original.width, u),
      formatMeasurement(r.original.height, u),
      formatMeasurement(r.fabrication.topTrackDisplay, u),
      formatMeasurement(r.fabrication.bottomTrackDisplay, u),
      Number.isFinite(r.fabrication.topBearingDisplay)
        ? formatMeasurement(r.fabrication.topBearingDisplay, u)
        : 'N/A',
      Number.isFinite(r.fabrication.bottomBearingDisplay)
        ? formatMeasurement(r.fabrication.bottomBearingDisplay, u)
        : 'N/A',
      formatMeasurement(r.fabrication.handleDisplay, u),
      formatMeasurement(r.fabrication.interlockDisplay, u),
      g1 ? fmtSize(g1.widthDisplay, g1.heightDisplay, u) : '',
      g2 ? fmtSize(g2.widthDisplay, g2.heightDisplay, u) : '',
      extraGlass,
      netText || 'N/A',
      g1 ? `${g1.widthMm} x ${g1.heightMm} mm` : '',
      netMm || 'N/A',
    ].map(escapeCsvCell).join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `JHD_Window_Fabrication_${sanitizeFileSegment(projectName, 'Project')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates and downloads a Landscape A4 Technical Drawing PDF for one or more
 * calculated windows (1 crisp technical drawing sheet per window).
 */
export async function downloadTechnicalDrawingsPDF(params: {
  projectName: string;
  customerName: string;
  results: SlidingWindowCalculationResult[];
  settings?: BusinessSettings;
  fileNameOverride?: string;
}): Promise<void> {
  const { projectName, customerName, results, settings, fileNameOverride } = params;
  const validResults = results.filter(r => r.isValid);
  if (validResults.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 10;
  const imgW = pageWidth - margin * 2;
  const imgH = (imgW * 760) / 1120;
  const yOffset = Math.max(8, (pageHeight - imgH) / 2);
  const dateStr = new Date().toLocaleDateString('en-IN');

  for (let i = 0; i < validResults.length; i++) {
    if (i > 0) doc.addPage();
    const res = validResults[i];
    const pngDataUrl = await renderTechnicalDrawingPngDataUrl(res, {
      projectName,
      customerName,
      businessName: settings?.businessName || 'WindowCut Pro',
      generatedDate: dateStr,
    });
    doc.addImage(pngDataUrl, 'PNG', margin, yOffset, imgW, imgH);
  }

  const defaultName =
    validResults.length === 1
      ? `WindowCutPro_Technical_Drawing_${sanitizeFileSegment(projectName, 'Project')}_${sanitizeFileSegment(
          validResults[0].windowNumber,
          'W1'
        )}.pdf`
      : `WindowCutPro_All_Window_Drawings_${sanitizeFileSegment(projectName, 'Project')}.pdf`;

  doc.save(fileNameOverride || defaultName);
}
