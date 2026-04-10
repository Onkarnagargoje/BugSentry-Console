import React, { useState, useEffect } from 'react';
import { useUser } from './hooks/useUser';
import { LoginView } from './views/LoginView';
import { RoleSelectionView } from './views/RoleSelectionView';
import { DeveloperDashboard } from './views/DeveloperDashboard';
import { WorkspaceView } from './views/WorkspaceView';
import './index.css';

function App() {
  // Initialize token from localStorage
  const [token, setToken] = useState(() => localStorage.getItem('bugsentry_token'));
  const [activeRole, setActiveRole] = useState(null);
  const { user } = useUser(token);

  // Capture ?token=<jwt> from URL after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('bugsentry_token', urlToken);
      setToken(urlToken);
      // Clean query string from URL without a page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('bugsentry_token');
    setToken(null);
    setActiveRole(null);
  };

  const isLoggedIn = !!token;

  return (
    <>
      {!isLoggedIn ? (
        <LoginView />
      ) : !activeRole ? (
        <RoleSelectionView
          onLogout={handleLogout}
          onRoleSelect={setActiveRole}
          user={user}
        />
      ) : activeRole === 'developer' ? (
        <DeveloperDashboard
          token={token}
          onLogout={handleLogout}
          onBack={() => setActiveRole(null)}
        />
      ) : (
        <WorkspaceView
          role={activeRole}
          onLogout={handleLogout}
          onBack={() => setActiveRole(null)}
        />
      )}
    </>
  );
}

export default App;
