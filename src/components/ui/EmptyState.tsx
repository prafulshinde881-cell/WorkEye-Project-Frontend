import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title = 'No items', description = '', primaryAction, icon }) => {
  return (
    <div style={{ padding: 36, textAlign: 'center', borderRadius: 12, boxShadow: '0 6px 18px rgba(2,6,23,0.04)', background: '#f8fafc' }}>
      <div style={{ fontSize: 48, color: '#c7d2fe', marginBottom: 12 }}>{icon || '⚪'}</div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
      {description && <p style={{ marginTop: 8, color: '#64748b' }}>{description}</p>}
      {primaryAction && (
        <div style={{ marginTop: 16 }}>
          <button onClick={primaryAction.onClick} style={{ padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(145deg,#6366f1,#7c3aed)', color: 'white', border: 0, cursor: 'pointer' }}>{primaryAction.label}</button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
