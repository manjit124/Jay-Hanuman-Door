import React from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { BusinessSettings, PaymentTransaction } from '../types.ts';
import { generatePaymentReceiptPDF } from '../lib/pdfGenerator.ts';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentTransaction | null;
  statusMessage?: string;
  settings?: BusinessSettings;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  statusMessage,
  settings,
}) => {
  if (!isOpen || !payment) return null;

  const isPaid = payment.status === 'paid';
  const isFailed = payment.status === 'failed';
  const isCancelled = payment.status === 'cancelled';

  const dateFormatted = new Date(payment.paidAt || payment.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="payment-receipt-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl overflow-hidden text-[#1A1A1A]">
        {/* Header */}
        <div
          className={`px-6 py-5 border-b flex items-start justify-between gap-4 ${
            isPaid
              ? 'bg-emerald-50/70 border-emerald-200'
              : isFailed
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {isPaid ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
            ) : isFailed ? (
              <XCircle className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
            ) : isCancelled ? (
              <AlertTriangle className="w-7 h-7 text-amber-700 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-7 h-7 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div>
              <h2 id="receipt-modal-title" className="font-serif text-xl font-bold text-[#1A1A1A]">
                {isPaid
                  ? 'Payment Successful'
                  : isFailed
                  ? 'Payment Failed'
                  : isCancelled
                  ? 'Payment Cancelled'
                  : 'Payment Pending'}
              </h2>
              <p className="text-xs text-[#555555] mt-0.5">
                {statusMessage ||
                  (isPaid
                    ? 'Your payment has been verified and recorded with WindowCut Pro.'
                    : payment.failureReason || 'Transaction did not complete.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt modal"
            className="p-1.5 rounded-lg text-[#666666] hover:text-[#1A1A1A] hover:bg-white/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-5">
          {/* Amount Block */}
          <div className="flex items-baseline justify-between pb-4 border-b border-[#EFEFEF]">
            <div>
              <div className="text-xs text-[#666666]">
                {isPaid ? 'Amount Paid' : 'Order Amount'}
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#1A1A1A] mt-0.5">
                ₹{Number(payment.amountInr || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right text-xs text-[#666666]">
              <div>{dateFormatted}</div>
              <div className="font-medium text-[#1A1A1A] mt-0.5">
                {payment.mode === 'test' ? 'Razorpay Test Mode' : 'Razorpay Live'}
                {payment.paymentMethod ? ` · ${payment.paymentMethod.toUpperCase()}` : ''}
              </div>
            </div>
          </div>

          {/* Itemized Details */}
          <dl className="space-y-2.5 text-xs">
            {payment.receiptNumber && (
              <div className="flex justify-between gap-4">
                <dt className="text-[#666666]">Receipt Number</dt>
                <dd className="font-mono font-semibold text-[#1A1A1A] text-right">
                  {payment.receiptNumber}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-[#666666]">Transaction ID</dt>
              <dd className="font-mono text-[#1A1A1A] text-right">{payment.transactionId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#666666]">Razorpay Order ID</dt>
              <dd className="font-mono text-[#1A1A1A] text-right">{payment.razorpayOrderId}</dd>
            </div>
            {payment.razorpayPaymentId && (
              <div className="flex justify-between gap-4">
                <dt className="text-[#666666]">Razorpay Payment ID</dt>
                <dd className="font-mono text-[#1A1A1A] text-right">{payment.razorpayPaymentId}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 pt-2 border-t border-[#F2F2F2]">
              <dt className="text-[#666666]">Product / Package</dt>
              <dd className="font-semibold text-[#1A1A1A] text-right">{payment.productName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#666666]">Customer</dt>
              <dd className="text-[#1A1A1A] text-right">
                {payment.customerName} (+91 {payment.customerMobile})
              </dd>
            </div>
            {isPaid && payment.creditsAwarded && payment.creditsAwarded > 0 && (
              <div className="flex justify-between gap-4 text-emerald-700 font-semibold">
                <dt>AI Wood Credits Added</dt>
                <dd>+{payment.creditsAwarded} Credits</dd>
              </div>
            )}
          </dl>

          {isPaid && payment.razorpaySignatureVerified && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cryptographic Razorpay payment signature verified on server.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            {isPaid && (
              <button
                id="btn-download-payment-receipt"
                type="button"
                onClick={() => generatePaymentReceiptPDF(payment, settings)}
                className="min-h-[42px] px-4 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Receipt PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-semibold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
