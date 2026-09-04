import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { activitiesApi, dashboardApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import '../styles/Today.css'

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
  const dayLabel = today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <AppShell
      aiPanel={
        <div className="ikyam-mock">
          <div className="rowx sp" style={{ marginBottom: 8 }}>
            <span className="lab">Ask AI</span>
          </div>
          <div className="ai-frame" style={{ padding: '16px 18px' }}>
            <span className="ai-tag">AI PRIORITY</span>
            <div className="tiny" style={{ marginTop: 8, lineHeight: 1.65, color: 'var(--ink)' }}>
              {summary?.ai_narrative || 'Loading your pipeline brief…'}
            </div>
          </div>
        </div>
      }
    >
      <div className="ikyam-mock today-page">
        <div className="scr-head">
          <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)' }}>
                Good day, {firstName} 👋
              </h2>
              <div className="title-bar" style={{ margin: '8px 0 12px 0' }} />
              <div className="goal" style={{ marginTop: 2 }}>
                {dayLabel} · {tasks.length} open task{tasks.length === 1 ? '' : 's'} requiring attention
              </div>
            </div>
            <div className="rowx" style={{ gap: 10 }}>
              <button className="btn ghost" style={{ borderRadius: 24, padding: '8px 16px' }} onClick={() => navigate('/activities')}>
                ⚡ My Activities
              </button>
              <button className="btn pri" style={{ borderRadius: 24, padding: '8px 20px' }} onClick={() => navigate('/leads')}>
                ＋ New Lead
              </button>
            </div>
          </div>

          {/* <div className="title-bar" style={{ margin: '8px 0 12px 0' }} /> */}
        </div>

        <div className="frame" style={{ padding: 22, marginTop: 12 }}>
          <div className="today-scroll-content">
           

            <div className="kpis">
              {(summary?.kpis || []).map((k, idx) => (
                <div className="card kpi today-kpi-card" key={k.label || idx}>
                  <div className="rowx sp" style={{ marginBottom: 6 }}>
                    <span className="lab" style={{ fontSize: 11, letterSpacing: '0.6px' }}>{k.label}</span>
                    <span className="today-kpi-icon">{kpiIcon(k.label)}</span>
                  </div>
                  <b style={{ display: 'block', font: '800 26px/1.2 var(--d)', color: 'var(--ink)' }}>{k.value}</b>
                </div>
              ))}
              {!summary && <div className="tiny" style={{ padding: 12 }}>Loading metric summary…</div>}
            </div>

            <div className="grid today-cols" style={{ marginTop: 24, gap: 22 }}>
              <div>
                <div className="rowx sp" style={{ marginBottom: 12 }}>
                  <div className="lab" style={{ fontSize: 12.5 }}>My open tasks ({tasks.length})</div>
                  <button className="btn ghost" style={{ padding: '3px 10px', fontSize: 11.5 }} onClick={() => navigate('/activities')}>View all →</button>
                </div>
                {tasks.length === 0 && (
                  <div className="card" style={{ padding: '20px 24px', borderRadius: 20, textAlign: 'center' }}>
                    <div className="tiny mut" style={{ fontSize: 13 }}>🎉 Nothing open — you're completely caught up for today!</div>
                  </div>
                )}
                {tasks.map((t) => (
                  <div key={t.id} className="card hov today-task" onClick={() => navigate('/activities')}>
                    <div className="rowx sp">
                      <div className="rowx" style={{ gap: 12 }}>
                        <span className="today-task-badge">{iconFor(t.activity_type)}</span>
                        <div>
                          <b style={{ display: 'block', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--d)' }}>{t.subject}</b>
                          {t.entity_type && <span className="tiny mut">{t.entity_type}</span>}
                        </div>
                      </div>
                      {t.due_at && <span className="chip warn">{new Date(t.due_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="lab" style={{ marginBottom: 12, fontSize: 12.5 }}>Quick navigation</div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  <QuickLink label="Leads" icon="🎯" subtitle="Manage incoming leads" onClick={() => navigate('/leads')} />
                  <QuickLink label="Pipeline" icon="📊" subtitle="Track deal stages" onClick={() => navigate('/pipeline')} />
                  <QuickLink label="Accounts" icon="🏢" subtitle="Client accounts" onClick={() => navigate('/accounts')} />
                  <QuickLink label="Activities" icon="⚡" subtitle="Tasks & meetings" onClick={() => navigate('/activities')} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function QuickLink({ label, icon, subtitle, onClick }) {
  return (
    <div className="card hov today-quick-link" onClick={onClick}>
      <div className="today-quick-icon">{icon}</div>
      <b style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--d)', marginTop: 6 }}>{label}</b>
      <span className="tiny mut" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>{subtitle}</span>
    </div>
  )
}

function iconFor(type) {
  return { call: '☎', task: '✓', meeting: '▤', email: '✉' }[type] || '•'
}

function kpiIcon(label = '') {
  const l = label.toLowerCase()
  if (l.includes('task') || l.includes('due')) return '⚡'
  if (l.includes('op') || l.includes('deal')) return '💼'
  if (l.includes('lead')) return '🎯'
  return '📈'
}
