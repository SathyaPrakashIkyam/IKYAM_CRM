import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { activitiesApi, dashboardApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import './Today.css'

export default function Today() {
  const [summary, setSummary] = useState(null)
  const [tasks, setTasks] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()
  const companyId = currentCompanyId()

  useEffect(() => {
    if (!companyId) return
    dashboardApi.today(companyId).then(setSummary).catch(() => {})
    activitiesApi
      .list(companyId, {})
      .then((rows) => setTasks((rows || []).filter((a) => a.status === 'open').slice(0, 5)))
      .catch(() => {})
  }, [companyId])

  const firstName = (user?.full_name || 'there').split(' ')[0]
  const today = new Date()
  const dayLabel = today.toLocaleDateString(undefined, { weekday: 'long' })

  return (
    <AppShell
      aiPanel={
        <div className="ikyam-mock">
          <div className="rowx sp" style={{ marginBottom: 4 }}>
            <span className="lab">Ask AI</span>
          </div>
          <div className="ai-frame" style={{ padding: '13px 15px' }}>
            <span className="ai-tag">AI PRIORITY</span>
            <div className="tiny" style={{ marginTop: 6, lineHeight: 1.6 }}>
              {summary?.ai_narrative || 'Loading your pipeline brief…'}
            </div>
          </div>
        </div>
      }
    >
      <div className="ikyam-mock today-page">
        <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ font: '600 18px var(--d)' }}>Good day, {firstName}</div>
            <div className="tiny">
              {dayLabel} · {tasks.length} open task{tasks.length === 1 ? '' : 's'}
            </div>
          </div>
          <span className="rowx">
            <button className="btn pri" onClick={() => navigate('/leads')}>＋ New lead</button>
          </span>
        </div>

        <div className="kpis" style={{ marginTop: 16 }}>
          {(summary?.kpis || []).map((k) => (
            <div className="card kpi" key={k.label}>
              <span className="tiny">{k.label}</span>
              <b style={{ display: 'block', font: '600 21px var(--d)', marginTop: 4 }}>{k.value}</b>
            </div>
          ))}
          {!summary && <div className="tiny">Loading…</div>}
        </div>

        <div className="grid today-cols" style={{ marginTop: 18 }}>
          <div>
            <div className="lab">My tasks</div>
            {tasks.length === 0 && <div className="tiny" style={{ marginTop: 8 }}>Nothing open — you're caught up.</div>}
            {tasks.map((t) => (
              <div key={t.id} className="card hov today-task" onClick={() => navigate('/activities')}>
                <span className="rowx sp">
                  <span>{iconFor(t.activity_type)} {t.subject}</span>
                  {t.due_at && <span className="chip warn">{new Date(t.due_at).toLocaleDateString()}</span>}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div className="lab">Quick links</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 8 }}>
              <QuickLink label="Leads" onClick={() => navigate('/leads')} />
              <QuickLink label="Pipeline" onClick={() => navigate('/pipeline')} />
              <QuickLink label="Accounts" onClick={() => navigate('/accounts')} />
              <QuickLink label="Activities" onClick={() => navigate('/activities')} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function QuickLink({ label, onClick }) {
  return (
    <div className="card hov" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={onClick}>
      <b style={{ fontSize: 12.5 }}>{label}</b>
    </div>
  )
}

function iconFor(type) {
  return { call: '☎', task: '✓', meeting: '▤', email: '✉' }[type] || '•'
}
