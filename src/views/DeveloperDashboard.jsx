import React, { useState, useEffect, useRef } from 'react';
import { FaBriefcase, FaDocker, FaCode, FaShieldAlt, FaBug, FaLightbulb } from 'react-icons/fa';
import {
  FiMenu, FiSearch, FiInbox, FiMessageSquare, FiRefreshCw, FiZap,
  FiFilter, FiStar, FiGitBranch, FiAlertCircle, FiShield, FiX, FiSend, FiChevronDown, FiChevronUp, FiCpu
} from 'react-icons/fi';
import { useUser } from '../hooks/useUser';
import { useRepos } from '../hooks/useRepos';
import { AnalysisBadge } from '../components/AnalysisBadge';
import { RiskGraph, RepositoryRiskChart } from '../components/Charts';
import { ChatMessage, TypingIndicator } from '../components/ChatComponents';
import { SkeletonRepo } from '../components/Skeletons';
import { SYSTEM_URL, LANG_COLORS } from '../utils/constants';

function extractBullets(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('*'))
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .slice(0, 5);
}

function buildFallbackInsights(currentResult) {
  const outputs = currentResult?.agent_outputs || {};
  return {
    architecture_summary: outputs.analyzer?.slice(0, 320) || 'Architecture insights will appear after analysis.',
    directory_hotspots: [],
    probable_failures: extractBullets(outputs.prediction).map((item, index) => ({
      area: `Potential Area ${index + 1}`,
      bug_type: item,
      eta_days: 7 + index * 3,
      impact: 'Medium',
      confidence: 'Medium',
    })),
    fix_plan: extractBullets(outputs.fix).map((item, index) => ({
      title: `Fix Step ${index + 1}`,
      action: item,
      owner: 'Developer',
      priority: index === 0 ? 'High' : 'Medium',
    })),
    final_guidance: outputs.docs?.slice(0, 280) || 'Use Copilot to ask for file-level remediation.',
  };
}

