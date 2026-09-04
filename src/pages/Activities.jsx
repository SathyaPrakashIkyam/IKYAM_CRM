import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { activitiesApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import '../styles/Activities.css'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'call', label: '☎ Calls' },
  { key: 'task', label: '✓ Tasks' },
  { key: 'meeting', label: '▤ Meetings' },
]

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: '☎ Phone Call' },
  { value: 'task', label: '✓ Task' },
  { value: 'meeting', label: '📅 Meeting' },
  { value: 'email', label: '✉ Email' },
]

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ activity_type: 'call', subject: '', due_at: '' })
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    activitiesApi.list(companyId, filter === 'all' ? {} : { activity_type: filter }).then(setActivities)
  }

  useEffect(load, [companyId, filter])

  async function createActivity(e) {
    e.preventDefault()
    await activitiesApi.create(companyId, form)
    setForm({ activity_type: 'call', subject: '', due_at: '' })
    setShowNew(false)
    load()
  }

  async function complete(id) {
    await activitiesApi.complete(id)
    load()
  }

  const overdue = activities.filter((a) => a.status === 'open' && a.due_at && new Date(a.due_at) < new Date())
  const open = activities.filter((a) => a.status === 'open' && !overdue.includes(a))
  const done = activities.filter((a) => a.status === 'completed')

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
              onComplete={complete}
              tone="risk"
            />
            <ActivitySection
              title="Today & Open"
              badgeText={`${open.length} pending`}
              items={open}
              onComplete={complete}
            />
            <ActivitySection
              title="Completed"
              badgeText={`${done.length} finished`}
              items={done}
              onComplete={complete}
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
            <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
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
                    <label className="lead-modal-label">Due Date</label>
                    <input
                      type="date"
                      className="lead-modal-input"
                      value={form.due_at || ''}
                      onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                    />
                  </div>

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
      </div>
    </AppShell>
  )
}

function ActivitySection({ title, badgeText, items, onComplete, tone, isDone }) {
  if (items.length === 0) return null
  return (
    <div className="activity-section">
      <div className="activity-section-header">
        <span className={`activity-section-title ${tone === 'risk' ? 'risk' : ''}`}>{title}</span>
        <span className={`activity-section-badge ${tone === 'risk' ? 'risk' : ''}`}>{badgeText}</span>
      </div>
      <div className="activity-cards-list">
        {items.map((a) => (
          <div className={`card hov activity-card ${isDone ? 'done' : ''}`} key={a.id}>
            <div className="rowx sp" style={{ width: '100%' }}>
              <div className="rowx" style={{ gap: 14 }}>
                <span
                  className="activity-icon-badge"
                  style={{ cursor: a.status === 'open' ? 'pointer' : 'default' }}
                  onClick={() => a.status === 'open' && onComplete(a.id)}
                  title={a.status === 'open' ? 'Click to complete' : 'Completed'}
                >
                  {typeIcon(a.activity_type)}
                </span>
                <div>
                  <b className={`activity-subject ${a.status === 'completed' ? 'completed' : ''}`}>
                    {a.subject}
                  </b>
                  <div className="rowx" style={{ gap: 8, marginTop: 3 }}>
                    <span className="tiny mut" style={{ textTransform: 'capitalize' }}>{a.activity_type}</span>
                    {a.entity_type && <span className="tiny mut">· {a.entity_type}</span>}
                  </div>
                </div>
              </div>

              <div className="rowx" style={{ gap: 10 }}>
                {a.due_at && (
                  <span className={`chip ${tone === 'risk' ? 'danger' : 'warn'}`}>
                    {new Date(a.due_at).toLocaleDateString()}
                  </span>
                )}
                {a.status === 'open' && (
                  <button
                    type="button"
                    className="activity-complete-btn"
                    onClick={() => onComplete(a.id)}
                  >
                    ✓ Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function typeIcon(type) {
  return { call: '☎', task: '✓', meeting: '📅', email: '✉' }[type] || '⚡'
}
