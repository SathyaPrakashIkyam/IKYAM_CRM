import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { passwordApi } from '../api/endpoints'
import ikyamLogo from '../assets/ikyam-relatepro-logo.png'
import loginBg from '../assets/loginbg2.png'
import '../styles/ikyam-mock.css'
import '../styles/login.css'

export default function SetPassword() {
  const [searchParams] = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  
  const [step, setStep] = useState(initialEmail ? 2 : 1) // 1: Enter email, 2: Enter OTP & New Password, 3: Success
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  
  const navigate = useNavigate()

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ikyam_theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ikyam_theme', theme)
  }, [theme])

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Request OTP (Step 1)
  async function handleSendOtp(e) {
    if (e) e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your registered email address')
      return
    }
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const res = await passwordApi.forgotPassword(email.trim())
      setSuccessMsg(res.message || 'OTP has been sent to your registered email.')
      setStep(2)
      setResendTimer(60)
    } catch (err) {
      console.error('Send OTP error:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Failed to send OTP. Please try again.'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  // Submit Password Change with OTP (Step 2)
  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP sent to your email')
      return
    }
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }
    if (newPassword.length < 8 || newPassword.length > 20) {
      setError('Password must be between 8 and 20 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await passwordApi.changePasswordWithOtp(
        email.trim(),
        otp.trim(),
        newPassword,
        confirmPassword
      )
      if (res.status === 'success') {
        setStep(3)
        setSuccessMsg(res.message || 'Password changed successfully!')
      } else {
        setError(res.message || 'Failed to change password.')
      }
    } catch (err) {
      console.error('Change password error:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Invalid or expired OTP. Please try again.'
      setError(errMsg)
    } finally {
      setLoading(false)
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

      {/* Main Container */}
      <div className="login-card-container">
        {/* Left Side: Hero Panel */}
        <div className="login-hero-panel">
          <div className="login-hero-brand">
            <img src={ikyamLogo} alt="Ikyam RelatePro" className="login-logo-img" />
          </div>

          <div className="login-hero-body">
            <h1 className="login-welcome-title">Security First</h1>
            <div className="login-title-line" />

            <p className="login-hero-desc">
              Protect your account with enterprise-grade authentication and secure OTP verification.
            </p>

            <div className="login-chart-graphic" aria-hidden="true" style={{ marginTop: '20px' }}>
              <div className="chart-bar bar-1" />
              <div className="chart-bar bar-2" />
              <div className="chart-bar bar-3" />
              <div className="chart-bar bar-4" />
            </div>
          </div>

          <div className="login-hero-footer">
            <div className="login-shield-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Encrypted OTP Protection</span>
              <span className="pill-green-dot" />
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="login-form-panel">
          <div className="login-form-header">
            <h2 className="login-signin-title">
              {step === 3 ? (
                <>Success<span className="title-underline">!</span></>
              ) : step === 2 ? (
                <>Set <span className="title-underline">Password</span></>
              ) : (
                <>Reset <span className="title-underline">Password</span></>
              )}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #718096)', marginTop: '4px' }}>
              {step === 1 && 'Enter your registered email to receive a verification OTP.'}
              {step === 2 && 'Enter the OTP sent to your email and choose a new password.'}
              {step === 3 && 'Your password has been successfully updated.'}
            </p>
          </div>

          {error && (
            <div className="login-error-banner" style={{ marginBottom: '16px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && step !== 3 && (
            <div
              style={{
                backgroundColor: 'rgba(72, 187, 120, 0.15)',
                border: '1px solid rgba(72, 187, 120, 0.4)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#276749',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form className="login-form" onSubmit={handleSendOtp}>
              <div className="login-field">
                <label className="login-label">Registered Email Address</label>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading} style={{ marginTop: '20px' }}>
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    <span>Sending OTP…</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link to="/login" className="login-link" style={{ fontSize: '13px' }}>
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 2 && (
            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="login-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="login-label">Email</label>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); setSuccessMsg('') }}
                    style={{ background: 'none', border: 'none', color: '#3182ce', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                  >
                    Change Email
                  </button>
                </div>
                <div className="login-input-wrapper" style={{ opacity: 0.8 }}>
                  <span className="login-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    className="login-input"
                    value={email}
                    disabled
                  />
                </div>
              </div>

              <div className="login-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="login-label">6-Digit OTP</label>
                  <button
                    type="button"
                    disabled={resendTimer > 0 || loading}
                    onClick={handleSendOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: resendTimer > 0 ? '#a0aec0' : '#3182ce',
                      fontSize: '12px',
                      cursor: resendTimer > 0 ? 'default' : 'pointer',
                      padding: 0,
                    }}
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                  </button>
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
                    type="text"
                    maxLength={6}
                    className="login-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    style={{ letterSpacing: '4px', fontWeight: 'bold' }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">New Password</label>
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="login-toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Confirm New Password</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="login-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="login-toggle-pw"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading} style={{ marginTop: '20px' }}>
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    <span>Updating Password…</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link to="/login" className="login-link" style={{ fontSize: '13px' }}>
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(72, 187, 120, 0.15)',
                  color: '#38a169',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main, #2d3748)', marginBottom: '8px' }}>
                Password Updated!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted, #718096)', marginBottom: '24px' }}>
                Your password has been changed successfully. You can now sign in with your new credentials.
              </p>

              <button
                type="button"
                className="login-submit-btn"
                onClick={() => navigate('/login')}
              >
                <span>Go to Sign In</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="login-card-reflection" aria-hidden="true" />
    </div>
  )
}
