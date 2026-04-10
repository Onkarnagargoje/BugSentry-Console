import { useState, useEffect, useCallback } from 'react';
import { SYSTEM_URL } from '../utils/constants';

/** Fetches real GitHub repos from bugsentry-system */
export function useRepos(token) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchRepos = useCallback(async (doSync = false) => {
    if (!token) return;

    // Optionally sync to DB first (also fetches live from GitHub)
    if (doSync) {
      setSyncing(true);
      try {
        await fetch(`${SYSTEM_URL}/api/github/sync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore sync errors */ }
      setSyncing(false);
    }

    // Fetch live repos directly from GitHub via the system service
    setLoading(true);
    try {
      const r = await fetch(`${SYSTEM_URL}/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('repos-live');
      const data = await r.json();
      // Normalize raw GitHub API fields
      const normalized = (data.repos || []).map(repo => ({
        repo_id: String(repo.repo_id || repo.id),
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        language: repo.language || null,
        stargazers_count: repo.stargazers_count || 0,
        forks_count: repo.forks_count || 0,
        private: repo.private || false,
        html_url: repo.html_url || repo.url || '',
        updated_at: repo.updated_at || '',
      }));
      setRepos(normalized);
    } catch {
      // Fallback: try list-saved from DB
      try {
        const r = await fetch(`${SYSTEM_URL}/api/github/list-saved`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        const normalized = (data.repos || []).map(repo => ({
          repo_id: String(repo.repo_id || repo.id || Math.random()),
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description || '',
          language: repo.language || null,
          stargazers_count: repo.stargazers_count || 0,
          forks_count: repo.forks_count || 0,
          private: repo.private || false,
          html_url: repo.html_url || repo.url || '',
          updated_at: repo.updated_at || '',
        }));
        setRepos(normalized);
      } catch { /* both failed */ }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRepos(true); // sync + fetch on mount
  }, [fetchRepos]);

  return { repos, loading, syncing, refetch: () => fetchRepos(true) };
}
