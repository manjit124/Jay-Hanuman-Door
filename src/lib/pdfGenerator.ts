import { jsPDF } from 'jspdf';
import { Quotation, BusinessSettings } from '../types.ts';
import { formatWhatsAppDisplay } from './contactUtils.ts';

export function generateQuotationPDF(quote: Quotation, settings: BusinessSettings): void {
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
  const rows = [
    {
      no: '1',
      title: `Door Material (${quote.materialName})`,
      detail: `${quote.sqFt.toFixed(2)} @ Rs. ${quote.materialRate}`,
      rate: `Rs. ${quote.materialRate}`,
      basis: `${quote.sqFt.toFixed(2)}`,
      amount: `Rs. ${quote.materialCost.toLocaleString('en-IN')}`,
    },
    {
      no: '2',
      title: `Polish / Finish (${quote.finishName})`,
      detail: `${quote.sqFt.toFixed(2)} @ Rs. ${quote.finishRate}`,
      rate: `Rs. ${quote.finishRate}`,
      basis: `${quote.sqFt.toFixed(2)}`,
      amount: `Rs. ${quote.finishCost.toLocaleString('en-IN')}`,
    },
    {
      no: '3',
      title: `Chaukhat / Frame (${quote.frameName})`,
      detail: quote.frameCost > 0 ? 'Heavy timber section with rebates' : 'Shutter only (no frame)',
      rate: quote.frameCost > 0 ? `Rs. ${quote.frameCost.toLocaleString('en-IN')}` : 'N/A',
      basis: '1 Unit',
      amount: `Rs. ${quote.frameCost.toLocaleString('en-IN')}`,
    },
    {
      no: '4',
      title: `Hardware Fitting (${quote.hardwareName})`,
      detail: quote.hardwareQty > 0 ? `Quantity: ${quote.hardwareQty} set(s)` : 'No hardware included',
      rate: quote.hardwarePrice > 0 ? `Rs. ${quote.hardwarePrice}/unit` : 'N/A',
      basis: `${quote.hardwareQty} Unit(s)`,
      amount: `Rs. ${quote.hardwareCost.toLocaleString('en-IN')}`,
    },
  ];

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

  // Save the PDF
  const filename = `${quote.quoteNumber || 'Quotation'}-${quote.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
