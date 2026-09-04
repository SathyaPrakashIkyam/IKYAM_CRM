import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { dashboardApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import '../styles/Dashboard.css'

const MIX_COLORS = ['var(--green)', 'var(--amber)', 'var(--orange)', 'var(--primary)', 'var(--mut)', 'var(--faint)']

function DeltaBadge({ kpi }) {
  if (!kpi.delta) return null
  const color = kpi.direction === 'up' ? 'var(--green-ink)' : kpi.direction === 'down' ? 'var(--orange-ink)' : 'var(--mut)'
  const arrow = kpi.direction === 'up' ? '▲' : kpi.direction === 'down' ? '▼' : '·'
  return <span className="tiny" style={{ color, marginLeft: 6 }}>{arrow} {kpi.delta}</span>
}

function BookingsChart({ points }) {
  const max = Math.max(1, ...points.map((p) => p.value))
  return (
    <div className="dash-bars">
      {points.map((p, i) => (
        <div className="dash-bar-col" key={i} title={`${p.label}: ₹${p.value.toLocaleString('en-IN')}`}>
          <div className="dash-bar" style={{ height: `${Math.max(3, Math.round((p.value / max) * 100))}%` }} />
          <span className="tiny mut">{p.label}</span>
        </div>
      ))}
    </div>
  )
}

function PipelineMixDonut({ slices, total }) {
  if (!slices.length || total === 0) {
    return <div className="tiny mut">No open pipeline to break down yet.</div>
  }
  let acc = 0
  const stops = slices.map((s, i) => {
    const from = acc
    acc += s.pct
    return `${MIX_COLORS[i % MIX_COLORS.length]} ${from}% ${acc}%`
  })
  return (
    <div className="rowx" style={{ gap: 18, alignItems: 'center' }}>
      <div className="dash-donut" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
        <div className="dash-donut-hole">
          <b style={{ fontSize: 13 }}>₹{total >= 100000 ? `${(total / 100000).toFixed(1)}L` : total.toLocaleString('en-IN')}</b>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map((s, i) => (
          <span key={s.label} className="chip" style={{ borderColor: MIX_COLORS[i % MIX_COLORS.length] }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: MIX_COLORS[i % MIX_COLORS.length], display: 'inline-block', marginRight: 6 }} />
            {s.label} {s.pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

function Funnel({ steps }) {
  const max = Math.max(1, ...steps.map((s) => s.count))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {steps.map((s) => (
        <div key={s.label} className="dash-funnel-row">
          <div className="dash-funnel-bar" style={{ width: `${Math.max(6, Math.round((s.count / max) * 100))}%` }}>
            <span>{s.label}</span>
          </div>
          <b className="tiny">{s.count}</b>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('this_quarter')
  const [question, setQuestion] = useState('')
  const companyId = currentCompanyId()

  useEffect(() => {
    if (!companyId) return
    setData(null)
    dashboardApi.analytics(companyId, period).then(setData)
  }, [companyId, period])

  function askFollowUp(e) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return
    window.dispatchEvent(new CustomEvent('ikyam:ai-ask', { detail: { question: q } }))
    setQuestion('')
  }

  const mixTotal = data ? data.pipeline_mix.reduce((sum, m) => sum + m.value, 0) : 0

  return (
    <AppShell>
      <div className="ikyam-mock dashboard-page">
        <div className="scr-head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2>Sales dashboard</h2>
            <span className="goal">KPIs, trend, funnel, mix — with the AI summary reading the charts for you.</span>
          </div>
          <select className="rpt-select" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ marginLeft: 'auto' }}>
            <option value="this_quarter">This quarter</option>
            <option value="last_quarter">Last quarter</option>
          </select>
        </div>

        <div className="kpis dashboard-kpis">
          {(data?.kpis || []).map((k) => (
            <div className="card kpi" key={k.label}>
              <span className="tiny">{k.label}</span>
              <b style={{ display: 'block', font: '600 21px var(--d)', marginTop: 4 }}>
                {k.value}<DeltaBadge kpi={k} />
              </b>
            </div>
          ))}
          {!data && <div className="tiny">Loading…</div>}
        </div>

        {data && (
          <div className="dash-cols">
            <div className="card dash-card">
              <b style={{ font: '600 13.5px var(--d)' }}>Bookings by week</b>
              <BookingsChart points={data.bookings_by_week} />
            </div>
            <div className="card dash-card">
              <b style={{ font: '600 13.5px var(--d)' }}>Pipeline mix</b>
              <div style={{ marginTop: 10 }}>
                <PipelineMixDonut slices={data.pipeline_mix} total={mixTotal} />
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="dash-cols" style={{ marginTop: 13 }}>
            <div className="card dash-card">
              <b style={{ font: '600 13.5px var(--d)' }}>Funnel · {period === 'this_quarter' ? 'this quarter' : 'last quarter'}</b>
              <div style={{ marginTop: 10 }}>
                <Funnel steps={data.funnel} />
              </div>
            </div>

            <div className="ai-frame dash-card" style={{ padding: 14 }}>
              <span className="ai-tag">AI READS THE QUARTER</span>
              <div className="tiny" style={{ marginTop: 6, lineHeight: 1.7 }}>{data.ai_narrative}</div>
              <form className="rowx" style={{ marginTop: 10, gap: 8 }} onSubmit={askFollowUp}>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder='Ask a follow-up: "which deals move the win rate most?"'
                  style={{
                    flex: 1, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8,
                    background: 'var(--surface2)', color: 'var(--ink)', font: '500 12px var(--b)',
                  }}
                />
                <button className="btn pri" disabled={!question.trim()}>Ask</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
