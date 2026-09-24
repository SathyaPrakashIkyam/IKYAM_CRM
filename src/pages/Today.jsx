import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { activitiesApi, dashboardApi, leadsApi, opportunitiesApi, quotesApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import '../styles/Today.css'

export default function Today() {
  const [summary, setSummary] = useState(null)
  const [tasks, setTasks] = useState([])
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [quotes, setQuotes] = useState([])
  const [pipelineTotal, setPipelineTotal] = useState(0)
  const [stageBreakdown, setStageBreakdown] = useState([])
  const [taskFilter, setTaskFilter] = useState('all')
  const [aiQuestion, setAiQuestion] = useState('')
  const [loading, setLoading] = useState(true)

  const { user, companyId } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!companyId) return
    // A newer run (company id corrected right after login) must win over an
    // older in-flight one, so a slow stale response can't overwrite fresh data.
    let cancelled = false
    setLoading(true)

    // Load all primary dashboard datasets in parallel
    Promise.allSettled([
      dashboardApi.today(companyId),
      activitiesApi.list(companyId, {}),
      leadsApi.list(companyId),
      opportunitiesApi.kanban(companyId),
      quotesApi.list(companyId),
    ]).then(([sumRes, actRes, leadRes, kanbanRes, quoteRes]) => {
      if (cancelled) return
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value)
      if (actRes.status === 'fulfilled') {
        const raw = actRes.value || []
        setTasks(raw.filter((a) => a.status === 'open'))
      }
      if (leadRes.status === 'fulfilled') {
        setLeads(leadRes.value || [])
      }
      if (kanbanRes.status === 'fulfilled') {
        const cols = kanbanRes.value || []
        const allDeals = cols.flatMap((c) =>
          (c.cards || []).map((card) => ({
            ...card,
            stageName: c.stage?.name || 'Open',
            stageColor: c.stage?.color || '#00C9A7',
          }))
        )
        const totalVal = cols.reduce((sum, c) => sum + (c.total_value || 0), 0)
        const stages = cols.map((c) => ({
          name: c.stage?.name || 'Stage',
          count: (c.cards || []).length,
          value: c.total_value || 0,
        }))
        setDeals(allDeals)
        setPipelineTotal(totalVal)
        setStageBreakdown(stages)
      }
      if (quoteRes.status === 'fulfilled') {
        setQuotes(quoteRes.value || [])
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [companyId])

  const firstName = (user?.full_name || 'there').split(' ')[0]
  const today = new Date()
  const dayLabel = today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  // Create a fast lookup map for leads
  const leadMap = useMemo(() => {
    const map = {}
    leads.forEach((l) => {
      if (l.id) map[l.id] = l
    })
    return map
  }, [leads])

  // Filter tasks by active tab
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks
    return tasks.filter((t) => (t.activity_type || '').toLowerCase() === taskFilter)
  }, [tasks, taskFilter])

  const callCount = tasks.filter((t) => t.activity_type === 'call').length
  const meetingCount = tasks.filter((t) => t.activity_type === 'meeting').length
  const todoCount = tasks.filter((t) => t.activity_type === 'task').length

  const hotLeads = leads.filter((l) => l.priority === 'Hot').length
  const recentLeads = leads.slice(0, 4)
  const topDeals = deals.slice(0, 4)

  function askAi(e) {
    e?.preventDefault?.()
    const q = aiQuestion.trim()
    if (!q) return
    window.dispatchEvent(new CustomEvent('ikyam:ai-ask', { detail: { question: q } }))
    setAiQuestion('')
  }

  return (
    <AppShell>
      <div className="ikyam-mock today-page">
        {/* Header Ribbon */}
        <div className="scr-head">
          <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)' }}>
                Good day, {firstName} 👋
              </h2>
              <div className="title-bar" style={{ margin: '8px 0 12px 0' }} />
              <div className="goal" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{dayLabel}</span>
                <span className="today-badge-dot" />
                <span className="chip brand" style={{ padding: '2px 8px', fontSize: 11 }}>
                  {tasks.length} open task{tasks.length === 1 ? '' : 's'}
                </span>
                {deals.length > 0 && (
                  <span className="chip ok" style={{ padding: '2px 8px', fontSize: 11 }}>
                    {deals.length} active deal{deals.length === 1 ? '' : 's'} · ₹{formatMoney(pipelineTotal)}
                  </span>
                )}
              </div>
            </div>

            <div className="rowx" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn ghost" style={{ borderRadius: 24, padding: '8px 16px' }} onClick={() => navigate('/activities')}>
                ⚡ Log Activity
              </button>
              <button className="btn pri" style={{ borderRadius: 24, padding: '8px 20px' }} onClick={() => navigate('/leads')}>
                ＋ New Lead
              </button>
            </div>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="frame today-main-frame" style={{ padding: 22, marginTop: 12 }}>
          <div className="today-scroll-content">
            
            {/* Top 4 KPI Metrics */}
            <div className="today-kpi-grid">
              <div className="card today-kpi-card accent-teal" onClick={() => navigate('/activities')}>
                <div className="rowx sp" style={{ marginBottom: 6 }}>
                  <span className="lab" style={{ fontSize: 11, letterSpacing: '0.6px' }}>TASKS DUE TODAY</span>
                  <span className="today-kpi-icon teal">⚡</span>
                </div>
                <div className="rowx" style={{ alignItems: 'baseline', gap: 8 }}>
                  <b className="today-kpi-val">{tasks.length}</b>
                  <span className="tiny mut">{tasks.length === 1 ? 'task open' : 'tasks open'}</span>
                </div>
              </div>

              <div className="card today-kpi-card accent-blue" onClick={() => navigate('/pipeline')}>
                <div className="rowx sp" style={{ marginBottom: 6 }}>
                  <span className="lab" style={{ fontSize: 11, letterSpacing: '0.6px' }}>OPEN PIPELINE</span>
                  <span className="today-kpi-icon blue">💼</span>
                </div>
                <div className="rowx" style={{ alignItems: 'baseline', gap: 8 }}>
                  <b className="today-kpi-val">₹{formatMoney(pipelineTotal)}</b>
                  <span className="tiny mut">{deals.length} active deal{deals.length === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="card today-kpi-card accent-amber" onClick={() => navigate('/leads')}>
                <div className="rowx sp" style={{ marginBottom: 6 }}>
                  <span className="lab" style={{ fontSize: 11, letterSpacing: '0.6px' }}>NEW & ACTIVE LEADS</span>
                  <span className="today-kpi-icon amber">🎯</span>
                </div>
                <div className="rowx" style={{ alignItems: 'baseline', gap: 8 }}>
                  <b className="today-kpi-val">{leads.length}</b>
                  {hotLeads > 0 && (
                    <span className="chip risk" style={{ padding: '2px 6px', fontSize: 11 }}>
                      🔥 {hotLeads} Hot
                    </span>
                  )}
                </div>
              </div>

              <div className="card today-kpi-card accent-purple" onClick={() => navigate('/quotesList')}>
                <div className="rowx sp" style={{ marginBottom: 6 }}>
                  <span className="lab" style={{ fontSize: 11, letterSpacing: '0.6px' }}>ACTIVE QUOTES</span>
                  <span className="today-kpi-icon purple">📑</span>
                </div>
                <div className="rowx" style={{ alignItems: 'baseline', gap: 8 }}>
                  <b className="today-kpi-val">{quotes.length}</b>
                  <span className="tiny mut">in proposal cycle</span>
                </div>
              </div>
            </div>

            {/* Main 2-Column Command Center */}
            <div className="grid today-workspace-grid" style={{ marginTop: 24, gap: 22 }}>
              
              {/* Left Column: Primary Workstream */}
              <div className="today-workstream">
                
                {/* 1. Daily Task Queue */}
                <div className="card today-section-card">
                  <div className="rowx sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
                      <b style={{ font: '600 14px var(--d)', color: 'var(--ink)' }}>Actionable Tasks</b>
                      <span className="chip brand" style={{ fontSize: 11 }}>{tasks.length}</span>
                    </div>
                    <div className="today-filter-tabs">
                      <button className={`today-tab ${taskFilter === 'all' ? 'active' : ''}`} onClick={() => setTaskFilter('all')}>
                        All ({tasks.length})
                      </button>
                      <button className={`today-tab ${taskFilter === 'call' ? 'active' : ''}`} onClick={() => setTaskFilter('call')}>
                        Calls ({callCount})
                      </button>
                      <button className={`today-tab ${taskFilter === 'meeting' ? 'active' : ''}`} onClick={() => setTaskFilter('meeting')}>
                        Meetings ({meetingCount})
                      </button>
                      <button className={`today-tab ${taskFilter === 'task' ? 'active' : ''}`} onClick={() => setTaskFilter('task')}>
                        Tasks ({todoCount})
                      </button>
                    </div>
                  </div>

                  {filteredTasks.length === 0 ? (
                    <div className="today-empty-state">
                      <span style={{ fontSize: 24 }}>🎉</span>
                      <div className="tiny mut" style={{ fontSize: 13, marginTop: 6 }}>
                        {tasks.length === 0 ? "You're completely caught up for today!" : "No tasks matching this filter."}
                      </div>
                    </div>
                  ) : (
                    <div className="today-task-list">
                      {filteredTasks.map((t) => {
                        const linkedLead = (t.lead_id && leadMap[t.lead_id]) || null
                        const leadName = t.lead_name || linkedLead?.name
                        const leadCompany = t.lead_company_name || linkedLead?.company_name
                        return (
                          <div key={t.id} className="today-task-item" onClick={() => navigate('/activities')}>
                            <div className="today-task-type-badge" data-type={t.activity_type}>
                              {iconFor(t.activity_type)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="rowx sp" style={{ gap: 8, alignItems: 'center' }}>
                                <b className="today-task-title">{t.subject}</b>
                                {t.due_at && (
                                  <span className={`chip ${isDueSoon(t.due_at) ? 'warn' : 'ghost'}`} style={{ fontSize: 11 }}>
                                    {formatDueDate(t.due_at)}
                                  </span>
                                )}
                              </div>
                              <div className="tiny mut" style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {leadName && (
                                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                    👤 {leadName}
                                  </span>
                                )}
                                {leadCompany && <span>({leadCompany})</span>}
                                {t.description && <span>· {t.description}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="rowx" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                    <button className="btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => navigate('/activities')}>
                      View all activities →
                    </button>
                  </div>
                </div>

                {/* 2. Top Active Opportunities */}
                <div className="card today-section-card" style={{ marginTop: 18 }}>
                  <div className="rowx sp" style={{ marginBottom: 12 }}>
                    <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
                      <b style={{ font: '600 14px var(--d)', color: 'var(--ink)' }}>Active Opportunities</b>
                      <span className="chip ok" style={{ fontSize: 11 }}>{deals.length}</span>
                    </div>
                    <button className="btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => navigate('/pipeline')}>
                      Kanban Board →
                    </button>
                  </div>

                  {topDeals.length === 0 ? (
                    <div className="today-empty-state">
                      <span style={{ fontSize: 24 }}>💼</span>
                      <div className="tiny mut" style={{ fontSize: 13, marginTop: 6 }}>
                        No open opportunities in pipeline yet. Convert a lead to start tracking deals.
                      </div>
                    </div>
                  ) : (
                    <div className="today-deals-list">
                      {topDeals.map((d) => (
                        <div key={d.id} className="today-deal-row" onClick={() => navigate(`/record/${d.id}`)}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <b className="today-deal-name">{d.title || d.name || 'Opportunity'}</b>
                            {d.account_name && (
                              <div className="tiny mut" style={{ marginTop: 2 }}>
                                {d.account_name}
                              </div>
                            )}
                          </div>
                          <div className="rowx" style={{ gap: 12, alignItems: 'center' }}>
                            <span className="chip" style={{ background: `${d.stageColor || '#00C9A7'}15`, borderColor: d.stageColor || '#00C9A7', color: d.stageColor || '#00C9A7', fontWeight: 600, fontSize: 11 }}>
                              {d.stageName}
                            </span>
                            <b style={{ font: '600 13.5px var(--d)', color: 'var(--ink)' }}>
                              ₹{Number(d.amount || 0).toLocaleString('en-IN')}
                            </b>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Recent Leads Feed */}
                <div className="card today-section-card" style={{ marginTop: 18 }}>
                  <div className="rowx sp" style={{ marginBottom: 12 }}>
                    <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
                      <b style={{ font: '600 14px var(--d)', color: 'var(--ink)' }}>Recent Inbound Leads</b>
                      <span className="chip brand" style={{ fontSize: 11 }}>{leads.length}</span>
                    </div>
                    <button className="btn ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => navigate('/leads')}>
                      All Leads →
                    </button>
                  </div>

                  {recentLeads.length === 0 ? (
                    <div className="today-empty-state">
                      <span style={{ fontSize: 24 }}>🎯</span>
                      <div className="tiny mut" style={{ fontSize: 13, marginTop: 6 }}>
                        No leads captured yet. Click "+ New Lead" to create one.
                      </div>
                    </div>
                  ) : (
                    <div className="today-leads-list">
                      {recentLeads.map((l) => (
                        <div key={l.id} className="today-lead-row" onClick={() => navigate('/leads')}>
                          <div className="today-lead-avatar">
                            {l.name ? l.name.charAt(0).toUpperCase() : 'L'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="rowx" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <b className="today-lead-name">{l.name}</b>
                              {l.designation && <span className="tiny mut">({l.designation})</span>}
                            </div>
                            <div className="tiny mut" style={{ marginTop: 2 }}>
                              {[l.company_name, formatSourceLabel(l.source)].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
                            {l.priority && (
                              <span className={`lead-priority-badge ${(l.priority || '').toLowerCase()}`} style={{ fontSize: 11 }}>
                                {l.priority === 'Hot' ? '🔥 Hot' : l.priority === 'Warm' ? '⚡ Warm' : '❄️ Cold'}
                              </span>
                            )}
                            <span className="chip ghost" style={{ fontSize: 11 }}>
                              {l.status || 'new'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: AI Insights & Quick Hub */}
              <div className="today-side-column">
                
                {/* 1. Ikyam AI Focus Card */}
                <div className="ai-frame today-ai-copilot-card">
                  <div className="rowx sp" style={{ marginBottom: 8 }}>
                    <span className="ai-tag">✨ IKYAM AI</span>
                    <span className="tiny mut">Live Brief</span>
                  </div>
                  <div className="today-ai-text">
                    {summary?.ai_narrative || 'Analyzing your sales pipeline and activity cadence…'}
                  </div>

                  <form className="today-ai-input-row" onSubmit={askAi}>
                    <input
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder='Ask Ikyam AI: "Which leads are hottest today?"'
                      className="today-ai-input"
                    />
                    <button className="btn pri" disabled={!aiQuestion.trim()} style={{ borderRadius: 8, padding: '6px 12px' }}>
                      Ask
                    </button>
                  </form>
                </div>

                {/* 2. Pipeline Health Stage Strip */}
                {stageBreakdown.length > 0 && (
                  <div className="card today-section-card" style={{ marginTop: 18 }}>
                    <div className="rowx sp" style={{ marginBottom: 10 }}>
                      <b style={{ font: '600 13.5px var(--d)', color: 'var(--ink)' }}>Pipeline Stage Health</b>
                      <span className="tiny mut">{deals.length} total deals</span>
                    </div>

                    <div className="today-stage-bars">
                      {stageBreakdown.map((st) => {
                        const pct = deals.length > 0 ? Math.round((st.count / deals.length) * 100) : 0
                        return (
                          <div key={st.name} className="today-stage-item">
                            <div className="rowx sp" style={{ fontSize: 12, marginBottom: 4 }}>
                              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{st.name}</span>
                              <span className="tiny mut">{st.count} ({pct}%)</span>
                            </div>
                            <div className="today-stage-track">
                              <div
                                className="today-stage-fill"
                                style={{ width: `${pct}%`, background: pct > 0 ? 'linear-gradient(90deg, #00C9A7, #0072CE)' : 'transparent' }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Quick Navigation Hub */}
                <div className="card today-section-card" style={{ marginTop: 18 }}>
                  <div className="lab" style={{ marginBottom: 12, fontSize: 12 }}>QUICK NAVIGATION</div>
                  <div className="today-nav-grid">
                    <QuickLink label="Leads" icon="🎯" subtitle="Manage leads" onClick={() => navigate('/leads')} />
                    <QuickLink label="Pipeline" icon="📊" subtitle="Track stages" onClick={() => navigate('/pipeline')} />
                    <QuickLink label="Accounts" icon="🏢" subtitle="Client accounts" onClick={() => navigate('/accounts')} />
                    <QuickLink label="Contacts" icon="👥" subtitle="Stakeholders" onClick={() => navigate('/contacts')} />
                    <QuickLink label="Quotes" icon="📑" subtitle="Proposals & pricing" onClick={() => navigate('/quotesList')} />
                    <QuickLink label="Activities" icon="⚡" subtitle="Calls & tasks" onClick={() => navigate('/activities')} />
                  </div>
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
    <div className="today-quick-link-card" onClick={onClick}>
      <div className="today-quick-icon-wrap">{icon}</div>
      <div>
        <b className="today-quick-title">{label}</b>
        <span className="today-quick-subtitle">{subtitle}</span>
      </div>
    </div>
  )
}

function iconFor(type) {
  const t = (type || '').toLowerCase()
  if (t === 'call') return '📞'
  if (t === 'meeting') return '📅'
  if (t === 'email') return '✉'
  return '📝'
}

function formatMoney(num) {
  const n = Number(num || 0)
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString('en-IN')
}

function formatSourceLabel(src) {
  if (!src) return 'Direct'
  const map = { manual: 'Manual', web: 'Web', referral: 'Referral', event: 'Event', partner: 'Partner', other: 'Other' }
  return map[src.toLowerCase()] || (src.charAt(0).toUpperCase() + src.slice(1))
}

function formatDueDate(dueAt) {
  if (!dueAt) return ''
  const d = new Date(dueAt)
  const now = new Date()
  const diffDays = Math.round((d - now) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Due Today'
  if (diffDays === 1) return 'Due Tomorrow'
  if (diffDays < 0) return `${Math.abs(diffDays)}d Overdue`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isDueSoon(dueAt) {
  if (!dueAt) return false
  const d = new Date(dueAt)
  const now = new Date()
  return d <= now || Math.round((d - now) / (1000 * 60 * 60 * 24)) <= 0
}
