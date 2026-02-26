import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Users, Plus, Minus, Zap, Loader2, CheckCircle,
  AlertCircle, Crown, CreditCard, Shield, Clock
} from 'lucide-react';
import {
  calculateUpgradePricing,
  initiateUserUpgrade,
  createOrderForUserUpgrade,
  verifyPayment,
  getUpgradeStatus,
  cancelUpgradeTransaction,
} from '@/utils/payment';

// ─────────────────────────────────────────────
// Razorpay loader helper (inline, no extra file needed)
// ─────────────────────────────────────────────
const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface PricingData {
  pricePerUser: number;       // e.g. 199
  additionalUsers: number;    // how many extra slots being added
  subtotal: number;
  gst: number;
  gstRate: number;            // e.g. 18
  total: number;
  currency: string;           // 'INR' | 'USD' etc.
  currencySymbol: string;     // '₹' | '$'
  proRated: boolean;
  billingCycle?: string;
}

interface AddUsersModalProps {
  licenseId: string;
  email: string;
  companyId: number;
  plan: string;
  currentUsed: number;
  currentLimit: number;
  onClose: () => void;
  /** Called after successful payment so parent can refresh license state */
  onUpgradeSuccess: (newLimit: number) => void;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function fmt(symbol: string, amount: number) {
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PricingRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid rgba(99,102,241,0.08)',
    }}>
      <span style={{ fontSize: '13px', color: bold ? '#1e293b' : '#64748b', fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: bold ? '16px' : '13px', fontWeight: bold ? 800 : 500, color: bold ? '#6366f1' : '#334155' }}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function AddUsersModal({
  licenseId, email, companyId, plan,
  currentUsed, currentLimit,
  onClose, onUpgradeSuccess,
}: AddUsersModalProps) {

  const [additionalUsers, setAdditionalUsers] = useState(1);
  const [pricing, setPricing]               = useState<PricingData | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError]     = useState<string | null>(null);

  const [paying, setPaying]           = useState(false);
  const [payError, setPayError]       = useState<string | null>(null);
  const [paySuccess, setPaySuccess]   = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const newLimit = currentLimit + additionalUsers;

  // ── Fetch pricing whenever additionalUsers changes ──
  const fetchPricing = useCallback(async () => {
    if (!licenseId) return;
    setPricingLoading(true);
    setPricingError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') ||
        (() => { try { return JSON.parse(localStorage.getItem('adminData') || '{}')?.token; } catch { return null; } })();

      const data = await calculateUpgradePricing({
        licenseId,
        newUserLimit: newLimit,
        email,
      });
      // LOG THIS — check console to see exact field names from your API
      console.log('[AddUsersModal] calculateUpgradePricing raw response:', JSON.stringify(data, null, 2));
      const p = data.pricing; // all amounts are nested here
      setPricing({
        pricePerUser:    data.pricePerUser    ?? 0,
        additionalUsers: data.additionalUsers ?? additionalUsers,
        subtotal:        p.subtotal           ?? 0,
        gst:             p.gst               ?? 0,
        gstRate:         18,
        total:           p.total             ?? 0,
        currency:        'INR',
        currencySymbol:  '₹',
        proRated:        true,
        billingCycle:    data.licenseDetails?.billingPeriod,
      });
    } catch (e: any) {
      setPricingError(e?.response?.data?.message || e.message || 'Failed to fetch pricing');
    } finally {
      setPricingLoading(false);
    }
  }, [licenseId, email, newLimit, additionalUsers]);

  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  // Prevent bg scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Payment flow ──
  const handleAddUsers = async () => {
    if (!pricing) return;
    setPaying(true);
    setPayError(null);

    try {
      // 1. Load Razorpay SDK
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) throw new Error('Failed to load payment SDK. Check your connection.');

      // 2. Initiate upgrade transaction on backend
      const upgradeRes = await initiateUserUpgrade({ licenseId, newUserLimit: newLimit, email });
      const txnId: string = upgradeRes.transactionId ?? upgradeRes.transaction_id;
      setTransactionId(txnId);

      // 3. Create Razorpay order
      const orderRes = await createOrderForUserUpgrade({ transactionId: txnId });
      console.log('[AddUsersModal] createOrderForUserUpgrade raw response:', JSON.stringify(orderRes, null, 2));

      const razorpayKey =
        orderRes.keyId      ||
        orderRes.key_id     ||
        orderRes.key        ||
        orderRes.razorpayKey||
        orderRes.razorpay_key_id;

      if (!razorpayKey) throw new Error('Razorpay key missing from order response');

      const orderId  = orderRes.orderId  || orderRes.order_id  || orderRes.id;
      const amount   = orderRes.amount;
      const currency = orderRes.currency ?? 'INR';

      // 4. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key:         razorpayKey,
          amount:      amount,
          currency:    currency ?? pricing.currency,
          order_id:    orderId  ?? orderRes.order_id,
          name:        'WorkEye',
          description: `Add ${additionalUsers} user${additionalUsers > 1 ? 's' : ''} — ${plan}`,
          prefill:     { email },
          theme:       { color: '#6366f1' },
          handler: async (response: any) => {
            try {
              await verifyPayment({
                ...response,
                transactionId: txnId,
                licenseId,
                newUserLimit: newLimit,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              // Cancel pending transaction silently
              cancelUpgradeTransaction({ transactionId: txnId }).catch(() => {});
              reject(new Error('Payment cancelled'));
            },
          },
        });
        rzp.open();
      });

      // 5. Poll upgrade status (up to 10s) to confirm LMS updated
      let confirmed = false;
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const status = await getUpgradeStatus(txnId);
          if (status.status === 'completed' || status.status === 'success') {
            confirmed = true;
            break;
          }
        } catch { /* ignore poll errors */ }
      }

      setPaySuccess(true);
      setTimeout(() => {
        onUpgradeSuccess(newLimit);
        onClose();
      }, 1800);

    } catch (err: any) {
      if (err.message === 'Payment cancelled') {
        setPayError('Payment was cancelled.');
      } else {
        setPayError(err?.response?.data?.message || err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setPaying(false);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !paying) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: '26rem',
        borderRadius: '20px',
        background: '#fff',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        position: 'relative',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users style={{ width: '20px', height: '20px', color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>Add More Users</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>{plan} Plan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={paying}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px',
              padding: '8px', cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: paying ? 0.5 : 1,
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* ── Current plan status ── */}
          <div style={{
            background: 'linear-gradient(145deg, #eff6ff, #dbeafe)',
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Users style={{ width: '18px', height: '18px', color: '#fff' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>Current Plan Status</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
                {currentUsed} of {currentLimit} slots used
              </p>
            </div>
          </div>

          {/* ── User count selector ── */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              How many users do you want to add?
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <button
                onClick={() => setAdditionalUsers((v) => Math.max(1, v - 1))}
                disabled={additionalUsers <= 1 || paying}
                style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: additionalUsers <= 1 ? '#f1f5f9' : '#f8fafc',
                  border: '2px solid #e2e8f0',
                  cursor: additionalUsers <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b', fontSize: '20px', fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                <Minus style={{ width: '16px', height: '16px' }} />
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                  {additionalUsers}
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>users</p>
              </div>

              <button
                onClick={() => setAdditionalUsers((v) => Math.min(100, v + 1))}
                disabled={paying}
                style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'linear-gradient(145deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>

          {/* ── New limit pill ── */}
          <div style={{
            background: 'linear-gradient(145deg, #f5f3ff, #ede9fe)',
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                New user limit
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color: '#4c1d95' }}>
                {newLimit} users
              </p>
            </div>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users style={{ width: '22px', height: '22px', color: '#fff' }} />
            </div>
          </div>

          {/* ── Pricing section ── */}
          {pricingLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Loader2 style={{ width: '24px', height: '24px', color: '#6366f1', margin: '0 auto' }} className="animate-spin" />
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8' }}>Calculating price…</p>
            </div>
          ) : pricingError ? (
            <div style={{
              background: '#fef2f2', borderRadius: '12px', padding: '12px',
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>{pricingError}</p>
            </div>
          ) : pricing ? (
            <>
              {/* Pro-rated badge */}
              {pricing.proRated && (
                <div style={{
                  background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '16px',
                }}>
                  <Zap style={{ width: '14px', height: '14px', color: '#16a34a', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                      Pro-rated pricing based on remaining license period
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#16a34a' }}>
                      You only pay for the remaining time in your billing cycle
                    </p>
                  </div>
                </div>
              )}

              {/* Pricing breakdown */}
              <div style={{
                background: '#f8fafc', borderRadius: '14px', padding: '4px 16px',
                marginBottom: '16px',
              }}>
                <PricingRow label="Price per user/month" value={fmt(pricing.currencySymbol, pricing.pricePerUser)} />
                <PricingRow label="Additional users" value={`×${pricing.additionalUsers}`} />
                <PricingRow label="Subtotal" value={fmt(pricing.currencySymbol, pricing.subtotal)} />
                <PricingRow label={`GST (${pricing.gstRate}%)`} value={fmt(pricing.currencySymbol, pricing.gst)} />
                <div style={{ paddingTop: '4px' }}>
                  <PricingRow label="Total" value={fmt(pricing.currencySymbol, pricing.total)} bold />
                </div>
              </div>

              {/* Note */}
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '10px', padding: '10px 14px', marginBottom: '20px',
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>Note:</strong> Additional users will be billed at{' '}
                  {fmt(pricing.currencySymbol, pricing.pricePerUser)}/user/month.
                  Your license will be updated immediately after payment confirmation.
                </p>
              </div>
            </>
          ) : null}

          {/* ── Pay error ── */}
          {payError && (
            <div style={{
              background: '#fef2f2', borderRadius: '12px', padding: '12px',
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>{payError}</p>
            </div>
          )}

          {/* ── Success ── */}
          {paySuccess && (
            <div style={{
              background: '#f0fdf4', borderRadius: '12px', padding: '12px',
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            }}>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#16a34a', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
                Users added! Your plan has been upgraded.
              </p>
            </div>
          )}

          {/* ── Buttons ── */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={paying || paySuccess}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                border: '2px solid #e2e8f0', background: '#fff',
                fontSize: '14px', fontWeight: 600, color: '#64748b',
                cursor: 'pointer',
                opacity: paying || paySuccess ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddUsers}
              disabled={paying || paySuccess || pricingLoading || !!pricingError}
              style={{
                flex: 2, padding: '12px', borderRadius: '12px',
                background: paying || paySuccess || pricingLoading
                  ? '#c7d2fe'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', color: '#fff',
                fontSize: '14px', fontWeight: 700,
                cursor: paying || paySuccess || pricingLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: paying || paySuccess || pricingLoading
                  ? 'none'
                  : '0 4px 14px rgba(99,102,241,0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {paying ? (
                <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />Processing…</>
              ) : paySuccess ? (
                <><CheckCircle style={{ width: '16px', height: '16px' }} />Done!</>
              ) : (
                <><Plus style={{ width: '16px', height: '16px' }} />Add Users</>
              )}
            </button>
          </div>

          {/* ── Trust badges ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
            {[
              { icon: <Shield style={{ width: '12px', height: '12px' }} />, label: 'Secure payment' },
              { icon: <CreditCard style={{ width: '12px', height: '12px' }} />, label: 'Razorpay' },
              { icon: <Clock style={{ width: '12px', height: '12px' }} />, label: 'Instant activation' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                {icon}
                <span style={{ fontSize: '11px' }}>{label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}