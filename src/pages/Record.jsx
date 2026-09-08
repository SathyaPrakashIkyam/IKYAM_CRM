import { useEffect, useRef, useState } from 'react'
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
  const [stages, setStages] = useState([])
  const [relatedQuotes, setRelatedQuotes] = useState([])
  const [contactsCount, setContactsCount] = useState(null)
  const [primaryContactEmail, setPrimaryContactEmail] = useState('')
  const [tipDismissed, setTipDismissed] = useState(false)
  const [showLostReason, setShowLostReason] = useState(false)
  const [lostReasonText, setLostReasonText] = useState('')
  const [lostReasonError, setLostReasonError] = useState('')
  const navigate = useNavigate()
  const activityInputRef = useRef(null)

  function loadActivities() {
    activitiesApi.forRecord('opportunity', id).then(setActivities)
  }

  useEffect(() => {
    opportunitiesApi.get(id).then((o) => {
      setOpp(o)
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
      // count reflects every quote actually tied to this deal — the general
      // list is scoped to the logged-in user's own quotes for non-admins,
      // which would under-count quotes owned by a teammate.
      accountsApi.quotes(o.account_id).then((qs) => {
        setRelatedQuotes(qs.filter((q) => q.opportunity_id === o.id))
      }).catch(() => {})
    })
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function focusActivityForm() {
    activityInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    activityInputRef.current?.focus()
  }

  async function addActivity() {
    const text = subject.trim() || `${activeType} logged`
    const activity = await activitiesApi.create(opp.company_id, {
      activity_type: activeType,
      subject: text,
      related_object_type: 'opportunity',
      related_record_id: id,
    })

    // Meeting/email activities redirect straight into the logged-in user's
    // own provider (Google or Outlook/Teams, detected from their login
    // email) with the invite/compose window prefilled — no manual picker.
    if (activeType === 'meeting' || activeType === 'email') {
      openActivityInProvider(activity, provider, primaryContactEmail)
    }

    setSubject('')
    loadActivities()
  }

  async function completeActivity(activityId) {
    await activitiesApi.complete(activityId)
    loadActivities()
  }

  async function closeDeal(outcome) {
    if (outcome === 'lost') {
      // Marking a deal lost always stops to collect a reason first — the
      // API rejects a lost close without one anyway, so this just surfaces
      // that requirement as a proper form instead of a failed request.
      setLostReasonText('')
      setLostReasonError('')
      setShowLostReason(true)
      return
    }
    const updated = await opportunitiesApi.close(id, { outcome })
    setOpp(updated)
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
                <button className="btn ghost" style={{ fontWeight: 700 }} onClick={() => navigate('/quotes')}>New quote</button>
                {opp.status === 'open' && (
                  <>
                    <button className="btn pri" onClick={() => closeDeal('won')}>Mark won</button>
                    <button className="btn" onClick={() => closeDeal('lost')}>Mark lost</button>
                  </>
                )}
              </div>
            </div>

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
              <div className="fld" style={{ border: 0 }}><span className="lab">Expected close</span>{opp.expected_close_date || '—'}</div>
            </div>

            <div className="mid">
              <div className="card" style={{ padding: '10px 12px' }}>
                <span className="tiny">Log an activity</span>
                <div className="rowx" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                  {ACTIVITY_TYPES.map((t) => (
                    <span key={t.type} className={`chip actchip ${activeType === t.type ? 'on' : ''}`} onClick={() => setActiveType(t.type)}>
                      {t.label}
                    </span>
                  ))}
                </div>
                <input
                  ref={activityInputRef}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What happened?"
                  className="record-activity-input"
                />
                <div className="rowx sp" style={{ marginTop: 8 }}>
                  <span className="tiny">Logging as <b>{ACTIVITY_TYPES.find((t) => t.type === activeType)?.label}</b></span>
                  <button className="btn pri" style={{ padding: '5px 11px' }} onClick={addActivity}>＋ Add activity</button>
                </div>
              </div>

              <div className="tl">
                {activities.map((a) => (
                  <div className="tl-item" key={a.id}>
                    <div className={`dot ${a.status === 'completed' ? 'g' : ''}`} onClick={() => a.status === 'open' && completeActivity(a.id)} style={{ cursor: a.status === 'open' ? 'pointer' : 'default' }}>
                      {iconFor(a.activity_type)}
                    </div>
                    <div>
                      <b style={{ fontSize: 12.5, textDecoration: a.status === 'completed' ? 'line-through' : 'none' }}>{a.subject}</b>
                      <div className="tiny">{a.activity_type} · {a.status}</div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && <div className="tiny">No activities logged yet.</div>}
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
                <div className="rec-related-row" onClick={() => navigate('/quotes')}>
                  <span className="tiny">Quotes</span>
                  <b className="tiny">{relatedQuotes.length}{relatedQuotes[0] ? ` — ${relatedQuotes[0].doc_num}` : ''}</b>
                </div>
                <div className="rec-related-row" onClick={() => navigate(`/accounts/${opp.account_id}`)}>
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
    </AppShell>
  )
}

function iconFor(type) {
  return { call: '☎', task: '✓', meeting: '▤', email: '✉', note: '✎' }[type] || '•'
}
