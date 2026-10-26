/**
 * AI Wood Scan Credit & Monetization Manager
 * 
 * Rules:
 * - One AI photo scan costs: 3 credits
 * - New free user receives: 6 credits (2 full scans)
 * - ₹49 pack: 15 credits (5 scans)
 * - ₹99 pack: 45 credits (15 scans - Best Value)
 * - ₹299 pack: 100 credits (33+ scans - Workshop / Contractor)
 * - All packs are one-time purchases (No subscriptions)
 * - Protected against duplicate deductions via idempotent transaction token
 */

const CREDITS_STORAGE_KEY = 'jai_wood_scan_credits_v1';
const DEDUPLICATED_TX_KEY = 'jai_deduplicated_scan_txs_v1';

export const DEFAULT_FREE_CREDITS = 6;
export const SCAN_COST_CREDITS = 3;

export interface CreditPack {
  id: 'pack_49' | 'pack_99' | 'pack_299';
  name: string;
  price: number;
  priceInInr: number;
  credits: number;
  scans: number;
  scanCount: number;
  popular?: boolean;
  badge?: string;
  description: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_49',
    name: 'Starter Pack',
    price: 49,
    priceInInr: 49,
    credits: 15,
    scans: 5,
    scanCount: 5,
    popular: false,
    badge: 'Starter',
    description: '5 high-accuracy AI wood identifications (15 credits)',
  },
  {
    id: 'pack_99',
    name: 'Popular Value Pack',
    price: 99,
    priceInInr: 99,
    credits: 45,
    scans: 15,
    scanCount: 15,
    popular: true,
    badge: 'Popular • Best Value',
    description: '15 high-accuracy AI wood identifications (45 credits)',
  },
  {
    id: 'pack_299',
    name: 'Pro Workshop Pack',
    price: 299,
    priceInInr: 299,
    credits: 100,
    scans: 33,
    scanCount: 33,
    popular: false,
    badge: 'Workshop Pro',
    description: '100 credits for contractors, carpenters & timber buyers',
  },
];

/**
 * Retrieves current credit balance. Initializes with 6 free credits on first use.
 */
export function getUserCredits(): number {
  if (typeof window === 'undefined') return DEFAULT_FREE_CREDITS;
  try {
    const raw = localStorage.getItem(CREDITS_STORAGE_KEY);
    if (raw === null) {
      // First time user: award 6 free credits
      localStorage.setItem(CREDITS_STORAGE_KEY, String(DEFAULT_FREE_CREDITS));
      return DEFAULT_FREE_CREDITS;
    }
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? DEFAULT_FREE_CREDITS : Math.max(0, parsed);
  } catch {
    return DEFAULT_FREE_CREDITS;
  }
}

/**
 * Checks whether user has sufficient credits for 1 photo scan (minimum 3 credits).
 */
export function hasEnoughCreditsForScan(): boolean {
  return getUserCredits() >= SCAN_COST_CREDITS;
}

/**
 * Deducts 3 credits for a successful scan with duplicate request protection.
 * If transactionId was already processed, it will not charge twice.
 */
export function deductCreditsForScan(transactionId: string): { success: boolean; remainingCredits: number } {
  if (typeof window === 'undefined') {
    return { success: true, remainingCredits: DEFAULT_FREE_CREDITS };
  }

  try {
    // 1. Check duplicate transactions
    const rawTx = localStorage.getItem(DEDUPLICATED_TX_KEY);
    let txList: string[] = [];
    if (rawTx) {
      try {
        txList = JSON.parse(rawTx);
      } catch {}
    }

    if (transactionId && txList.includes(transactionId)) {
      console.log(`ℹ️ [Credits] Transaction ${transactionId} already deducted, avoiding double deduction.`);
      return { success: true, remainingCredits: getUserCredits() };
    }

    const current = getUserCredits();
    if (current < SCAN_COST_CREDITS) {
      return { success: false, remainingCredits: current };
    }

    const updated = Math.max(0, current - SCAN_COST_CREDITS);
    localStorage.setItem(CREDITS_STORAGE_KEY, String(updated));

    // Record transaction ID (keep last 50)
    if (transactionId) {
      txList.unshift(transactionId);
      if (txList.length > 50) txList = txList.slice(0, 50);
      localStorage.setItem(DEDUPLICATED_TX_KEY, JSON.stringify(txList));
    }

    window.dispatchEvent(new CustomEvent('jai_credits_updated', { detail: { credits: updated } }));
    return { success: true, remainingCredits: updated };
  } catch (err) {
    console.warn('⚠️ [Credits] Deduction error:', err);
    return { success: true, remainingCredits: getUserCredits() };
  }
}

/**
 * Adds purchased credits to user balance.
 */
export function addPurchasedCredits(creditsToAdd: number, _transactionId?: string): number {
  if (typeof window === 'undefined') return creditsToAdd;
  try {
    const current = getUserCredits();
    const updated = current + creditsToAdd;
    localStorage.setItem(CREDITS_STORAGE_KEY, String(updated));
    window.dispatchEvent(new CustomEvent('jai_credits_updated', { detail: { credits: updated } }));
    return updated;
  } catch {
    return getUserCredits();
  }
}

/**
 * Subscribe to credit balance changes
 */
export function subscribeCreditsChange(callback: (credits: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: any) => {
    callback(e.detail?.credits ?? getUserCredits());
  };
  window.addEventListener('jai_credits_updated', handler);
  return () => window.removeEventListener('jai_credits_updated', handler);
}
