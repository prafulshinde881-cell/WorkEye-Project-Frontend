import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Trash2, Edit, X, Loader2, UserPlus, Mail, User,
  Briefcase, Building, CheckCircle, AlertCircle, Users,
  Search, Download, Crown, Zap, Lock, TrendingUp, ExternalLink
} from 'lucide-react';
import { members as membersAPI, dashboard as dashboardAPI, wsClient } from '@/config/api';
import { TrackerSetupGuide } from './TrackerSetupGuide';
import { AddUsersModal } from './Addusersmodal';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const LICENSE_BASE  = 'https://lisence-system.onrender.com/api';
const PRODUCT_ID    = '69589e3fe70228ef3c25f26c';
const BILLING_URL   = '/billing'; 


// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface LicenseData {
  licenseId: string;
  plan: string;
  userLimit: number;   // from activeLicense.maxLimits['user-limit']
  userUsed: number;    // from activeLicense.usage['user-limit']
}

// Dashboard API response shape (image 3):
// { dashboard: { 'user-limit': { used, max, remaining, limitReached } } }
interface DashboardFeature {
  used: number;
  max: number;
  remaining: number;
  limitReached: boolean;
}

interface Member {
  id: number;
  email: string;
  name: string;
  position?: string;
  department?: string;
  status: 'active' | 'idle' | 'offline';
  is_active: boolean;
  created_at: string;
  device_count?: number;
}

interface MembersManagementProps {
  companyUsername: string;
  companyId: number;
  onMembersUpdate?: () => void;
  adminEmail?: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getAdminEmail(): string {
  try { return JSON.parse(localStorage.getItem('adminData') || '{}')?.email || ''; }
  catch { return ''; }
}

// ─────────────────────────────────────────────
// LMS API
// ─────────────────────────────────────────────

/**
 * Fetch active license.
 * Response: { activeLicense: { _id, licenseTypeId: { name }, maxLimits, usage } }
 */
async function fetchLicense(email: string): Promise<LicenseData | null> {
  if (!email) return null;
  try {
    const res = await fetch(
      `${LICENSE_BASE}/external/actve-license/${encodeURIComponent(email)}?productId=${PRODUCT_ID}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const lic  = json.activeLicense;
    if (!lic?._id) return null;

    const data: LicenseData = {
      licenseId: lic._id,
      plan:      lic.licenseTypeId?.name       || 'Professional',
      userLimit: lic.maxLimits?.['user-limit'] ?? Infinity,
      userUsed:  lic.usage?.['user-limit']     ?? 0,
    };
    localStorage.setItem('lmsLicenseId', data.licenseId);
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch dashboard — this is the AUTHORITATIVE limit check.
 * Response: { dashboard: { 'user-limit': { used, max, remaining, limitReached } } }
 */
async function fetchDashboard(licenseId: string): Promise<DashboardFeature | null> {
  if (!licenseId) return null;
  try {
    const res = await fetch(`${LICENSE_BASE}/license/${licenseId}/dashboard`);
    if (!res.ok) return null;
    const json = await res.json();
    const ul   = json.dashboard?.['user-limit'];
    if (!ul) return null;
    return {
      used:         ul.used         ?? 0,
      max:          ul.max          ?? Infinity,
      remaining:    ul.remaining    ?? 0,
      limitReached: ul.limitReached ?? false,
    };
  } catch {
    return null;
  }
}

/**
 * Report seat DELTA to LMS via heartbeat.
 * The heartbeat increments/decrements by the value you send.
 * Pass +1 for add, -1 for delete.
 * Then re-fetch dashboard to get authoritative values.
 * Returns null silently on failure — never blocks UI.
 */
async function reportSeatsDelta(
  licenseId: string,
  companyId: number,
  delta: number,
): Promise<DashboardFeature | null> {
  if (!licenseId) return null;
  
  // If delta is 0, just fetch current state
  if (delta === 0) return fetchDashboard(licenseId);
  
  try {
    const hbRes = await fetch(`${LICENSE_BASE}/heartbeat/${licenseId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:   companyId,
        features: [{ slug: 'user-limit', value: delta }], // +1 or -1
      }),
    });
    // Log heartbeat failures but don't throw
    if (!hbRes.ok) {
      console.warn('[LMS] heartbeat delta failed:', hbRes.status);
    }
  } catch (e) {
    console.warn('[LMS] heartbeat delta error:', e);
  }

  // Always re-fetch dashboard after heartbeat to get fresh values
  return fetchDashboard(licenseId);
}

