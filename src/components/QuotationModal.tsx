import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  MessageCircle,
  CheckCircle2,
  FileText,
  Printer,
  Calendar,
  User,
  Phone,
  MapPin,
  Sparkles,
  Loader2,
  Cloud,
  ExternalLink,
} from 'lucide-react';
import { CalculationResult, BusinessSettings, Door, Quotation } from '../types.ts';
import { createQuotation } from '../lib/api.ts';
import { generateQuotationPDF, createQuotationPDFBlob } from '../lib/pdfGenerator.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';
import { uploadBlobToDrive } from '../lib/googleDriveService.ts';

interface QuotationModalProps {
  calculation: CalculationResult;
  door?: Door | null;
  settings: BusinessSettings;
  onClose: () => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  calculation,
  door,
  settings,
  onClose,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [savedQuote, setSavedQuote] = useState<Quotation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Generate & Save Quote
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg('Please enter your name and contact phone number');
      return;
    }
    setErrorMsg('');
    setIsSaving(true);

    try {
      const res = await createQuotation({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerCity: customerCity.trim(),
        doorId: door?.id,
        doorName: door?.name || 'Custom Wood Door',
        doorImage: door?.images?.[0],
        widthInch: calculation.widthInch,
        heightInch: calculation.heightInch,
        materialId: '',
        finishId: '',
        frameId: '',
        hardwareId: '',
        hardwareQty: calculation.hardwareQty,
      });

      setSavedQuote(res.quotation);
    } catch (err: any) {
      console.error(err);
      // Even if offline/network fails, create fallback local quote
      const fallbackQuote: Quotation = {
        ...calculation,
        id: 'quote-local-' + Date.now(),
        quoteNumber: `${settings.quotePrefix || 'SHIV'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerCity: customerCity.trim(),
        doorId: door?.id,
        doorName: door?.name || 'Custom Handcrafted Door',
        doorImage: door?.images?.[0],
        status: 'new',
        createdAt: new Date().toISOString(),
      };
      setSavedQuote(fallbackQuote);
    } finally {
      setIsSaving(false);
    }
  };

  const [isDriveSaving, setIsDriveSaving] = useState(false);
  const [driveSuccessLink, setDriveSuccessLink] = useState<{ url: string; name: string } | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  const handleDownloadPDF = () => {
    if (!savedQuote) return;
    generateQuotationPDF(savedQuote, settings);
  };

  const handleSaveToGoogleDrive = async () => {
    if (!savedQuote) return;
    setIsDriveSaving(true);
    setDriveError(null);
    setDriveSuccessLink(null);

    try {
      const { blob, filename } = createQuotationPDFBlob(savedQuote, settings);
      const res = await uploadBlobToDrive(
        blob,
        filename,
        'application/pdf',
        'Jai Hanuman Door Quotes',
        `Official quotation ${savedQuote.quoteNumber} for ${savedQuote.customerName} (${savedQuote.doorName})`
      );

      setDriveSuccessLink({
        url: res.webViewLink || 'https://drive.google.com',
        name: res.name,
      });
    } catch (err: any) {
      console.error('Google Drive save error:', err);
      setDriveError(err?.message || 'Failed to save quotation to Google Drive');
    } finally {
      setIsDriveSaving(false);
    }
  };

  const handleWhatsApp = () => {
    if (!savedQuote) return;
    const isMatIncluded = savedQuote.materialIncludedInDoorPrice;
    const msg = `Hello ${settings.businessName},

Here is my Quotation: *${savedQuote.quoteNumber}*
Name: ${savedQuote.customerName} (${savedQuote.customerPhone})
Door: ${savedQuote.doorName}
Size: ${savedQuote.widthInch}" × ${savedQuote.heightInch}" (${savedQuote.sqFt.toFixed(2)} sq.ft)
Door Shutter: ₹${savedQuote.doorCost.toLocaleString('en-IN')}
Material: ${savedQuote.materialName} (${isMatIncluded ? 'Included in Door Shutter' : `₹${savedQuote.materialCost.toLocaleString('en-IN')}`})
${savedQuote.finishCost > 0 ? `Polish: ${savedQuote.finishName} (₹${savedQuote.finishCost.toLocaleString('en-IN')})\n` : ''}${savedQuote.frameCost > 0 ? `Frame: ${savedQuote.frameName} (₹${savedQuote.frameCost.toLocaleString('en-IN')})\n` : ''}${savedQuote.hardwareCost > 0 ? `Hardware: ${savedQuote.hardwareName} (₹${savedQuote.hardwareCost.toLocaleString('en-IN')})\n` : ''}*Estimated Total: ₹${savedQuote.total.toLocaleString('en-IN')}*

Please confirm availability and dispatch timeline.`;

    const url = getWhatsAppUrl(settings?.whatsappNumber, msg);
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    if (!savedQuote) return;
    const bName = settings?.businessName || 'Jai Hanuman Door';
    const shareText = `Quotation ${savedQuote.quoteNumber} from ${bName}\nDoor: ${savedQuote.doorName}\nEstimated Total: ₹${savedQuote.total.toLocaleString('en-IN')}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Door Quotation ${savedQuote.quoteNumber}`,
          text: shareText,
        });
      } catch {
        // Dismissed
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Quotation details copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl text-[#1A1A1A] overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F8F8F6] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF7E3] text-[#C89211] flex items-center justify-center border border-[#C89211]/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A] leading-tight">
                {savedQuote ? 'Official Quotation Ready' : 'Generate Door Quotation'}
              </h3>
              <p className="text-xs text-[#666666]">
                {savedQuote ? `Ref: ${savedQuote.quoteNumber}` : 'Enter customer details to receive an itemized estimate'}
              </p>
            </div>
          </div>

          <button
            id="close-quote-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          
          {!savedQuote ? (
            /* Input Form Step */
            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Summary Strip */}
              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#1A1A1A] text-sm">
                    {door ? door.name : 'Custom Door Shutter'}
                  </div>
                  <div className="text-xs text-[#666666] font-mono mt-0.5">
                    {calculation.widthInch}" × {calculation.heightInch}" ({calculation.sqFt.toFixed(2)}) • {calculation.materialName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#666666]">Estimated Total</div>
                  <div className="text-xl font-bold font-mono text-[#C89211]">
                    ₹{calculation.total.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-[#C62828]/30 text-[#C62828] text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Customer Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Customer Full Name <span className="text-[#C89211]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                    <input
                      id="quote-customer-name"
                      type="text"
                      required
                      placeholder="e.g. Rajesh Patil"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] text-[#1A1A1A] placeholder:text-[#666666] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    WhatsApp / Contact Number <span className="text-[#C89211]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                    <input
                      id="quote-customer-phone"
                      type="tel"
                      required
                      placeholder="e.g. 98220 12345"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] text-[#1A1A1A] placeholder:text-[#666666] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    City / Site Location (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                    <input
                      id="quote-customer-city"
                      type="text"
                      placeholder="e.g. Pune, Mumbai, Nashik, Nagpur"
                      value={customerCity}
                      onChange={e => setCustomerCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] text-[#1A1A1A] placeholder:text-[#666666] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="submit-generate-quote"
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Official Quotation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-white" />
                      Create & View Official Estimate
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* Official Quotation Document Preview (Section 11) */
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Document Container */}
              <div className="bg-white text-stone-900 rounded-xl p-5 sm:p-7 border border-stone-200 shadow-sm font-sans space-y-5">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
                  <div>
                    <h2 className="font-serif text-2xl font-black text-stone-900">
                      {settings.businessName || 'Jai Hanuman Door'}
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {settings.tagline || 'Master Craftsmen in Handcrafted Sagwan & Teak Wood Doors'}
                    </p>
                    {settings.address && (
                      <p className="text-[11px] text-stone-500 mt-1 max-w-sm">
                        {settings.address}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold text-xs">
                      {savedQuote.quoteNumber}
                    </span>
                    <div className="text-xs text-stone-500 mt-1.5 flex items-center sm:justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(savedQuote.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {/* Customer Details Box */}
                <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-stone-500">Customer Name:</span>{' '}
                    <span className="font-bold text-stone-900">{savedQuote.customerName}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Contact:</span>{' '}
                    <span className="font-bold text-stone-900">{savedQuote.customerPhone}</span>
                  </div>
                  {savedQuote.customerCity && (
                    <div>
                      <span className="text-stone-500">Location:</span>{' '}
                      <span className="font-bold text-stone-900">{savedQuote.customerCity}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-stone-500">Door Model:</span>{' '}
                    <span className="font-bold text-stone-900">{savedQuote.doorName}</span>
                  </div>
                </div>

                {/* Door Dimensions Header */}
                <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-amber-950">
                    Dimensions: {savedQuote.widthInch}" (W) × {savedQuote.heightInch}" (H)
                  </span>
                  <span className="font-bold font-mono text-amber-900">
                    Area: {savedQuote.sqFt.toFixed(2)}
                  </span>
                </div>

                {/* Breakdown Table */}
                <div className="border border-stone-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {savedQuote.doorCost !== undefined && savedQuote.doorCost > 0 && (
                        <tr>
                          <td className="p-2.5">
                            <span className="font-medium text-stone-900">
                              {savedQuote.materialIncludedInDoorPrice
                                ? `Door Shutter & Design (${savedQuote.doorName})`
                                : `Door Craftsmanship (${savedQuote.doorName})`}
                            </span>
                            <div className="text-[10px] text-stone-500">
                              {savedQuote.doorPricingType === 'fixed'
                                ? `Fixed Price Shutter (${savedQuote.materialName} Wood)`
                                : savedQuote.materialIncludedInDoorPrice
                                ? `${savedQuote.sqFt.toFixed(2)} sq.ft @ ₹${savedQuote.doorBaseRate}/sq.ft (Solid ${savedQuote.materialName} Timber)`
                                : `${savedQuote.sqFt.toFixed(2)} sq.ft @ ₹${savedQuote.doorBaseRate}/sq.ft`}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-stone-600">
                            {savedQuote.doorPricingType === 'fixed' ? 'Fixed' : `₹${savedQuote.doorBaseRate}/sq.ft`}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                            ₹{savedQuote.doorCost.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}

                      <tr>
                        <td className="p-2.5">
                          <span className="font-medium text-stone-900">Door Material ({savedQuote.materialName})</span>
                          <div className="text-[10px] text-stone-500">
                            {savedQuote.materialIncludedInDoorPrice
                              ? 'Seasoned solid timber (Included in Door Shutter base price)'
                              : `${savedQuote.sqFt.toFixed(2)} sq.ft seasoned timber`}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-stone-600">
                          {savedQuote.materialIncludedInDoorPrice ? 'Included' : `₹${savedQuote.materialRate}`}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                          {savedQuote.materialIncludedInDoorPrice ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-sans">
                              Included (₹0)
                            </span>
                          ) : (
                            `₹${savedQuote.materialCost.toLocaleString('en-IN')}`
                          )}
                        </td>
                      </tr>

                      {savedQuote.finishCost > 0 && (
                        <tr>
                          <td className="p-2.5">
                            <span className="font-medium text-stone-900">Polish / Finish ({savedQuote.finishName})</span>
                            <div className="text-[10px] text-stone-500">{savedQuote.sqFt.toFixed(2)} sq.ft coat</div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-stone-600">
                            ₹{savedQuote.finishRate}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                            ₹{savedQuote.finishCost.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}

                      {savedQuote.frameCost > 0 && (
                        <tr>
                          <td className="p-2.5">
                            <span className="font-medium text-stone-900">Door Frame / Chaukhat ({savedQuote.frameName})</span>
                            <div className="text-[10px] text-stone-500">Full Timber Frame with Rebates</div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-stone-600">Fixed</td>
                          <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                            ₹{savedQuote.frameCost.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}

                      {savedQuote.hardwareCost > 0 && (
                        <tr>
                          <td className="p-2.5">
                            <span className="font-medium text-stone-900">Hardware & Fitting ({savedQuote.hardwareName})</span>
                            <div className="text-[10px] text-stone-500">Qty: {savedQuote.hardwareQty} Unit(s)</div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-stone-600">
                            ₹{savedQuote.hardwarePrice}/unit
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                            ₹{savedQuote.hardwareCost.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal & Total */}
                <div className="flex flex-col items-end pt-2 border-t border-stone-200 text-xs">
                  <div className="w-full sm:w-64 space-y-1">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold">₹{savedQuote.subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    {savedQuote.additionalCharges > 0 && (
                      <div className="flex justify-between text-stone-600">
                        <span>{savedQuote.additionalChargeName}:</span>
                        <span className="font-mono font-semibold">₹{savedQuote.additionalCharges.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-bold text-amber-800 pt-1 border-t border-stone-200">
                      <span>Estimated Total:</span>
                      <span className="font-mono font-extrabold text-lg">₹{savedQuote.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Terms Note */}
                <div className="pt-2 text-[10px] text-stone-500 leading-relaxed border-t border-stone-100">
                  <p className="font-semibold text-stone-600 mb-0.5">Terms & Notes:</p>
                  <p>• {settings.disclaimer || 'Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.'}</p>
                  <p>• Estimate valid for 30 days. Fitting & transportation extra as per site location.</p>
                </div>

              </div>

              {/* Action Buttons (Section 11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <button
                  id="btn-download-pdf"
                  type="button"
                  onClick={handleDownloadPDF}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download PDF</span>
                </button>

                <button
                  id="btn-save-google-drive"
                  type="button"
                  onClick={handleSaveToGoogleDrive}
                  disabled={isDriveSaving}
                  className="py-2.5 px-3 rounded-xl bg-[#0C0A09] hover:bg-stone-800 text-amber-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#C89211]/40 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isDriveSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Saving to Drive...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 text-amber-400" />
                      <span>Save to Drive</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-send-whatsapp-quotation"
                  type="button"
                  onClick={handleWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                  <span>WhatsApp</span>
                </button>

                <button
                  id="btn-share-quotation-modal"
                  type="button"
                  onClick={handleShare}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#E5E5E5] shadow-sm transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#666666]" />
                  <span>Share Quote</span>
                </button>
              </div>

              {driveSuccessLink && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Saved to your Google Drive in folder <strong>Jai Hanuman Door Quotes</strong></span>
                  </div>
                  <a
                    href={driveSuccessLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-bold text-emerald-700 hover:underline shrink-0"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {driveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between animate-in fade-in duration-200">
                  <span className="flex items-center gap-1.5">
                    <X className="w-4 h-4 text-red-600 shrink-0 cursor-pointer" onClick={() => setDriveError(null)} />
                    {driveError}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveToGoogleDrive}
                    className="underline text-[11px] font-semibold text-red-900 hover:text-red-700 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
