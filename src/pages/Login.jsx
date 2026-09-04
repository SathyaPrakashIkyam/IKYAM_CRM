import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import ikyamLogo from '../assets/ikyam-relatepro-logo.png'
import loginBg from '../assets/loginbg2.png'
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
    return localStorage.getItem('ikyam_theme') || 'light'
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
    <div className="ikyam-mock login-page" style={{ backgroundImage: `url("${loginBg}")` }}>
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



      {/* Main Glass Split Card Container */}
      <div className="login-card-container">
        {/* Left Side: Hero Showcase Section */}
        <div className="login-hero-panel">
          {/* Main Ikyam RelatePro Logo Image */}
          <div className="login-hero-brand">
            <img src={ikyamLogo} alt="Ikyam RelatePro" className="login-logo-img" />
          </div>

          <div className="login-hero-body">
            <h1 className="login-welcome-title">Welcome!</h1>
            <div className="login-title-line" />

            <p className="login-hero-desc">
              Manage deals &amp; scale revenue with Ikyam CRM — AI-powered sales pipeline platform designed for high-performing teams.
            </p>

            {/* Learn More button with Play circle icon matching mockup */}
            <button type="button" className="login-learn-more-btn" onClick={() => navigate('/onboarding')}>
              <span className="play-icon-circle">
                <svg width="10" height="12" viewBox="0 0 10 12" fill="#0C4B56">
                  <path d="M1 1.5L9 6L1 10.5V1.5Z" />
                </svg>
              </span>
              <span>Learn More</span>
            </button>

            {/* 3D Glass Growth Pipeline Graphic matching mockup */}
            <div className="login-chart-graphic" aria-hidden="true">
              <div className="chart-bar bar-1" />
              <div className="chart-bar bar-2" />
              <div className="chart-bar bar-3" />
              <div className="chart-bar bar-4" />
              <svg className="chart-trend-svg" viewBox="0 0 240 140" fill="none">
                <path d="M 10 120 Q 70 100 130 60 T 210 20" stroke="url(#trend-grad)" strokeWidth="4" strokeLinecap="round" filter="drop-shadow(0 0 8px #FF8A2A)" />
                <circle cx="210" cy="20" r="6" fill="#FF8A2A" filter="drop-shadow(0 0 10px #FF8A2A)" />
                <defs>
                  <linearGradient id="trend-grad" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1C658C" />
                    <stop offset="50%" stopColor="#00C9A7" />
                    <stop offset="100%" stopColor="#FF9F2A" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Bottom Security Badge matching mockup */}
          <div className="login-hero-footer">
            <div className="login-shield-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Enterprise Encrypted &amp; Live Synced</span>
              <span className="pill-green-dot" />
            </div>
          </div>
        </div>

        {/* Right Side: Glassmorphism Sign-in Form */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2 className="login-signin-title">
              Sign <span className="title-underline">in</span>
            </h2>
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
              <label className="login-label">User Name</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  required
                  type="email"
                  className="login-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="TechTree / name@company.com"
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
                  <span>Sign in</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Social Icons Row with Divider matching mockup */}
          <div className="login-social-divider">
            <span className="divider-line" />
            <span className="divider-text">or continue with</span>
            <span className="divider-line" />
          </div>

          <div className="login-social-row">
            <button type="button" className="login-social-btn" title="Sign in with Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
            <button type="button" className="login-social-btn" title="Sign in with Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </button>
            <button type="button" className="login-social-btn" title="Sign in with LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-1.37.7-2.18 1.71-2.18 1.03 0 1.54.77 1.54 2.18v4.93h2.8M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            </button>
          </div>

          <div className="login-form-footer">
            <span>Don't have a workspace?</span>
            <Link to="/onboarding" className="login-link">
              Create workspace →
            </Link>
          </div>
        </div>
      </div>

      {/* Floor reflection effect under card matching mockup */}
      <div className="login-card-reflection" aria-hidden="true" />
    </div>
  )
}


