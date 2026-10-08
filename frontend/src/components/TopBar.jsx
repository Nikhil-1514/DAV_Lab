import React from 'react';
import { Database, RefreshCw } from 'lucide-react';

export default function TopBar({ title, activeVersion, versions, onSelectVersion, onRefresh }) {
  return (
    <header className="top-bar" id="app-topbar">
      <h1 className="top-bar-title">{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="version-badge">
          <Database size={14} />
          <span>Version:</span>
          <select
            id="version-select-dropdown"
            className="select-field"
            style={{ padding: '2px 8px', fontSize: '0.78rem', background: 'transparent', border: 'none', fontWeight: 600, color: 'var(--primary)' }}
            value={activeVersion?.version_id || 'v0_original'}
            onChange={(e) => onSelectVersion(e.target.value)}
          >
            {versions.map((v) => (
              <option key={v.version_id} value={v.version_id}>
                {v.name} ({v.processed_rows} rows)
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-outline" onClick={onRefresh} title="Refresh dataset metrics" style={{ padding: '6px 12px' }}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}
