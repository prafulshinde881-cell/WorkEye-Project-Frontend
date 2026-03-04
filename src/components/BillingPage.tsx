import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { purchaseLicense } from '../utils/license';
import { createOrder, verifyPayment } from '../utils/payment';
import { loadRazorpay } from '../utils/loadRazorpay';
import {
  Check,
  Clock,
  Loader2,
  Star,
  Zap,
  Sparkles,
  Crown,
  X,
  ArrowRight,
  BadgeIndianRupee,
  FileText,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStoredUser } from '../utils/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingCycle = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

interface PlanFeature {
  featureSlug: string;
  uiLabel: string;
}

interface LmsPlan {
  licenseId: string;
  licenseTypeId: string;
  name: string;
  price: number;
  isFree: boolean;
  highlighted: boolean;
  features: PlanFeature[];
  discountConfig: Record<BillingCycle, number>;
  icon: any;
  colorFrom: string;
  colorTo: string;
}

interface ActiveLicense {
  planName: string;
  licenseTypeId: string;
  expireAt: string | null;
  status: string;
  pricePerMonth: number;
}

interface UpgradeQuote {
  // originalSubtotal = plan price after cycle discount, BEFORE credit, BEFORE GST
  // This is what backend returns as `originalAmount`
  originalSubtotal: number;
  creditApplied: number;
  // adjustedSubtotal = originalSubtotal - creditApplied (still pre-GST)
  adjustedSubtotal: number;
  // gst = adjustedSubtotal * 0.18
  gst: number;
  // finalAmount = adjustedSubtotal + gst (what Razorpay charges)
  finalAmount: number;
  isUpgrade: boolean;
  upgradeDetails?: {
    from: string;
    to: string;
    creditInfo: {
      creditAmount: number;
      remainingDays: number;
      pricePerDay: number;
    };
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_ID = '69589e3fe70228ef3c25f26c';
const LMS_BASE = 'https://license-system.onrender.com';

const PLAN_ORDER: Record<string, number> = {
  starter: 0,
  professional: 1,
  business: 2,
  enterprise: 3,
};

const BILLING_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  'half-yearly': 6,
  yearly: 12,
};

const BILLING_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half-Yearly',
  yearly: 'Yearly',
};