export function DeveloperDashboard({ token, onLogout, onBack }) {
  const { user } = useUser(token);
  const { repos, loading: reposLoading, syncing, refetch } = useRepos(token);

  const [selectedRepo, setSelectedRepo] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [analysisResults, setAnalysisResults] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showAllRepos, setShowAllRepos] = useState(false);

  const chatEndRef = useRef(null);
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const runningIds = Object.entries(analysisStatus)
      .filter(([, s]) => s === 'running')
      .map(([id]) => id);
    if (!runningIds.length) return;

    const interval = setInterval(async () => {
      for (const rid of runningIds) {
        try {
          const r = await fetch(`${SYSTEM_URL}/api/analysis/status/${rid}`, { headers: authHeaders });
          const data = await r.json();
          if (data.status === 'completed') {
            setAnalysisStatus((prev) => ({ ...prev, [rid]: 'completed' }));
            setAnalysisResults((prev) => ({ ...prev, [rid]: data.results || data }));
          } else if (data.status === 'failed') {
            setAnalysisStatus((prev) => ({ ...prev, [rid]: 'failed' }));
          }
        } catch {
          // ignore polling errors
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [analysisStatus, token]); // eslint-disable-line

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const runAnalysis = async (repo) => {
    const repoId = repo.repo_id;
    if (analysisStatus[repoId] === 'running') return;

    setAnalysisStatus((prev) => ({ ...prev, [repoId]: 'running' }));
    try {
      const qs = repo.full_name ? `?full_name=${encodeURIComponent(repo.full_name)}` : '';
      const r = await fetch(`${SYSTEM_URL}/api/analysis/${repoId}${qs}`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!r.ok) throw new Error('analysis-failed');
      const data = await r.json();
      setAnalysisStatus((prev) => ({ ...prev, [repoId]: 'completed' }));
      setAnalysisResults((prev) => ({ ...prev, [repoId]: data.results || data }));
    } catch {
      setAnalysisStatus((prev) => ({ ...prev, [repoId]: 'failed' }));
    }
  };

  const handleRepoSelect = async (repo) => {
    if (selectedRepo?.repo_id === repo.repo_id) return;
    setSelectedRepo(repo);
    setChatHistory([]);

    if (!analysisStatus[repo.repo_id]) {
      try {
        const r = await fetch(`${SYSTEM_URL}/api/analysis/status/${repo.repo_id}`, { headers: authHeaders });
        const data = await r.json();
        if (data.status === 'completed') {
          setAnalysisStatus((prev) => ({ ...prev, [repo.repo_id]: 'completed' }));
          setAnalysisResults((prev) => ({ ...prev, [repo.repo_id]: data.results || data }));
        } else if (data.status === 'running') {
          setAnalysisStatus((prev) => ({ ...prev, [repo.repo_id]: 'running' }));
        } else {
          setAnalysisStatus((prev) => ({ ...prev, [repo.repo_id]: 'not_started' }));
        }
      } catch {
        setAnalysisStatus((prev) => ({ ...prev, [repo.repo_id]: 'not_started' }));
      }
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !selectedRepo || chatLoading) return;
    if (analysisStatus[selectedRepo.repo_id] !== 'completed') return;

    const question = chatInput.trim();
    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);

    try {
      const r = await fetch(`${SYSTEM_URL}/api/analysis/copilot/${selectedRepo.repo_id}`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await r.json();
      if (!r.ok) {
        const detail = data?.detail || `Copilot failed with status ${r.status}`;
        throw new Error(detail);
      }
      const answer = data.answer || 'No response from AI.';
      setChatHistory((prev) => [...prev, { role: 'bot', text: answer }]);
    } catch (err) {
      const message = err?.message || 'Failed to reach BugSentry Copilot. Please try again.';
      setChatHistory((prev) => [...prev, { role: 'bot', text: `Warning: ${message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.full_name?.toLowerCase().includes(filterText.toLowerCase()) ||
    r.name?.toLowerCase().includes(filterText.toLowerCase())
  );

  const displayedRepos = showAllRepos ? filteredRepos : filteredRepos.slice(0, 6);

  const statusDotClass = (repoId) => {
    const s = analysisStatus[repoId];
    if (s === 'completed') return 'green';
    if (s === 'running') return 'orange';
    if (s === 'failed') return 'red';
    return 'gray';
  };

  const selectedStatus = selectedRepo ? analysisStatus[selectedRepo.repo_id] : null;
  const isAnalyzed = selectedStatus === 'completed';
  const isRunning = selectedStatus === 'running';
  const currentResult = selectedRepo ? analysisResults[selectedRepo.repo_id] : null;
  const insight = currentResult?.structured_insights || buildFallbackInsights(currentResult);
  const repoStructure = currentResult?.repo_context?.repo_structure || {};
  const directoryHotspots = (insight.directory_hotspots || []).slice(0, 6);
  const probableFailures = (insight.probable_failures || []).slice(0, 5);
  const fixPlan = (insight.fix_plan || []).slice(0, 5);
  const structurePreview = (repoStructure.directories || []).slice(0, 12);

  return (
    <div className="dev-dashboard-layout">
      <div className="bg-glow" />
      <div className="light-spot spot-1" />
      <div className="light-spot spot-2" />

      <header className="dev-topbar">
        <div className="dev-topbar-left">
          <button className="icon-btn"><FiMenu /></button>
          <img src="/logo.png" alt="Bugsentry Logo" className="dev-logo" />
          <span className="dev-topbar-title">{selectedRepo ? selectedRepo.full_name : 'Dashboard'}</span>
        </div>

        <div className="dev-topbar-center">
          <div className="dev-search-bar">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Type / to search" />
          </div>
        </div>

        <div className="dev-topbar-right">
          <button className="icon-btn" onClick={onBack} title="Switch Role">
            <FaBriefcase style={{ fontSize: '14px' }} />
          </button>
          <button className="icon-btn" onClick={refetch} title="Sync repositories">
            <FiRefreshCw className={syncing ? 'spin' : ''} />
          </button>
          <button className="icon-btn"><FiInbox /></button>
          {user?.picture ? <img src={user.picture} alt="avatar" className="dev-user-avatar-img" /> : <div className="dev-user-avatar" />}
          <button onClick={onLogout} className="logout-btn-small">Sign Out</button>
        </div>
      </header>

      <div className="dev-main-grid">
        <aside className="dev-sidebar-left">
          <div className="dev-dropdown">
            {user?.picture ? <img src={user.picture} alt="avatar" className="dev-user-avatar-img small" /> : <div className="dev-user-avatar small" />}
            <span>{user?.name || user?.email || '...'}</span>
            <span className="dropdown-arrow">v</span>
          </div>

          <div className="dev-section-header">
            <h4>Your repositories</h4>
            {syncing && <span className="sync-label">Syncing...</span>}
          </div>

          <input
            type="text"
            className="dev-input-filter"
            placeholder="Find a repository..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />

          <div className="expanded-sidebar-content">
            <ul className="dev-repo-list expanded">
              {reposLoading
                ? Array(6).fill(0).map((_, i) => <SkeletonRepo key={i} />)
                : displayedRepos.length === 0
                  ? <li className="no-repos-msg">{repos.length === 0 ? 'Syncing your GitHub repos...' : 'No repos match filter.'}</li>
                  : displayedRepos.map((repo) => (
                      <li
                        key={repo.repo_id}
                        className={`repo-list-item ${selectedRepo?.repo_id === repo.repo_id ? 'selected' : ''}`}
                        onClick={() => handleRepoSelect(repo)}
                      >
                        <span className={`status-dot ${statusDotClass(repo.repo_id)}`} />
                        <span className="repo-name" title={repo.full_name}>{repo.full_name || repo.name}</span>
                        <AnalysisBadge status={analysisStatus[repo.repo_id]} />
                      </li>
                    ))}
            </ul>

            {filteredRepos.length > 6 && (
              <button className="btn-see-more" onClick={() => setShowAllRepos(!showAllRepos)}>
                {showAllRepos ? <><FiChevronUp /> See Less</> : <><FiChevronDown /> See More ({filteredRepos.length - 6} more)</>}
              </button>
            )}

            <hr className="sidebar-divider" />

            <h4 className="sidebar-subhead">Quick Actions</h4>
            <ul className="sidebar-list">
              <li
                onClick={() => selectedRepo && runAnalysis(selectedRepo)}
                className={!selectedRepo || isRunning ? 'disabled' : ''}
                title={selectedRepo ? 'Run AI security scan' : 'Select a repo first'}
              >
                <FiCpu className="sidebar-icon" />
                <span>Run AI Scan</span>
              </li>
              <li><FiAlertCircle className="sidebar-icon" /><span>View Issues</span></li>
              <li><FaDocker className="sidebar-icon" /><span>Dockerfile Audit</span></li>
            </ul>

            <hr className="sidebar-divider" />
            <h4 className="sidebar-subhead">Repo count</h4>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 0' }}>{repos.length} repositories loaded</p>
          </div>
        </aside>

        <main className="dev-center-feed">
          {!selectedRepo && (
            <>
              <h2 className="feed-title">Home</h2>
              <div className="dev-ai-box chatbot-disabled">
                <textarea placeholder="Select a repository from the sidebar to start analysis and chat with BugSentry Copilot" disabled />
                <div className="ai-box-toolbar">
                  <div className="toolbar-left">
                    <button className="btn-outline" disabled><FiMessageSquare /> Ask</button>
                  </div>
                  <div className="toolbar-right">
                    <span className="ai-model-selector">BugSentry Copilot</span>
                    <button className="btn-send" disabled><FiSend /></button>
                  </div>
                </div>
              </div>
              <RepositoryRiskChart />
              <div className="dev-feed-header">
                <h3>Feed & Analytics</h3>
                <button className="btn-outline"><FiFilter /> Filter</button>
              </div>
              <RiskGraph />
            </>
          )}

          {selectedRepo && (
            <>
              <div className="repo-detail-header">
                <div>
                  <h2 className="feed-title" style={{ marginBottom: 6 }}>
                    <a href={selectedRepo.html_url} target="_blank" rel="noreferrer" style={{ color: '#58A6FF', textDecoration: 'none' }}>
                      {selectedRepo.full_name}
                    </a>
                  </h2>
                  <p className="repo-detail-desc">{selectedRepo.description || 'No description provided.'}</p>
                </div>
                <AnalysisBadge status={selectedStatus} />
              </div>

              <div className="repo-meta-row">
                {selectedRepo.language && (
                  <span className="repo-meta-tag">
                    <span className="lang-dot" style={{ background: LANG_COLORS[selectedRepo.language] || '#888' }} />
                    {selectedRepo.language}
                  </span>
                )}
                {selectedRepo.stargazers_count > 0 && <span className="repo-meta-tag"><FiStar /> {selectedRepo.stargazers_count}</span>}
                {selectedRepo.forks_count > 0 && <span className="repo-meta-tag"><FiGitBranch /> {selectedRepo.forks_count}</span>}
                <span className="repo-meta-tag">{selectedRepo.private ? 'Private' : 'Public'}</span>
              </div>

              <div className="agent-action-bar">
                <div>
                  <h3>Agent Control Center</h3>
                  <p>Run full 7-agent scan to generate directory risks, bug timeline, and practical solution guide.</p>
                </div>
                <button className="btn-scan" onClick={() => runAnalysis(selectedRepo)} disabled={isRunning}>
                  <FiZap /> {isRunning ? 'Agents Running...' : 'Run 7 Agents'}
                </button>
              </div>

              {isRunning && (
                <div className="scan-running-card">
                  <div className="scan-spinner" />
                  <div>
                    <h3>Analysis In Progress</h3>
                    <p>7 AI agents are scanning your repository. This may take 30-90 seconds...</p>
                  </div>
                </div>
              )}

              {selectedStatus === 'failed' && (
                <div className="scan-failed-card">
                  <FiAlertCircle size={24} color="#f85149" />
                  <div>
                    <h3>Analysis Failed</h3>
                    <p>Something went wrong during analysis. Please try again.</p>
                  </div>
                  <button className="btn-scan" onClick={() => runAnalysis(selectedRepo)}>Retry</button>
                </div>
              )}

              {isAnalyzed && currentResult && (
                <div className="analysis-summary-view animate-fade-in">
                  <div className="summary-strip">
                    <div className="summary-chip"><strong>{repoStructure.total_files || 0}</strong><span>Files Scanned</span></div>
                    <div className="summary-chip"><strong>{repoStructure.total_directories || 0}</strong><span>Directories</span></div>
                    <div className="summary-chip"><strong>{probableFailures.length}</strong><span>Likely Failure Points</span></div>
                    <div className="summary-chip"><strong>{fixPlan.length}</strong><span>Actionable Fixes</span></div>
                  </div>

                  <div className="analysis-grid">
                    <div className="summary-card">
                      <div className="card-header"><FaShieldAlt className="header-icon" /><h3>Architecture Snapshot</h3></div>
                      <div className="card-body">
                        <p className="summary-p">{insight.architecture_summary}</p>
                        <p className="mini-note">{insight.final_guidance}</p>
                      </div>
                    </div>

                    <div className="summary-card">
                      <div className="card-header"><FaCode className="header-icon" /><h3>Directory Overview</h3></div>
                      <div className="directory-list">
                        {structurePreview.length === 0 && <p className="mini-note">Directory scan unavailable for this run.</p>}
                        {structurePreview.map((path) => <div key={path} className="directory-item">{path}</div>)}
                      </div>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="card-header"><FaBug className="header-icon" /><h3>Where Bugs Can Appear (ETA + Impact)</h3></div>
                    <div className="timeline-list">
                      {probableFailures.length === 0 && <p className="mini-note">No structured failure timeline available yet. Re-run scan or ask Copilot for file-level bugs.</p>}
                      {probableFailures.map((row, idx) => (
                        <div key={`${row.area}-${idx}`} className="timeline-item-card">
                          <div className="timeline-head">
                            <strong>{row.area || `Area ${idx + 1}`}</strong>
                            <span>{row.eta_days ? `${row.eta_days} days` : 'Unknown ETA'}</span>
                          </div>
                          <p>{row.bug_type}</p>
                          <div className="timeline-meta">
                            <span>Impact: {row.impact || 'Medium'}</span>
                            <span>Confidence: {row.confidence || 'Medium'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {directoryHotspots.length > 0 && (
                    <div className="summary-card">
                      <div className="card-header"><FiAlertCircle className="header-icon" /><h3>High-Risk Directories</h3></div>
                      <div className="hotspot-grid">
                        {directoryHotspots.map((spot, idx) => (
                          <div key={`${spot.path}-${idx}`} className="hotspot-card">
                            <h4>{spot.path}</h4>
                            <p>{spot.risk_reason}</p>
                            <span>{spot.severity || 'Medium'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="summary-card">
                    <div className="card-header"><FaLightbulb className="header-icon" /><h3>Solution Guide (Action Plan)</h3></div>
                    <div className="fix-plan-list">
                      {fixPlan.length === 0 && <p className="mini-note">Fix plan unavailable in current run. Ask Copilot: Give patch-ready fixes by file path.</p>}
                      {fixPlan.map((fix, idx) => (
                        <div key={`${fix.title}-${idx}`} className="fix-plan-item">
                          <div>
                            <h4>{fix.title || `Fix ${idx + 1}`}</h4>
                            <p>{fix.action}</p>
                          </div>
                          <div className="fix-meta">
                            <span>{fix.priority || 'Medium'}</span>
                            <span>{fix.owner || 'Developer'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className={`copilot-section ${(!isAnalyzed && !isRunning) ? 'copilot-locked' : ''}`}>
                <div className="copilot-header">
                  <FiZap className="copilot-zap" />
                  <h3>BugSentry Copilot</h3>
                  {!isAnalyzed && (
                    <span className="copilot-lock-hint">{isRunning ? 'Available after scan completes' : 'Run analysis first to enable chat'}</span>
                  )}
                </div>

                {chatHistory.length > 0 && (
                  <div className="chat-history">
                    {chatHistory.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
                    {chatLoading && <TypingIndicator />}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <div className={`dev-ai-box copilot-input-box ${!isAnalyzed ? 'chatbot-disabled' : ''}`}>
                  <textarea
                    placeholder={
                      isAnalyzed
                        ? `Ask about ${selectedRepo.name} e.g. What are the main security risks?`
                        : isRunning
                          ? 'Waiting for scan to complete...'
                          : 'Run analysis first to enable BugSentry Copilot...'
                    }
                    disabled={!isAnalyzed || chatLoading}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    rows={3}
                  />
                  <div className="ai-box-toolbar">
                    <div className="toolbar-left">
                      <span className="ai-model-selector">BugSentry Copilot - {selectedRepo.name}</span>
                    </div>
                    <div className="toolbar-right">
                      {chatHistory.length > 0 && (
                        <button className="btn-outline small" onClick={() => setChatHistory([])} title="Clear chat">
                          <FiX /> Clear
                        </button>
                      )}
                      <button className="btn-send" onClick={sendChat} disabled={!isAnalyzed || chatLoading || !chatInput.trim()} title="Send message (Enter)">
                        <FiSend />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
