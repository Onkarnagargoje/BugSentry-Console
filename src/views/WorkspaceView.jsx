import React from 'react';
import { FaBriefcase } from 'react-icons/fa';

export function WorkspaceView({ role, onLogout, onBack }) {
  return (
    <main className="dashboard-wrapper">
      <div className="bg-glow" />
      <nav className="navbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img src="/logo.png" alt="Bugsentry Logo" className="logo" />
          <button
            className="auth-btn"
            onClick={onBack}
            style={{ height: '36px', padding: '0 16px', borderRadius: '8px', background: 'transparent', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            ← Switch Role
          </button>
        </div>
        <button
          onClick={onLogout}
          className="logout-btn"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', fontSize: '13px' }}
        >
          Sign Out
        </button>
      </nav>

      <div className="workspace-content animate-zoom-in">
        <div className="workspace-icon" style={{ color: '#9b51e0' }}>
          <FaBriefcase size={64} />
        </div>
        <h1 className="workspace-title">CEO Executive Dashboard</h1>
        <p className="workspace-subtitle">
          Aggregated organization risk posture, deployment velocity metrics, and compliance analytics.
        </p>
        <button className="hologram-btn">Initialize Workspace</button>
      </div>
    </main>
  );
}
