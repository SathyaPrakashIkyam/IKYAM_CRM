import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { onboardingApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import '../styles/ikyam-mock.css'
import '../styles/onboarding.css'

export default function Onboarding() {
  const { auth, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showConfirmApprove, setShowConfirmApprove] = useState(false)
  const [modalState, setModalState] = useState({
    open: false,
    title: '',
    message: '',
    type: 'success',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    onboard_company_id: '',
    company_name: '',
    company_phone_no: '',
    company_street: '',
    company_city: '',
    company_state: '',
    company_zipcode: '',
    company_website: '',
    industry_type: '',
    headoffice_location: '',
    company_gst: '',
    registration_number: '',
    company_logo: '',
    user_name: '',
    email: '',
    user_phone_no: '',
    email_id: '',
    email_pwd: '',
    smtp_server: '',
    smtp_port: '',
    source: '', // no default — the admin must actively pick Standalone or SAP B1
    base_url: '',
    sap_username: '',
    sap_password: '',
    sap_db: '',
    db_type: '',
    schema_id: '',
    is_active: false,
    is_approved: false,
    created_by: auth?.email || auth?.user_name || 'Admin',
    updated_by: auth?.email || auth?.user_name || 'Admin',
  })

  useEffect(() => {
    if (location.state?.record) {
      const rec = location.state.record
      setForm((prev) => ({
        ...prev,
        ...rec,
        onboard_company_id: rec.onboard_company_id || rec.id || '',
        company_name: rec.company_name || '',
        company_phone_no: rec.company_phone_no || '',
        company_street: rec.company_street || '',
        company_city: rec.company_city || '',
        company_state: rec.company_state || '',
        company_zipcode: rec.company_zipcode || '',
        company_website: rec.company_website || '',
        industry_type: rec.industry_type || '',
        headoffice_location: rec.headoffice_location || '',
        company_gst: rec.company_gst || '',
        registration_number: rec.registration_number || '',
        company_logo: rec.company_logo || '',
        user_name: rec.user_name || '',
        email: rec.email || '',
        user_phone_no: rec.user_phone_no || '',
        email_id: rec.email_id || '',
        email_pwd: rec.email_pwd || '',
        smtp_server: rec.smtp_server || '',
        smtp_port: rec.smtp_port || '',
        base_url: rec.base_url || '',
        sap_username: rec.sap_username || '',
        sap_password: rec.sap_password || '',
        sap_db: rec.sap_db || '',
        db_type: rec.db_type || '',
        source: rec.source || 'standalone',
        schema_id: rec.schema_id || '',
        is_active: rec.is_active ?? false,
        is_approved: rec.is_approved ?? false,
      }))
    }
  }, [location.state])

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [showSapPw, setShowSapPw] = useState(false)
  const [showSmtpPw, setShowSmtpPw] = useState(false)

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const isEditMode = Boolean(form.onboard_company_id)
  const needsSapConfig = form.source === 'sap_b1'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.source) {
      setError('Please choose the company\'s Source (Standalone or SAP B1) in section 3 before submitting.')
      return
    }

    setSaving(true)
    try {
      let onboardingId = form.onboard_company_id
      if (isEditMode && onboardingId) {
        await onboardingApi.updateCompanyDetails(onboardingId, form)
      } else {
        const res = await onboardingApi.addCompanyDetails(form)
        onboardingId = res?.onboard_company_id || res?.data?.onboard_company_id || res?.id || onboardingId
      }

      if (logoFile && onboardingId) {
        const formData = new FormData()
        formData.append('file', logoFile)
        try {
          await onboardingApi.addOnboardingLogo(onboardingId, formData)
        } catch (logoErr) {
          console.error('Failed to upload company logo:', logoErr)
        }
      }

      setSuccess(
        isEditMode
          ? 'Onboarding details & logo updated successfully!'
          : 'Onboarding company details & logo submitted successfully!'
      )
      setTimeout(() => {
        if (isSuperAdmin) {
          navigate('/onboarding-list')
        } else {
          navigate('/login')
        }
      }, 500)
    } catch (err) {
      console.error('Failed to submit onboarding:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Could not save company onboarding details'
      setError(errMsg)
    } finally {
      setSaving(false)
    }
  }

  async function executeApprove() {
    const onboardingId = form.onboard_company_id
    if (!onboardingId) return

    setApproving(true)
    setError('')
    try {
      await onboardingApi.approveCompanyDetails(onboardingId)
      setForm((prev) => ({ ...prev, is_approved: true, is_active: true }))
      setShowConfirmApprove(false)
      setModalState({
        open: true,
        title: 'Approval Successful',
        message: `Company "${form.company_name || onboardingId}" has been successfully approved and activated.`,
        type: 'success',
      })
    } catch (err) {
      console.error('Failed to approve company:', err)
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Approval request failed'
      setShowConfirmApprove(false)
      setModalState({
        open: true,
        title: 'Approval Failed',
        message: typeof msg === 'string' ? msg : JSON.stringify(msg),
        type: 'error',
      })
    } finally {
      setApproving(false)
    }
  }

  const formContent = (
    <div className="ikyam-mock onboarding-card-container full-width">
      <div className="onboarding-form-panel">
        <div className="onboarding-form-header rowx sp">
          <div>
            <h2>
              {isEditMode
                ? `Edit Onboarding: ${form.company_name || form.onboard_company_id}`
                : 'Tenant & Company Onboarding'}
            </h2>
            <p>
              {isEditMode
                ? `Modify company, address, credentials, SAP integration & status for ${form.onboard_company_id}`
                : 'Register company details, office location, admin credentials, and SAP B1 database integration.'}
            </p>
          </div>
          {isEditMode && (
            <div className="rowx" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {form.is_approved ? (
                <span className="chip ok" style={{ fontSize: 13, padding: '5px 12px' }}>
                  ✓ Approved & Active
                </span>
              ) : isSuperAdmin ? (
                <button
                  type="button"
                  className="btn pri"
                  disabled={approving || saving}
                  style={{
                    background: 'var(--green)',
                    borderColor: 'var(--green)',
                    color: '#fff',
                    padding: '5px 14px',
                    fontSize: 12.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => setShowConfirmApprove(true)}
                >
                  {approving ? (
                    <>
                      <span
                        className="onboarding-spinner"
                        style={{
                          width: 12,
                          height: 12,
                          border: '2px solid rgba(255,255,255,0.35)',
                          borderTopColor: '#ffffff',
                          borderRadius: '50%',
                          display: 'inline-block',
                        }}
                      />
                      <span>Approving…</span>
                    </>
                  ) : (
                    '✓ Approve Company'
                  )}
                </button>
              ) : (
                <span className="chip warn" style={{ fontSize: 13, padding: '5px 12px' }}>
                  Pending Approval
                </span>
              )}
              <span className="chip brand" style={{ fontSize: 13, padding: '5px 12px' }}>
                Editing #{form.onboard_company_id}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="onboarding-error-banner" style={{ marginBottom: 16 }}>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="chip ok" style={{ display: 'block', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            ✓ {success}
          </div>
        )}

        <form className="onboarding-form" onSubmit={handleSubmit}>
          {/* SECTION 1: COMPANY PROFILE */}
          <div className="onboarding-section-card">
            <div className="onboarding-section-title">🏢 1. Company Profile</div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Company Name *</label>
                <div className="onboarding-input-wrapper">
                  <input
                    required
                    type="text"
                    className="onboarding-input"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Würfel Küche Pvt. Ltd."
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Company Phone No *</label>
                <div className="onboarding-input-wrapper">
                  <input
                    required
                    type="text"
                    maxLength={10}
                    className="onboarding-input"
                    value={form.company_phone_no}
                    onChange={(e) =>
                      setForm({ ...form, company_phone_no: e.target.value.replace(/\D/g, '').slice(0, 10) })
                    }
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Industry Type</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.industry_type}
                    onChange={(e) => setForm({ ...form, industry_type: e.target.value })}
                    placeholder="IT / Manufacturing / Retail"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Company Website</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.company_website}
                    onChange={(e) => setForm({ ...form, company_website: e.target.value })}
                    placeholder="https://company.com"
                  />
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">GST Number</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.company_gst}
                    onChange={(e) => setForm({ ...form, company_gst: e.target.value })}
                    placeholder="29AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Registration Number</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.registration_number}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                    placeholder="REG-1092837"
                  />
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Company Logo</label>
                <div className="onboarding-input-wrapper" style={{ padding: '6px 12px', height: 44, display: 'flex', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    style={{ fontSize: 12.5, width: '100%' }}
                  />
                </div>
              </div>

              {(logoPreview || form.company_logo) ? (
                <div className="onboarding-field">
                  <label className="onboarding-label">Logo Preview</label>
                  <div className="rowx" style={{ gap: 10, alignItems: 'center' }}>
                    <img
                      src={logoPreview || form.company_logo}
                      alt="Company Logo"
                      style={{ height: 40, maxWidth: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', padding: 2 }}
                    />
                    <span className="tiny mut">Image ready</span>
                  </div>
                </div>
              ) : (
                <div className="onboarding-field">
                  <label className="onboarding-label">Logo Status</label>
                  <span className="tiny mut" style={{ paddingTop: 10, display: 'block' }}>No logo file selected</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: LOCATION & ADDRESS */}
          <div className="onboarding-section-card" style={{ marginTop: 20 }}>
            <div className="onboarding-section-title">📍 2. Location &amp; Address</div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Street Address *</label>
                <div className="onboarding-input-wrapper">
                  <input
                    required
                    type="text"
                    className="onboarding-input"
                    value={form.company_street}
                    onChange={(e) => setForm({ ...form, company_street: e.target.value })}
                    placeholder="123 Industrial Park Road"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Head Office Location</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.headoffice_location}
                    onChange={(e) => setForm({ ...form, headoffice_location: e.target.value })}
                    placeholder="HQ Campus"
                  />
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">City *</label>
                <div className="onboarding-input-wrapper">
                  <input
                    required
                    type="text"
                    className="onboarding-input"
                    value={form.company_city}
                    onChange={(e) => setForm({ ...form, company_city: e.target.value })}
                    placeholder="Bengaluru"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">State *</label>
                <div className="onboarding-input-wrapper">
                  <input
                    required
                    type="text"
                    className="onboarding-input"
                    value={form.company_state}
                    onChange={(e) => setForm({ ...form, company_state: e.target.value })}
                    placeholder="Karnataka"
                  />
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Zipcode *</label>
                <div className="onboarding-input-wrapper">
                  <input
                    required
                    type="text"
                    className="onboarding-input"
                    value={form.company_zipcode}
                    onChange={(e) => setForm({ ...form, company_zipcode: e.target.value })}
                    placeholder="560001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADMIN & SAP B1 INTEGRATION */}
          <div className="onboarding-section-card" style={{ marginTop: 20 }}>
            <div className="onboarding-section-title">👤 3. Admin Credentials &amp; SAP B1 Config</div>

            <div className="onboarding-field" style={{ marginBottom: 18 }}>
              <label className="onboarding-label">Source</label>
              <div className="onboarding-source-toggle">
                <button
                  type="button"
                  className={form.source === 'standalone' ? 'active' : ''}
                  onClick={() => setForm({ ...form, source: 'standalone' })}
                >
                  Standalone
                </button>
                <button
                  type="button"
                  className={form.source === 'sap_b1' ? 'active' : ''}
                  onClick={() => setForm({ ...form, source: 'sap_b1' })}
                >
                  SAP B1
                </button>
              </div>
              <div className="onboarding-hint" style={!form.source ? { color: 'var(--orange-ink)' } : undefined}>
                {form.source === 'sap_b1'
                  ? 'This company is SAP B1-integrated — every quote it creates is automatically queued for ERP sync.'
                  : form.source === 'standalone'
                  ? 'This company is CRM-only — quotes stay standalone, no SAP connection needed.'
                  : 'Required — pick how this company will use the CRM before continuing.'}
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Admin User Name</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.user_name}
                    onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                    placeholder="Super Admin"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Admin Email</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="email"
                    className="onboarding-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="admin@company.com"
                  />
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">User Phone No</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    maxLength={10}
                    className="onboarding-input"
                    value={form.user_phone_no}
                    onChange={(e) =>
                      setForm({ ...form, user_phone_no: e.target.value.replace(/\D/g, '').slice(0, 10) })
                    }
                    placeholder="9876543210"
                  />
                </div>
              </div>
              {needsSapConfig && (
                <div className="onboarding-field">
                  <label className="onboarding-label">Base URL</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      className="onboarding-input"
                      value={form.base_url}
                      onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                      placeholder="https://ikyam.in:50000/b1s/v2"
                    />
                  </div>
                </div>
              )}
            </div>

            {needsSapConfig && (
              <>
                <div className="onboarding-grid-2">
                  <div className="onboarding-field">
                    <label className="onboarding-label">SAP DB Name</label>
                    <div className="onboarding-input-wrapper">
                      <input
                        type="text"
                        className="onboarding-input"
                        value={form.sap_db}
                        onChange={(e) => setForm({ ...form, sap_db: e.target.value })}
                        placeholder="PRODUCTION"
                      />
                    </div>
                  </div>

                  <div className="onboarding-field">
                    <label className="onboarding-label">DB Type</label>
                    <div className="onboarding-input-wrapper">
                      <input
                        type="text"
                        className="onboarding-input"
                        value={form.db_type}
                        onChange={(e) => setForm({ ...form, db_type: e.target.value })}
                        placeholder="HANA / MSSQL"
                      />
                    </div>
                  </div>
                </div>

                <div className="onboarding-grid-2">
                  <div className="onboarding-field">
                    <label className="onboarding-label">SAP Username</label>
                    <div className="onboarding-input-wrapper">
                      <input
                        type="text"
                        className="onboarding-input"
                        value={form.sap_username}
                        onChange={(e) => setForm({ ...form, sap_username: e.target.value })}
                        placeholder="manager"
                      />
                    </div>
                  </div>

                  <div className="onboarding-field">
                    <label className="onboarding-label">SAP Password</label>
                    <div className="onboarding-input-wrapper">
                      <input
                        type={showSapPw ? 'text' : 'password'}
                        className="onboarding-input"
                        style={{ paddingRight: 38 }}
                        value={form.sap_password}
                        onChange={(e) => setForm({ ...form, sap_password: e.target.value })}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="onboarding-toggle-pw"
                        onClick={() => setShowSapPw((v) => !v)}
                        title={showSapPw ? 'Hide password' : 'Show password'}
                      >
                        {showSapPw ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SECTION 4: SMTP CONFIG */}
          <div className="onboarding-section-card" style={{ marginTop: 20 }}>
            <div className="onboarding-section-title">✉️ 4. SMTP &amp; Email Server Config</div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">SMTP Email ID</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="email"
                    className="onboarding-input"
                    value={form.email_id}
                    onChange={(e) => setForm({ ...form, email_id: e.target.value })}
                    placeholder="prod.admin@ikyam.com"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">SMTP Password</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type={showSmtpPw ? 'text' : 'password'}
                    className="onboarding-input"
                    style={{ paddingRight: 38 }}
                    value={form.email_pwd}
                    onChange={(e) => setForm({ ...form, email_pwd: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="onboarding-toggle-pw"
                    onClick={() => setShowSmtpPw((v) => !v)}
                    title={showSmtpPw ? 'Hide password' : 'Show password'}
                  >
                    {showSmtpPw ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">SMTP Server Host</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.smtp_server}
                    onChange={(e) => setForm({ ...form, smtp_server: e.target.value })}
                    placeholder="smtp.office365.com"
                  />
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">SMTP Port</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.smtp_port}
                    onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: ACCOUNT STATUS & TENANT SETTINGS */}
          {/* <div className="onboarding-section-card" style={{ marginTop: 20 }}>
            <div className="onboarding-section-title">⚙️ 5. Status &amp; Schema Settings</div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Active Status</label>
                <div className="onboarding-input-wrapper">
                  <select
                    className="onboarding-input"
                    value={form.is_active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                    style={{ background: 'transparent' }}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Approval Status</label>
                <div className="onboarding-input-wrapper">
                  <select
                    className="onboarding-input"
                    value={form.is_approved ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, is_approved: e.target.value === 'true' })}
                    style={{ background: 'transparent' }}
                  >
                    <option value="true">Approved</option>
                    <option value="false">Pending Approval</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="onboarding-grid-2">
              <div className="onboarding-field">
                <label className="onboarding-label">Schema ID</label>
                <div className="onboarding-input-wrapper">
                  <input
                    type="text"
                    className="onboarding-input"
                    value={form.schema_id}
                    onChange={(e) => setForm({ ...form, schema_id: e.target.value })}
                    placeholder="ik_crm_b1"
                  />
                </div>
              </div>

              {form.onboard_company_id && (
                <div className="onboarding-field">
                  <label className="onboarding-label">Onboarding ID</label>
                  <div className="onboarding-input-wrapper" style={{ opacity: 0.7 }}>
                    <input
                      readOnly
                      type="text"
                      className="onboarding-input"
                      value={form.onboard_company_id}
                    />
                  </div>
                </div>
              )}
            </div>
          </div> */}

          <div className="rowx sp" style={{ marginTop: 24, gap: 10, flexWrap: 'wrap' }}>
            {isSuperAdmin && (
              <button
                type="button"
                className="btn ghost"
                disabled={saving || approving}
                onClick={() => navigate('/onboarding-list')}
              >
                ← Back to List
              </button>
            )}
            <div className="rowx" style={{ marginLeft: 'auto', gap: 10 }}>
              {isEditMode && isSuperAdmin && !form.is_approved && (
                <button
                  type="button"
                  className="btn pri"
                  disabled={saving || approving}
                  style={{
                    background: 'var(--green)',
                    borderColor: 'var(--green)',
                    color: '#fff',
                    padding: '12px 22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => setShowConfirmApprove(true)}
                >
                  {approving ? (
                    <>
                      <span
                        className="onboarding-spinner"
                        style={{
                          width: 14,
                          height: 14,
                          border: '2px solid rgba(255,255,255,0.35)',
                          borderTopColor: '#ffffff',
                          borderRadius: '50%',
                        }}
                      />
                      <span>Approving Company…</span>
                    </>
                  ) : (
                    '✓ Approve Company'
                  )}
                </button>
              )}
              <button
                type="submit"
                className="onboarding-submit-btn"
                disabled={saving || approving}
                style={{ padding: '12px 28px' }}
              >
                {saving ? (
                  <>
                    <span className="onboarding-spinner" />
                    <span>{isEditMode ? 'Updating details…' : 'Submitting details…'}</span>
                  </>
                ) : (
                  <span>{isEditMode ? 'Update Onboarding Details ✓' : 'Submit Onboarding Details ✓'}</span>
                )}
              </button>
            </div>
          </div>

          {!auth && (
            <div className="onboarding-form-footer">
              <span>Already have a workspace?</span>
              <Link to="/login" className="onboarding-link">
                Sign in →
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  )

  const modals = (
    <>
      {/* Full-Screen Loading Overlay when saving */}
      {saving && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--line)',
              borderRadius: 20,
              padding: '28px 36px',
              maxWidth: 440,
              width: '100%',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lift), 0 24px 64px rgba(0,0,0,0.25)',
              animation: 'onboardingFadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <span
                className="onboarding-spinner"
                style={{
                  width: 34,
                  height: 34,
                  border: '3px solid rgba(0, 114, 206, 0.2)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'inline-block',
                }}
              />
            </div>
            <h3 style={{ font: '700 17px var(--d)', color: 'var(--ink)', margin: '0 0 6px' }}>
              {isEditMode ? 'Updating Onboarding Details…' : 'Submitting Onboarding Details…'}
            </h3>
            <p className="tiny mut" style={{ margin: 0, lineHeight: 1.5 }}>
              {logoFile
                ? 'Uploading company logo and saving tenant configuration. Please wait…'
                : 'Saving company details and credentials. Please wait…'}
            </p>
          </div>
        </div>
      )}

      {/* Approval Confirmation Warning Dialog */}
      {showConfirmApprove && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => {
            if (!approving) setShowConfirmApprove(false)
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: `1.5px solid ${approving ? 'var(--primary)' : 'var(--amber)'}`,
              borderRadius: 20,
              padding: '28px 32px',
              maxWidth: 480,
              width: '100%',
              boxShadow: 'var(--shadow-lift), 0 24px 64px rgba(0,0,0,0.25)',
              animation: 'onboardingFadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rowx" style={{ gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: approving ? 'var(--primary-soft)' : 'var(--amber-soft)',
                  color: approving ? 'var(--primary)' : 'var(--amber-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {approving ? (
                  <span
                    className="onboarding-spinner"
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid rgba(0, 114, 206, 0.25)',
                      borderTopColor: 'var(--primary)',
                      borderRadius: '50%',
                      display: 'inline-block',
                    }}
                  />
                ) : (
                  '❓'
                )}
              </div>
              <div>
                <h3 style={{ font: '700 17px var(--d)', color: 'var(--ink)', margin: 0 }}>
                  {approving ? 'Approving Company Workspace…' : 'Confirm Company Approval'}
                </h3>
                <span className="tiny mut">
                  {approving ? 'Please wait while workspace setup completes' : 'Action confirmation'}
                </span>
              </div>
            </div>

            <p style={{ font: '400 13.5px var(--b)', color: 'var(--ink)', lineHeight: 1.5, marginBottom: approving ? 16 : 22 }}>
              {approving ? (
                <>
                  Approving company <b style={{ color: 'var(--primary)' }}>"{form.company_name || form.onboard_company_id}"</b>.
                  Setting up tenant database schema and activating workspace access…
                </>
              ) : (
                <>
                  Are you sure you want to approve company{' '}
                  <b style={{ color: 'var(--primary)' }}>
                    "{form.company_name || form.onboard_company_id}"
                  </b>
                  {form.onboard_company_id ? ` (${form.onboard_company_id})` : ''}? This will approve the tenant request and activate company workspace access.
                </>
              )}
            </p>

            {approving && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  marginBottom: 20,
                  borderRadius: 10,
                  background: 'var(--surface2)',
                  border: '1px solid var(--line)',
                  fontSize: 13,
                  color: 'var(--ink)',
                }}
              >
                <span
                  className="onboarding-spinner"
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(0, 114, 206, 0.25)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span>Provisioning workspace & database schema. This may take a few seconds…</span>
              </div>
            )}

            <div className="rowx" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn ghost"
                disabled={approving}
                onClick={() => setShowConfirmApprove(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn pri"
                disabled={approving}
                style={{
                  background: 'var(--green)',
                  borderColor: 'var(--green)',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: approving ? 0.85 : 1,
                  cursor: approving ? 'not-allowed' : 'pointer',
                }}
                onClick={executeApprove}
              >
                {approving ? (
                  <>
                    <span
                      className="onboarding-spinner"
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(255, 255, 255, 0.35)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        display: 'inline-block',
                      }}
                    />
                    <span>Approving…</span>
                  </>
                ) : (
                  '✓ Yes, Approve Company'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Approving Overlay */}
      {approving && !showConfirmApprove && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--line)',
              borderRadius: 20,
              padding: '28px 36px',
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lift), 0 24px 64px rgba(0,0,0,0.25)',
              animation: 'onboardingFadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <span
                className="onboarding-spinner"
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid rgba(0, 114, 206, 0.2)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'inline-block',
                }}
              />
            </div>
            <h3 style={{ font: '700 17px var(--d)', color: 'var(--ink)', margin: '0 0 6px' }}>
              Approving Company Workspace…
            </h3>
            <p className="tiny mut" style={{ margin: 0, lineHeight: 1.5 }}>
              Provisioning database schema and activating company access. Please wait…
            </p>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {modalState.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setModalState((m) => ({ ...m, open: false }))}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: `1.5px solid ${modalState.type === 'error' ? 'rgba(225, 74, 14, 0.4)' : 'var(--green)'}`,
              borderRadius: 20,
              padding: '28px 32px',
              maxWidth: 520,
              width: '100%',
              boxShadow: 'var(--shadow-lift), 0 24px 64px rgba(0,0,0,0.25)',
              animation: 'onboardingFadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rowx" style={{ gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: modalState.type === 'error' ? 'var(--orange-soft)' : 'var(--green-soft)',
                  color: modalState.type === 'error' ? 'var(--orange-ink)' : 'var(--green-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {modalState.type === 'error' ? '⚠️' : '✓'}
              </div>
              <div>
                <h3 style={{ font: '700 17px var(--d)', color: 'var(--ink)', margin: 0 }}>
                  {modalState.title}
                </h3>
                <span className="tiny mut">Notification alert</span>
              </div>
            </div>

            <p style={{ font: '400 13.5px var(--b)', color: 'var(--ink)', lineHeight: 1.5, marginBottom: 22 }}>
              {modalState.message}
            </p>

            <div className="rowx" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setModalState((m) => ({ ...m, open: false }))}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (auth) {
    return (
      <AppShell>
        <div style={{ padding: '10px 0' }}>{formContent}</div>
        {modals}
      </AppShell>
    )
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-bg-glow">
        <div className="onboarding-glow-1" />
        <div className="onboarding-glow-2" />
        <div className="onboarding-grid-pattern" />
      </div>
      {formContent}
      {modals}
    </div>
  )
}
