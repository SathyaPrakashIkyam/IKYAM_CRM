import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { onboardingApi, aiChatApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'

export default function OnboardingList() {
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [approvingId, setApprovingId] = useState(null)

  // Confirmation modal state before approval
  const [confirmRecord, setConfirmRecord] = useState(null)

  // AI (Gemini) key provisioning modal — Super Admin maps a key to a
  // specific company's schema_id, since global_key lives in the shared
  // schema and isn't something a company admin necessarily has yet.
  const [aiKeyRecord, setAiKeyRecord] = useState(null)

  // Feedback modal state (success or error)
  const [modalState, setModalState] = useState({
    open: false,
    title: '',
    message: '',
    type: 'error', // 'error' | 'success'
    record: null,
  })

  useEffect(() => {
    loadForms()
  }, [])

  async function loadForms() {
    setLoading(true)
    setError('')
    try {
      const res = await onboardingApi.getAllForms()
      const dataList = Array.isArray(res) ? res : res?.data || res?.items || []
      setForms(dataList)
    } catch (err) {
      console.error('Failed to load onboarding forms:', err)
      setError('Could not load onboarding requests')
    } finally {
      setLoading(false)
    }
  }

  async function executeApprove(record) {
    const onboardingId = record?.onboard_company_id || record?.id
    if (!onboardingId) return

    setApprovingId(onboardingId)
    setError('')
    try {
      await onboardingApi.approveCompanyDetails(onboardingId)
      setForms((prev) =>
        prev.map((item) =>
          (item.onboard_company_id === onboardingId || item.id === onboardingId)
            ? { ...item, is_approved: true, is_active: true }
            : item
        )
      )
      setModalState({
        open: true,
        title: 'Approval Successful',
        message: `Company "${record.company_name || onboardingId}" has been successfully approved and activated.`,
        type: 'success',
        record: null,
      })
    } catch (err) {
      console.error('Failed to approve onboarding record:', err)
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Approval request failed'

      setModalState({
        open: true,
        title: 'Approval Failed',
        message: msg,
        type: 'error',
        record: record,
      })
    } finally {
      setApprovingId(null)
    }
  }

  const filtered = forms.filter((item) => {
    const q = search.toLowerCase()
    return (
      item.company_name?.toLowerCase().includes(q) ||
      item.user_name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.email_id?.toLowerCase().includes(q) ||
      item.industry_type?.toLowerCase().includes(q) ||
      item.onboard_company_id?.toLowerCase().includes(q)
    )
  })

  return (
    <AppShell>
      <div className="ikyam-mock">
      <div className="scr-head">
        <div>
          <h2>Onboarding Requests</h2>
          <span className="goal">Manage tenant workspace onboardings and company registrations.</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/onboarding" className="btn pri">
            ＋ New Onboarding
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 18 }}>
        <div className="tile">
          <span className="lab">Total Companies</span>
          <b>{forms.length}</b>
        </div>
        <div className="tile">
          <span className="lab">Active Workspaces</span>
          <b style={{ color: 'var(--green)' }}>
            {forms.filter((f) => f.is_active).length}
          </b>
        </div>
        <div className="tile">
          <span className="lab">Pending Approvals</span>
          <b style={{ color: 'var(--amber)' }}>
            {forms.filter((f) => !f.is_approved).length}
          </b>
        </div>
      </div>

      {/* Main Table Frame */}
      <div className="frame" style={{ padding: 18 }}>
        <div className="rowx sp" style={{ marginBottom: 14 }}>
          <div className="searchwrap">
            <input
              type="text"
              className="login-input"
              placeholder="Search companies, users, IDs or emails…"
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
                width: 280,
              }}
            />
          </div>
          <button className="btn" onClick={loadForms} disabled={loading}>
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
            <div style={{ marginTop: 10 }}>Loading onboarding requests…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mut)' }}>
            No onboarding records found.
          </div>
        ) : (
          <div className="table-card">
            <table className="qtable">
            <thead>
              <tr>
                <th> Company Name</th>
                <th>Admin Contact</th>
                <th>Industry</th>
                <th>Location / Phone</th>
                <th>SAP / DB Config</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const targetId = item.onboard_company_id || item.id
                const isApproving = approvingId === targetId

                return (
                  <tr key={targetId || item.schema_id || idx}>
                    <td>
                      
                      <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>
                        {item.company_name}
                      </div>
                      {item.company_website && (
                        <a
                          href={item.company_website.startsWith('http') ? item.company_website : `https://${item.company_website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tiny"
                          style={{ color: 'var(--primary)' }}
                        >
                          {item.company_website}
                        </a>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.user_name || item.created_by || '—'}</div>
                      <div className="tiny mono">{item.email || item.email_id}</div>
                    </td>
                    <td>
                      <span className="chip brand">{item.industry_type || 'General'}</span>
                    </td>
                    <td>
                      <div>{item.company_city ? `${item.company_city}, ${item.company_state || ''}` : '—'}</div>
                      <div className="tiny mut">{item.company_phone_no}</div>
                    </td>
                    <td>
                      <div className="mono" style={{ fontSize: 12 }}>
                        {item.sap_db || item.db_type || '—'}
                      </div>
                      <div className="tiny mut">{item.base_url || '—'}</div>
                    </td>
                    <td>
                      <div className="rowx" style={{ gap: 6 }}>
                        <span className={`chip ${item.is_active ? 'ok' : 'risk'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`chip ${item.is_approved ? 'ok' : 'warn'}`}>
                          {item.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="rowx" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        {item.is_approved ? (
                          <span className="chip ok" style={{ fontSize: 11, padding: '3px 8px' }}>
                            ✓ Approved
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn pri"
                            disabled={isApproving || !targetId}
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setConfirmRecord(item)}
                          >
                            {isApproving ? 'Approving…' : '✓ Approve'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => navigate('/onboarding', { state: { record: item } })}
                        >
                          ✏ Edit
                        </button>
                        {item.schema_id && (
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setAiKeyRecord(item)}
                          >
                            🔑 AI Key
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Approval Confirmation Warning Dialog */}
      {confirmRecord && (
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
          onClick={() => setConfirmRecord(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--amber)',
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
                  background: 'var(--amber-soft)',
                  color: 'var(--amber-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ❓
              </div>
              <div>
                <h3 style={{ font: '700 17px var(--d)', color: 'var(--ink)', margin: 0 }}>
                  Confirm Company Approval
                </h3>
                <span className="tiny mut">Action confirmation</span>
              </div>
            </div>

            <p style={{ font: '400 13.5px var(--b)', color: 'var(--ink)', lineHeight: 1.5, marginBottom: 22 }}>
              Are you sure you want to approve company{' '}
              <b style={{ color: 'var(--primary)' }}>
                "{confirmRecord.company_name || confirmRecord.onboard_company_id}"
              </b>
              {confirmRecord.onboard_company_id ? ` (${confirmRecord.onboard_company_id})` : ''}? This will approve the tenant request and activate company workspace access.
            </p>

            <div className="rowx" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmRecord(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn pri"
                style={{ background: 'var(--green)', borderColor: 'var(--green)', color: '#fff' }}
                onClick={() => {
                  const rec = confirmRecord
                  setConfirmRecord(null)
                  executeApprove(rec)
                }}
              >
                ✓ Yes, Approve Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executive Feedback Modal */}
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
              {modalState.record && (
                <button
                  type="button"
                  className="btn pri"
                  onClick={() => {
                    const rec = modalState.record
                    setModalState((m) => ({ ...m, open: false }))
                    navigate('/onboarding', { state: { record: rec } })
                  }}
                >
                  ✏ Edit Record Now
                </button>
              )}
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

      {/* Gemini API key provisioning */}
      {aiKeyRecord && (
        <AiKeyModal record={aiKeyRecord} onClose={() => setAiKeyRecord(null)} />
      )}
      </div>
    </AppShell>
  )
}

function AiKeyModal({ record, onClose }) {
  const schemaId = record.schema_id
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    aiChatApi.keys(schemaId)
      .then(setKeys)
      .catch(() => setError('Could not load existing keys'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [schemaId])

  async function addKey(e) {
    e.preventDefault()
    if (!newKey.trim()) return
    setSaving(true)
    setError('')
    try {
      await aiChatApi.addKey(newKey.trim(), schemaId)
      setNewKey('')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add key')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id) {
    await aiChatApi.deactivateKey(id, schemaId)
    load()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 20,
          padding: '28px 32px', maxWidth: 460, width: '100%',
          boxShadow: 'var(--shadow-lift), 0 24px 64px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ font: '700 17px var(--d)', color: 'var(--ink)', margin: '0 0 2px' }}>Gemini API key</h3>
        <span className="tiny mut">
          {record.company_name} — mapped to schema <span className="mono">{schemaId}</span>
        </span>

        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div className="tiny mut">Loading…</div>
          ) : (
            <>
              {keys.length === 0 && <div className="tiny mut" style={{ marginBottom: 8 }}>No key configured for this company yet.</div>}
              {keys.map((k) => (
                <div className="fld rowx sp" key={k.global_key_id}>
                  <div>
                    <span className="mono">{k.masked_key}</span>{' '}
                    <span className={`chip ${k.is_active ? 'ok' : ''}`} style={{ marginLeft: 6 }}>{k.is_active ? 'Active' : 'Deactivated'}</span>
                  </div>
                  {k.is_active && (
                    <span className="tiny" style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--orange-ink)' }} onClick={() => deactivate(k.global_key_id)}>
                      Deactivate
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {error && <div className="tiny" style={{ color: 'var(--orange-ink)', marginTop: 6 }}>{error}</div>}

          <form className="rowx" style={{ marginTop: 12, gap: 8 }} onSubmit={addKey}>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Paste a Gemini API key…"
              style={{
                flex: 1, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8,
                background: 'var(--surface2)', color: 'var(--ink)', font: '500 12.5px var(--b)',
              }}
            />
            <button className="btn pri" disabled={saving}>{saving ? 'Adding…' : '＋ Add key'}</button>
          </form>
        </div>

        <div className="rowx" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
