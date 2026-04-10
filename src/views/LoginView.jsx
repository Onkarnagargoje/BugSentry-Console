import React, { useState, useEffect } from 'react';
import { FaGithub, FaGitlab, FaGoogle } from 'react-icons/fa';
import { AUTH_URL, REVIEWS_DATA } from '../utils/constants';

export function LoginView() {
  const [currentReview, setCurrentReview] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReview(prev => (prev + 1) % REVIEWS_DATA.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const activeReview = REVIEWS_DATA[currentReview];

  return (
    <main className="split-layout">
      <div className="bg-glow" />
      <div className="light-spot spot-1" />
      <div className="light-spot spot-2" />

      {/* Left — Auth */}
      <section className="layout-left">
        <nav className="navbar">
          <img src="/logo.png" alt="Bugsentry Logo" className="logo" />
        </nav>

        <div className="auth-container">
          <div className="glass-card">
            <div className="header">
              <h1 className="title">Welcome to Bugsentry</h1>
              <p className="subtitle">AI-powered Software Risk Intelligence</p>
            </div>

            <div className="button-group">
              <a href={`${AUTH_URL}/auth/google/login`} className="auth-btn">
                <span className="btn-icon"><FaGoogle color="#4285F4" /></span>
                Continue with Google
              </a>
              <a href={`${AUTH_URL}/auth/github/login`} className="auth-btn">
                <span className="btn-icon"><FaGithub /></span>
                Continue with GitHub
              </a>
              <a href={`${AUTH_URL}/auth/gitlab/login`} className="auth-btn">
                <span className="btn-icon"><FaGitlab color="#FC6D26" /></span>
                Continue with GitLab
              </a>
            </div>

            <p className="auth-footnote">
              By continuing, you agree to BugSentry's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </section>

      {/* Right — Marketing */}
      <section className="layout-right">
        <div className="review-card">
          <div key={activeReview.id} className="review-content-animate">
            <div className="review-header">
              <div className="review-avatar">
                <div className="avatar-shape" />
                <div className="avatar-shape-secondary" />
              </div>
              <div className="review-meta">
                <h4>{activeReview.name}</h4>
                <span>{activeReview.handle}</span>
              </div>
            </div>
            <div className="review-body">
              <p>{activeReview.text}</p>
            </div>
            <div className="review-footer">
              <span className="emoji">{activeReview.emoji}</span>
              <p>{activeReview.footer}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