const PLAN_META: Record<string, { icon: any; highlighted: boolean; colorFrom: string; colorTo: string }> = {
  starter:      { icon: Star,     highlighted: false, colorFrom: '#64748b', colorTo: '#475569' },
  professional: { icon: Zap,      highlighted: false, colorFrom: '#3b82f6', colorTo: '#1d4ed8' },
  business:     { icon: Sparkles, highlighted: true,  colorFrom: '#f59e0b', colorTo: '#d97706' },
  enterprise:   { icon: Crown,    highlighted: false, colorFrom: '#8b5cf6', colorTo: '#7c3aed' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMeta(name: string) {
  return PLAN_META[name.toLowerCase()] ?? {
    icon: Star, highlighted: false, colorFrom: '#64748b', colorTo: '#475569',
  };
}

function getPlanOrder(name: string): number {
  return PLAN_ORDER[name.toLowerCase()] ?? 99;
}

/**
 * Display price shown on the plan card (pre-GST, post-discount).
 * This is purely cosmetic — the real price comes from the backend quote.
 */
function getPlanPrice(plan: LmsPlan, cycle: BillingCycle): number {
  if (plan.isFree) return 0;
  const months = BILLING_MONTHS[cycle];
  const discount = plan.discountConfig?.[cycle] ?? 0;
  return plan.price * months * (1 - discount / 100);
}

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ─── buildQuoteFromOrder ──────────────────────────────────────────────────────
/**
 * Single place that converts the raw backend order response into an UpgradeQuote.
 *
 * Backend field mapping:
 *   order.originalAmount  → subtotal BEFORE credit AND before GST
 *                           (undefined on first-time purchases in some edge cases)
 *   order.creditApplied   → prorated credit from old plan (0 if no upgrade)
 *   order.amount          → FINAL rupee amount INCLUDING GST (what Razorpay charges)
 *   order.amountInPaise   → order.amount * 100 (for Razorpay SDK)
 *   order.isUpgrade       → boolean
 *
 * Derivation:
 *   adjustedSubtotal = originalAmount - creditApplied
 *   gst              = adjustedSubtotal * 0.18
 *   finalAmount      = adjustedSubtotal + gst  ← must match order.amount
 */
function buildQuoteFromOrder(
  order: any,
  plan: LmsPlan,
  activeLicense: ActiveLicense | null
): UpgradeQuote {
  // originalAmount from backend = discounted subtotal before credit & GST.
  // For a plain new purchase with no credit, backend may not send originalAmount
  // separately, so we derive it: originalAmount = amount / 1.18
  const originalSubtotal: number =
    order.originalAmount != null && order.originalAmount > 0
      ? Number(order.originalAmount)
      : Number((order.amount / 1.18).toFixed(2));

  const creditApplied: number = Number(order.creditApplied ?? 0);

  // adjustedSubtotal is what GST is applied on
  const adjustedSubtotal: number = Math.max(originalSubtotal - creditApplied, 0);

  // GST calculated FORWARD from adjustedSubtotal — never back-calculated from finalAmount
  const gst: number = Number((adjustedSubtotal * 0.18).toFixed(2));

  // finalAmount should equal order.amount (Razorpay total)
  const finalAmount: number = Number(order.amount);

  const isUpgrade: boolean = Boolean(order.isUpgrade);

  return {
    originalSubtotal,
    creditApplied,
    adjustedSubtotal,
    gst,
    finalAmount,
    isUpgrade,
    upgradeDetails: isUpgrade
      ? {
          from: activeLicense?.planName ?? 'Current Plan',
          to: plan.name,
          creditInfo: {
            creditAmount: creditApplied,
            remainingDays: 0,
            pricePerDay: 0,
          },
        }
      : undefined,
  };
}

// ─── UpgradeModal ─────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  open: boolean;
  plan: LmsPlan | null;
  billingCycle: BillingCycle;
  quote: UpgradeQuote | null;
  loadingQuote: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onRetry: () => void;
  busy: boolean;
  error: string | null;
}

function UpgradeModal({
  open, plan, billingCycle, quote, loadingQuote,
  onConfirm, onClose, onRetry, busy, error,
}: UpgradeModalProps) {
  if (!plan) return null;

  // Discount % that was applied to arrive at originalSubtotal
  const discount = plan.discountConfig?.[billingCycle] ?? 0;

  // What the plan would cost without any cycle discount (monthly × months)
  const undiscountedTotal = plan.price * BILLING_MONTHS[billingCycle];

  // Actual saving from cycle discount = undiscounted - originalSubtotal
  const cycleSaving =
    quote && discount > 0 ? undiscountedTotal - quote.originalSubtotal : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onClose()}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">

              {/* ── Header ── */}
              <div
                className="px-6 py-5 flex items-center justify-between"
                style={{ background: `linear-gradient(135deg, ${plan.colorFrom}, ${plan.colorTo})` }}
              >
                <div>
                  <p className="text-xs text-white/70 uppercase tracking-widest font-semibold">
                    {quote?.isUpgrade ? 'Upgrade Plan' : 'Subscribe to Plan'}
                  </p>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {quote?.upgradeDetails
                      ? `${quote.upgradeDetails.from} → ${quote.upgradeDetails.to}`
                      : plan.name}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  disabled={busy}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="px-6 py-6 space-y-4">

                {/* Loading state */}
                {loadingQuote && (
                  <div className="flex flex-col items-center justify-center py-14 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm text-slate-500">Calculating your price...</p>
                  </div>
                )}

                {/* Error state */}
                {!loadingQuote && error && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <p className="text-sm text-slate-700 font-semibold text-center">Failed to load pricing</p>
                    <p className="text-xs text-slate-400 text-center px-4">{error}</p>
                    <button
                      onClick={onRetry}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try again
                    </button>
                  </div>
                )}

                {/* Fallback: no quote, no error, no loading */}
                {!loadingQuote && !error && !quote && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <AlertCircle className="w-8 h-8 text-orange-400" />
                    <p className="text-sm text-slate-700 font-semibold">Unable to load pricing</p>
                    <p className="text-xs text-slate-400 text-center px-4">
                      Something went wrong while preparing your order.
                    </p>
                    <button
                      onClick={onRetry}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try again
                    </button>
                  </div>
                )}

                {/* ── Quote breakdown ── */}
                {!loadingQuote && !error && quote && (
                  <>
                    {/* Billing cycle badge */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Billing cycle</span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                        {BILLING_LABELS[billingCycle]}
                      </span>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="space-y-2.5 text-sm">
                      {/* Base plan price (post-discount, pre-credit, pre-GST) */}
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {plan.name} ({BILLING_LABELS[billingCycle]})
                        </span>
                        <span className="font-medium text-slate-800">
                          {formatINR(quote.originalSubtotal)}
                        </span>
                      </div>

                      {/* Cycle discount saving — only shown when there's a real saving */}
                      {discount > 0 && cycleSaving > 0 && (
                        <div className="flex justify-between text-emerald-600 text-xs">
                          <span>Cycle discount ({discount}% off)</span>
                          <span>− {formatINR(cycleSaving)}</span>
                        </div>
                      )}

                      {/* Upgrade credit box */}
                      {quote.isUpgrade && quote.creditApplied > 0 && (
                        <>
                          <hr className="border-dashed border-slate-200" />
                          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-amber-600" />
                              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                Upgrade Credit Applied
                              </p>
                            </div>
                            <div className="flex justify-between text-amber-700 font-medium text-sm">
                              <span>Prorated credit from current plan</span>
                              <span>− {formatINR(quote.creditApplied)}</span>
                            </div>
                          </div>
                        </>
                      )}

                      <hr className="border-slate-100" />

                      {/* Subtotal after credit (pre-GST) */}
                      <div className="flex justify-between font-medium text-slate-700">
                        <span>
                          Subtotal{quote.isUpgrade && quote.creditApplied > 0 ? ' after credit' : ''}
                        </span>
                        <span>{formatINR(quote.adjustedSubtotal)}</span>
                      </div>

                      {/* GST */}
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>GST (18%)</span>
                        <span>+ {formatINR(quote.gst)}</span>
                      </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Total */}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700">Total Payable</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {formatINR(quote.finalAmount)}
                      </span>
                    </div>

                    {/* Pay button */}
                    <button
                      onClick={onConfirm}
                      disabled={busy}
                      className="w-full mt-2 h-11 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${plan.colorFrom}, ${plan.colorTo})` }}
                    >
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <BadgeIndianRupee className="w-4 h-4" />
                          Pay {formatINR(quote.finalAmount)} &amp;{' '}
                          {quote.isUpgrade ? 'Upgrade' : 'Subscribe'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Trust note */}
                    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                      <Shield className="w-3 h-3" />
                      Secured by Razorpay · Cancel anytime
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── BillingPage ──────────────────────────────────────────────────────────────

export function BillingPage() {
  const navigate = useNavigate();

  // ── Auth ──────────────────────────────────────────────────────────────────
  // We get the email from localStorage (your app's own auth).
  // The LMS MongoDB userId is fetched from the active-license API response
  // (ownerUserId field) and stored in lmsUserId state — because your app's
  // numeric `id: 21` is NOT the same as the LMS's MongoDB ObjectId.

  function getUserFromStorage() {
    try {
      return JSON.parse(localStorage.getItem('adminData') || 'null');
    } catch {
      return null;
    }
  }

  const loggedInUser = getStoredUser() || getUserFromStorage();
  // Email is safe to read from localStorage directly
  const userEmail: string = loggedInUser?.email ?? '';
  const userName: string =
    loggedInUser?.full_name ?? loggedInUser?.name ?? loggedInUser?.company_name ?? userEmail;

  // ── State ─────────────────────────────────────────────────────────────────

  const [plans, setPlans] = useState<LmsPlan[]>([]);
  const [activeLicense, setActiveLicense] = useState<ActiveLicense | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // The LMS MongoDB ObjectId for this user — resolved from the active-license
  // API response. Used as `userId` when calling createOrder.
  const [lmsUserId, setLmsUserId] = useState<string>('');

  // Modal
  const [upgradeTarget, setUpgradeTarget] = useState<LmsPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [upgradeQuote, setUpgradeQuote] = useState<UpgradeQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // ── Fetch plans ───────────────────────────────────────────────────────────

  async function fetchPlans(): Promise<LmsPlan[]> {
    const res = await fetch(
      `${LMS_BASE}/api/license/public/licenses-by-product/${PRODUCT_ID}`,
      { headers: { 'x-api-key': 'my-secret-key-123' } }
    );
    const data = await res.json();
    const raw: any[] =
      data.licenses ?? data.data?.licenses ?? data.data ?? (Array.isArray(data) ? data : []);

    const mapped: LmsPlan[] = raw.map((lic: any) => {
      const lt = lic.licenseType ?? lic;
      const meta = getMeta(lt.name ?? '');
      return {
        licenseId: lic._id,
        licenseTypeId: lt._id,
        name: lt.name ?? 'Plan',
        price: lt.price?.amount ?? lt.price ?? 0,
        isFree: (lt.price?.amount ?? lt.price ?? 0) === 0,
        highlighted: meta.highlighted,
        features: (lt.features ?? []).map((f: any) =>
          typeof f === 'string'
            ? { featureSlug: f, uiLabel: f }
            : {
                featureSlug: f.featureSlug ?? f._id ?? f.name,
                uiLabel: f.uiLabel ?? f.name ?? String(f),
              }
        ),
        discountConfig: lt.discountConfig ?? {
          monthly: 0, quarterly: 5, 'half-yearly': 10, yearly: 20,
        },
        icon: meta.icon,
        colorFrom: meta.colorFrom,
        colorTo: meta.colorTo,
      };
    });

    const sorted = [...mapped].sort((a, b) => getPlanOrder(a.name) - getPlanOrder(b.name));
    setPlans(sorted);
    return sorted;
  }

  // ── Fetch active license ──────────────────────────────────────────────────
  // Also extracts ownerUserId (LMS MongoDB ObjectId) and stores it in lmsUserId.
  // If the user has no active license yet, we get the userId from purchaseLicense
  // response (data.userId) in fetchUpgradeQuote instead.

  async function fetchActiveLicense(loadedPlans: LmsPlan[]) {
    if (!userEmail) return;
    try {
      const res = await fetch(
        `${LMS_BASE}/api/external/actve-license/${encodeURIComponent(userEmail)}?productId=${PRODUCT_ID}`,
        { headers: { 'x-api-key': 'my-secret-key-123' } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const lic = data.activeLicense ?? data.license ?? data.data ?? data;

      // ✅ Extract LMS MongoDB userId from the license response
      const resolvedLmsUserId: string =
        (typeof lic.ownerUserId === 'string' ? lic.ownerUserId : lic.ownerUserId?._id) ?? '';
      if (resolvedLmsUserId) {
        setLmsUserId(resolvedLmsUserId);
      }

      const licenseTypeId: string =
        (typeof lic.licenseTypeId === 'string' ? lic.licenseTypeId : lic.licenseTypeId?._id) ??
        lic.licenseType?._id ??
        (typeof lic.licenseType === 'string' ? lic.licenseType : '') ??
        '';

      if (!licenseTypeId) return;

      const matched = loadedPlans.find((p) => p.licenseTypeId === licenseTypeId);
      setActiveLicense({
        planName: matched?.name ?? lic.licenseType?.name ?? lic.planName ?? lic.name ?? 'Unknown',
        licenseTypeId,
        expireAt: lic.endDate ?? lic.expireAt ?? lic.expiresAt ?? null,
        status: lic.status ?? 'active',
        pricePerMonth: lic.priceSnapshot?.subtotal ?? matched?.price ?? 0,
      });
    } catch {
      // No active license — lmsUserId will be resolved from purchaseLicense response
    }
  }

  // ── Fetch upgrade quote ───────────────────────────────────────────────────
  /**
   * Two-step flow:
   *   1. POST /api/lms/purchase-license  → creates a PENDING transaction, returns transactionId
   *   2. POST /api/payment/create-order  → finds that PENDING transaction, creates Razorpay order,
   *                                        returns { orderId, amount, amountInPaise, originalAmount,
   *                                                  creditApplied, isUpgrade, key, ... }
   *
   * We store the raw order on window.__pendingOrder so confirmPayment() can open Razorpay.
   * We build the UpgradeQuote from the order via buildQuoteFromOrder().
   */
  async function fetchUpgradeQuote(
    plan: LmsPlan,
    cycle: BillingCycle,
    retryCount = 0
  ): Promise<UpgradeQuote | null> {
    if (!userEmail) {
      toast.error('Please log in to continue');
      return null;
    }

    setLoadingQuote(true);
    setQuoteError(null);

    try {
      // ── Step 1: Create / resume PENDING transaction ──────────────────────
      // purchaseLicense uses email to find-or-create the user in the LMS DB
      // and returns data.userId = LMS MongoDB ObjectId (what createOrder needs).
      //
      // ✅ IMPORTANT: licenseId here = plan.licenseId (the parent License doc _id)
      //    NOT plan.licenseTypeId. The backend does License.findById(licenseId)
      //    and populates licenseTypeId from it. Passing licenseTypeId causes 404.
      const purchaseRes = await purchaseLicense({
        name: userName,
        email: userEmail,
        licenseId: plan.licenseId,       // ✅ parent License _id
        billingCycle: cycle,
        amount: 0,
        currency: 'INR',
      });

      if (!purchaseRes?.success) {
        throw new Error(purchaseRes?.message ?? 'Failed to initiate purchase');
      }

      const transactionId: string = purchaseRes?.data?.transactionId;
      if (!transactionId) {
        throw new Error('Transaction ID missing from purchase response');
      }

      // ✅ Get the LMS MongoDB userId from purchaseLicense response.
      // This is the correct ObjectId the LMS uses — NOT your app's numeric id.
      const resolvedUserId: string =
        purchaseRes?.data?.userId ?? lmsUserId;

      if (!resolvedUserId) {
        throw new Error('Could not resolve LMS user ID. Please try again.');
      }

      // Cache it for subsequent calls (e.g. retry)
      if (resolvedUserId && !lmsUserId) {
        setLmsUserId(resolvedUserId);
      }

      // ── Step 2: Create Razorpay order ────────────────────────────────────
      const orderRes = await createOrder({
        userId: resolvedUserId,          // ✅ LMS MongoDB ObjectId
        licenseId: plan.licenseId,       // ✅ same parent License _id
        billingCycle: cycle,
        amount: 0,
      });

      // Guard: server returned HTML (misconfigured proxy / 404 page)
      if (typeof orderRes === 'string' && orderRes.includes('<!doctype')) {
        throw new Error('Server returned an HTML error page instead of JSON');
      }

      // Guard: backend explicitly says no pending transaction exists yet
      if (orderRes?.code === 'NO_PENDING_TRANSACTION') {
        if (retryCount < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
          return fetchUpgradeQuote(plan, cycle, retryCount + 1);
        }
        throw new Error('Session expired. Please try again.');
      }

      // Guard: backend returned an error message without an orderId
      if (orderRes?.message && !orderRes?.orderId) {
        // Surface known backend errors with user-friendly messages
        const errCode: string = orderRes?.error ?? orderRes?.code ?? '';
        if (errCode === 'DOWNGRADE_NOT_ALLOWED') {
          throw new Error('Downgrade is not allowed while your current plan is active.');
        }
        if (errCode === 'DUPLICATE_PLAN_NOT_ALLOWED') {
          throw new Error('You already have this plan active.');
        }
        throw new Error(orderRes.message);
      }

      // Guard: orderId or amount missing (unexpected shape)
      if (!orderRes?.orderId || orderRes?.amount == null) {
        throw new Error('Invalid order response — missing orderId or amount');
      }

      // ── Build quote from the real backend numbers ─────────────────────────
      const quote = buildQuoteFromOrder(orderRes, plan, activeLicense);
      setUpgradeQuote(quote);

      // Store everything Razorpay needs
      (window as any).__pendingOrder = {
        transactionId,
        orderId: orderRes.orderId,
        key: orderRes.key,
        amount: orderRes.amount,
        amountInPaise: orderRes.amountInPaise,
        currency: orderRes.currency ?? 'INR',
      };

      return quote;
    } catch (err: any) {
      const errData = err?.response?.data;
      let message =
        errData?.message ??
        err?.message ??
        'Failed to load pricing. Please try again.';

      // Axios wraps backend errors in response.data
      const errCode: string = errData?.error ?? errData?.code ?? '';
      if (errCode === 'DOWNGRADE_NOT_ALLOWED') {
        message = 'Downgrade is not allowed while your current plan is active.';
      }
      if (errCode === 'DUPLICATE_PLAN_NOT_ALLOWED') {
        message = 'You already have this plan active.';
      }

      setQuoteError(message);
      toast.error(message);
      return null;
    } finally {
      setLoadingQuote(false);
    }
  }

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      setLoading(true);
      const loaded = await fetchPlans();
      await fetchActiveLicense(loaded);
      setLoading(false);
    })();
  }, []);

  // ── Plan selection ────────────────────────────────────────────────────────

  async function handlePlanSelect(plan: LmsPlan) {
    setUpgradeTarget(plan);
    setUpgradeQuote(null);
    setQuoteError(null);
    setModalOpen(true);
    await fetchUpgradeQuote(plan, billingCycle);
  }

  async function handleRetryQuote() {
    if (upgradeTarget) {
      await fetchUpgradeQuote(upgradeTarget, billingCycle);
    }
  }

  function handleCloseModal() {
    if (busy) return;
    setModalOpen(false);
    setUpgradeQuote(null);
    setUpgradeTarget(null);
    setQuoteError(null);
    delete (window as any).__pendingOrder;
  }

  // ── Razorpay payment ──────────────────────────────────────────────────────

  async function confirmPayment() {
    if (!upgradeTarget || !upgradeQuote) return;
    setBusy(true);

    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Razorpay SDK failed to load');

      const pendingOrder = (window as any).__pendingOrder;
      if (!pendingOrder?.orderId) {
        throw new Error('Order details not found. Please close and try again.');
      }

      const rzp = new (window as any).Razorpay({
        key: pendingOrder.key,
        amount: pendingOrder.amountInPaise,
        currency: pendingOrder.currency,
        name: 'WorkEye',
        description: `${upgradeTarget.name} · ${BILLING_LABELS[billingCycle]}`,
        order_id: pendingOrder.orderId,
        prefill: { email: userEmail, name: userName },
        theme: { color: upgradeTarget.colorFrom },
        modal: {
          ondismiss: () => {
            setBusy(false);
            toast.info('Payment cancelled');
          },
        },
        handler: async (rzpRes: any) => {
          try {
            await verifyPayment({
              transactionId: pendingOrder.transactionId,
              razorpay_payment_id: rzpRes.razorpay_payment_id,
              razorpay_order_id: rzpRes.razorpay_order_id,
              razorpay_signature: rzpRes.razorpay_signature,
            });

            toast.success(
              `${upgradeQuote.isUpgrade ? 'Upgraded' : 'Subscribed'} to ${upgradeTarget.name} successfully!`,
              { duration: 5000 }
            );

            handleCloseModal();
            const loaded = await fetchPlans();
            await fetchActiveLicense(loaded);
            delete (window as any).__pendingOrder;
          } catch (verifyErr: any) {
            toast.error(
              `Payment verification failed. Contact support with ref: ${pendingOrder.transactionId}`,
              { duration: 8000 }
            );
          } finally {
            setBusy(false);
          }
        },
      });

      rzp.open();
    } catch (e: any) {
      toast.error(e?.message ?? 'Payment failed. Please try again.');
      setBusy(false);
    }
  }

  // ── Free trial activation ─────────────────────────────────────────────────

  async function activateTrial(plan: LmsPlan) {
    setBusy(true);
    try {
      const res = await purchaseLicense({
        name: userName,
        email: userEmail,
        licenseId: plan.licenseId,      
        billingCycle: 'monthly',
        amount: 0,
        currency: 'INR',
      });
      if (!res?.success) throw new Error(res?.message ?? 'Failed to activate trial');
      toast.success('Free plan activated!');
      const loaded = await fetchPlans();
      await fetchActiveLicense(loaded);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to activate free plan');
    } finally {
      setBusy(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const referencePlan = plans.find((p) => !p.isFree);
  const cycleDiscount = (c: BillingCycle) => referencePlan?.discountConfig?.[c] ?? 0;

  const gridClass =
    plans.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
      : plans.length === 3
      ? 'grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <UpgradeModal
        open={modalOpen}
        plan={upgradeTarget}
        billingCycle={billingCycle}
        quote={upgradeQuote}
        loadingQuote={loadingQuote}
        error={quoteError}
        onConfirm={confirmPayment}
        onRetry={handleRetryQuote}
        onClose={handleCloseModal}
        busy={busy}
      />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">

          {/* ── Page header ── */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Billing
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your subscription and billing preferences.
            </p>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {!loading && (
            <>
              {/* ── Active subscription banner ── */}
              {activeLicense && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        Current Subscription
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-2xl font-bold text-slate-900 capitalize">
                          {activeLicense.planName}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                            activeLicense.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {activeLicense.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {activeLicense.expireAt
                          ? `Expires on ${new Date(activeLicense.expireAt).toLocaleDateString('en-IN', {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })}`
                          : 'No expiry date'}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/billing/invoices')}
                      className="flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View Invoices
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Billing cycle toggle ── */}
              {plans.some((p) => !p.isFree) && (
                <div className="flex justify-center">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-0.5 shadow-sm">
                    {(['monthly', 'quarterly', 'half-yearly', 'yearly'] as BillingCycle[]).map((cycle) => {
                      const pct = cycleDiscount(cycle);
                      const isActive = billingCycle === cycle;
                      return (
                        <button
                          key={cycle}
                          onClick={() => setBillingCycle(cycle)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {BILLING_LABELS[cycle]}
                          {pct > 0 && (
                            <span className={`ml-1.5 text-xs font-semibold ${isActive ? 'text-blue-200' : 'text-emerald-600'}`}>
                              -{pct}%
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Plan cards ── */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
                className={`grid gap-6 ${gridClass}`}
              >
                {plans.map((plan) => {
                  const Icon = plan.icon;
                  const isCurrent = activeLicense?.licenseTypeId === plan.licenseTypeId;
                  const price = getPlanPrice(plan, billingCycle);
                  const discount = plan.discountConfig?.[billingCycle] ?? 0;

                  return (
                    <motion.div
                      key={plan.licenseId}
                      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                      whileHover={{ y: -4, transition: { duration: 0.18 } }}
                      className={`relative rounded-2xl border p-6 flex flex-col bg-white transition-shadow duration-200 ${
                        isCurrent
                          ? 'border-emerald-400 ring-2 ring-emerald-300 shadow-lg'
                          : plan.highlighted
                          ? 'border-blue-300 ring-1 ring-blue-200 shadow-md'
                          : 'border-slate-200 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Badge */}
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-emerald-500 text-white text-xs px-4 py-1 rounded-full shadow font-semibold whitespace-nowrap">
                            Current Plan
                          </span>
                        </div>
                      )}

                      {/* Icon + name */}
                      <div className="flex items-center gap-3 mb-5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0"
                          style={{ background: `linear-gradient(135deg, ${plan.colorFrom}, ${plan.colorTo})` }}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">{plan.name}</h3>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-extrabold text-slate-900">
                            {plan.isFree ? 'Free' : formatINR(price)}
                          </span>
                          {!plan.isFree && (
                            <span className="text-sm text-slate-400 mb-1">
                              / {BILLING_LABELS[billingCycle].toLowerCase()}
                            </span>
                          )}
                        </div>
                        {!plan.isFree && discount > 0 && (
                          <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                            Save {discount}% with this cycle
                          </p>
                        )}
                        {plan.isFree && (
                          <p className="text-xs text-slate-400 mt-0.5">No credit card required</p>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2.5 flex-1 mb-6">
                        {plan.features.map((f) => (
                          <li key={f.featureSlug} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            </span>
                            <span className="text-slate-600">{f.uiLabel}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full h-10 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold cursor-default"
                        >
                          Current Plan
                        </button>
                      ) : plan.isFree ? (
                        <button
                          onClick={() => activateTrial(plan)}
                          disabled={busy}
                          className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Start Free Trial'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePlanSelect(plan)}
                          disabled={busy}
                          className="w-full h-10 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                          style={{ background: `linear-gradient(135deg, ${plan.colorFrom}, ${plan.colorTo})` }}
                        >
                          {activeLicense ? 'Upgrade' : 'Subscribe'} to {plan.name}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* ── Footer ── */}
              <p className="text-center text-xs text-slate-400 pb-4">
                All prices shown exclude GST (18%). Payments secured by Razorpay.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}