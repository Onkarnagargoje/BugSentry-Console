import React from 'react';

export function AnalysisBadge({ status }) {
  if (!status || status === 'not_started') return null;
  const map = {
    completed:   { label: 'Scanned',     cls: 'badge-green'  },
    running:     { label: 'Scanning…',   cls: 'badge-orange' },
    failed:      { label: 'Failed',      cls: 'badge-red'    },
  };
  const { label, cls } = map[status] || {};
  if (!label) return null;
  return <span className={`analysis-badge ${cls}`}>{label}</span>;
}
