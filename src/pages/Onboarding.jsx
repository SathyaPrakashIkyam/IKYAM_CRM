import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/endpoints'
import { setCurrentCompanyId } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { IKYAM_LOGO } from '../assets/logo'
import '../styles/onboarding.css'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const [workspace, setWorkspace] = useState({
    workspace_name: '', subdomain: '', region: 'in-1',
    admin_full_name: '', admin_email: '', admin_password: '',
  })
  const [company, setCompany] = useState({
    code: '', name: '', base_currency: 'INR', country: 'IN', fiscal_year_start: 4, erp_company_db: '',
  })

  async function submitWorkspace(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const tokens = await authApi.createWorkspace(workspace)
      login(tokens)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create the workspace')
    } finally {
      setSaving(false)
    }
  }

  async function submitCompany(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await authApi.createCompany(company)
      setCurrentCompanyId(created.id)
      navigate('/users')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create the company')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="onboarding-page">
      {/* Background Glow Mesh */}
      <div className="onboarding-bg-glow">
        <div className="onboarding-glow-1" />
        <div className="onboarding-glow-2" />
        <div className="onboarding-grid-pattern" />
      </div>

      {/* Main Container */}
      <div className="onboarding-card-container">
        {/* Left Hero Panel */}
        <div className="onboarding-hero-panel">
          <div className="onboarding-hero-header">
            <img src={IKYAM_LOGO} alt="Ikyam CRM" style={{ height: 26 }} />
            <span className="onboarding-brand-tag">⚡ Quick Workspace Setup</span>
          </div>

          <div className="onboarding-hero-body">
            <h1 className="onboarding-hero-title">
              Welcome to <span className="gradient-text">Ikyam CRM</span>
            </h1>
            <p className="onboarding-hero-desc">
              Set up your organization, admin credentials, and company structure in under 2 minutes.
            </p>

            <div className="onboarding-steps-list">
              <div className={`onboarding-step-item ${step === 1 ? 'active' : 'completed'}`}>
                <div className="onboarding-step-badge">{step > 1 ? '✓' : '1'}</div>
                <div className="onboarding-step-info">
                  <h4>Workspace &amp; Admin Setup</h4>
                  <p>Configure your workspace subdomain and primary admin account.</p>
                </div>
              </div>

              <div className={`onboarding-step-item ${step === 2 ? 'active' : ''}`}>
                <div className="onboarding-step-badge">2</div>
                <div className="onboarding-step-info">
                  <h4>Company &amp; ERP Profile</h4>
                  <p>Define your primary entity code, currency, and ERP database link.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="onboarding-hero-footer">
            <span className="login-status-dot" />
            <span>Multi-company &amp; SAP B1 ready</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="onboarding-form-panel">
          {/* Progress Step Header */}
          <div className="onboarding-progress-bar">
            <div className={`onboarding-pill-step ${step === 1 ? 'active' : 'completed'}`}>
              <span className="onboarding-pip-num">{step > 1 ? '✓' : '1'}</span>
              <span>Workspace</span>
            </div>
            <div className={`onboarding-step-divider ${step > 1 ? 'active' : ''}`} />
            <div className={`onboarding-pill-step ${step === 2 ? 'active' : ''}`}>
              <span className="onboarding-pip-num">2</span>
              <span>Company details</span>
            </div>
          </div>

          <div className="onboarding-form-header">
            <h2>{step === 1 ? 'Create your workspace' : 'Setup company profile'}</h2>
            <p>{step === 1 ? 'Enter your workspace name and admin details' : 'Configure your primary operating business entity'}</p>
          </div>

          {error && (
            <div className="onboarding-error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form className="onboarding-form" onSubmit={submitWorkspace}>
              <div className="onboarding-form-section-title">Workspace Configuration</div>
              
              <div className="onboarding-field">
                <label className="onboarding-label">Workspace Name</label>
                <div className="onboarding-input-wrapper">
                  <span className="onboarding-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </span>
                  <input
                    required
                    type="text"
                    className="onboarding-input"
                    value={workspace.workspace_name}
                    onChange={(e) => setWorkspace({ ...workspace, workspace_name: e.target.value })}
                    placeholder="e.g. Würfel Küche Group"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Subdomain</label>
                <div className="onboarding-input-wrapper">
                  <span className="onboarding-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  <input
                    required
                    pattern="[a-z0-9-]{3,40}"
                    type="text"
                    className="onboarding-input"
                    value={workspace.subdomain}
                    onChange={(e) => setWorkspace({ ...workspace, subdomain: e.target.value.toLowerCase() })}
                    placeholder="wurfel"
                  />
                </div>
              </div>

              <div className="onboarding-form-section-title" style={{ marginTop: 8 }}>Primary Admin Account</div>

              <div className="onboarding-field">
                <label className="onboarding-label">Full Name</label>
                <div className="onboarding-input-wrapper">
                  <span className="onboarding-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    required
                    type="text"
                    className="onboarding-input"
                    value={workspace.admin_full_name}
                    onChange={(e) => setWorkspace({ ...workspace, admin_full_name: e.target.value })}
                    placeholder="e.g. Prem A."
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Work Email</label>
                <div className="onboarding-input-wrapper">
                  <span className="onboarding-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    required
                    type="email"
                    className="onboarding-input"
                    value={workspace.admin_email}
                    onChange={(e) => setWorkspace({ ...workspace, admin_email: e.target.value })}
                    placeholder="prem@wurfelkueche.com"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Password</label>
                <div className="onboarding-input-wrapper">
                  <span className="onboarding-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    className="onboarding-input"
                    value={workspace.admin_password}
                    onChange={(e) => setWorkspace({ ...workspace, admin_password: e.target.value })}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="onboarding-toggle-pw"
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

              <button type="submit" className="onboarding-submit-btn" disabled={saving}>
                {saving ? (
                  <>
                    <span className="onboarding-spinner" />
                    <span>Creating workspace…</span>
                  </>
                ) : (
                  <>
                    <span>Continue to company details</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="onboarding-form" onSubmit={submitCompany}>
              <div className="onboarding-form-section-title">Primary Business Entity</div>

              <div className="onboarding-grid-2">
                <div className="onboarding-field">
                  <label className="onboarding-label">Company Code</label>
                  <div className="onboarding-input-wrapper">
                    <span className="onboarding-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </span>
                    <input
                      required
                      type="text"
                      className="onboarding-input"
                      value={company.code}
                      onChange={(e) => setCompany({ ...company, code: e.target.value })}
                      placeholder="e.g. WKG"
                    />
                  </div>
                </div>

                <div className="onboarding-field">
                  <label className="onboarding-label">Company Name</label>
                  <div className="onboarding-input-wrapper">
                    <span className="onboarding-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3h6v4H9z" />
                      </svg>
                    </span>
                    <input
                      required
                      type="text"
                      className="onboarding-input"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="Würfel Küche Pvt. Ltd."
                    />
                  </div>
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">SAP B1 Company DB (Optional)</label>
                <div className="onboarding-input-wrapper">
                  <span className="onboarding-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="onboarding-input"
                    value={company.erp_company_db}
                    onChange={(e) => setCompany({ ...company, erp_company_db: e.target.value })}
                    placeholder="e.g. WURFEL_PROD"
                  />
                </div>
              </div>

              <button type="submit" className="onboarding-submit-btn" disabled={saving}>
                {saving ? (
                  <>
                    <span className="onboarding-spinner" />
                    <span>Finalizing setup…</span>
                  </>
                ) : (
                  <>
                    <span>Finish setup → Go to User Management</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="onboarding-form-footer">
            <span>Already have a workspace?</span>
            <Link to="/login" className="onboarding-link">
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
