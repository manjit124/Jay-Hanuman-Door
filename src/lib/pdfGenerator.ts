import { jsPDF } from 'jspdf';
import { Quotation, BusinessSettings, ChaukhatCalculationResult, CombinedQuotation } from '../types.ts';
import { formatWhatsAppDisplay } from './contactUtils.ts';

export function buildQuotationPDFDoc(quote: Quotation, settings: BusinessSettings): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  // Header Banner Background
  doc.setFillColor(30, 27, 24); // Warm dark teak charcoal
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Business Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName || 'Jai Hanuman Door', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 200, 180);
  doc.text(settings.tagline || 'Master Craftsmen in Handcrafted Sagwan & Teak Wood Doors', margin, 26);

  // Business contact in header right
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  const contactText = [
    `Phone: ${settings.phone || '+91 78874 12884'}`,
    `WhatsApp: ${formatWhatsAppDisplay(settings.whatsappNumber)}`,
    `Email: ${settings.email || 'shivshahidoors@gmail.com'}`,
  ];
  let contactY = 16;
  contactText.forEach(line => {
    doc.text(line, pageWidth - margin, contactY, { align: 'right' });
    contactY += 5;
  });

  y = 52;

  // Quotation Title & Meta Box
  doc.setDrawColor(220, 215, 205);
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 26, 2, 2, 'FD');

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL DOOR PRICE ESTIMATE', margin + 6, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 90, 80);
  doc.text(`Quotation No: ${quote.quoteNumber}`, margin + 6, y + 17);
  doc.text(`Date: ${new Date(quote.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin + 6, y + 22);

  // Customer Info Box Right
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Customer Details:', pageWidth / 2 + 10, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${quote.customerName}`, pageWidth / 2 + 10, y + 15);
  doc.text(`Phone: ${quote.customerPhone}`, pageWidth / 2 + 10, y + 20);
  if (quote.customerCity) {
    doc.text(`City / Site: ${quote.customerCity}`, pageWidth / 2 + 10, y + 25);
  }

  y += 34;

  // Door Model and Dimensions Bar
  doc.setFillColor(243, 239, 232);
  doc.rect(margin, y, pageWidth - (margin * 2), 16, 'F');
  doc.setTextColor(120, 53, 15); // Teak Amber
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(quote.doorName || 'Custom Engineered Wood Door', margin + 4, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Size: ${quote.widthInch}" (W) × ${quote.heightInch}" (H)  |  Calculated Area: ${quote.sqFt.toFixed(2)}`,
    margin + 4,
    y + 12
  );

  y += 24;

  // Itemized Pricing Table Header
  doc.setFillColor(45, 40, 35);
  doc.rect(margin, y, pageWidth - (margin * 2), 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('No.', margin + 3, y + 6);
  doc.text('Item / Specification', margin + 14, y + 6);
  doc.text('Rate / Unit', pageWidth - margin - 52, y + 6, { align: 'right' });
  doc.text('Calculation Basis', pageWidth - margin - 26, y + 6, { align: 'right' });
  doc.text('Amount (INR)', pageWidth - margin - 4, y + 6, { align: 'right' });

  y += 9;

  // Table Rows
  const rows: Array<{
    no: string;
    title: string;
    detail: string;
    rate: string;
    basis: string;
    amount: string;
  }> = [];

  let rowNum = 1;
  if (quote.materialIncludedInDoorPrice) {
    if (quote.doorCost && quote.doorCost > 0) {
      rows.push({
        no: String(rowNum++),
        title: `Door Shutter & Design (${quote.doorName || 'Selected Design'})`,
        detail: quote.doorPricingType === 'fixed'
          ? `Fixed price shutter (${quote.materialName} Wood)`
          : `${quote.sqFt.toFixed(2)} sq.ft @ Rs. ${quote.doorBaseRate}/sq.ft (Solid ${quote.materialName} Timber)`,
        rate: quote.doorPricingType === 'fixed' ? 'Fixed' : `Rs. ${quote.doorBaseRate}/sq.ft`,
        basis: quote.doorPricingType === 'fixed' ? '1 Shutter' : `${quote.sqFt.toFixed(2)} sq.ft`,
        amount: `Rs. ${quote.doorCost.toLocaleString('en-IN')}`,
      });
    }

    rows.push({
      no: String(rowNum++),
      title: `Door Material (${quote.materialName})`,
      detail: 'Seasoned solid timber (Included in Door Shutter base price)',
      rate: 'Included',
      basis: `${quote.sqFt.toFixed(2)} sq.ft`,
      amount: 'Included (Rs. 0)',
    });
  } else {
    if (quote.doorCost && quote.doorCost > 0) {
      rows.push({
        no: String(rowNum++),
        title: `Door Craftsmanship (${quote.doorName || 'Selected Design'})`,
        detail: quote.doorPricingType === 'fixed'
          ? 'Fixed price craftsmanship'
          : `${quote.sqFt.toFixed(2)} sq.ft @ Rs. ${quote.doorBaseRate}/sq.ft`,
        rate: quote.doorPricingType === 'fixed' ? 'Fixed' : `Rs. ${quote.doorBaseRate}/sq.ft`,
        basis: quote.doorPricingType === 'fixed' ? '1 Shutter' : `${quote.sqFt.toFixed(2)} sq.ft`,
        amount: `Rs. ${quote.doorCost.toLocaleString('en-IN')}`,
      });
    }

    rows.push({
      no: String(rowNum++),
      title: `Door Material (${quote.materialName})`,
      detail: `${quote.sqFt.toFixed(2)} sq.ft @ Rs. ${quote.materialRate}/sq.ft`,
      rate: `Rs. ${quote.materialRate}/sq.ft`,
      basis: `${quote.sqFt.toFixed(2)} sq.ft`,
      amount: `Rs. ${quote.materialCost.toLocaleString('en-IN')}`,
    });
  }

  if (quote.finishCost && quote.finishCost > 0) {
    rows.push({
      no: String(rowNum++),
      title: `Polish / Finish (${quote.finishName})`,
      detail: `${quote.sqFt.toFixed(2)} @ Rs. ${quote.finishRate}`,
      rate: `Rs. ${quote.finishRate}`,
      basis: `${quote.sqFt.toFixed(2)}`,
      amount: `Rs. ${quote.finishCost.toLocaleString('en-IN')}`,
    });
  }
  if (quote.frameCost && quote.frameCost > 0) {
    rows.push({
      no: String(rowNum++),
      title: `Chaukhat / Frame (${quote.frameName})`,
      detail: 'Heavy timber section with rebates',
      rate: `Rs. ${quote.frameCost.toLocaleString('en-IN')}`,
      basis: '1 Unit',
      amount: `Rs. ${quote.frameCost.toLocaleString('en-IN')}`,
    });
  }
  if (quote.hardwareCost && quote.hardwareCost > 0) {
    rows.push({
      no: String(rowNum++),
      title: `Hardware Fitting (${quote.hardwareName})`,
      detail: `Quantity: ${quote.hardwareQty} set(s)`,
      rate: quote.hardwarePrice > 0 ? `Rs. ${quote.hardwarePrice}/unit` : 'N/A',
      basis: `${quote.hardwareQty} Unit(s)`,
      amount: `Rs. ${quote.hardwareCost.toLocaleString('en-IN')}`,
    });
  }

  doc.setFontSize(9);

  rows.forEach((row, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 250, isEven ? 255 : 248, isEven ? 255 : 245);
    doc.rect(margin, y, pageWidth - (margin * 2), 12, 'F');
    doc.setDrawColor(230, 225, 218);
    doc.line(margin, y + 12, pageWidth - margin, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(row.no, margin + 4, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(row.title, margin + 14, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 100, 95);
    doc.text(row.detail, margin + 14, y + 9.5);

    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text(row.rate, pageWidth - margin - 52, y + 7, { align: 'right' });
    doc.text(row.basis, pageWidth - margin - 26, y + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(row.amount, pageWidth - margin - 4, y + 7, { align: 'right' });

    y += 12;
  });

  // Subtotal & Total Block
  y += 4;
  const summaryBoxWidth = 85;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(248, 245, 240);
  doc.rect(summaryX, y, summaryBoxWidth, quote.additionalCharges > 0 ? 32 : 24, 'F');
  doc.setDrawColor(220, 210, 200);
  doc.rect(summaryX, y, summaryBoxWidth, quote.additionalCharges > 0 ? 32 : 24, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text('Subtotal:', summaryX + 6, y + 7);
  doc.text(`Rs. ${quote.subtotal.toLocaleString('en-IN')}`, summaryX + summaryBoxWidth - 6, y + 7, { align: 'right' });

  let totalOffset = y + 7;

  if (quote.additionalCharges > 0) {
    totalOffset += 7;
    doc.text(quote.additionalChargeName || 'Additional Taxes:', summaryX + 6, totalOffset);
    doc.text(`Rs. ${quote.additionalCharges.toLocaleString('en-IN')}`, summaryX + summaryBoxWidth - 6, totalOffset, { align: 'right' });
  }

  totalOffset += 8;
  doc.setDrawColor(180, 83, 9);
  doc.line(summaryX + 6, totalOffset - 2, summaryX + summaryBoxWidth - 6, totalOffset - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(180, 83, 9); // Bold Teak Amber
  doc.text('Estimated Total:', summaryX + 6, totalOffset + 4);
  doc.text(`Rs. ${quote.total.toLocaleString('en-IN')}`, summaryX + summaryBoxWidth - 6, totalOffset + 4, { align: 'right' });

  y = totalOffset + 18;

  // Terms & Important Notes
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Terms & Conditions / Notes:', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 85, 80);

  const terms = settings.terms?.length
    ? settings.terms
    : [
        'Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.',
        'Estimate is valid for 30 days from generation.',
        'Transportation and installation charges extra as per site location.',
      ];

  terms.forEach(term => {
    const wrapped = doc.splitTextToSize(`• ${term}`, pageWidth - (margin * 2));
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.8;
  });

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(140, 130, 120);
  doc.text(
    `Generated by ${settings.businessName} Door Price Calculator Portal | Official WhatsApp: ${formatWhatsAppDisplay(settings.whatsappNumber)}`,
    pageWidth / 2,
    288,
    { align: 'center' }
  );

  const filename = `${quote.quoteNumber || 'Quotation'}-${quote.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  return { doc, filename };
}

export function generateQuotationPDF(quote: Quotation, settings: BusinessSettings): void {
  const { doc, filename } = buildQuotationPDFDoc(quote, settings);
  doc.save(filename);
}

export function createQuotationPDFBlob(quote: Quotation, settings: BusinessSettings): { blob: Blob; filename: string } {
  const { doc, filename } = buildQuotationPDFDoc(quote, settings);
  const blob = doc.output('blob');
  return { blob, filename };
}

export function generateChaukhatQuotationPDF(
  chaukhat: ChaukhatCalculationResult,
  settings: BusinessSettings,
  customerName?: string,
  customerPhone?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  // Header Banner Background
  doc.setFillColor(30, 27, 24);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Business Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName || 'Jai Hanuman Door', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 200, 180);
  doc.text(settings.tagline || 'Master Craftsmen in Handcrafted Sagwan & Teak Wood Doors', margin, 26);

  // Business contact
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  const contactText = [
    `Phone: ${settings.phone || '+91 78874 12884'}`,
    `WhatsApp: ${formatWhatsAppDisplay(settings.whatsappNumber)}`,
    `Email: ${settings.email || 'shivshahidoors@gmail.com'}`,
  ];
  let contactY = 16;
  contactText.forEach(line => {
    doc.text(line, pageWidth - margin, contactY, { align: 'right' });
    contactY += 5;
  });

  y = 52;

  // Quotation Title & Meta Box
  doc.setDrawColor(220, 215, 205);
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 26, 2, 2, 'FD');

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL CHAUKHAT (DOOR FRAME) ESTIMATE', margin + 6, y + 9);

  const quoteNo = `CHK-${Date.now().toString().slice(-6)}`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 90, 80);
  doc.text(`Quotation No: ${quoteNo}`, margin + 6, y + 17);

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Date: ${dateStr}`, margin + 6, y + 23);

  // Customer Details Right
  doc.text(`Customer: ${customerName || 'Valued Client'}`, pageWidth - margin - 6, y + 17, { align: 'right' });
  if (customerPhone) {
    doc.text(`Contact: ${customerPhone}`, pageWidth - margin - 6, y + 23, { align: 'right' });
  }

  y += 33;

  // Specifications Grid
  doc.setFillColor(245, 243, 240);
  doc.setDrawColor(215, 208, 198);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 34, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Chaukhat Frame Specifications', margin + 6, y + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 65, 60);

  const col1X = margin + 6;
  const col2X = margin + 55;
  const col3X = margin + 115;

  doc.text(`Wood Timber:`, col1X, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(`${chaukhat.woodType}`, col1X, y + 21);
  doc.setFont('helvetica', 'normal');

  doc.text(`Section Size (W × D):`, col2X, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(`${chaukhat.sectionSizeName}`, col2X, y + 21);
  doc.setFont('helvetica', 'normal');

  doc.text(`Overall Opening:`, col3X, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(`${chaukhat.heightFt} ft × ${chaukhat.widthFt} ft (${chaukhat.heightInch}" × ${chaukhat.widthInch}")`, col3X, y + 21);
  doc.setFont('helvetica', 'normal');

  doc.text(`Selected Design:`, col1X, y + 27);
  doc.setFont('helvetica', 'bold');
  doc.text(`${chaukhat.selectedDesignName}`, col1X + 26, y + 27);
  doc.setFont('helvetica', 'normal');

  doc.text(`Total Running Length:`, col3X, y + 27);
  doc.setFont('helvetica', 'bold');
  doc.text(`${chaukhat.runningLengthFt.toFixed(1)} Running Feet (2 × H + W)`, col3X + 32, y + 27);
  doc.setFont('helvetica', 'normal');

  y += 42;

  // Price Breakdown Table
  doc.setFillColor(50, 45, 40);
  doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('No.', margin + 3, y + 5.5);
  doc.text('Item / Specification', margin + 14, y + 5.5);
  doc.text('Rate / Basis', pageWidth - margin - 50, y + 5.5, { align: 'right' });
  doc.text('Calculation Basis', pageWidth - margin - 26, y + 5.5, { align: 'right' });
  doc.text('Amount (INR)', pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 8;

  const tableRows = [
    {
      no: '1',
      title: `Chaukhat Solid Timber Material (${chaukhat.woodType})`,
      detail: `Kiln-seasoned ${chaukhat.sectionSizeName} timber section`,
      rate: chaukhat.pricingMethod === 'running_foot' ? `Rs. ${chaukhat.woodRatePerRft}/Rft` : 'Fixed Material',
      basis: `${chaukhat.runningLengthFt.toFixed(1)} Rft`,
      amount: `Rs. ${chaukhat.materialCost.toLocaleString('en-IN')}`,
    },
    {
      no: '2',
      title: `Chaukhat Craftsmanship & Carving (${chaukhat.selectedDesignName})`,
      detail: chaukhat.selectedDesignId === 'plain'
        ? 'Clean precision square rebate & planed profile'
        : chaukhat.selectedDesignId === 'diamond'
        ? 'Artisan geometric diamond relief borders'
        : 'Deep relief floral & traditional ornamental carving',
      rate: chaukhat.designCarvingCharge > 0 ? `Rs. ${(chaukhat.designCarvingCharge / Math.max(1, chaukhat.runningLengthFt)).toFixed(0)}/Rft` : 'Included',
      basis: `${chaukhat.runningLengthFt.toFixed(1)} Rft`,
      amount: chaukhat.designCarvingCharge > 0 ? `Rs. ${chaukhat.designCarvingCharge.toLocaleString('en-IN')}` : 'Rs. 0 (Included)',
    },
  ];

  tableRows.forEach(row => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(235, 230, 222);
    doc.rect(margin, y, pageWidth - (margin * 2), 12, 'FD');

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(row.no, margin + 4, y + 5);
    doc.text(row.title, margin + 14, y + 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 100, 95);
    doc.text(row.detail, margin + 14, y + 9.5);

    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(row.rate, pageWidth - margin - 50, y + 6.5, { align: 'right' });
    doc.text(row.basis, pageWidth - margin - 26, y + 6.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(row.amount, pageWidth - margin - 4, y + 6.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 12;
  });

  y += 4;

  // Subtotal & Total Box
  doc.setDrawColor(215, 208, 198);
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(pageWidth - margin - 75, y, 75, 26, 2, 2, 'FD');

  const totX = pageWidth - margin - 6;
  doc.setFontSize(8.5);
  doc.setTextColor(80, 75, 70);
  doc.text('Subtotal:', totX - 40, y + 6.5);
  doc.text(`Rs. ${chaukhat.subtotal.toLocaleString('en-IN')}`, totX, y + 6.5, { align: 'right' });

  doc.text('Taxes & Workshop Levies:', totX - 40, y + 12.5);
  doc.text(`Rs. ${chaukhat.additionalCharges.toLocaleString('en-IN')}`, totX, y + 12.5, { align: 'right' });

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 112, 11);
  doc.text('Estimated Total:', totX - 40, y + 20);
  doc.text(`Rs. ${chaukhat.totalPrice.toLocaleString('en-IN')}`, totX, y + 20, { align: 'right' });

  y += 36;

  // Terms & Conditions
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Notes & Timber Verification:', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 85, 80);

  const chkTerms = [
    'Price shown is an estimate based on standard running length (2 × height + width) and may vary based on exact masonry opening measurements.',
    'Timber is kiln-seasoned to 8-12% moisture with anti-termite chemical dipping.',
    'Hold-fast clamps, site installation, and transportation are arranged on request as per site location.',
  ];

  chkTerms.forEach(term => {
    const wrapped = doc.splitTextToSize(`• ${term}`, pageWidth - (margin * 2));
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.8;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(140, 130, 120);
  doc.text(
    `Jai Hanuman Door | Chaukhat (Door Frame) Price Calculator | WhatsApp: ${formatWhatsAppDisplay(settings.whatsappNumber)}`,
    pageWidth / 2,
    288,
    { align: 'center' }
  );

  const filename = `Chaukhat-Estimate-${chaukhat.woodType.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now().toString().slice(-4)}.pdf`;
  doc.save(filename);
}

export function generateCombinedQuotationPDF(
  combined: CombinedQuotation,
  settings: BusinessSettings,
  customerName?: string,
  customerPhone?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 20;

  // Header Banner Background
  doc.setFillColor(30, 27, 24);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Business Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName || 'Jai Hanuman Door', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 200, 180);
  doc.text(settings.tagline || 'Master Craftsmen in Handcrafted Sagwan & Teak Wood Doors', margin, 26);

  // Business contact
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  const contactText = [
    `Phone: ${settings.phone || '+91 78874 12884'}`,
    `WhatsApp: ${formatWhatsAppDisplay(settings.whatsappNumber)}`,
    `Email: ${settings.email || 'shivshahidoors@gmail.com'}`,
  ];
  let contactY = 16;
  contactText.forEach(line => {
    doc.text(line, pageWidth - margin, contactY, { align: 'right' });
    contactY += 5;
  });

  y = 52;

  // Quotation Title & Meta Box
  doc.setDrawColor(220, 215, 205);
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 26, 2, 2, 'FD');

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMBINED DOOR + CHAUKHAT OFFICIAL ESTIMATE', margin + 6, y + 9);

  const quoteNo = `JHD-COMB-${Date.now().toString().slice(-6)}`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 90, 80);
  doc.text(`Quotation No: ${quoteNo}`, margin + 6, y + 17);

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Date: ${dateStr}`, margin + 6, y + 23);

  // Customer Details Right
  doc.text(`Customer: ${customerName || 'Valued Client'}`, pageWidth - margin - 6, y + 17, { align: 'right' });
  if (customerPhone) {
    doc.text(`Contact: ${customerPhone}`, pageWidth - margin - 6, y + 23, { align: 'right' });
  }

  y += 33;

  // Door Shutter Summary Box
  if (combined.doorCalculation) {
    doc.setFillColor(248, 246, 242);
    doc.setDrawColor(215, 208, 198);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('1. Door Shutter Component', margin + 6, y + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 65, 60);
    doc.text(
      `Design: ${combined.doorCalculation.doorName || 'Custom'} | Timber: ${combined.doorCalculation.materialName} | Size: ${combined.doorCalculation.widthInch}" × ${combined.doorCalculation.heightInch}" (${combined.doorCalculation.sqFt.toFixed(2)} sq.ft)`,
      margin + 6,
      y + 13
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Door Price: Rs. ${combined.doorCost.toLocaleString('en-IN')}`,
      pageWidth - margin - 6,
      y + 13,
      { align: 'right' }
    );
    doc.setFont('helvetica', 'normal');

    y += 26;
  }

  // Chaukhat Summary Box
  if (combined.chaukhatCalculation) {
    doc.setFillColor(248, 246, 242);
    doc.setDrawColor(215, 208, 198);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('2. Chaukhat (Door Frame) Component', margin + 6, y + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 65, 60);
    doc.text(
      `Design: ${combined.chaukhatCalculation.selectedDesignName} | Timber: ${combined.chaukhatCalculation.woodType} | Section: ${combined.chaukhatCalculation.sectionSizeName} | Opening: ${combined.chaukhatCalculation.heightFt}ft × ${combined.chaukhatCalculation.widthFt}ft (${combined.chaukhatCalculation.runningLengthFt.toFixed(1)} Rft)`,
      margin + 6,
      y + 13
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Chaukhat Price: Rs. ${combined.chaukhatCost.toLocaleString('en-IN')}`,
      pageWidth - margin - 6,
      y + 13,
      { align: 'right' }
    );
    doc.setFont('helvetica', 'normal');

    y += 26;
  }

  // Combined Total Card
  doc.setDrawColor(200, 146, 17);
  doc.setFillColor(254, 252, 247);
  doc.roundedRect(pageWidth - margin - 85, y, 85, 30, 2, 2, 'FD');

  const ctotX = pageWidth - margin - 6;
  doc.setFontSize(8.5);
  doc.setTextColor(80, 75, 70);
  doc.text('Door Price Total:', ctotX - 50, y + 7);
  doc.text(`Rs. ${combined.doorCost.toLocaleString('en-IN')}`, ctotX, y + 7, { align: 'right' });

  doc.text('Chaukhat Frame Total:', ctotX - 50, y + 13);
  doc.text(`Rs. ${combined.chaukhatCost.toLocaleString('en-IN')}`, ctotX, y + 13, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 112, 11);
  doc.text('Combined Grand Total:', ctotX - 50, y + 22);
  doc.text(`Rs. ${combined.combinedTotal.toLocaleString('en-IN')}`, ctotX, y + 22, { align: 'right' });

  y += 40;

  // Notes
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Terms & Guarantee:', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 85, 80);

  const combTerms = [
    'Combined quotation includes both complete Door Shutter and matching Chaukhat frame with guaranteed precision rebate fitment.',
    'Every component is charged exactly once with zero duplicate craftsmanship or material overheads.',
    'Both door and chaukhat are manufactured from seasoned timber with matching grain profile and moisture balance.',
  ];

  combTerms.forEach(term => {
    const wrapped = doc.splitTextToSize(`• ${term}`, pageWidth - (margin * 2));
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.8;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(140, 130, 120);
  doc.text(
    `Jai Hanuman Door | Complete Door & Chaukhat Manufacturing | WhatsApp: ${formatWhatsAppDisplay(settings.whatsappNumber)}`,
    pageWidth / 2,
    288,
    { align: 'center' }
  );

  const filename = `Combined-Quotation-${Date.now().toString().slice(-4)}.pdf`;
  doc.save(filename);
}

