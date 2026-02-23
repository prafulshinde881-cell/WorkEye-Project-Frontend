import React from 'react';
import { X, Download, FileText, Terminal, CheckCircle, Zap, Loader2 } from 'lucide-react';

interface TrackerSetupGuideProps {
  memberName: string;
  memberEmail: string;
  onClose: () => void;
  onDownloadTracker: () => void;
  isDownloading?: boolean;
}

export function TrackerSetupGuide({
  memberName,
  memberEmail,
  onClose,
  onDownloadTracker,
  isDownloading = false
}: TrackerSetupGuideProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="neu-card"
        style={{
          width: '100%',
          maxWidth: '32rem',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(190, 195, 201, 0.3)'
          }}
        >
          <h3
            className="neu-title"
            style={{
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0
            }}
          >
            <Zap style={{ width: '24px', height: '24px', color: '#6366f1' }} />
            <span>Tracker Setup</span>
          </h3>
          <button onClick={onClose} className="neu-btn-sm" style={{ padding: '8px' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Welcome, <strong>{memberName}</strong> ({memberEmail})
            </p>
            <p style={{ marginTop: 8, color: '#475569', fontSize: '13px' }}>
              Follow these steps to set up the Work Eye Tracker on your device.
            </p>
          </div>

          {/* Step 1: Download */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              1
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Download the Tracker
              </h4>
              <p style={{ margin: '4px 0 12px', color: '#64748b', fontSize: '13px' }}>
                Get the latest WorkEye Tracker executable for your system.
              </p>
              <button
                onClick={onDownloadTracker}
                disabled={isDownloading}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
                  color: 'white',
                  border: 0,
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isDownloading ? 0.6 : 1
                }}
              >
                {isDownloading ? (
                  <>
                    <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download style={{ width: '14px', height: '14px' }} />
                    <span>Download Tracker</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Extract */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              2
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Extract & Run
              </h4>
              <p style={{ margin: '4px 0 12px', color: '#64748b', fontSize: '13px' }}>
                Extract the downloaded file and run the installer on your computer.
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#1e293b',
                  fontFamily: 'monospace',
                  overflowX: 'auto'
                }}
              >
                python WorkEyeTracker.py
              </code>
            </div>
          </div>

          {/* Step 3: Configure */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #6366f1, #7c3aed)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              3
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Enter Credentials
              </h4>
              <p style={{ margin: '4px 0 12px', color: '#64748b', fontSize: '13px' }}>
                Use your email and the tracker token provided during setup.
              </p>
              <div
                style={{
                  padding: '8px 12px',
                  background: '#e6f0ff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#1e3a8a',
                  fontFamily: 'monospace'
                }}
              >
                Email: {memberEmail}
              </div>
            </div>
          </div>

          {/* Step 4: Verify */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #10b981, #059669)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              ✓
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Start Tracking
              </h4>
              <p style={{ margin: '4px 0', color: '#64748b', fontSize: '13px' }}>
                The tracker will start monitoring your activity. You'll see real-time updates in the Dashboard.
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div
            style={{
              padding: '12px',
              background: 'linear-gradient(145deg, #e6f0ff, #dbe9ff)',
              borderLeft: '3px solid #6366f1',
              borderRadius: '6px'
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: '#1e3a8a', fontWeight: 500 }}>
              💡 <strong>Tip:</strong> Keep the tracker running during work hours for accurate monitoring.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button
              onClick={onClose}
              className="neu-btn"
              style={{ flex: 1 }}
            >
              Close
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Could link to detailed docs
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                textAlign: 'center',
                textDecoration: 'none',
                borderRadius: '10px',
                border: '1px solid rgba(99,102,241,0.12)',
                color: '#6366f1',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <FileText style={{ display: 'inline', width: '14px', height: '14px', marginRight: '4px' }} />
              View Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackerSetupGuide;
