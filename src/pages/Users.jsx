import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { userMasterApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'

export default function Users() {
  const { auth } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // State for inline status updating
  const [updatingStatusId, setUpdatingStatusId] = useState(null)

  // State for Change Password Modal
  const [pwModalUser, setPwModalUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showModalPw, setShowModalPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const schemaId = auth?.schema_id || ''
      const res = await userMasterApi.getAllUsers(schemaId)
      const list = Array.isArray(res) ? res : res?.data || res?.items || []
      setUsers(list)
    } catch (err) {
      console.error('Failed to fetch user master list:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Could not load user master list'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(u) {
    const currentActive = u.is_active !== false
    const nextActive = !currentActive
    setUpdatingStatusId(u.user_id)
    try {
      await userMasterApi.updateUserStatus(u.user_id, nextActive)
      setUsers((prev) =>
        prev.map((item) => (item.user_id === u.user_id ? { ...item, is_active: nextActive } : item))
      )
    } catch (err) {
      console.error('Failed to update user status:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Failed to update user status'
      alert(errMsg)
    } finally {
      setUpdatingStatusId(null)
    }
  }

  function openChangePassword(u) {
    setPwModalUser(u)
    setNewPassword('')
    setPwError('')
    setPwSuccess('')
    setShowModalPw(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!pwModalUser || !newPassword) return
    setPwError('')
    setPwSuccess('')
    setSavingPw(true)

    try {
      await userMasterApi.adminChangePassword(pwModalUser.user_id, newPassword)
      setPwSuccess('Password updated successfully!')
      setTimeout(() => {
        setPwModalUser(null)
      }, 1200)
    } catch (err) {
      console.error('Failed to update password:', err)
      const detail = err.response?.data?.detail
      const errMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message || err.response?.data?.message || 'Failed to update password'
      setPwError(errMsg)
    } finally {
      setSavingPw(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (u.user_name || u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.user_id || '').toLowerCase().includes(q) ||
      (u.city || u.location || '').toLowerCase().includes(q)
    )
  })

  return (
    <AppShell>
      <div className="ikyam-mock">
      <div className="scr-head">
        <div>
          <h2>User Management</h2>
          <span className="goal">Manage company user accounts, security roles, and schema access.</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className="btn pri"
            onClick={() => navigate('/users/new')}
          >
            ＋ Add New User
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 18 }}>
        <div className="tile">
          <span className="lab">Total Users</span>
          <b>{users.length}</b>
        </div>
        <div className="tile">
          <span className="lab">Active Users</span>
          <b style={{ color: 'var(--green)' }}>
            {users.filter((u) => u.is_active !== false).length}
          </b>
        </div>
        <div className="tile">
          <span className="lab">Company Admins</span>
          <b style={{ color: 'var(--primary)' }}>
            {users.filter((u) => (u.role || '').toUpperCase().includes('ADMIN')).length}
          </b>
        </div>
      </div>

      {/* Main Table Card Frame */}
      <div className="frame" style={{ padding: 18 }}>
        <div className="rowx sp" style={{ marginBottom: 14 }}>
          <div className="searchwrap">
            <input
              type="text"
              className="login-input"
              placeholder="Search by name, email, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: 38,
                paddingLeft: 14,
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--surface2)',
                color: 'var(--ink)',
                fontSize: 13,
                width: 300,
              }}
            />
          </div>
          <button className="btn" onClick={loadUsers} disabled={loading}>
            ⟲ Refresh
          </button>
        </div>

        {error && (
          <div className="onboarding-error-banner" style={{ marginBottom: 14 }}>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mut)' }}>
            <span className="login-spinner" style={{ borderColor: 'var(--line)', borderTopColor: 'var(--primary)' }} />
            <div style={{ marginTop: 10 }}>Loading user master list…</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mut)' }}>
            No users found in user master list.
          </div>
        ) : (
          <table className="qtable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email &amp; Mobile</th>
                <th>Role</th>
                <th>Address</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => {
                const roleUpper = (u.role || '').toUpperCase()
                const isCompAdmin = roleUpper === 'COMPANY_ADMIN' || roleUpper === 'COMPANY ADMIN'

                return (
                  <tr key={u.user_id || u.email || idx}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>
                        {u.user_name || u.full_name || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{u.email || '—'}</div>
                      <div className="tiny mut">{u.mobile_number || u.phone || '—'}</div>
                    </td>
                    <td>
                      <span className="chip brand" style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px' }}>
                        {u.role || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="tiny mut">{u.city ? `${u.city}${u.country ? `, ${u.country}` : ''}` : u.location || '—'}</div>
                    </td>
                    <td>
                      {isCompAdmin ? (
                        <span className={`chip ${u.is_active !== false ? 'ok' : 'risk'}`}>
                          {u.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingStatusId === u.user_id}
                          className={`chip ${u.is_active !== false ? 'ok' : 'risk'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="Click to toggle user status"
                          onClick={() => handleToggleStatus(u)}
                        >
                          {updatingStatusId === u.user_id
                            ? 'Updating…'
                            : u.is_active !== false
                            ? 'Active ✓'
                            : 'Inactive ✕'}
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isCompAdmin ? (
                        <span className="tiny mut">—</span>
                      ) : (
                        <div className="rowx" style={{ gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => navigate('/users/new', { state: { record: u } })}
                          >
                            ✏ Edit
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => openChangePassword(u)}
                          >
                            🔑 Password
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Change Password Modal */}
      {pwModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setPwModalUser(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: '24px 28px',
              maxWidth: 440,
              width: '100%',
              boxShadow: 'var(--shadow-lift), 0 24px 64px rgba(0,0,0,0.25)',
              animation: 'onboardingFadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rowx sp" style={{ marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ font: '700 16px var(--d)', color: 'var(--ink)', margin: 0 }}>
                  🔑 Change Password
                </h3>
                <span className="tiny mut">User: {pwModalUser.user_name || pwModalUser.email}</span>
              </div>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 16, padding: '2px 8px' }}
                onClick={() => setPwModalUser(null)}
              >
                ✕
              </button>
            </div>

            {pwError && (
              <div className="onboarding-error-banner" style={{ marginBottom: 14 }}>
                <span>{pwError}</span>
              </div>
            )}

            {pwSuccess && (
              <div className="chip ok" style={{ display: 'block', padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                ✓ {pwSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="onboarding-field">
                <label className="onboarding-label">New Password *</label>
                <div className="onboarding-input-wrapper">
                  <input
                    required
                    type={showModalPw ? 'text' : 'password'}
                    className="onboarding-input"
                    style={{ paddingRight: 38 }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="onboarding-toggle-pw"
                    onClick={() => setShowModalPw((v) => !v)}
                    title={showModalPw ? 'Hide password' : 'Show password'}
                  >
                    {showModalPw ? (
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

              <div className="rowx sp" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setPwModalUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn pri"
                  disabled={savingPw}
                >
                  {savingPw ? 'Updating…' : 'Update Password ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  )
}
