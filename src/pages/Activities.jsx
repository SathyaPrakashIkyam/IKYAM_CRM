import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { activitiesApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'call', label: '☎ Calls' },
  { key: 'task', label: '✓ Tasks' },
  { key: 'meeting', label: '▤ Meetings' },
]

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ activity_type: 'call', subject: '' })
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    activitiesApi.list(companyId, filter === 'all' ? {} : { activity_type: filter }).then(setActivities)
  }

  useEffect(load, [companyId, filter])

  async function createActivity(e) {
    e.preventDefault()
    await activitiesApi.create(companyId, form)
    setForm({ activity_type: 'call', subject: '' })
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
      <div className="scr-head"><h2>Activities</h2><span className="goal">Every call, task, and meeting — one queue.</span></div>

      <div className="topbar" style={{ border: 0, background: 'transparent', padding: '0 0 12px' }}>
        <div className="rowx">
          {FILTERS.map((f) => (
            <span key={f.key} className={`chip actchip ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</span>
          ))}
        </div>
        <button className="btn pri" onClick={() => setShowNew((v) => !v)}>＋ New activity</button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={createActivity}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} style={fieldInput}>
                <option value="call">Call</option>
                <option value="task">Task</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
              </select>
              <input required placeholder="Subject" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} style={fieldInput} />
            </div>
            <div className="rowx sp" style={{ marginTop: 9 }}>
              <span />
              <span className="rowx">
                <button type="button" className="btn ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button className="btn pri">Add to queue</button>
              </span>
            </div>
          </form>
        </div>
      )}

      <ActivitySection title="Overdue" items={overdue} onComplete={complete} tone="risk" />
      <ActivitySection title="Open" items={open} onComplete={complete} />
      <ActivitySection title="Completed" items={done} onComplete={complete} />
    </AppShell>
  )
}

function ActivitySection({ title, items, onComplete, tone }) {
  if (items.length === 0) return null
  return (
    <>
      <div className="lab" style={{ marginTop: 16, color: tone ? `var(--${tone === 'risk' ? 'orange' : 'ink'}-ink)` : undefined }}>{title}</div>
      {items.map((a) => (
        <div className="card hov" key={a.id} style={{ marginTop: 8, padding: '10px 12px' }}>
          <div className="rowx sp">
            <div className="rowx">
              <span className="dot" style={{ cursor: a.status === 'open' ? 'pointer' : 'default' }} onClick={() => a.status === 'open' && onComplete(a.id)}>
                {{ call: '☎', task: '✓', meeting: '▤', email: '✉' }[a.activity_type] || '•'}
              </span>
              <div>
                <b style={{ fontSize: 12.5, textDecoration: a.status === 'completed' ? 'line-through' : 'none' }}>{a.subject}</b>
                <div className="tiny">{a.activity_type}</div>
              </div>
            </div>
            {a.due_at && <span className="chip warn">{new Date(a.due_at).toLocaleDateString()}</span>}
          </div>
        </div>
      ))}
    </>
  )
}

const fieldInput = {
  padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 8,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12.5px var(--b)',
}
