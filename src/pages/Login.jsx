import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { IKYAM_LOGO } from '../assets/logo'
import '../styles/login.css'

export default function Login() {
  const [form, setForm] = useState({ subdomain: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const tokens = await authApi.login(form)
      login(tokens)
      navigate('/today')
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect email or password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login-page">
      {/* Ambient background glow & grid pattern */}
      <div className="login-bg-glow">
        <div className="login-glow-1" />
        <div className="login-glow-2" />
        <div className="login-grid-pattern" />
      </div>

      {/* Main Login Card Container */}
      <div className="login-card-container">
        {/* Left Side: Brand & Feature Showcase */}
        <div className="login-hero-panel">
          <div className="login-hero-header">
            <img src={IKYAM_LOGO} alt="Ikyam CRM" style={{ height: 26 }} />
            <span className="login-brand-tag">✨ AI-Powered CRM</span>
          </div>

          <div className="login-hero-body">
            <h1 className="login-hero-title">
              Manage deals & grow sales with <span className="gradient-text">Ikyam CRM</span>
            </h1>
            <p className="login-hero-desc">
              Next-generation intelligence platform to streamline pipelines, forecast revenue, and manage accounts effortlessly.
            </p>

            <div className="login-feature-list">
              <div className="login-feature-card">
                <div className="login-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="login-feature-text">
                  <h4>Kanban Pipeline Tracking</h4>
                  <p>Drag and drop deals across stages effortlessly.</p>
                </div>
              </div>

              <div className="login-feature-card">
                <div className="login-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div className="login-feature-text">
                  <h4>Real-time Sync & Insights</h4>
                  <p>Automated activity tracking & quarterly dashboards.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-hero-footer">
            <span className="login-status-dot" />
            <span>Systems operational & synced</span>
          </div>
        </div>

        {/* Right Side: Sign-in Form */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Enter your workspace credentials to sign in</p>
          </div>

          {error && (
            <div className="login-error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={submit}>
            <div className="login-field">
              <label className="login-label">Workspace Subdomain</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </span>
                <input
                  required
                  type="text"
                  className="login-input"
                  value={form.subdomain}
                  onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                  placeholder="e.g. wurfel"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">Work Email</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  required
                  type="email"
                  className="login-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="prem@wurfelkueche.com"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={saving}>
              {saving ? (
                <>
                  <span className="login-spinner" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="login-form-footer">
            <span>New workspace?</span>
            <Link to="/onboarding" className="login-link">
              Set one up →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

