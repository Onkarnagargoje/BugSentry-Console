import { useState, useEffect } from 'react';
import { AUTH_URL } from '../utils/constants';

/** Fetches current user from bugsentry-auth using stored JWT */
export function useUser(token) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    setLoading(true);
    fetch(`${AUTH_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error('auth'); return r.json(); })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [token]);

  return { user, loading };
}
