import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { userMasterApi, rolesApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import '../styles/onboarding.css'

export default function UserForm() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Real roles from Role Management — including any custom roles a company
  // admin has created — so the Security Role picker actually assigns a role
  // that Role Management's permissions apply to, not just 3 hardcoded names.
  const [roles, setRoles] = useState([])
  useEffect(() => {
    rolesApi.list().then(setRoles).catch(() => {})
  }, [])

  const [form, setForm] = useState({
    user_id: `USER_${Math.floor(1000 + Math.random() * 9000)}`,
    user_name: '',
    password: '',
    is_active: true,
    role: '',
    email: '',
    token: '',
    schema_id: auth?.schema_id || 'ik_crmb1_c00002',
    mobile_number: '',
    location: '',
    country: 'India',
    house_number: '',
    street_name: '',
    zipcode: '',
    city: '',
  })

  const [showPw, setShowPw] = useState(false)

  const isEditMode = Boolean(location.state?.record || form.token)

  useEffect(() => {
    if (location.state?.record) {
      const rec = location.state.record
      setForm((prev) => ({
        ...prev,
        ...rec,
        user_id: rec.user_id || prev.user_id,
        user_name: rec.user_name || rec.full_name || '',
        password: rec.password || '',
        is_active: rec.is_active ?? true,
        role: rec.role || 'COMPANY_ADMIN',
        email: rec.email || '',
        token: rec.token || '',
        schema_id: rec.schema_id || auth?.schema_id || 'ik_crmb1_c00002',
        mobile_number: rec.mobile_number || rec.phone || '',
        location: rec.location || '',
        country: rec.country || 'India',
        house_number: rec.house_number || '',
        street_name: rec.street_name || '',
        zipcode: rec.zipcode || '',
        city: rec.city || '',
      }))
    }
  }, [location.state, auth?.schema_id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const payload = {
      user_id: form.user_id,
      user_name: form.user_name,
      password: form.password,
      is_active: form.is_active,
      role: form.role,
      email: form.email,
      token: form.token || '',
      schema_id: form.schema_id || auth?.schema_id || '',
      mobile_number: form.mobile_number || '',
      location: form.location || '',
      token_create_at: new Date().toISOString(),
      country: form.country || '',
      house_number: form.house_number || '',
      street_name: form.street_name || '',
      zipcode: form.zipcode || '',
      city: form.city || '',
    }

    try {
      if (isEditMode && form.user_id) {
        await userMasterApi.updateUserMaster(form.user_id, payload)
      } else {
        await userMasterApi.addUserMaster(payload)
      }
      setSuccess(
        isEditMode
          ? 'User master updated successfully!'
          : 'User master created successfully!'
      )
      setTimeout(() => {
        navigate('/users')
      }, 1200)
    } catch (err) {
      console.error('Failed to save user master:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Failed to save user master record'
      setError(errMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="ikyam-mock">
      <div className="scr-head rowx sp" style={{ marginBottom: 16 }}>
        <div>
          <h2>{isEditMode ? `Edit User: ${form.user_name || form.email}` : '＋ Add New User Master'}</h2>
          <span className="goal">Configure user credentials, role permissions, schema access &amp; address details.</span>
        </div>
        <div>
          <button type="button" className="btn ghost" onClick={() => navigate('/users')}>
            ← Back to Users
          </button>
        </div>
      </div>

      <div className="onboarding-card-container full-width">
        <div className="onboarding-form-panel" style={{ padding: '28px 32px' }}>

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
            {/* SECTION 1: CREDENTIALS & ROLE */}
            <div className="onboarding-section-card">
              <div className="onboarding-section-title">👤 1. Credentials &amp; Role Permissions</div>

              <div className="onboarding-grid-2">
               

                <div className="onboarding-field">
                  <label className="onboarding-label">User Name *</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      required
                      type="text"
                      className="onboarding-input"
                      value={form.user_name}
                      onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                      placeholder="User"
                    />
                  </div>
                </div>

                <div className="onboarding-field">
                  <label className="onboarding-label">Security Role *</label>
                  <div className="onboarding-input-wrapper">
                    <select
                      className="onboarding-input"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      style={{ background: 'transparent' }}
                    >
                      <option value="">Select a role…</option>
                      {roles.map((r) => (
                        // "Company Admin" keeps the legacy COMPANY_ADMIN value — every
                        // admin-detection check elsewhere in the app (isCompanyAdmin,
                        // backend _require_admin) matches that exact string.
                        <option key={r.id} value={r.name === 'Company Admin' ? 'COMPANY_ADMIN' : r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="onboarding-grid-2">
                <div className="onboarding-field">
                  <label className="onboarding-label">
                    Email Address * {isEditMode && <span className="tiny mut">(Locked)</span>}
                  </label>
                  <div className="onboarding-input-wrapper">
                    <input
                      required
                      disabled={isEditMode}
                      type="email"
                      className="onboarding-input"
                      style={isEditMode ? { opacity: 0.65, cursor: 'not-allowed', background: 'var(--surface2)' } : {}}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="demo@ikyam.com"
                    />
                  </div>
                </div>

                {!isEditMode && (
                <div className="onboarding-field">
                  <label className="onboarding-label">
                    Password * {isEditMode && <span className="tiny mut">(Locked)</span>}
                  </label>
                  <div className="onboarding-input-wrapper">
                    <input
                      required={!isEditMode}
                      disabled={isEditMode}
                      type={showPw ? 'text' : 'password'}
                      className="onboarding-input"
                      style={
                        isEditMode
                          ? { opacity: 0.65, cursor: 'not-allowed', background: 'var(--surface2)', paddingRight: 38 }
                          : { paddingRight: 38 }
                      }
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="onboarding-toggle-pw"
                      onClick={() => setShowPw((v) => !v)}
                      title={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? (
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
                )}
              </div>

             
            </div>

            {/* SECTION 2: CONTACT DETAILS */}
            <div className="onboarding-section-card" style={{ marginTop: 20 }}>
              <div className="onboarding-section-title">📞 2. Contact &amp; Location Info</div>

              <div className="onboarding-grid-2">
                <div className="onboarding-field">
                  <label className="onboarding-label">Mobile Number</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      maxLength={10}
                      className="onboarding-input"
                      value={form.mobile_number}
                      onChange={(e) =>
                        setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div className="onboarding-field">
                  <label className="onboarding-label">Location / Landmark</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      className="onboarding-input"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="New Friends Colony"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: ADDRESS & STATUS */}
            <div className="onboarding-section-card" style={{ marginTop: 20 }}>
              <div className="onboarding-section-title">📍 3. Address &amp; Account Status</div>

              <div className="onboarding-grid-2">
                <div className="onboarding-field">
                  <label className="onboarding-label">City</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      className="onboarding-input"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Bangalore"
                    />
                  </div>
                </div>

                <div className="onboarding-field">
                  <label className="onboarding-label">Country</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      className="onboarding-input"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="India"
                    />
                  </div>
                </div>
              </div>

              <div className="onboarding-grid-2">
                <div className="onboarding-field">
                  <label className="onboarding-label">House Number</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      className="onboarding-input"
                      value={form.house_number}
                      onChange={(e) => setForm({ ...form, house_number: e.target.value })}
                      placeholder="No. 42"
                    />
                  </div>
                </div>

                <div className="onboarding-field">
                  <label className="onboarding-label">Street Name</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      className="onboarding-input"
                      value={form.street_name}
                      onChange={(e) => setForm({ ...form, street_name: e.target.value })}
                      placeholder="MG Road"
                    />
                  </div>
                </div>
              </div>

              <div className="onboarding-grid-2">
                <div className="onboarding-field">
                  <label className="onboarding-label">Zipcode</label>
                  <div className="onboarding-input-wrapper">
                    <input
                      type="text"
                      className="onboarding-input"
                      value={form.zipcode}
                      onChange={(e) => setForm({ ...form, zipcode: e.target.value })}
                      placeholder="560093"
                    />
                  </div>
                </div>

                
              </div>
            </div>

            <div className="rowx sp" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate('/users')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="onboarding-submit-btn"
                disabled={saving}
                style={{ padding: '12px 28px', display: 'inline-flex' }}
              >
                {saving ? (
                  <>
                    <span className="onboarding-spinner" />
                    <span>Saving user details…</span>
                  </>
                ) : (
                  <span>{isEditMode ? 'Update User Master ✓' : 'Save User Master ✓'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </AppShell>
  )
}
