import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { accountsApi, activitiesApi, opportunitiesApi } from '../api/endpoints'

const ACTIVITY_TYPES = [
  { type: 'call', label: '☎ Call' },
  { type: 'task', label: '✓ Task' },
  { type: 'meeting', label: '▤ Meeting' },
  { type: 'email', label: '✉ Email' },
]

export default function Record() {
  const { id } = useParams()
  const [opp, setOpp] = useState(null)
  const [account, setAccount] = useState(null)
  const [activities, setActivities] = useState([])
  const [activeType, setActiveType] = useState('call')
  const [subject, setSubject] = useState('')
  const navigate = useNavigate()

  function loadActivities() {
    activitiesApi.forRecord('opportunity', id).then(setActivities)
  }

  useEffect(() => {
    opportunitiesApi.get(id).then((o) => {
      setOpp(o)
      accountsApi.get(o.account_id).then(setAccount)
    })
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addActivity() {
    const text = subject.trim() || `${activeType} logged`
    await activitiesApi.create(opp.company_id, {
      activity_type: activeType,
      subject: text,
      related_object_type: 'opportunity',
      related_record_id: id,
    })
    setSubject('')
    loadActivities()
  }

  async function completeActivity(activityId) {
    await activitiesApi.complete(activityId)
    loadActivities()
  }

  async function closeDeal(outcome) {
    const updated = await opportunitiesApi.close(id, { outcome })
    setOpp(updated)
  }

  if (!opp) {
    return <AppShell><div className="tiny">Loading…</div></AppShell>
  }

  return (
    <AppShell>
      <div className="scr-head">
        <h2>{opp.name}</h2>
        <span className="goal">{opp.opportunity_no} · {opp.status}</span>
      </div>

      <div className="frame">
        <div className="rec">
          <div>
            <div className="fld"><span className="lab">Account</span>
              <u style={{ cursor: 'pointer' }} onClick={() => navigate(`/accounts/${opp.account_id}`)}>{account?.name || '—'}</u>
            </div>
            <div className="fld"><span className="lab">Amount</span>{opp.amount ? `₹${opp.amount.toLocaleString('en-IN')}` : '—'}</div>
            <div className="fld"><span className="lab">Win probability</span>{opp.win_probability ?? '—'}%</div>
            <div className="fld" style={{ border: 0 }}><span className="lab">Expected close</span>{opp.expected_close_date || '—'}</div>

            {opp.status === 'open' && (
              <div className="rowx" style={{ marginTop: 14 }}>
                <button className="btn pri" onClick={() => closeDeal('won')}>Mark won</button>
                <button className="btn" onClick={() => closeDeal('lost')}>Mark lost</button>
              </div>
            )}
          </div>

          <div className="mid">
            <div className="card" style={{ padding: '10px 12px' }}>
              <span className="tiny">Log an activity</span>
              <div className="rowx" style={{ marginTop: 8, flexWrap: 'wrap' }}>
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
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What happened?"
                style={{ width: '100%', marginTop: 8, padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', font: '500 12.5px var(--b)' }}
              />
              <div className="rowx sp" style={{ marginTop: 8 }}>
                <span />
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
            <div className="lab">Next best action</div>
            <div className="ai-frame" style={{ padding: 12, marginTop: 8 }}>
              <span className="ai-tag">AI SUGGESTED</span>
              <div className="tiny" style={{ marginTop: 3 }}>Follow up on the outstanding quote before it goes cold.</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function iconFor(type) {
  return { call: '☎', task: '✓', meeting: '▤', email: '✉', note: '✎' }[type] || '•'
}
