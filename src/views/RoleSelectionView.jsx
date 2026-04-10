import React from 'react';
import { FaCode, FaBriefcase } from 'react-icons/fa';

export function RoleSelectionView({ onLogout, onRoleSelect, user }) {
  return (
    <main className="dashboard-wrapper">
      <div className="bg-glow" />
      <nav className="navbar" style={{ justifyContent: 'space-between' }}>
        <img src="/logo.png" alt="Bugsentry Logo" className="logo" />
        <button onClick={onLogout} className="logout-btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div className="dashboard-content">
        {user && (
          <div className="role-select-user">
            {user.picture
              ? <img src={user.picture} alt="avatar" className="role-user-avatar-img" />
              : <div className="role-user-avatar-placeholder" />
            }
            <p className="role-user-welcome">Welcome back, <strong>{user.name || user.email}</strong></p>
          </div>
        )}
        <h1 className="dashboard-title">Choose your workspace experience</h1>
        <div className="role-cards-container">
          <div className="role-card" onClick={() => onRoleSelect('developer')}>
            <div className="role-icon"><FaCode /></div>
            <h3>Use as Developer</h3>
            <p>View technical insights, code-level risks, and detailed AI security analysis</p>
          </div>
          <div className="role-card" onClick={() => onRoleSelect('ceo')}>
            <div className="role-icon"><FaBriefcase /></div>
            <h3>Use as CEO</h3>
            <p>View business impact, risk summary, and decision insights</p>
          </div>
        </div>
      </div>
    </main>
  );
}
