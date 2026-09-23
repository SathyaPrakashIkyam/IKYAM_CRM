import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { accountsApi, activitiesApi, opportunitiesApi } from '../api/endpoints'
import { openActivityInProvider, detectProviderFromEmail } from '../utils/activityLinks'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import '../styles/Record.css'

const ACTIVITY_TYPES = [
  { type: 'call', label: '☎ Call' },
  { type: 'task', label: '✓ Task' },
  { type: 'meeting', label: '▤ Meeting' },
  { type: 'email', label: '✉ Email' },
]

export default function Record() {
  const { id } = useParams()
  const { user } = useAuth()
  const provider = detectProviderFromEmail(user?.email) // 'google' | 'outlook' — based on the logged-in user's own login email
  const [opp, setOpp] = useState(null)
  const [account, setAccount] = useState(null)
  const [activities, setActivities] = useState([])
  const [activeType, setActiveType] = useState('call')
  const [subject, setSubject] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [activityError, setActivityError] = useState('')
  const [newAttachments, setNewAttachments] = useState([])
  const [completeTarget, setCompleteTarget] = useState(null)
  const [completeSummary, setCompleteSummary] = useState('')
  const [completeAttachments, setCompleteAttachments] = useState([])
  const [completeError, setCompleteError] = useState('')
  const [submittingComplete, setSubmittingComplete] = useState(false)
  const [stages, setStages] = useState([])
  const [relatedQuotes, setRelatedQuotes] = useState([])
  const [contactsCount, setContactsCount] = useState(null)
  const [primaryContactEmail, setPrimaryContactEmail] = useState('')
  const [tipDismissed, setTipDismissed] = useState(false)
  const [showLostReason, setShowLostReason] = useState(false)
  const [lostReasonText, setLostReasonText] = useState('')
  const [lostReasonError, setLostReasonError] = useState('')
  // Surfaces a rejected "Mark won" (e.g. "needs at least one quote") — this
  // used to just fail silently since closeDeal had no error handling.
  const [closeError, setCloseError] = useState('')
  const navigate = useNavigate()
  const activityInputRef = useRef(null)

  function setQuickDue(offsetDaysOrHours, targetHour = null) {
    const d = new Date()
    if (targetHour !== null) {
      d.setDate(d.getDate() + offsetDaysOrHours)
      d.setHours(targetHour, 0, 0, 0)
    } else {
      d.setHours(d.getHours() + offsetDaysOrHours)
    }
    const pad = (n) => String(n).padStart(2, '0')
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    setDueAt(localIso)
    if (activityError) setActivityError('')
  }

  // Both ways an activity gets created for this deal (the Activities page's
  // "Associated Lead" picker, or this page's own "Log an activity" box) now
  // target the SAME lead (opp.source_lead_id) — so the full lead history,
  // not just activities linked to this one deal, is what actually belongs
  // here. Falls back to the old deal-only view for a deal with no source
  // lead (pre-existing data from before every activity required one).
  function loadActivities(sourceLeadId) {
    if (sourceLeadId) {
      activitiesApi.leadHistory(sourceLeadId).then(setActivities)
    } else {
      activitiesApi.forRecord('opportunity', id).then(setActivities)
    }
  }

  useEffect(() => {
    opportunitiesApi.get(id).then((o) => {
      setOpp(o)
      loadActivities(o.source_lead_id)
      accountsApi.get(o.account_id).then(setAccount)
      accountsApi.contacts(o.account_id).then((c) => {
        setContactsCount(c.length)
        // Auto-fill the guest/recipient address from the account's primary
        // contact, so meeting invites and emails go out without the user
        // having to type the address in themselves.
        const primary = c.find((ct) => ct.primary_email)
        setPrimaryContactEmail(primary?.primary_email || '')
      }).catch(() => {})
      opportunitiesApi.kanban(o.company_id).then((cols) => {
        setStages(cols.map((c) => c.stage).sort((a, b) => a.sort_order - b.sort_order))
      }).catch(() => {})
      // Use the account-scoped endpoint (not the general quotes list) so this
      // count reflects every quote actually tied to this account — the
      // general list is scoped to the logged-in user's own quotes for
      // non-admins, which would under-count quotes owned by a teammate.
      // Not filtered by opportunity_id: quotes aren't created against a
      // specific deal in this app (the quote form only ever sets
      // account_id), so that filter always evaluated to zero.
      accountsApi.quotes(o.account_id).then(setRelatedQuotes).catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function focusActivityForm() {
    activityInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    activityInputRef.current?.focus()
  }

  async function addActivity() {
    // The UI already hides this form entirely when the deal has no source
    // lead (every activity requires one now) — this is just a defensive
    // backstop against a stale render still calling through.
    if (!opp.source_lead_id) return
    setActivityError('')
    const text = subject.trim()
    if (!text) {
      setActivityError('Activity description / typing line is mandatory.')
      activityInputRef.current?.focus()
      return
    }
    if (!dueAt) {
      setActivityError('Follow-up Date & Time is mandatory.')
      return
    }

    try {
      const activity = await activitiesApi.create(opp.company_id, {
        activity_type: activeType,
        subject: text,
        due_at: new Date(dueAt).toISOString(),
        related_object_type: 'opportunity',
        related_record_id: id,
        lead_id: opp.source_lead_id,
        attachments: newAttachments,
      })

      // Meeting/email activities redirect straight into the logged-in user's
      // own provider (Google or Outlook/Teams, detected from their login
      // email) with the invite/compose window prefilled — no manual picker.
      if (activeType === 'meeting' || activeType === 'email') {
        openActivityInProvider(activity, provider, primaryContactEmail)
      }

      setSubject('')
      setDueAt('')
      setNewAttachments([])
      setActivityError('')
      loadActivities(opp.source_lead_id)
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (detail?.[0]?.msg || 'Failed to log activity.')
      setActivityError(msg)
    }
  }

  function handleNewAttachmentChange(e) {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    setNewAttachments((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  function removeNewAttachment(indexToRemove) {
    setNewAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  // Clicking an open activity's dot used to instantly complete it with a
  // hardcoded "Completed" placeholder summary and no way to attach
  // anything — inconsistent with the real Complete flow on the Activities
  // page, which requires a real summary and supports attachments. This
  // opens the same kind of modal here instead of silently force-completing.
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

  function handleCompleteAttachmentChange(e) {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    setCompleteAttachments((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  function removeCompleteAttachment(indexToRemove) {
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
      loadActivities(opp.source_lead_id)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to complete activity. Please try again.'
      setCompleteError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmittingComplete(false)
    }
  }

  async function closeDeal(outcome) {
    setCloseError('')
    if (outcome === 'lost') {
      // Marking a deal lost always stops to collect a reason first — the
      // API rejects a lost close without one anyway, so this just surfaces
      // that requirement as a proper form instead of a failed request.
      setLostReasonText('')
      setLostReasonError('')
      setShowLostReason(true)
      return
    }
    try {
      const updated = await opportunitiesApi.close(id, { outcome })
      setOpp(updated)
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (detail?.[0]?.msg || err?.message || 'Could not close this deal.')
      setCloseError(msg)
    }
  }

  async function confirmLostReason() {
    if (!lostReasonText.trim()) {
      setLostReasonError('Please provide a reason for changing this Lead to Lost.')
      return
    }
    const updated = await opportunitiesApi.close(id, { outcome: 'lost', lost_reason: lostReasonText.trim() })
    setOpp(updated)
    setShowLostReason(false)
    setLostReasonText('')
    setLostReasonError('')
  }

  function cancelLostReason() {
    setShowLostReason(false)
    setLostReasonText('')
    setLostReasonError('')
  }

  const upcomingActivities = useMemo(() => {
    return activities
      .filter((a) => a.status === 'open' && a.due_at)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
  }, [activities])
  const nextFollowUp = upcomingActivities[0] || null
  const nextFollowUpOverdue = nextFollowUp && new Date(nextFollowUp.due_at) < new Date()
  const fallbackOpenActivity = useMemo(() => {
    return activities.find((a) => a.status === 'open') || null
  }, [activities])

  if (!opp) {
    return (
      <AppShell>
        <div className="ikyam-mock"><div className="tiny">Loading…</div></div>
      </AppShell>
    )
  }

  const probability = opp.win_probability ?? null
  const currentStageIndex = stages.findIndex((s) => s.id === opp.stage_id)
  const daysOpen = Math.max(0, Math.round((Date.now() - new Date(opp.created_at)) / 86400000))
  const openActivityCount = activities.filter((a) => a.status === 'open').length

  return (
    <AppShell>
      <div className="ikyam-mock record-page">
        <div className="frame">
          <div className="record-header">
            <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ font: '600 16px var(--d)' }}>{opp.name}</div>
                <div className="tiny">{opp.opportunity_no} · <span className={`chip ${opp.status === 'won' ? 'ok' : opp.status === 'lost' ? 'risk' : 'brand'}`}>{opp.status}</span></div>
                {opp.status === 'lost' && opp.lost_reason && (
                  <div className="tiny mut" style={{ marginTop: 4, fontStyle: 'italic' }}>Reason: {opp.lost_reason}</div>
                )}
              </div>
              <div className="rowx" style={{ flexWrap: 'wrap' }}>
                <button className="btn ghost" style={{ fontWeight: 700 }} onClick={focusActivityForm}>Log activity</button>
                <button
                  className="btn ghost"
                  style={{ fontWeight: 700 }}
                  onClick={() => navigate('/newQuotes', { state: { accountId: opp.account_id } })}
                >
                  New quote
                </button>
                {opp.status === 'open' && (
                  <>
                    <button className="btn pri" onClick={() => closeDeal('won')}>Mark won</button>
                    <button className="btn" onClick={() => closeDeal('lost')}>Mark lost</button>
                  </>
                )}
              </div>
            </div>

            {closeError && (
              <div
                className="tiny"
                style={{
                  marginTop: 10,
                  color: 'var(--danger, #d64545)',
                  background: 'rgba(214, 69, 69, 0.08)',
                  border: '1px solid rgba(214, 69, 69, 0.25)',
                  borderRadius: 10,
                  padding: '9px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span>⚠ {closeError}</span>
                <span style={{ cursor: 'pointer' }} onClick={() => setCloseError('')}>✕</span>
              </div>
            )}

            {stages.length > 0 && currentStageIndex >= 0 && (
              <>
                <div className="rec-stagebar">
                  {stages.map((s, i) => (
                    <div
                      key={s.id}
                      className={`rec-stagebar-seg ${i <= currentStageIndex ? (s.stage_kind === 'won' ? 'won' : s.stage_kind === 'lost' ? 'lost' : 'filled') : ''}`}
                    />
                  ))}
                </div>
                <div className="rec-stagebar-labs">
                  {stages.map((s, i) => (
                    <span key={s.id} className={i === currentStageIndex ? 'current' : ''}>{s.name}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rec">
            <div>
              <div className="lab">Details</div>
              <div className="fld"><span className="lab">Account</span>
                <u style={{ cursor: 'pointer' }} onClick={() => navigate(`/accounts/${opp.account_id}`)}>{account?.name || '—'}</u>
              </div>
              <div className="fld"><span className="lab">Amount</span><span className="mono" style={{ fontWeight: 600 }}>{opp.amount ? `₹${opp.amount.toLocaleString('en-IN')}` : '—'}</span></div>
              <div className="fld"><span className="lab">Win probability</span>{probability != null ? `${probability}%` : '—'}</div>
              <div className="fld"><span className="lab">Expected close</span>{opp.expected_close_date || '—'}</div>
              <div className="fld" style={{ border: 0 }}>
                <span className="lab">Next follow-up</span>
                {nextFollowUp ? (
                  <div style={{ marginTop: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: nextFollowUpOverdue ? 'var(--danger, #d64545)' : 'var(--primary, #00C9A7)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span>{iconFor(nextFollowUp.activity_type)}</span>
                      <span>{new Date(nextFollowUp.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span style={{ fontSize: 11, opacity: 0.85 }}>{new Date(nextFollowUp.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {nextFollowUpOverdue && (
                      <span className="chip warn" style={{ fontSize: 9.5, padding: '1px 5px', marginTop: 3, display: 'inline-block' }}>Overdue</span>
                    )}
                  </div>
                ) : fallbackOpenActivity ? (
                  <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 2 }}>
                    {iconFor(fallbackOpenActivity.activity_type)} {fallbackOpenActivity.subject || 'Open activity'} (no date)
                  </div>
                ) : (
                  <span className="tiny mut">—</span>
                )}
              </div>
            </div>

            <div className="mid">
              {opp.source_lead_id ? (
                <div className="card" style={{ padding: '12px 14px' }}>
                  <div className="rowx sp">
                    <span className="tiny" style={{ fontWeight: 700 }}>Log / Schedule Activity</span>
                    <span className="tiny mut" style={{ fontSize: 11 }}>Next Follow-up</span>
                  </div>

                  {/* Activity Type Chips */}
                  <div className="rowx" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                    {ACTIVITY_TYPES.map((t) => (
                      <span
                        key={t.type}
                        className={`chip actchip ${activeType === t.type ? 'on' : ''}`}
                        onClick={() => setActiveType(t.type)}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>

                  {/* Subject Input */}
                  <div style={{ marginTop: 8 }}>
                    <div className="rowx sp" style={{ marginBottom: 4 }}>
                      <label className="tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        Description / Next Steps *
                      </label>
                      <span className="tiny" style={{ color: 'var(--danger, #d64545)', fontWeight: 600, fontSize: 10.5 }}>
                        Mandatory
                      </span>
                    </div>
                    <input
                      ref={activityInputRef}
                      required
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value)
                        if (activityError) setActivityError('')
                      }}
                      placeholder={`Enter what happened or what's planned for this ${activeType}... *`}
                      className="record-activity-input"
                      style={{ marginTop: 0 }}
                    />
                  </div>

                  {/* Next Follow-up Date & Time Picker */}
                  <div style={{ marginTop: 10, background: 'rgba(0, 201, 167, 0.04)', border: '1.5px solid rgba(0, 201, 167, 0.25)', borderRadius: 12, padding: '10px 12px' }}>
                    <div className="rowx sp" style={{ marginBottom: 6 }}>
                      <label className="tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        📅 Follow-up Date &amp; Time *
                      </label>
                      <span className="tiny" style={{ color: 'var(--danger, #d64545)', fontWeight: 600, fontSize: 10.5 }}>
                        Mandatory
                      </span>
                    </div>
                    
                    <input
                      type="datetime-local"
                      required
                      value={dueAt}
                      onChange={(e) => {
                        setDueAt(e.target.value)
                        if (activityError) setActivityError('')
                      }}
                      className="record-activity-datetime-input"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="rowx" style={{ marginTop: 6, gap: 5, flexWrap: 'wrap' }}>
                      <span className="tiny mut" style={{ fontSize: 10.5 }}>Quick:</span>
                      <button type="button" className="btn ghost" style={{ padding: '2px 7px', fontSize: 10.5, borderRadius: 10 }} onClick={() => setQuickDue(2)}>
                        +2 hrs
                      </button>
                      <button type="button" className="btn ghost" style={{ padding: '2px 7px', fontSize: 10.5, borderRadius: 10 }} onClick={() => setQuickDue(1, 10)}>
                        Tomorrow 10 AM
                      </button>
                      <button type="button" className="btn ghost" style={{ padding: '2px 7px', fontSize: 10.5, borderRadius: 10 }} onClick={() => setQuickDue(2, 11)}>
                        In 2 days
                      </button>
                      <button type="button" className="btn ghost" style={{ padding: '2px 7px', fontSize: 10.5, borderRadius: 10 }} onClick={() => setQuickDue(7, 10)}>
                        Next week
                      </button>
                    </div>
                  </div>

                  {/* Attachments */}
                  <label
                    className="rowx"
                    style={{
                      marginTop: 10,
                      gap: 6,
                      cursor: 'pointer',
                      border: '1px dashed var(--line, rgba(0, 201, 167, 0.35))',
                      borderRadius: 10,
                      padding: '6px 10px',
                    }}
                  >
                    <input type="file" multiple style={{ display: 'none' }} onChange={handleNewAttachmentChange} />
                    <span style={{ fontSize: 13 }}>📎</span>
                    <span className="tiny" style={{ color: 'var(--primary, #00C9A7)', fontWeight: 600 }}>
                      {newAttachments.length > 0 ? `${newAttachments.length} file(s) attached` : 'Attach files (optional)'}
                    </span>
                  </label>

                  {newAttachments.length > 0 && (
                    <div className="rowx" style={{ marginTop: 6, gap: 6, flexWrap: 'wrap' }}>
                      {newAttachments.map((file, idx) => (
                        <span key={`${file.name}-${idx}`} className="chip" style={{ fontSize: 11, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          📄 {file.name}
                          <span style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => removeNewAttachment(idx)}>✕</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {activityError && (
                    <div className="tiny" style={{ color: 'var(--danger, #d64545)', marginTop: 8, background: 'rgba(214, 69, 69, 0.08)', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(214, 69, 69, 0.2)' }}>
                      ⚠ {activityError}
                    </div>
                  )}

                  <div className="rowx sp" style={{ marginTop: 10 }}>
                    <span className="tiny">
                      Logging as <b>{ACTIVITY_TYPES.find((t) => t.type === activeType)?.label}</b>
                    </span>
                    <button className="btn pri" style={{ padding: '6px 14px', borderRadius: 16 }} onClick={addActivity}>
                      📅 Schedule follow-up ✓
                    </button>
                  </div>
                </div>
              ) : (
                // Every activity now requires a lead — this deal was
                // created directly (never converted from a lead), so
                // there's genuinely nothing to attach one to here.
                <div className="card" style={{ padding: '14px 16px' }}>
                  <span className="tiny">Log an activity</span>
                  <div className="tiny mut" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    This deal has no source lead, so activities can't be logged on it directly —
                    every activity must be tied to a lead. Log activities from the Activities page
                    against a lead instead, or convert a lead into this deal's account.
                  </div>
                </div>
              )}

              <div className="tl">
                {activities.map((a) => {
                  const isOverdue = a.status === 'open' && a.due_at && new Date(a.due_at) < new Date()
                  return (
                    <div className="tl-item" key={a.id}>
                      <div
                        className={`dot ${a.status === 'completed' ? 'g' : isOverdue ? 'warn' : ''}`}
                        onClick={() => a.status === 'open' && openCompleteModal(a)}
                        style={{ cursor: a.status === 'open' ? 'pointer' : 'default' }}
                        title={a.status === 'open' ? 'Click to complete this activity' : 'Completed'}
                      >
                        {iconFor(a.activity_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="rowx sp" style={{ gap: 8 }}>
                          <b style={{ fontSize: 12.5, textDecoration: a.status === 'completed' ? 'line-through' : 'none' }}>
                            {a.subject}
                          </b>
                          <span className={`chip ${a.status === 'completed' ? 'ok' : isOverdue ? 'risk' : 'brand'}`} style={{ fontSize: 10, padding: '1px 6px', textTransform: 'uppercase' }}>
                            {isOverdue ? 'Overdue' : a.status}
                          </span>
                        </div>

                        <div className="rowx" style={{ gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          <span className="tiny mut" style={{ textTransform: 'capitalize' }}>
                            {a.activity_type}
                          </span>
                          {a.due_at && (
                            <span className={`tiny ${isOverdue ? 'rec-overdue-tag' : 'rec-due-tag'}`} style={{ fontWeight: 600 }}>
                              📅 Follow-up: {new Date(a.due_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                          {!a.due_at && a.created_at && (
                            <span className="tiny mut">
                              Logged {new Date(a.created_at).toLocaleDateString()}
                            </span>
                          )}
                          {a.completed_at && (
                            <span className="tiny mut" style={{ color: 'var(--green, #00C9A7)' }}>
                              ✓ Done {new Date(a.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {a.summary && (
                          <div className="tiny" style={{ marginTop: 4, background: 'var(--surface2, rgba(0,0,0,0.03))', padding: '6px 8px', borderRadius: 8, fontStyle: 'italic', color: 'var(--ink)' }}>
                            💬 {a.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {activities.length === 0 && <div className="tiny mut" style={{ padding: 12 }}>No activities logged yet.</div>}
              </div>
            </div>

            <div>
              {probability != null && (
                <div className="ai-frame" style={{ padding: 13 }}>
                  <span className="ai-tag">AI</span>
                  <div className="rowx" style={{ gap: 13, marginTop: 4 }}>
                    <div className="ring" style={{ background: `conic-gradient(from -90deg, var(--green) 0 ${probability}%, var(--line) ${probability}% 100%)` }}>
                      <b>{probability}%</b><span>win</span>
                    </div>
                    <ul className="rec-ai-stats">
                      <li>{daysOpen} day{daysOpen === 1 ? '' : 's'} since created</li>
                      <li>{openActivityCount} open activit{openActivityCount === 1 ? 'y' : 'ies'}</li>
                      <li>{activities.length} total logged</li>
                    </ul>
                  </div>
                </div>
              )}

              {!tipDismissed && (
                <>
                  <div className="lab" style={{ marginTop: probability != null ? 12 : 0 }}>Next best action</div>
                  <div className="ai-frame" style={{ padding: 12, marginTop: 8 }}>
                    <span className="ai-tag">AI SUGGESTED</span>
                    <div className="tiny" style={{ marginTop: 3 }}>
                      {activities.some((a) => a.status === 'open')
                        ? 'Clear the open activity above before it goes cold.'
                        : 'Log the next touchpoint to keep this deal moving.'}
                    </div>
                    <div className="rowx" style={{ marginTop: 8, gap: 8 }}>
                      <button className="btn pri" style={{ padding: '4px 10px' }} onClick={focusActivityForm}>Do it</button>
                      <span className="tiny" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTipDismissed(true)}>Dismiss</span>
                    </div>
                  </div>
                </>
              )}

              <div className="lab" style={{ marginTop: 12 }}>Related</div>
              <div className="card" style={{ padding: '4px 10px', marginTop: 8 }}>
                <div
                  className="rec-related-row"
                  onClick={() =>
                    relatedQuotes.length > 0
                      ? // Same pattern as the Contacts row below: go to the
                        // full list, pre-filtered to this account — not
                        // straight into a single quote's details, so more
                        // than one quote for this deal is still browsable.
                        navigate('/quotesList', { state: { accountId: opp.account_id } })
                      : // No quotes for this deal yet — the plain quotes list
                        // was unfiltered and showed unrelated quotes from
                        // other accounts, which looked like a broken link.
                        // Go straight to creating one for this account instead.
                        navigate('/newQuotes', { state: { accountId: opp.account_id } })
                  }
                >
                  <span className="tiny">Quotes</span>
                  {relatedQuotes.length > 0 ? (
                    <b className="tiny">{relatedQuotes.length}</b>
                  ) : (
                    <span className="tiny" style={{ color: 'var(--primary, #00C9A7)', fontWeight: 600 }}>+ New quote</span>
                  )}
                </div>
                <div
                  className="rec-related-row"
                  onClick={() =>
                    navigate('/contacts', {
                      state: { accountFilter: opp.account_id, leadId: opp.source_lead_id },
                    })
                  }
                >
                  <span className="tiny">Contacts</span>
                  <b className="tiny">{contactsCount ?? '—'}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLostReason && (
        <div className="lead-modal-overlay" onClick={cancelLostReason}>
          <div className="lead-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="lead-modal-header">
              <div className="lead-modal-title-row">
                <div className="lead-modal-icon-badge">⚠</div>
                <div>
                  <h3>Mark as Lost</h3>
                  <span className="tiny mut">A reason is required before this deal can be marked lost</span>
                </div>
              </div>
              <button type="button" className="lead-modal-close" onClick={cancelLostReason}>✕</button>
            </div>
            <div className="title-bar" style={{ margin: '0 0 20px 0', width: 44, height: 3 }} />

            <label className="lead-modal-label">Reason *</label>
            <textarea
              autoFocus
              rows={3}
              placeholder="e.g. Went with a competitor on price"
              className="lead-modal-input"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              value={lostReasonText}
              onChange={(e) => { setLostReasonText(e.target.value); if (lostReasonError) setLostReasonError('') }}
            />
            {lostReasonError && (
              <div className="tiny" style={{ color: 'var(--danger, #d64545)', marginTop: 10 }}>{lostReasonError}</div>
            )}

            <div className="lead-modal-actions">
              <button type="button" className="btn ghost lead-modal-cancel-btn" onClick={cancelLostReason}>
                Cancel
              </button>
              <button type="button" className="btn pri lead-modal-submit-btn" onClick={confirmLostReason}>
                Confirm Lost ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {completeTarget && (
        <div className="lead-modal-overlay" onClick={closeCompleteModal}>
          <div className="lead-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="lead-modal-header">
              <div className="lead-modal-title-row">
                <div className="lead-modal-icon-badge" style={{ color: '#00C9A7', background: 'rgba(0, 201, 167, 0.12)' }}>✓</div>
                <div>
                  <h3>Complete Activity</h3>
                  <span className="tiny mut">{completeTarget.subject}</span>
                </div>
              </div>
              <button type="button" className="lead-modal-close" onClick={closeCompleteModal} disabled={submittingComplete}>✕</button>
            </div>
            <div className="title-bar" style={{ margin: '0 0 16px 0', width: 44, height: 3 }} />

            <form onSubmit={handleConfirmComplete}>
              <div style={{ marginBottom: 16 }}>
                <div className="rowx sp" style={{ marginBottom: 6 }}>
                  <label className="lead-modal-label" style={{ margin: 0 }}>Summary *</label>
                  <span className="tiny" style={{ color: 'var(--danger, #d64545)', fontWeight: 600 }}>Mandatory</span>
                </div>
                <textarea
                  autoFocus
                  required
                  rows={4}
                  placeholder="What happened, outcome, next steps..."
                  className="lead-modal-input"
                  style={{ height: 'auto', minHeight: 90, padding: '12px 16px', borderRadius: 16, resize: 'vertical', fontFamily: 'inherit' }}
                  value={completeSummary}
                  onChange={(e) => { setCompleteSummary(e.target.value); if (completeError) setCompleteError('') }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="lead-modal-label">Attachments <span className="tiny mut">(optional)</span></label>
                <label
                  style={{
                    border: '1.5px dashed var(--line, rgba(0, 201, 167, 0.35))',
                    borderRadius: 16,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  <input type="file" multiple style={{ display: 'none' }} onChange={handleCompleteAttachmentChange} />
                  <span>📎</span>
                  <span className="tiny" style={{ color: 'var(--primary, #00C9A7)', fontWeight: 600 }}>Choose files</span>
                </label>
                {completeAttachments.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {completeAttachments.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="rowx sp" style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 12px', fontSize: 12 }}>
                        <span>📄 {file.name}</span>
                        <span style={{ cursor: 'pointer' }} onClick={() => removeCompleteAttachment(idx)}>✕</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {completeError && (
                <div className="tiny" style={{ color: 'var(--danger, #d64545)', marginBottom: 12, background: 'rgba(214, 69, 69, 0.08)', padding: '8px 12px', borderRadius: 10 }}>
                  ⚠ {completeError}
                </div>
              )}

              <div className="lead-modal-actions">
                <button type="button" className="btn ghost lead-modal-cancel-btn" onClick={closeCompleteModal} disabled={submittingComplete}>Cancel</button>
                <button type="submit" className="btn pri lead-modal-submit-btn" disabled={submittingComplete || !completeSummary.trim()}>
                  {submittingComplete ? 'Saving…' : 'Confirm Completed ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function iconFor(type) {
  return { call: '☎', task: '✓', meeting: '▤', email: '✉', note: '✎' }[type] || '•'
}
