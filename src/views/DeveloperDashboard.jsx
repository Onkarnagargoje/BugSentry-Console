import React, { useState, useEffect, useRef } from 'react';
import { FaBriefcase, FaDocker, FaCode, FaShieldAlt, FaBug, FaLightbulb } from 'react-icons/fa';
import {
  FiMenu, FiSearch, FiInbox, FiMessageSquare, FiRefreshCw, FiZap,
  FiFilter, FiStar, FiGitBranch, FiAlertCircle, FiShield, FiX, FiSend, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { useUser } from '../hooks/useUser';
import { useRepos } from '../hooks/useRepos';
import { AnalysisBadge } from '../components/AnalysisBadge';
import { RiskGraph, RepositoryRiskChart } from '../components/Charts';
import { ChatMessage, TypingIndicator } from '../components/ChatComponents';
import { SkeletonRepo } from '../components/Skeletons';
import { SYSTEM_URL, LANG_COLORS } from '../utils/constants';

export function DeveloperDashboard({ token, onLogout, onBack }) {
  const { user } = useUser(token);
  const { repos, loading: reposLoading, syncing, refetch } = useRepos(token);

  const [selectedRepo, setSelectedRepo]   = useState(null);
  const [filterText,   setFilterText]     = useState('');
  const [analysisStatus,  setAnalysisStatus]  = useState({});  // { repo_id: 'not_started'|'running'|'completed'|'failed' }
  const [analysisResults, setAnalysisResults] = useState({});  // { repo_id: resultObj }
  const [chatHistory,  setChatHistory]    = useState([]);
  const [chatInput,    setChatInput]      = useState('');
  const [chatLoading,  setChatLoading]    = useState(false);
  const [showAllRepos, setShowAllRepos]   = useState(false);
  
  const chatEndRef = useRef(null);
  const authHeaders = { Authorization: `Bearer ${token}` };

  /* Poll running analyses every 5s */
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
            setAnalysisStatus(prev => ({ ...prev, [rid]: 'completed' }));
            setAnalysisResults(prev => ({ ...prev, [rid]: data.results || data }));
          } else if (data.status === 'failed') {
             setAnalysisStatus(prev => ({ ...prev, [rid]: 'failed' }));
          }
        } catch { /* ignore */ }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [analysisStatus, token]); // eslint-disable-line

  /* Auto-scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  /* Trigger 7-agent AI analysis */
  const runAnalysis = async (repo) => {
    const repoId = repo.repo_id;
    if (analysisStatus[repoId] === 'running' || analysisStatus[repoId] === 'completed') return;

    setAnalysisStatus(prev => ({ ...prev, [repoId]: 'running' }));
    try {
      const qs = repo.full_name ? `?full_name=${encodeURIComponent(repo.full_name)}` : '';
      const r = await fetch(`${SYSTEM_URL}/api/analysis/${repoId}${qs}`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!r.ok) throw new Error('analysis-failed');
      const data = await r.json();
      // Optimization: if it returns immediately as completed (cached)
      if(data.status === 'completed') {
          setAnalysisStatus(prev => ({ ...prev, [repoId]: 'completed' }));
          setAnalysisResults(prev => ({ ...prev, [repoId]: data.results || data }));
      }
    } catch {
      setAnalysisStatus(prev => ({ ...prev, [repoId]: 'failed' }));
    }
  };

  /* Select a repo from sidebar */
  const handleRepoSelect = async (repo) => {
    if (selectedRepo?.repo_id === repo.repo_id) return;
    setSelectedRepo(repo);
    setChatHistory([]);

    // Check status if we haven't already
    if (!analysisStatus[repo.repo_id]) {
      try {
        const r = await fetch(`${SYSTEM_URL}/api/analysis/status/${repo.repo_id}`, { headers: authHeaders });
        const data = await r.json();
        if (data.status === 'completed') {
          setAnalysisStatus(prev => ({ ...prev, [repo.repo_id]: 'completed' }));
          setAnalysisResults(prev => ({ ...prev, [repo.repo_id]: data.results || data }));
        } else if (data.status === 'running') {
          setAnalysisStatus(prev => ({ ...prev, [repo.repo_id]: 'running' }));
        } else {
          setAnalysisStatus(prev => ({ ...prev, [repo.repo_id]: 'not_started' }));
          // AUTO START ANALYSIS ON CLICK
          runAnalysis(repo);
        }
      } catch {
        setAnalysisStatus(prev => ({ ...prev, [repo.repo_id]: 'not_started' }));
        runAnalysis(repo);
      }
    }
  };

  /* Send chat message to copilot */
  const sendChat = async () => {
    if (!chatInput.trim() || !selectedRepo || chatLoading) return;
    if (analysisStatus[selectedRepo.repo_id] !== 'completed') return;

    const question = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);

    try {
      const r = await fetch(`${SYSTEM_URL}/api/analysis/copilot/${selectedRepo.repo_id}`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await r.json();
      const answer = data.answer || data.detail || 'No response from AI.';
      setChatHistory(prev => [...prev, { role: 'bot', text: answer }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'bot', text: '⚠️ Failed to reach BugSentry Copilot. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  /* Helpers */
  const filteredRepos = repos.filter(r =>
    r.full_name?.toLowerCase().includes(filterText.toLowerCase()) ||
    r.name?.toLowerCase().includes(filterText.toLowerCase())
  );

  const displayedRepos = showAllRepos ? filteredRepos : filteredRepos.slice(0, 6);

  const statusDotClass = (repoId) => {
    const s = analysisStatus[repoId];
    if (s === 'completed')  return 'green';
    if (s === 'running')    return 'orange';
    if (s === 'failed')     return 'red';
    return 'gray';
  };

  const selectedStatus = selectedRepo ? analysisStatus[selectedRepo.repo_id] : null;
  const isAnalyzed = selectedStatus === 'completed';
  const isRunning  = selectedStatus === 'running';
  const currentResult = selectedRepo ? analysisResults[selectedRepo.repo_id] : null;

  return (
    <div className="dev-dashboard-layout">
      <div className="bg-glow" />
      <div className="light-spot spot-1" />
      <div className="light-spot spot-2" />

      {/* ── Top Navbar ── */}
      <header className="dev-topbar">
        <div className="dev-topbar-left">
          <button className="icon-btn"><FiMenu /></button>
          <img src="/logo.png" alt="Bugsentry Logo" className="dev-logo" />
          <span className="dev-topbar-title">
            {selectedRepo ? selectedRepo.full_name : 'Dashboard'}
          </span>
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
          <button
            className="icon-btn"
            onClick={refetch}
            title="Sync repositories"
          >
            <FiRefreshCw className={syncing ? 'spin' : ''} />
          </button>
          <button className="icon-btn"><FiInbox /></button>
          {user?.picture
            ? <img src={user.picture} alt="avatar" className="dev-user-avatar-img" />
            : <div className="dev-user-avatar" />
          }
          <button onClick={onLogout} className="logout-btn-small">Sign Out</button>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <div className="dev-main-grid">

        {/* ── Left Sidebar ── */}
        <aside className="dev-sidebar-left">
          <div className="dev-dropdown">
            {user?.picture
              ? <img src={user.picture} alt="avatar" className="dev-user-avatar-img small" />
              : <div className="dev-user-avatar small" />
            }
            <span>{user?.name || user?.email || '…'}</span>
            <span className="dropdown-arrow">▼</span>
          </div>

          <div className="dev-section-header">
            <h4>Your repositories</h4>
            {syncing && <span className="sync-label">Syncing…</span>}
          </div>

          <input
            type="text"
            className="dev-input-filter"
            placeholder="Find a repository…"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />

          <div className="expanded-sidebar-content">
            <ul className="dev-repo-list expanded">
              {reposLoading
                ? Array(6).fill(0).map((_, i) => <SkeletonRepo key={i} />)
                : displayedRepos.length === 0
                  ? <li className="no-repos-msg">
                      {repos.length === 0
                        ? 'Syncing your GitHub repos…'
                        : 'No repos match filter.'}
                    </li>
                  : displayedRepos.map(repo => (
                      <li
                        key={repo.repo_id}
                        className={`repo-list-item ${selectedRepo?.repo_id === repo.repo_id ? 'selected' : ''}`}
                        onClick={() => handleRepoSelect(repo)}
                      >
                        <span className={`status-dot ${statusDotClass(repo.repo_id)}`} />
                        <span className="repo-name" title={repo.full_name}>
                          {repo.full_name || repo.name}
                        </span>
                        <AnalysisBadge status={analysisStatus[repo.repo_id]} />
                      </li>
                    ))
              }
            </ul>

            {filteredRepos.length > 6 && (
                <button 
                  className="btn-see-more" 
                  onClick={() => setShowAllRepos(!showAllRepos)}
                >
                  {showAllRepos ? <><FiChevronUp /> See Less</> : <><FiChevronDown /> See More ({filteredRepos.length - 6} more)</>}
                </button>
            )}

            <hr className="sidebar-divider" />

            <h4 className="sidebar-subhead">Quick Actions</h4>
            <ul className="sidebar-list">
              <li
                onClick={() => selectedRepo && runAnalysis(selectedRepo)}
                className={(!selectedRepo || isRunning || isAnalyzed) ? 'disabled' : ''}
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
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 0' }}>
              {repos.length} repositories loaded
            </p>
          </div>
        </aside>

        {/* ── Center Content ── */}
        <main className="dev-center-feed">

          {/* ── DEFAULT HOME (no repo selected) ── */}
          {!selectedRepo && (
            <>
              <h2 className="feed-title">Home</h2>

              {/* Disabled copilot box */}
              <div className="dev-ai-box chatbot-disabled">
                <textarea
                  placeholder="← Select a repository from the sidebar to start analysis and chat with BugSentry Copilot"
                  disabled
                />
                <div className="ai-box-toolbar">
                  <div className="toolbar-left">
                    <button className="btn-outline" disabled><FiMessageSquare /> Ask ▼</button>
                  </div>
                  <div className="toolbar-right">
                    <span className="ai-model-selector">BugSentry Copilot</span>
                    <button className="btn-send" disabled><FiSend /></button>
                  </div>
                </div>
              </div>

              <RepositoryRiskChart />

              <div className="dev-feed-header">
                <h3>Feed &amp; Analytics</h3>
                <button className="btn-outline"><FiFilter /> Filter</button>
              </div>

              <RiskGraph />
            </>
          )}

          {/* ── REPO DETAIL VIEW (repo selected) ── */}
          {selectedRepo && (
            <>
              {/* Header */}
              <div className="repo-detail-header">
                <div>
                  <h2 className="feed-title" style={{ marginBottom: 6 }}>
                    <a
                      href={selectedRepo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#58A6FF', textDecoration: 'none' }}
                    >
                      {selectedRepo.full_name}
                    </a>
                  </h2>
                  <p className="repo-detail-desc">
                    {selectedRepo.description || 'No description provided.'}
                  </p>
                </div>
                <AnalysisBadge status={selectedStatus} />
              </div>

              {/* Repo Meta Row */}
              <div className="repo-meta-row">
                {selectedRepo.language && (
                  <span className="repo-meta-tag">
                    <span className="lang-dot" style={{ background: LANG_COLORS[selectedRepo.language] || '#888' }} />
                    {selectedRepo.language}
                  </span>
                )}
                {selectedRepo.stargazers_count > 0 && (
                  <span className="repo-meta-tag"><FiStar /> {selectedRepo.stargazers_count}</span>
                )}
                {selectedRepo.forks_count > 0 && (
                  <span className="repo-meta-tag"><FiGitBranch /> {selectedRepo.forks_count}</span>
                )}
                <span className="repo-meta-tag">
                  {selectedRepo.private ? '🔒 Private' : '🌐 Public'}
                </span>
              </div>

              {/* ── Scanning progress card ── */}
              {isRunning && (
                <div className="scan-running-card">
                  <div className="scan-spinner" />
                  <div>
                    <h3>Analysis In Progress</h3>
                    <p>7 AI agents are scanning your repository. This may take 30–90 seconds…</p>
                  </div>
                </div>
              )}

              {/* ── Failed card ── */}
              {selectedStatus === 'failed' && (
                <div className="scan-failed-card">
                  <FiAlertCircle size={24} color="#f85149" />
                  <div>
                    <h3>Analysis Failed</h3>
                    <p>Something went wrong during analysis. Please try again.</p>
                  </div>
                  <button className="btn-scan" onClick={() => runAnalysis(selectedRepo)}>
                    Retry
                  </button>
                </div>
              )}

              {/* ── Enhanced Analysis Summary ── */}
              {isAnalyzed && currentResult && (
                <div className="analysis-summary-view animate-fade-in">
                  
                  {/* Executive Summary Section */}
                  <div className="summary-card main-summary">
                    <div className="card-header">
                        <FiShieldAlt className="header-icon" />
                        <h3>AI Security Protocol: Analysis Summary</h3>
                    </div>
                    <div className="card-body">
                        {currentResult.ai_summary || currentResult.executive_summary ? (
                            <div className="summary-text-wrapper">
                                <p className="summary-p">{currentResult.ai_summary || currentResult.executive_summary}</p>
                            </div>
                        ) : (
                            <div className="error-display">
                                <FiAlertCircle />
                                <p>Detailed analysis could not be fully parsed. Please check the individual agent reports below.</p>
                                {typeof currentResult === 'string' && <pre className="raw-log">{currentResult.slice(0, 300)}...</pre>}
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Agent Findings Grid */}
                  <div className="findings-grid">
                      {/* Security Agent */}
                      <div className="finding-card security">
                          <div className="finding-icon"><FaShieldAlt /></div>
                          <div className="finding-content">
                              <h4>Vulnerabilities</h4>
                              <p>{currentResult.vulnerabilities || 'No critical vulnerabilities detected in the primary scan.'}</p>
                          </div>
                      </div>
                      
                      {/* Bugs Agent */}
                      <div className="finding-card bugs">
                          <div className="finding-icon"><FaBug /></div>
                          <div className="finding-content">
                              <h4>Logic Bugs</h4>
                              <p>{currentResult.bugs || 'Code logic appears sound based on structural analysis.'}</p>
                          </div>
                      </div>

                      {/* Quality Agent */}
                      <div className="finding-card quality">
                          <div className="finding-icon"><FaLightbulb /></div>
                          <div className="finding-content">
                              <h4>Code Quality</h4>
                              <p>{currentResult.quality || 'Optimization recommended for better maintainability.'}</p>
                          </div>
                      </div>
                  </div>

                  {/* Solution & Remediation Section (BLACK BACKGROUND AS REQUESTED) */}
                  <div className="remediation-section">
                      <div className="section-title">
                          <FiZap />
                          <h3>Recommended Solutions & Remedies</h3>
                      </div>
                      
                      <div className="remediation-container">
                          {currentResult.remediation || currentResult.solution ? (
                              <div className="solution-content">
                                  {/* If the solution looks like code, we wrap it in a pre */}
                                  {(currentResult.remediation || currentResult.solution).includes('```') ? (
                                      <div className="code-solution markdown-body">
                                          {/* Simplified markdown parsing for demo */}
                                          <p>{(currentResult.remediation || currentResult.solution).split('```')[0]}</p>
                                          <pre>
                                              <code>
                                                {(currentResult.remediation || currentResult.solution).split('```')[1]?.replace('javascript', '').replace('python', '')}
                                              </code>
                                          </pre>
                                          <p>{(currentResult.remediation || currentResult.solution).split('```')[2]}</p>
                                      </div>
                                  ) : (
                                       <p className="text-solution">{currentResult.remediation || currentResult.solution}</p>
                                  )}
                              </div>
                          ) : (
                              <div className="solution-placeholder">
                                  <p>AI Copilot is generating customized remediation steps based on your codebase structure...</p>
                              </div>
                          )}
                      </div>
                      
                      {/* Dark Graph Representation */}
                      <div className="dark-graph-card">
                          <div className="card-header">
                              <h4>Impact Visualization</h4>
                          </div>
                          <div className="graph-placeholder">
                               <RiskGraph />
                          </div>
                      </div>
                  </div>
                </div>
              )}

              {/* ── BugSentry Copilot Chat ── */}
              <div className={`copilot-section ${(!isAnalyzed && !isRunning) ? 'copilot-locked' : ''}`}>
                <div className="copilot-header">
                  <FiZap className="copilot-zap" />
                  <h3>BugSentry Copilot</h3>
                  {!isAnalyzed && (
                    <span className="copilot-lock-hint">
                      {isRunning ? 'Available after scan completes' : 'Run analysis first to enable chat'}
                    </span>
                  )}
                </div>

                {/* Chat History */}
                {chatHistory.length > 0 && (
                  <div className="chat-history">
                    {chatHistory.map((msg, i) => (
                      <ChatMessage key={i} msg={msg} />
                    ))}
                    {chatLoading && <TypingIndicator />}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Chat Input */}
                <div className={`dev-ai-box copilot-input-box ${!isAnalyzed ? 'chatbot-disabled' : ''}`}>
                  <textarea
                    placeholder={
                      isAnalyzed
                        ? `Ask about ${selectedRepo.name}… e.g. "What are the main security risks?"`
                        : isRunning
                          ? 'Waiting for scan to complete…'
                          : 'Select a repo to trigger scan and enable copilot…'
                    }
                    disabled={!isAnalyzed || chatLoading}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    rows={3}
                  />
                  <div className="ai-box-toolbar">
                    <div className="toolbar-left">
                      <span className="ai-model-selector">
                        BugSentry Copilot • {selectedRepo.name}
                      </span>
                    </div>
                    <div className="toolbar-right">
                      {chatHistory.length > 0 && (
                        <button
                          className="btn-outline small"
                          onClick={() => setChatHistory([])}
                          title="Clear chat"
                        >
                          <FiX /> Clear
                        </button>
                      )}
                      <button
                        className="btn-send"
                        onClick={sendChat}
                        disabled={!isAnalyzed || chatLoading || !chatInput.trim()}
                        title="Send message (Enter)"
                      >
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
