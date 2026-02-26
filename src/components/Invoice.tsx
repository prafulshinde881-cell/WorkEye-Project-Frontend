import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, X, Loader2, ArrowLeft, Receipt } from 'lucide-react';
import { getMyTransactions } from '../utils/payment';

const LMS_BASE = 'https://lisence-system.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id:     string;
  date:   string;
  plan:   string;
  cycle:  string;
  amount: number;
  status: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const navigate = useNavigate();

  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [previewId,  setPreviewId]  = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rawUser = JSON.parse(localStorage.getItem('adminData') ?? '{}');
        const email   = rawUser.email ?? '';

        if (!email) {
          setError('User not found. Please log in again.');
          return;
        }

        const PRODUCT_ID = '69589e3fe70228ef3c25f26c';
        let lmsUserId = '';

        try {
          const licRes = await fetch(
            `${LMS_BASE}/api/external/actve-license/${encodeURIComponent(email)}?productId=${PRODUCT_ID}`,
            { headers: { 'x-api-key': 'my-secret-key-123' } }
          );
          if (licRes.ok) {
            const licData = await licRes.json();
            const lic = licData.activeLicense ?? licData.license ?? licData.data ?? licData;
            lmsUserId =
              (typeof lic.ownerUserId === 'string' ? lic.ownerUserId : lic.ownerUserId?._id) ?? '';
          }
        } catch {
          // active-license call failed — lmsUserId stays empty
        }

        if (!lmsUserId) {
          setError('No active license found. Purchase a plan to see invoices here.');
          return;
        }

        const data = await getMyTransactions(lmsUserId);
        const list: any[] = data?.transactions ?? [];

        setInvoices(
          list.map((t: any) => ({
            id:     t._id,
            date:   t.createdAt ?? '',
            plan:   t.plan ?? 'Plan',
            cycle:  t.billingCycle ?? 'monthly',
            amount: t.amount ?? 0,
            status: t.status ?? 'paid',
          }))
        );
      } catch (e: any) {
        console.error('[Invoices]', e);
        setError('Failed to load invoices. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handlePreview(id: string) {
    setPreviewing(true);
    setPreviewId(id);
    try {
      const res = await fetch(`${LMS_BASE}/api/payment/invoice/${id}`);
      if (!res.ok) throw new Error('Failed to fetch invoice');
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error('[Preview]', e);
      setPreviewId(null);
    } finally {
      setPreviewing(false);
    }
  }

  function handleClosePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewId(null);
  }

  function handleDownload(id: string) {
    window.open(`${LMS_BASE}/api/payment/invoice/${id}`, '_blank');
  }

  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Preview Modal ── */}
      <AnimatePresence>
        {previewId && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePreview}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden border border-slate-200"
                style={{ maxHeight: '90vh' }}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-slate-400" />
                    <h2 className="font-semibold text-slate-800">Invoice Preview</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(previewId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                    <button
                      onClick={handleClosePreview}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal body */}
                <div
                  className="flex-1 flex items-center justify-center bg-slate-50"
                  style={{ minHeight: 520 }}
                >
                  {previewing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-sm text-slate-400">Loading invoice…</p>
                    </div>
                  ) : previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title="Invoice Preview"
                      className="w-full"
                      style={{ minHeight: 520, height: '100%' }}
                    />
                  ) : (
                    <p className="text-sm text-slate-400">Failed to load preview.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main page ── */}
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Billing &amp; Invoices
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                View your payment history and download invoices anytime.
              </p>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-sm font-medium transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-24">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && invoices.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm"
            >
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
              </div>
              <h3 className="font-semibold text-slate-800 text-lg">No invoices yet</h3>
              <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
                Once you purchase or upgrade a plan, invoices will appear here.
              </p>
              <button
                onClick={() => navigate('/billing')}
                className="mt-6 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                View Plans
              </button>
            </motion.div>
          )}

          {/* ── Invoice table ── */}
          {!loading && !error && invoices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">

                  {/* Head */}
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {(['Sr.No.', 'Plan', 'Billing Cycle', 'Date', 'Amount', 'Status', 'Actions'] as const).map(
                        (h, i) => (
                          <th
                            key={h}
                            className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 ${
                              i === 6 ? 'text-right' : 'text-left'
                            }`}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody className="divide-y divide-slate-50">
                    {invoices.map((inv, i) => (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span className="text-xs font-mono text-slate-400">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-800 capitalize">{inv.plan}</span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="capitalize text-slate-600">{inv.cycle}</span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {inv.date
                            ? new Date(inv.date).toLocaleDateString('en-IN', {
                                day:   'numeric',
                                month: 'short',
                                year:  'numeric',
                              })
                            : '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900">
                            ₹{Number(inv.amount).toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Paid
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreview(inv.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => handleDownload(inv.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs font-bold text-slate-700">
                  Total Paid: ₹{totalPaid.toLocaleString('en-IN')}
                </p>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </>
  );
}