// ─────────────────────────────────────────────
// UPGRADE MODAL
// ─────────────────────────────────────────────
function UpgradeModal({ plan, used, limit, onClose, onAddUsersClick }: {
  plan: string; used: number; limit: number; onClose: () => void; onAddUsersClick: () => void;
}) {


  const handleUpgrade = () => {
     window.location.href = BILLING_URL;
   };
   
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="neu-card" style={{ width: '100%', maxWidth: '26rem', padding: '32px', textAlign: 'center', position: 'relative' }}>
        <button onClick={onClose} className="neu-btn-sm" style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px' }}>
          <X style={{ width: '18px', height: '18px' }} />
        </button>

        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(145deg,#fbbf24,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
          <Crown style={{ width: '36px', height: '36px', color: '#fff' }} />
        </div>

        <h2 className="neu-title" style={{ fontSize: '22px', marginBottom: '8px' }}>User Limit Reached</h2>
        <p className="neu-text-muted" style={{ fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
          Your <strong>{plan}</strong> plan allows up to <strong>{limit} member{limit !== 1 ? 's' : ''}</strong>.
         Upgrade to add more.
        </p>

        {/* Usage bar */}
        <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min((used / Math.max(limit, 1)) * 100, 100)}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleUpgrade}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: 'linear-gradient(145deg,#fbbf24,#f59e0b)', color: '#fff', fontWeight: 700, fontSize: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,0.4)' }}
          >
            <Zap style={{ width: '18px', height: '18px' }} />
            Upgrade Plan
            <ExternalLink style={{ width: '14px', height: '14px', opacity: 0.8 }} />
          </button>
          <button
            onClick={onAddUsersClick}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', width: '100%', background: 'linear-gradient(145deg,#ede9fe,#ddd6fe)', color: '#5b21b6', fontWeight: 700, fontSize: '14px', borderRadius: '12px', border: '2px solid #c4b5fd', cursor: 'pointer' }}
          >
            <Users style={{ width: '16px', height: '16px' }} />
            Add More Users (Same Plan)
          </button>
          <button onClick={onClose} className="neu-btn" style={{ width: '100%' }}>Maybe Later</button>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          {['Unlimited team members', 'Advanced analytics & reports', 'Priority support'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <TrendingUp style={{ width: '14px', height: '14px', color: '#f59e0b', flexShrink: 0 }} />
              <span className="neu-text" style={{ fontSize: '13px' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// LIMIT BANNER (shows when ≥ 80% used OR limitReached)
// ─────────────────────────────────────────────
function LimitBanner({ used, limit, limitReached, plan, onUpgradeClick }: {
  used: number; limit: number; limitReached: boolean; plan: string; onUpgradeClick: () => void;
}) {
  if (!limit || limit === Infinity) return null;
  const pct    = (used / limit) * 100;
  const isNear = pct >= 80 || limitReached;
  if (!isNear) return null;

  return (
    <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '14px', background: limitReached ? 'linear-gradient(145deg,#fee2e2,#fecaca)' : 'linear-gradient(145deg,#fef3c7,#fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {limitReached
          ? <Lock        style={{ width: '18px', height: '18px', color: '#dc2626', flexShrink: 0 }} />
          : <AlertCircle style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0 }} />}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: limitReached ? '#991b1b' : '#92400e', margin: 0 }}>
            {limitReached
              ? `Limit reached — ${used}/${limit} on ${plan}`
              : `Approaching limit — ${used}/${limit} used`}
          </p>
          <p style={{ fontSize: '12px', color: limitReached ? '#b91c1c' : '#b45309', margin: '2px 0 0' }}>
            {limitReached
              ? 'Upgrade to add more members.'
              : `${limit - used} slot${limit - used !== 1 ? 's' : ''} remaining.`}
          </p>
        </div>
      </div>
      <button
        onClick={onUpgradeClick}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: limitReached ? '#dc2626' : '#d97706', color: '#fff', fontWeight: 700, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
      >
        <Crown style={{ width: '14px', height: '14px' }} /> Upgrade
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function MembersManagement({
  companyUsername, companyId, onMembersUpdate, adminEmail: adminEmailProp,
}: MembersManagementProps) {

  const [membersList, setMembersList]               = useState<Member[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState<string | null>(null);
  const [success, setSuccess]                       = useState<string | null>(null);
  const [searchQuery, setSearchQuery]               = useState('');
  const [showAddModal, setShowAddModal]             = useState(false);
  const [editingMember, setEditingMember]           = useState<Member | null>(null);
  const [submitting, setSubmitting]                 = useState(false);
  const [downloadingTracker, setDownloadingTracker] = useState(false);
  const [showTrackerSetup, setShowTrackerSetup]     = useState(false);
  const [trackerSetupMember, setTrackerSetupMember] = useState<{ name: string; email: string } | null>(null);
  const [formData, setFormData]                     = useState({ email: '', name: '', position: '', department: '' });

  // License state
  const [licenseId, setLicenseId]               = useState('');
  const [plan, setPlan]                         = useState('Free');
  const [userLimit, setUserLimit]               = useState<number>(Infinity);
  const [userUsed, setUserUsed]                 = useState(0);
  const [limitReached, setLimitReached]         = useState(false);
  const [licenseReady, setLicenseReady]         = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);

  const resolvedEmail = adminEmailProp || getAdminEmail();
  const isModalOpen   = showAddModal || !!editingMember;
  // isAtLimit uses both local count AND server limitReached flag
  const isAtLimit     = limitReached || (userLimit !== Infinity && membersList.length >= userLimit);

  // ── Apply dashboard response to state ──
  const applyDashboard = useCallback((d: DashboardFeature | null) => {
    if (!d) return;
    setUserUsed(d.used);
    setUserLimit(d.max);
    setLimitReached(d.limitReached);
  }, []);

  // Prevent bg scroll when modal open
  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isModalOpen]);

  // ─────────────────────────────────────────────
  // syncSeatsDelta — call after add (+1) OR delete (-1).
  // Reports delta to LMS, reads back fresh values.
  // ─────────────────────────────────────────────
  const syncSeatsDelta = useCallback(async (delta: number) => {
    if (!licenseId) return;
    const dashboard = await reportSeatsDelta(licenseId, companyId, delta);
    applyDashboard(dashboard);
  }, [licenseId, companyId, applyDashboard]);

  // ─────────────────────────────────────────────
  // loadMembers
  // ─────────────────────────────────────────────
  const loadMembers = useCallback(async (): Promise<number> => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, dashboardRes] = await Promise.all([
        membersAPI.getAll(),
        dashboardAPI.getStats(),
      ]);
      if (membersRes.success && membersRes.members) {
        const statusMap = new Map<number, 'active' | 'idle' | 'offline'>();
        dashboardRes?.members?.forEach((dm: any) => {
          const s = (dm.status || '').toLowerCase();
          if (['active', 'idle', 'offline'].includes(s)) statusMap.set(dm.id, s as any);
        });
        const list: Member[] = membersRes.members.map((m: any) => ({
          ...m, status: statusMap.get(m.id) || 'offline',
        }));
        setMembersList(list);
        return list.length;
      }
      setMembersList([]);
      return 0;
    } catch (err: any) {
      setError(err.message || 'Failed to load members');
      setMembersList([]);
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────
  // initLicense — runs on mount.
  // 1. Fetch license (get licenseId + plan)
  // 2. Fetch dashboard (get authoritative used/limit/limitReached)
  // NOTE: We do NOT sync on mount because the company itself counts as 1 user in LMS,
  // but WorkEye members don't include the company. The LMS already has the correct count.
  // ─────────────────────────────────────────────
  const initLicense = useCallback(async (currentCount: number) => {
    if (!resolvedEmail) { setLicenseReady(true); return; }

    const lic = await fetchLicense(resolvedEmail);
    if (!lic) { setLicenseReady(true); return; }

    setLicenseId(lic.licenseId);
    setPlan(lic.plan);

    // Fetch dashboard for authoritative values
    const dash = await fetchDashboard(lic.licenseId);
    if (dash) {
      applyDashboard(dash);
    } else {
      // Fallback to license values if dashboard fails
      setUserLimit(lic.userLimit);
      setUserUsed(lic.userUsed);
    }

    setLicenseReady(true);

    // DO NOT sync on mount - LMS already has correct count including company
    // The company counts as 1 user in LMS, but WorkEye members don't include the company
    // So LMS: company(1) + members(n) = n+1
    // WorkEye: members(n)
    // No sync needed on mount - LMS is already correct
  }, [resolvedEmail, applyDashboard]);

  // ── Mount ──
  useEffect(() => {
    loadMembers().then((count) => initLicense(count));

    // Reduced polling: refresh members list every 60 seconds instead of 5s
    // WebSocket events handle real-time status updates, so aggressive polling not needed
    const pollId = setInterval(() => loadMembers(), 60_000);

    const handleStatusUpdate = (data: any) => {
      if (data.member_id && data.status)
        setMembersList((prev) => prev.map((m) =>
          m.id === data.member_id ? { ...m, status: data.status.toLowerCase() } : m));
    };
    const handleLogout = (data: any) => {
      if (data.member_id)
        setMembersList((prev) => prev.map((m) =>
          m.id === data.member_id ? { ...m, status: 'offline' } : m));
    };

    wsClient.on('member_status_update', handleStatusUpdate);
    wsClient.on('member_logout', handleLogout);

    return () => {
      clearInterval(pollId);
      wsClient.off('member_status_update', handleStatusUpdate);
      wsClient.off('member_logout', handleLogout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──
  const resetForm  = () => { setFormData({ email: '', name: '', position: '', department: '' }); setError(null); setSuccess(null); };
  const closeModal = () => { setShowAddModal(false); setEditingMember(null); resetForm(); };

  const handleOpenAddModal = () => {
    if (!licenseReady) { setError('Checking subscription… please wait.'); return; }
    if (isAtLimit)     { setShowUpgradeModal(true); return; }
    resetForm();
    setShowAddModal(true);
  };

  const handleUpgradeSuccess = useCallback((newLimit: number) => {
    setUserLimit(newLimit);
    setLimitReached(false);
    fetchDashboard(licenseId).then(applyDashboard);
  }, [licenseId, applyDashboard]);

  // ── Add member (+1 seat) ──
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      // 1. Live check from dashboard (authoritative)
      const dash = await fetchDashboard(licenseId);
      if (dash?.limitReached || (dash && dash.remaining <= 0)) {
        applyDashboard(dash);
        setShowUpgradeModal(true);
        return;
      }

      // 2. Create in WorkEye
      await membersAPI.create(formData);

      // 3. Reload → real count
      await loadMembers();

      // 4. Report +1 delta to LMS
      await syncSeatsDelta(+1);

      setSuccess('Member added successfully!');
      closeModal();
      setTrackerSetupMember({ name: formData.name, email: formData.email });
      setShowTrackerSetup(true);
      onMembersUpdate?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update member (no seat change) ──
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      await membersAPI.update(editingMember.id, formData);
      setSuccess('Member updated successfully!');
      closeModal();
      await loadMembers();
      onMembersUpdate?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update member');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete member (-1 seat) ──
  const handleDeleteMember = async (memberId: number) => {
    if (!confirm('Remove this member? This cannot be undone.')) return;
    try {
      // 1. Delete from WorkEye
      await membersAPI.delete(memberId);

      // 2. Reload
      await loadMembers();

      // 3. Report -1 delta → frees the seat in LMS
      await syncSeatsDelta(-1);

      setSuccess('Member removed successfully!');
      onMembersUpdate?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete member');
    }
  };

  // ── Download tracker ──
  const handleDownloadTracker = async () => {
    setDownloadingTracker(true); setError(null);
    try {
      const response = await membersAPI.downloadTracker();
      if (response?.success) {
        if (response.download_url) {
          const a = document.createElement('a');
          a.href = response.download_url;
          a.download = response.filename || 'WorkEyeTracker.py';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
        setSuccess(response.message || 'Tracker downloaded!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response?.error || 'Failed to generate tracker');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download tracker');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloadingTracker(false);
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setFormData({ email: member.email, name: member.name, position: member.position || '', department: member.department || '' });
    setError(null); setSuccess(null);
  };

  const getStatusBadge = (status: 'active' | 'idle' | 'offline') => ({
    className: { active: 'neu-badge-success', idle: 'neu-badge-warning', offline: 'neu-badge-danger' }[status] || 'neu-badge-danger',
    label:     { active: 'Active', idle: 'Idle', offline: 'Offline' }[status] || 'Offline',
  });

  const filteredMembers = membersList.filter((m) =>
    [m.name, m.email, m.position || '', m.department || '']
      .some((v) => v.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Form fields config — typed to fix TS error ──
  type FormField = 'email' | 'name' | 'position' | 'department';
  interface FieldConfig {
    label: string;
    icon: React.ReactNode;
    field: FormField;
    type: string;
    placeholder: string;
    disabled: boolean;
  }
  const fieldConfigs: FieldConfig[] = [
    { label: 'Email Address', icon: <Mail      style={{ width: '14px', height: '14px' }} />, field: 'email',      type: 'email', placeholder: 'john.doe@company.com', disabled: !!editingMember },
    { label: 'Full Name',     icon: <User      style={{ width: '14px', height: '14px' }} />, field: 'name',       type: 'text',  placeholder: 'John Doe',             disabled: false },
    { label: 'Position',      icon: <Briefcase style={{ width: '14px', height: '14px' }} />, field: 'position',   type: 'text',  placeholder: 'Software Developer',   disabled: false },
    { label: 'Department',    icon: <Building  style={{ width: '14px', height: '14px' }} />, field: 'department', type: 'text',  placeholder: 'Engineering',          disabled: false },
  ];

  // ── Modal ──
  const modal = isModalOpen ? createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', overflowY: 'auto' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div className="neu-card" style={{ width: '100%', maxWidth: '28rem', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(190,195,201,0.3)' }}>
            <h3 className="neu-title" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <UserPlus style={{ width: '24px', height: '24px', color: '#6366f1' }} />
              {editingMember ? 'Edit Member' : 'Add New Member'}
            </h3>
            <button onClick={closeModal} className="neu-btn-sm" style={{ padding: '8px' }}>
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          <form
            onSubmit={editingMember ? handleUpdateMember : handleAddMember}
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {fieldConfigs.map(({ label, icon, field, type, placeholder, disabled }) => (
              <div key={field}>
                <label className="neu-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  {icon}{label}
                </label>
                <input
                  type={type}
                  required={field === 'email' || field === 'name'}
                  value={formData[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="neu-input"
                  style={{ width: '100%' }}
                  placeholder={placeholder}
                  disabled={disabled || submitting}
                />
              </div>
            ))}

            {error && (
              <div style={{ background: 'linear-gradient(145deg,#fed7aa,#fdba74)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: '16px', height: '16px', color: '#7c2d12', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#7c2d12', margin: 0 }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <button type="button" onClick={closeModal} className="neu-btn" style={{ flex: 1 }} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="neu-btn-accent"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {submitting
                  ? <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />{editingMember ? 'Updating…' : 'Adding…'}</>
                  : <><CheckCircle style={{ width: '16px', height: '16px' }} />{editingMember ? 'Update' : 'Add Member'}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '32px' }}>

      {success && (
        <div className="neu-card" style={{ marginBottom: '24px', padding: '16px', background: 'linear-gradient(145deg,#d1fae5,#a7f3d0)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle style={{ width: '20px', height: '20px', color: '#065f46' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#065f46', margin: 0 }}>{success}</p>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="neu-card" style={{ marginBottom: '24px', padding: '16px', background: 'linear-gradient(145deg,#fed7aa,#fdba74)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#7c2d12' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#7c2d12', margin: 0 }}>{error}</p>
        </div>
      )}

      {licenseReady && (
        <LimitBanner
          used={userUsed}
          limit={userLimit === Infinity ? 0 : userLimit}
          limitReached={limitReached}
          plan={plan}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />
      )}

      {/* Toolbar */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: '400px' }}>
          <Search style={{ position: 'absolute', width: '20px', height: '20px', color: '#64748b', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search members…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neu-input"
            style={{ width: '100%', paddingLeft: '48px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          {/* Seat pill
          {licenseReady && userLimit !== Infinity && (
            <div style={{ padding: '6px 14px', borderRadius: '999px', background: isAtLimit ? 'linear-gradient(145deg,#fee2e2,#fecaca)' : 'linear-gradient(145deg,#ede9fe,#ddd6fe)', fontSize: '13px', fontWeight: 700, color: isAtLimit ? '#991b1b' : '#5b21b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users style={{ width: '14px', height: '14px' }} />
              {membersList.length} / {userLimit} users
            </div>
          )} */}

          <button onClick={handleDownloadTracker} disabled={downloadingTracker} className="neu-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(145deg,#86efac,#6ee7b7)', color: '#065f46' }}>
            {downloadingTracker
              ? <><Loader2 style={{ width: '20px', height: '20px' }} className="animate-spin" /><span>Downloading…</span></>
              : <><Download style={{ width: '20px', height: '20px' }} /><span>Download Tracker</span></>}
          </button>

          {/* CSV Import */}
          <input id="csvImport" type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setSubmitting(true); setError(null); setSuccess(null);
              try {
                const text    = await file.text();
                const lines   = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                if (!lines.length) throw new Error('CSV is empty');
                const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
                let added = 0, failed = 0;

                for (let i = 1; i < lines.length; i++) {
                  // Check dashboard before each row
                  const dash = await fetchDashboard(licenseId);
                  if (dash?.limitReached || (dash && dash.remaining <= 0)) {
                    if (dash) applyDashboard(dash);
                    failed += lines.length - i;
                    setShowUpgradeModal(true);
                    break;
                  }

                  const cols = lines[i].split(',').map((c) => c.trim());
                  const obj: Record<string, string> = {};
                  headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
                  const payload = {
                    email:      obj.email || obj.mail || '',
                    name:       obj.name  || obj.full_name || obj.fullname || '',
                    position:   obj.position   || '',
                    department: obj.department || '',
                  };
                  if (!payload.email || !payload.name) { failed++; continue; }
                  try { 
                    await membersAPI.create(payload); 
                    added++;
                    // Report +1 delta for each successfully added member
                    await syncSeatsDelta(+1);
                  }
                  catch { failed++; }
                }

                await loadMembers();

                setSuccess(`Imported ${added} member${added !== 1 ? 's' : ''}.${failed ? ` ${failed} failed.` : ''}`);
                setTimeout(() => setSuccess(null), 4000);
              } catch (err: any) {
                setError(err.message || 'Failed to import CSV');
                setTimeout(() => setError(null), 5000);
              } finally {
                setSubmitting(false);
                (document.getElementById('csvImport') as HTMLInputElement).value = '';
              }
            }}
          />
          <button
            onClick={() => document.getElementById('csvImport')?.click()}
            disabled={submitting}
            className="neu-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <UserPlus style={{ width: '20px', height: '20px' }} /><span>Import CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className={isAtLimit ? 'neu-btn' : 'neu-btn-accent'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ...(isAtLimit ? { background: 'linear-gradient(145deg,#fbbf24,#f59e0b)', color: '#fff' } : {}) }}
          >
            {isAtLimit
              ? <><Crown style={{ width: '20px', height: '20px' }} />Upgrade to Add</>
              : <><Plus  style={{ width: '20px', height: '20px' }} />Add Member</>}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="neu-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p className="neu-text" style={{ fontWeight: 600 }}>Loading members…</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="neu-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Users style={{ width: '64px', height: '64px', color: '#cbd5e1', margin: '0 auto 16px' }} />
          <h3 className="neu-title" style={{ fontSize: '18px', marginBottom: '8px' }}>
            {searchQuery ? 'No members found' : 'No members yet'}
          </h3>
          <p className="neu-text-muted" style={{ marginBottom: '24px' }}>
            {searchQuery ? 'Try adjusting your search.' : 'Add your first team member to get started.'}
          </p>
          {!searchQuery && (
            <button onClick={handleOpenAddModal} className="neu-btn-accent"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus style={{ width: '20px', height: '20px' }} /><span>Add First Member</span>
            </button>
          )}
        </div>
      ) : (
        <div className="neu-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="neu-table">
              <thead>
                <tr>
                  <th>Member</th><th>Position</th><th>Department</th>
                  <th>Status</th><th>Devices</th><th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const badge = getStatusBadge(member.status);
                  return (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(145deg,#7477ff,#5558d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px' }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="neu-title"     style={{ fontSize: '14px', marginBottom: '2px' }}>{member.name}</p>
                            <p className="neu-text-muted" style={{ fontSize: '12px' }}>{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="neu-text" style={{ fontSize: '14px' }}>{member.position   || '-'}</span></td>
                      <td><span className="neu-text" style={{ fontSize: '14px' }}>{member.department || '-'}</span></td>
                      <td>
                        <span className={`neu-badge ${badge.className}`}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px', background: 'currentColor' }} />
                          {badge.label}
                        </span>
                      </td>
                      <td><span className="neu-text" style={{ fontSize: '14px' }}>{member.device_count || 0}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => handleEditClick(member)} className="neu-btn-sm" title="Edit" style={{ padding: '8px' }}>
                            <Edit style={{ width: '16px', height: '16px' }} />
                          </button>
                          <button onClick={() => handleDeleteMember(member.id)} className="neu-btn-sm" title="Remove"
                            style={{ padding: '8px', background: 'linear-gradient(145deg,#fca5a5,#f87171)', color: '#7f1d1d' }}>
                            <Trash2 style={{ width: '16px', height: '16px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal}

      {showUpgradeModal && (
        <UpgradeModal
          plan={plan}
          used={membersList.length}
          limit={userLimit === Infinity ? 0 : userLimit}
          onClose={() => setShowUpgradeModal(false)}
          onAddUsersClick={() => { setShowUpgradeModal(false); setShowAddUsersModal(true); }}
        />
      )}

      {showAddUsersModal && (
        <AddUsersModal
          licenseId={licenseId}
          email={resolvedEmail}
          companyId={companyId}
          plan={plan}
          currentUsed={userUsed}
          currentLimit={userLimit === Infinity ? 0 : userLimit}
          onClose={() => setShowAddUsersModal(false)}
          onUpgradeSuccess={handleUpgradeSuccess}
        />
      )}

      {showTrackerSetup && trackerSetupMember && (
        <TrackerSetupGuide
          memberName={trackerSetupMember.name}
          memberEmail={trackerSetupMember.email}
          onClose={() => { setShowTrackerSetup(false); setTrackerSetupMember(null); }}
          onDownloadTracker={handleDownloadTracker}
          isDownloading={downloadingTracker}
        />
      )}
    </div>
  );
}