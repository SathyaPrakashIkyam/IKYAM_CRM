import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { activitiesApi, leadsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import { openActivityInProvider, detectProviderFromEmail } from '../utils/activityLinks'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import '../styles/Activities.css'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'call', label: '☎ Calls' },
  { key: 'task', label: '✓ Tasks' },
  { key: 'meeting', label: '▤ Meetings' },
  { key: 'email', label: '✉ Emails' },
]

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: '☎ Phone Call' },
  { value: 'task', label: '✓ Task' },
  { value: 'meeting', label: '📅 Meeting' },
  { value: 'email', label: '✉ Email' },
]

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ activity_type: 'call', subject: '', due_at: '', lead_id: '' })
  const [attendeeEmail, setAttendeeEmail] = useState('')
  const { user } = useAuth()
  const provider = detectProviderFromEmail(user?.email) // 'google' | 'outlook' — based on the logged-in user's own email
  const companyId = currentCompanyId()
  const needsProvider = form.activity_type === 'meeting' || form.activity_type === 'email'

  function load() {
    if (!companyId) return
    activitiesApi.list(companyId, filter === 'all' ? {} : { activity_type: filter }).then(setActivities)
  }

  useEffect(load, [companyId, filter])

  useEffect(() => {
    if (!companyId) return
    leadsApi
      .list(companyId)
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load leads for activities:', err))
  }, [companyId])

  async function createActivity(e) {
    e.preventDefault()
    const payload = {
      activity_type: form.activity_type,
      subject: form.subject,
      // form.due_at comes from a datetime-local input, e.g. "2026-09-09T12:10"
      // — no timezone info. `new Date(...)` parses that as the browser's own
      // local time, so .toISOString() gives the correct absolute UTC instant
      // to store, instead of the naive string being reinterpreted as UTC
      // server-side (which would silently shift it by the local offset).
      due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined,
      ...(form.lead_id
        ? {
            lead_id: form.lead_id,
            related_object_type: 'lead',
            related_record_id: form.lead_id,
          }
        : {}),
    }
    const activity = await activitiesApi.create(companyId, payload)

    // Meeting/email activities open the chosen provider (Gmail/Google Calendar
    // or Outlook/Teams) prefilled with the activity's details. This is a pure
    // frontend redirect — the CRM has already saved the activity by this point.
    if (needsProvider) {
      openActivityInProvider(activity, provider, attendeeEmail)
    }

    setForm({ activity_type: 'call', subject: '', due_at: '', lead_id: '' })
    setAttendeeEmail('')
    setShowNew(false)
    load()
  }

  const [completeTarget, setCompleteTarget] = useState(null)
  const [completeSummary, setCompleteSummary] = useState('')
  const [completeAttachments, setCompleteAttachments] = useState([])
  const [completeError, setCompleteError] = useState('')
  const [submittingComplete, setSubmittingComplete] = useState(false)

  function openCompleteModal(activity) {
    setCompleteTarget(activity)
    setCompleteSummary('')
    setCompleteAttachments([])
    setCompleteError('')
  }

  function closeCompleteModal() {
    if (submittingComplete) return
    setCompleteTarget(null)
    setCompleteSummary('')
    setCompleteAttachments([])
    setCompleteError('')
  }

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    setCompleteAttachments((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  function removeAttachment(indexToRemove) {
    setCompleteAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  async function handleConfirmComplete(e) {
    if (e) e.preventDefault()
    if (!completeTarget) return

    const trimmed = completeSummary.trim()
    if (!trimmed) {
      setCompleteError('Summary is mandatory before marking this activity as completed.')
      return
    }

    setSubmittingComplete(true)
    setCompleteError('')

    try {
      const formData = new FormData()
      formData.append('summary', trimmed)
      for (const file of completeAttachments) {
        formData.append('attachments', file)
      }

      await activitiesApi.complete(completeTarget.id, formData)
      closeCompleteModal()
      load()
    } catch (err) {
      console.error('Failed to complete activity:', err)
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to complete activity. Please try again.'
      setCompleteError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmittingComplete(false)
    }
  }

  const overdue = activities.filter((a) => a.status === 'open' && a.due_at && new Date(a.due_at) < new Date())
  const open = activities.filter((a) => a.status === 'open' && !overdue.includes(a))
  const done = activities.filter((a) => a.status === 'completed')

  const leadOptions = [
    { value: '', label: 'Select a lead (optional)...' },
    ...leads.map((l) => {
      const person = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.name || ''
      const comp = l.company_name || ''
      const code = l.lead_no || ''
      let label = person && comp && person !== comp ? `${person} · ${comp}` : (person || comp || 'Lead')
      if (code) label += ` (${code})`
      return { value: l.id, label }
    }),
  ]

  return (
    <AppShell>
      <div className="ikyam-mock activities-page">
        <div className="scr-head" style={{ marginBottom: 16 }}>
          <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)' }}>
                Activities
              </h2>
              <div className="goal" style={{ marginTop: 2 }}>
                Every call, task, and meeting — one unified queue across all records
              </div>
            </div>
            <button className="btn pri activities-new-btn" onClick={() => setShowNew(true)}>
              ＋ New activity
            </button>
          </div>
          <div className="title-bar" style={{ margin: '10px 0 16px 0' }} />
        </div>

        <div className="rowx sp activities-toolbar">
          <div className="rowx" style={{ gap: 8 }}>
            {FILTERS.map((f) => (
              <span
                key={f.key}
                className={`actchip ${filter === f.key ? 'on' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </span>
            ))}
          </div>
          <span className="tiny mut">{activities.length} total activities</span>
        </div>

        <div className="frame activities-main-frame">
          <div className="activities-scroll-pane">
            <ActivitySection
              title="Overdue"
              badgeText={`${overdue.length} requiring immediate action`}
              items={overdue}
              leads={leads}
              onComplete={openCompleteModal}
              tone="risk"
            />
            <ActivitySection
              title="Today & Open"
              badgeText={`${open.length} pending`}
              items={open}
              leads={leads}
              onComplete={openCompleteModal}
            />
            <ActivitySection
              title="Completed"
              badgeText={`${done.length} finished`}
              items={done}
              leads={leads}
              onComplete={openCompleteModal}
              isDone
            />
            {activities.length === 0 && (
              <div className="activities-empty-state">
                <div className="activities-empty-icon">⚡</div>
                <b>No activities found</b>
                <p className="tiny mut">Create a new call, meeting, or task to start tracking your queue.</p>
              </div>
            )}
          </div>
        </div>

        {showNew && (
          <div className="lead-modal-overlay" onClick={() => setShowNew(false)}>
            <div className="lead-modal-card activity-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="lead-modal-header">
                <div className="lead-modal-title-row">
                  <div className="lead-modal-icon-badge">⚡</div>
                  <div>
                    <h3>Create new activity</h3>
                    <span className="tiny mut">Schedule a call, meeting, task, or follow-up</span>
                  </div>
                </div>
                <button type="button" className="lead-modal-close" onClick={() => setShowNew(false)}>✕</button>
              </div>
              <div className="title-bar" style={{ margin: '0 0 20px 0', width: 44, height: 3 }} />

              <form onSubmit={createActivity}>
                <div className="lead-modal-form-grid">
                  <div>
                    <label className="lead-modal-label">Activity type *</label>
                    <CustomSelect
                      options={ACTIVITY_TYPE_OPTIONS}
                      value={form.activity_type}
                      onChange={(val) => setForm({ ...form, activity_type: val })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label className="lead-modal-label">Associated Lead</label>
                    <CustomSelect
                      options={leadOptions}
                      value={form.lead_id}
                      onChange={(val) => {
                        setForm((prev) => ({ ...prev, lead_id: val }))
                        if (val && !attendeeEmail) {
                          const selLead = leads.find((l) => l.id === val)
                          if (selLead?.email) {
                            setAttendeeEmail(selLead.email)
                          }
                        }
                      }}
                      placeholder="Select a lead (optional)..."
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className={needsProvider ? '' : 'lead-modal-full-width'}>
                    <label className="lead-modal-label">Due date &amp; time</label>
                    <input
                      type="datetime-local"
                      className="lead-modal-input"
                      value={form.due_at || ''}
                      onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                    />
                    <span className="tiny mut" style={{ marginTop: 2, display: 'block' }}>
                      The exact time matters — it's what reminder notifications count down from
                    </span>
                  </div>

                  {needsProvider && (
                    <div>
                      <label className="lead-modal-label">
                        {form.activity_type === 'meeting' ? 'Invite email' : 'Send to email'}
                      </label>
                      <input
                        type="email"
                        placeholder="contact@example.com"
                        className="lead-modal-input"
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="lead-modal-full-width">
                    <label className="lead-modal-label">Subject / Description *</label>
                    <input
                      required
                      placeholder="e.g. Follow up call regarding Q3 pricing proposal"
                      className="lead-modal-input"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>
                </div>

                {needsProvider && (
                  <div className="tiny mut" style={{ marginTop: -8, marginBottom: 16 }}>
                    Will open in {provider === 'google'
                      ? (form.activity_type === 'meeting' ? 'Google Calendar / Meet' : 'Gmail')
                      : (form.activity_type === 'meeting' ? 'Outlook / Teams' : 'Outlook')} — based on your login email
                  </div>
                )}

                <div className="lead-modal-actions">
                  <button type="button" className="btn ghost lead-modal-cancel-btn" onClick={() => setShowNew(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn pri lead-modal-submit-btn">
                    Add to queue →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Complete Activity (Mandatory Summary + Multiple Attachments) */}
        {completeTarget && (
          <div className="lead-modal-overlay" onClick={closeCompleteModal}>
            <div
              className="lead-modal-card activity-modal-dialog"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 520, borderRadius: 24 }}
            >
              <div className="lead-modal-header">
                <div className="lead-modal-title-row">
                  <div
                    className="lead-modal-icon-badge"
                    style={{
                      color: '#00C9A7',
                      background: 'rgba(0, 201, 167, 0.12)',
                      fontSize: 18,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <h3>Complete Activity</h3>
                    <span className="tiny mut">Record completion summary and attach files</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="lead-modal-close"
                  onClick={closeCompleteModal}
                  disabled={submittingComplete}
                >
                  ✕
                </button>
              </div>

              <div className="title-bar" style={{ margin: '0 0 16px 0', width: 44, height: 3 }} />

              {/* Target Activity Summary Preview */}
              <div
                style={{
                  background: 'var(--surface2, rgba(240, 246, 250, 0.7))',
                  border: '1px solid var(--line, rgba(0, 201, 167, 0.2))',
                  borderRadius: 14,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(0, 201, 167, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {typeIcon(completeTarget.activity_type)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {completeTarget.subject}
                  </div>
                  <div className="tiny mut" style={{ textTransform: 'capitalize' }}>
                    {completeTarget.activity_type}
                    {completeTarget.due_at && (
                      <span> · Due {new Date(completeTarget.due_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleConfirmComplete}>
                {/* Summary Field */}
                <div style={{ marginBottom: 16 }}>
                  <div className="rowx sp" style={{ marginBottom: 6 }}>
                    <label className="lead-modal-label" style={{ margin: 0 }}>
                      Summary *
                    </label>
                    <span className="tiny" style={{ color: 'var(--danger, #d64545)', fontWeight: 600 }}>
                      Mandatory
                    </span>
                  </div>
                  <textarea
                    autoFocus
                    required
                    rows={4}
                    placeholder="Enter a paragraph summary of the discussion, outcome, client response, and next steps..."
                    className="lead-modal-input"
                    style={{
                      height: 'auto',
                      minHeight: 96,
                      padding: '12px 16px',
                      borderRadius: 16,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                      fontSize: 13.5,
                    }}
                    value={completeSummary}
                    onChange={(e) => {
                      setCompleteSummary(e.target.value)
                      if (completeError) setCompleteError('')
                    }}
                  />
                </div>

                {/* Attachments Field */}
                <div style={{ marginBottom: 16 }}>
                  <div className="rowx sp" style={{ marginBottom: 6 }}>
                    <label className="lead-modal-label" style={{ margin: 0 }}>
                      Attachments
                    </label>
                    <span className="tiny mut">Optional · Multiple files supported</span>
                  </div>

                  <label
                    style={{
                      border: '1.5px dashed var(--line, rgba(0, 201, 167, 0.35))',
                      borderRadius: 16,
                      padding: '14px 18px',
                      background: 'var(--surface2, rgba(240, 246, 250, 0.5))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const dropped = Array.from(e.dataTransfer.files || [])
                      if (dropped.length) {
                        setCompleteAttachments((prev) => [...prev, ...dropped])
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <span style={{ fontSize: 18 }}>📎</span>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ font: '600 12.5px var(--b)', color: 'var(--primary, #00C9A7)' }}>
                        Choose files
                      </span>
                      <span className="tiny mut" style={{ marginLeft: 6 }}>
                        or drag &amp; drop here
                      </span>
                    </div>
                  </label>

                  {completeAttachments.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        maxHeight: 130,
                        overflowY: 'auto',
                        paddingRight: 4,
                      }}
                    >
                      {completeAttachments.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--surface, #fff)',
                            border: '1px solid var(--line, rgba(0, 201, 167, 0.2))',
                            borderRadius: 10,
                            padding: '6px 12px',
                            fontSize: 12,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span>📄</span>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{file.name}</span>
                            <span className="tiny mut">({formatFileSize(file.size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--mut)',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 12,
                            }}
                            title="Remove file"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {completeError && (
                  <div
                    className="tiny"
                    style={{
                      color: 'var(--danger, #d64545)',
                      marginBottom: 12,
                      background: 'rgba(214, 69, 69, 0.08)',
                      padding: '8px 12px',
                      borderRadius: 10,
                    }}
                  >
                    ⚠ {completeError}
                  </div>
                )}

                <div className="lead-modal-actions" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn ghost lead-modal-cancel-btn"
                    onClick={closeCompleteModal}
                    disabled={submittingComplete}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn pri lead-modal-submit-btn"
                    disabled={submittingComplete || !completeSummary.trim()}
                    style={{ minWidth: 150 }}
                  >
                    {submittingComplete ? 'Saving…' : 'Confirm Completed ✓'}
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

function ActivitySection({ title, badgeText, items, leads = [], onComplete, tone, isDone }) {
  if (items.length === 0) return null
  return (
    <div className="activity-section">
      <div className="activity-section-header">
        <span className={`activity-section-title ${tone === 'risk' ? 'risk' : ''}`}>{title}</span>
        <span className={`activity-section-badge ${tone === 'risk' ? 'risk' : ''}`}>{badgeText}</span>
      </div>
      <div className="activity-cards-list">
        {items.map((a) => {
          const linkedLead = leads.find((l) => l.id === a.lead_id || l.id === a.related_record_id)
          const leadDisplayName = linkedLead
            ? ([linkedLead.first_name, linkedLead.last_name].filter(Boolean).join(' ') || linkedLead.name || linkedLead.company_name)
            : a.lead_name || (a.entity_type === 'lead' ? 'Lead' : null)

          return (
            <div className={`card hov activity-card ${isDone ? 'done' : ''}`} key={a.id}>
              <div className="rowx sp" style={{ width: '100%' }}>
                <div className="rowx" style={{ gap: 14 }}>
                  <span
                    className="activity-icon-badge"
                    style={{ cursor: a.status === 'open' ? 'pointer' : 'default' }}
                    onClick={() => a.status === 'open' && onComplete(a)}
                    title={a.status === 'open' ? 'Click to complete' : 'Completed'}
                  >
                    {typeIcon(a.activity_type)}
                  </span>
                  <div>
                    <b className={`activity-subject ${a.status === 'completed' ? 'completed' : ''}`}>
                      {a.subject}
                    </b>
                    <div className="rowx" style={{ gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="tiny mut" style={{ textTransform: 'capitalize' }}>{a.activity_type}</span>
                      {leadDisplayName && (
                        <span className="chip" style={{ fontSize: 10.5, padding: '1px 7px', background: 'rgba(0, 114, 206, 0.08)', color: '#0072CE', fontWeight: 600 }}>
                          👤 {leadDisplayName}
                        </span>
                      )}
                      {a.entity_type && !leadDisplayName && <span className="tiny mut">· {a.entity_type}</span>}
                    </div>
                    {/* Display Summary / Outcome if present */}
                    {(a.summary || a.outcome) && (
                      <p className="tiny mut" style={{ marginTop: 5, fontStyle: 'italic', maxWidth: 650, lineHeight: 1.4 }}>
                        “{a.summary || a.outcome}”
                      </p>
                    )}
                    {/* Display Attachments if present */}
                    {Array.isArray(a.attachments) && a.attachments.length > 0 && (
                      <div className="rowx" style={{ gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                        {a.attachments.map((att, attIdx) => {
                          const name = typeof att === 'string' ? att.split('/').pop() : att.file_name || att.name || 'Attachment'
                          const url = typeof att === 'string' ? att : att.url || att.file_url
                          return url ? (
                            <a
                              key={attIdx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="chip"
                              style={{ fontSize: 11, padding: '2px 8px', textDecoration: 'none', color: 'var(--primary, #00C9A7)' }}
                            >
                              📎 {name}
                            </a>
                          ) : (
                            <span key={attIdx} className="chip" style={{ fontSize: 11, padding: '2px 8px' }}>
                              📎 {name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rowx" style={{ gap: 10 }}>
                  {a.due_at && (
                    <span className={`chip ${tone === 'risk' ? 'danger' : 'warn'}`}>
                      {new Date(a.due_at).toLocaleDateString()} {new Date(a.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {a.status === 'open' && (
                    <button
                      type="button"
                      className="activity-complete-btn"
                      onClick={() => onComplete(a)}
                    >
                      ✓ Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function typeIcon(type) {
  return { call: '☎', task: '✓', meeting: '📅', email: '✉' }[type] || '⚡'
}

