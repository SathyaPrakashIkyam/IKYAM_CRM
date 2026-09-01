import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import ikyamLogo from '../assets/ikyam-relatepro-logo.png'
import '../styles/ikyam-mock.css'
import '../styles/login.css'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ikyam_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ikyam_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const tokens = await authApi.login(form)
      console.log(tokens)
      login(tokens)
      const roleStr = (tokens?.role || '').toUpperCase()
      if (roleStr === 'SUPER_ADMIN' || roleStr === 'SUPER ADMIN') {
        navigate('/onboarding-list')
      } else if (roleStr === 'COMPANY_ADMIN' || roleStr === 'COMPANY ADMIN') {
        navigate('/users')
      } else {
        navigate('/today')
      }
    } catch (err) {
      console.error('Login error:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Incorrect email or password'
      setError(errMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ikyam-mock login-page">
      {/* Top right theme toggle */}
      <button
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Light mode</span>
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>Dark mode</span>
          </>
        )}
      </button>

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
            <img src={ikyamLogo} alt="Ikyam RelatePro" style={{ height: 28 }} />
            <span className="login-brand-tag">⚡ Next-Gen Intelligence</span>
          </div>

          <div className="login-hero-body">
            <h1 className="login-hero-title">
              Manage deals &amp; scale revenue with <span className="gradient-text">Ikyam CRM</span>
            </h1>
            <p className="login-hero-desc">
              AI-powered sales pipeline platform designed for high-performing teams to convert leads and predict revenue accurately.
            </p>

            <div className="login-metric-pill">
              <span className="pill-dot" />
              <span className="pill-text"><b>+34%</b> Average deal velocity boost</span>
            </div>

            <div className="login-feature-list">
              <div className="login-feature-card">
                <div className="login-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="login-feature-text">
                  <h4>Visual Kanban Pipeline</h4>
                  <p>Drag, drop, and automate deals through stages.</p>
                </div>
              </div>

              <div className="login-feature-card">
                <div className="login-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div className="login-feature-text">
                  <h4>Real-time Sync &amp; AI Forecast</h4>
                  <p>Predict deal health &amp; conversion probability live.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-hero-footer">
            <span className="login-status-dot" />
            <span>Systems operational &amp; enterprise encrypted</span>
          </div>
        </div>

        {/* Right Side: Sign-in Form */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to access your CRM workspace</p>
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
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="login-field">
              <div className="rowx sp">
                <label className="login-label">Password</label>
              </div>
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

            <div className="login-remember-row">
              <label className="login-remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <button type="submit" className="login-submit-btn" disabled={saving}>
              {saving ? (
                <>
                  <span className="login-spinner" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="login-form-footer">
            <span>Don't have a workspace?</span>
            <Link to="/onboarding" className="login-link">
              Create workspace →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


