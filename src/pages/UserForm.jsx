import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { userMasterApi, rolesApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import '../styles/UserForm.css'

const COUNTRY_OPTIONS = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: true, label: '🟢 Active' },
  { value: false, label: '🔴 Inactive' },
]

export default function UserForm() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const roleOptions = [
    { value: '', label: 'Select a role…' },
    ...roles.map((r) => ({
      value: r.name === 'Company Admin' ? 'COMPANY_ADMIN' : r.name,
      label: r.name,
    })),
  ]

  return (
    <AppShell>
      <div className="ikyam-mock userform-container">
        {/* Header Bar */}
        <div className="scr-head rowx sp" style={{ marginBottom: 20 }}>
          <div>
            <h2>{isEditMode ? `Edit User: ${form.user_name || form.email}` : '＋ Add New User Master'}</h2>
            <span className="goal">Configure user credentials, role permissions, schema access &amp; address details.</span>
          </div>
          <div>
            <button type="button" className="btn ghost" style={{ borderRadius: 18, padding: '8px 16px' }} onClick={() => navigate('/users')}>
              ← Back to Users
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="userform-card">
          {error && (
            <div className="onboarding-error-banner" style={{ marginBottom: 18, borderRadius: 14 }}>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="chip ok" style={{ display: 'block', padding: '12px 16px', marginBottom: 18, fontSize: 13, borderRadius: 14 }}>
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* SECTION 1: CREDENTIALS & ROLE */}
            <div className="userform-section-card">
              <div className="userform-section-title">
                <span>👤</span> 1. Credentials &amp; Security Role
              </div>

              <div className="userform-grid-2">
                <div className="userform-field">
                  <label className="userform-label">User Name *</label>
                  <div className="userform-input-wrapper">
                    <input
                      required
                      type="text"
                      className="userform-input"
                      value={form.user_name}
                      onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div className="userform-field">
                  <label className="userform-label">Security Role *</label>
                  <div className="userform-input-wrapper">
                    <CustomSelect
                      options={roleOptions}
                      value={form.role}
                      onChange={(val) => setForm({ ...form, role: val })}
                      className="user-form-custom-select"
                      placeholder="Select a role…"
                    />
                  </div>
                </div>
              </div>

              <div className="userform-grid-2">
                <div className="userform-field">
                  <label className="userform-label">
                    Email Address * {isEditMode && <span className="tiny mut">(Locked)</span>}
                  </label>
                  <div className="userform-input-wrapper">
                    <input
                      required
                      disabled={isEditMode}
                      type="email"
                      className="userform-input"
                      style={isEditMode ? { opacity: 0.65, cursor: 'not-allowed', background: 'var(--surface2)' } : {}}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                {!isEditMode ? (
                  <div className="userform-field">
                    <label className="userform-label">Password *</label>
                    <div className="userform-input-wrapper">
                      <input
                        required
                        type={showPw ? 'text' : 'password'}
                        className="userform-input"
                        style={{ paddingRight: 42 }}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="userform-toggle-pw"
                        onClick={() => setShowPw((v) => !v)}
                        title={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? (
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
                ) : (
                  <div className="userform-field">
                    <label className="userform-label">Account Status</label>
                    <div className="userform-input-wrapper">
                      <CustomSelect
                        options={STATUS_OPTIONS}
                        value={form.is_active}
                        onChange={(val) => setForm({ ...form, is_active: val })}
                        className="user-form-custom-select"
                      />
                    </div>
                  </div>
                )}
              </div>

              {!isEditMode && (
                <div className="userform-grid-2">
                  <div className="userform-field">
                    <label className="userform-label">Account Status</label>
                    <div className="userform-input-wrapper">
                      <CustomSelect
                        options={STATUS_OPTIONS}
                        value={form.is_active}
                        onChange={(val) => setForm({ ...form, is_active: val })}
                        className="user-form-custom-select"
                      />
                    </div>
                  </div>
                  <div className="userform-field" />
                </div>
              )}
            </div>

            {/* SECTION 2: CONTACT & LOCATION */}
            <div className="userform-section-card">
              <div className="userform-section-title">
                <span>📞</span> 2. Contact &amp; Landmark Details
              </div>

              <div className="userform-grid-2">
                <div className="userform-field">
                  <label className="userform-label">Mobile Number</label>
                  <div className="userform-input-wrapper">
                    <input
                      type="text"
                      maxLength={10}
                      className="userform-input"
                      value={form.mobile_number}
                      onChange={(e) =>
                        setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <div className="userform-field">
                  <label className="userform-label">Location / Landmark</label>
                  <div className="userform-input-wrapper">
                    <input
                      type="text"
                      className="userform-input"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Near Tech Park"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: ADDRESS DETAILS */}
            <div className="userform-section-card">
              <div className="userform-section-title">
                <span>📍</span> 3. Address &amp; Region Info
              </div>

              <div className="userform-grid-2">
                <div className="userform-field">
                  <label className="userform-label">City</label>
                  <div className="userform-input-wrapper">
                    <input
                      type="text"
                      className="userform-input"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Bangalore"
                    />
                  </div>
                </div>

                <div className="userform-field">
                  <label className="userform-label">Country</label>
                  <div className="userform-input-wrapper">
                    <CustomSelect
                      options={COUNTRY_OPTIONS}
                      value={form.country}
                      onChange={(val) => setForm({ ...form, country: val })}
                      className="user-form-custom-select"
                      placeholder="Select country…"
                    />
                  </div>
                </div>
              </div>

              <div className="userform-grid-2">
                <div className="userform-field">
                  <label className="userform-label">House / Office Number</label>
                  <div className="userform-input-wrapper">
                    <input
                      type="text"
                      className="userform-input"
                      value={form.house_number}
                      onChange={(e) => setForm({ ...form, house_number: e.target.value })}
                      placeholder="e.g. Suite 402, Block A"
                    />
                  </div>
                </div>

                <div className="userform-field">
                  <label className="userform-label">Street Name</label>
                  <div className="userform-input-wrapper">
                    <input
                      type="text"
                      className="userform-input"
                      value={form.street_name}
                      onChange={(e) => setForm({ ...form, street_name: e.target.value })}
                      placeholder="e.g. 100 Feet Road"
                    />
                  </div>
                </div>
              </div>

              <div className="userform-grid-2">
                <div className="userform-field">
                  <label className="userform-label">Zipcode / Postal Code</label>
                  <div className="userform-input-wrapper">
                    <input
                      type="text"
                      className="userform-input"
                      value={form.zipcode}
                      onChange={(e) => setForm({ ...form, zipcode: e.target.value })}
                      placeholder="e.g. 560038"
                    />
                  </div>
                </div>
                <div className="userform-field" />
              </div>
            </div>

            {/* Actions Bar */}
            <div className="userform-actions">
              <button
                type="button"
                className="btn ghost"
                style={{ borderRadius: 18, padding: '10px 22px' }}
                onClick={() => navigate('/users')}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="userform-submit-btn"
                disabled={saving}
              >
                {saving ? (
                  <span>Saving user details…</span>
                ) : (
                  <span>{isEditMode ? 'Update User Master ✓' : 'Save User Master ✓'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
