import React, { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Printer,
  Share2,
  ClipboardList,
  Check,
  AlertCircle,
} from 'lucide-react';
import type {
  BusinessSettings,
  SlidingWindowCalculationResult,
} from '../../types.ts';
import {
  buildTechnicalDrawingSvgMarkup,
  downloadTechnicalDrawingPNG,
  renderTechnicalDrawingPngDataUrl,
} from '../../lib/slidingWindowDrawingSvg.ts';
import {
  downloadSlidingWindowCuttingPDF,
  downloadTechnicalDrawingsPDF,
} from '../../lib/slidingWindowExport.ts';
import {
  formatInchDecimal,
  formatMeasurement,
  formatMeasurementWithFraction,
} from '../../lib/slidingWindowEngine.ts';

interface WindowTechnicalDrawingProps {
  result: SlidingWindowCalculationResult;
  projectName: string;
  customerName: string;
  settings?: BusinessSettings;
  compact?: boolean;
}

export const WindowTechnicalDrawing: React.FC<WindowTechnicalDrawingProps> = ({
  result,
  projectName,
  customerName,
  settings,
  compact = false,
}) => {
  const [busyAction, setBusyAction] = useState<'png' | 'pdf' | 'print' | 'whatsapp' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const meta = useMemo(
    () => ({
      projectName,
      customerName,
      businessName: settings?.businessName || 'WindowCut Pro',
      generatedDate: new Date().toLocaleDateString('en-IN'),
    }),
    [projectName, customerName, settings?.businessName]
  );

  const svgMarkup = useMemo(
    () => buildTechnicalDrawingSvgMarkup(result, meta),
    [result, meta]
  );

  const svgDataUri = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
    [svgMarkup]
  );

  const notify = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => {
      setFeedback(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  if (!result.isValid) {
    return null;
  }

  const handleDownloadPng = async () => {
    setBusyAction('png');
    try {
      await downloadTechnicalDrawingPNG(result, meta);
      notify('success', `Downloaded PNG technical drawing for ${result.windowNumber}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to generate PNG drawing.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadDrawingPdf = async () => {
    setBusyAction('pdf');
    try {
      await downloadTechnicalDrawingsPDF({
        projectName,
        customerName,
        results: [result],
        settings,
      });
      notify('success', `Downloaded Technical Drawing PDF for ${result.windowNumber}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to export Technical Drawing PDF.');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrintDrawing = () => {
    setBusyAction('print');
    try {
      let portal = document.getElementById('jhd-print-drawing-portal');
      if (!portal) {
        portal = document.createElement('div');
        portal.id = 'jhd-print-drawing-portal';
        portal.style.display = 'none';
        document.body.appendChild(portal);
      }
      // Safely render pure SVG image element inside print portal
      portal.replaceChildren();
      const img = document.createElement('img');
      img.src = svgDataUri;
      img.alt = `Technical Drawing ${result.windowNumber}`;
      img.style.width = '100%';
      img.style.maxWidth = '1050px';
      img.style.height = 'auto';
      portal.appendChild(img);

      document.body.classList.add('jhd-printing-drawing');
      const cleanup = () => {
        document.body.classList.remove('jhd-printing-drawing');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);

      window.setTimeout(() => {
        window.print();
        window.setTimeout(cleanup, 1200);
      }, 120);
    } catch (err: any) {
      document.body.classList.remove('jhd-printing-drawing');
      notify('error', err?.message || 'Could not open print preview.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareWhatsApp = async () => {
    setBusyAction('whatsapp');
    try {
      const u = result.displayUnit;
      const topB = Number.isFinite(result.fabrication.topBearingDisplay)
        ? formatMeasurementWithFraction(result.fabrication.topBearingDisplay, u)
        : '—';
      const botB = Number.isFinite(result.fabrication.bottomBearingDisplay)
        ? formatMeasurementWithFraction(result.fabrication.bottomBearingDisplay, u)
        : '—';

      const glassLines = result.glassPanels
        .map(gp => {
          const primary = `${formatMeasurement(gp.widthDisplay, u)} x ${formatMeasurement(gp.heightDisplay, u)}`;
          if (u === 'inch') {
            return `  - ${gp.label}: ${formatMeasurementWithFraction(gp.widthDisplay, u)} x ${formatMeasurementWithFraction(gp.heightDisplay, u)}`;
          }
          return `  - ${gp.label}: ${primary} (${formatInchDecimal(gp.widthInch)}" x ${formatInchDecimal(gp.heightInch)}")`;
        })
        .join('\n');

      const netLines =
        result.mosquitoNetPanels.length > 0
          ? '\n*Mosquito Net:*\n' +
            result.mosquitoNetPanels
              .map(np =>
                u === 'inch'
                  ? `  - ${np.label}: ${formatMeasurementWithFraction(np.widthDisplay, u)} x ${formatMeasurementWithFraction(np.heightDisplay, u)}`
                  : `  - ${np.label}: ${formatMeasurement(np.widthDisplay, u)} x ${formatMeasurement(np.heightDisplay, u)} (${formatInchDecimal(np.widthInch)}" x ${formatInchDecimal(np.heightInch)}")`
              )
              .join('\n')
          : '';

      const message = [
        `*${settings?.businessName || 'WINDOWCUT PRO'} — Sliding Window Drawing & Cutting List*`,
        `Project: ${projectName || 'Window Fabrication'}`,
        customerName ? `Customer: ${customerName}` : null,
        `Window: *${result.windowNumber}* (${result.original.trackType.toUpperCase()} · ${result.original.configuration})`,
        `Size: ${formatMeasurementWithFraction(result.original.width, u)} x ${formatMeasurementWithFraction(result.original.height, u)}`,
        `Profile: ${result.profileUsed.name}`,
        '',
        `*Aluminium & Track Cuts:*`,
        `  - Top Track (T.B.): ${formatMeasurementWithFraction(result.fabrication.topTrackDisplay, u)}`,
        `  - Bottom Track (T.B.): ${formatMeasurementWithFraction(result.fabrication.bottomTrackDisplay, u)}`,
        `  - Handle Section: ${formatMeasurementWithFraction(result.fabrication.handleDisplay, u)}`,
        `  - Interlock Section: ${formatMeasurementWithFraction(result.fabrication.interlockDisplay, u)}`,
        '',
        `*Bearing Measurement (T.B.):*`,
        `  1. Top Track (T.B.) Bearing: *${topB}*`,
        `  2. Bottom Track (T.B.) Bearing: *${botB}*`,
        '',
        `*Glass Panels (${result.original.glassThickness}):*`,
        glassLines,
        netLines,
      ]
        .filter(line => line !== null)
        .join('\n');

      // Try native Web Share with PNG attachment on supported devices first
      let sharedNative = false;
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare) {
        try {
          const pngUrl = await renderTechnicalDrawingPngDataUrl(result, meta);
          const blob = await (await fetch(pngUrl)).blob();
          const file = new File(
            [blob],
            `JHD_Drawing_${result.windowNumber || 'W1'}.png`,
            { type: 'image/png' }
          );
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${result.windowNumber} Technical Drawing`,
              text: message,
              files: [file],
            });
            sharedNative = true;
          }
        } catch {
          sharedNative = false;
        }
      }

      if (!sharedNative) {
        // Download PNG locally so fabricator has image ready to drop in chat, and open generic WhatsApp share picker
        await downloadTechnicalDrawingPNG(result, meta);
        const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        const a = document.createElement('a');
        a.href = waUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        notify('success', 'WhatsApp summary opened & PNG drawing downloaded to attach.');
      }
    } catch (err: any) {
      notify('error', err?.message || 'Could not share drawing on WhatsApp.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadCuttingList = () => {
    downloadSlidingWindowCuttingPDF({
      projectName,
      customerName,
      results: [result],
      settings,
    });
  };

  return (
    <div className="border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
      {/* Drawing Action Header */}
      <div className="px-4 py-3 bg-[#F8F8F6] border-b border-[#E5E5E5] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <h5 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
            Automatic Technical Window Drawing — {result.windowNumber}
          </h5>
          <p className="text-[11px] text-[#666666]">
            {result.original.trackType === '3-track'
              ? '3-Track Architectural Elevation (2 Glass + Mosquito Net · Proportional Panel Layout)'
              : '2-Track Architectural Elevation (2 Sliding Glass Panels · Interlock & Track Plan)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={busyAction !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FFF7E3] text-[#1A1A1A] border border-[#D4D4D4] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#C89211]" />
            <span>{busyAction === 'png' ? 'Generating...' : 'Download PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDrawingPdf}
            disabled={busyAction !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-black text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-[#E6B33A]" />
            <span>{busyAction === 'pdf' ? 'Creating PDF...' : 'Download Drawing PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintDrawing}
            disabled={busyAction !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F3F3F0] text-[#1A1A1A] border border-[#D4D4D4] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-[#444444]" />
            <span>Print Drawing</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={busyAction !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#16803A] hover:bg-[#146C31] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{busyAction === 'whatsapp' ? 'Preparing...' : 'Share on WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCuttingList}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FFF7E3] hover:bg-[#FDECC4] text-[#8A6108] border border-[#C89211]/40 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Complete Cutting List</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border-b ${
            feedback.type === 'success'
              ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
              : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Responsive Engineering SVG Preview */}
      <div className={`bg-[#FFFFFF] ${compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}`}>
        <img
          src={svgDataUri}
          alt={`Technical Fabrication Drawing for Window ${result.windowNumber}`}
          className="w-full h-auto block rounded border border-[#E5E5E5]"
        />
      </div>
    </div>
  );
};
