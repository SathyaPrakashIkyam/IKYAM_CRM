import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { reportsApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import '../styles/Reports.css'
import { useAuth } from '../context/AuthContext'

const REPORTS = [
  { key: 'pipeline_by_stage', label: 'Pipeline by stage', fetch: reportsApiCall('pipelineByStage') },
  { key: 'win_loss', label: 'Win / loss', fetch: reportsApiCall('winLoss') },
  { key: 'leads_by_source', label: 'Leads by source', fetch: reportsApiCall('leadsBySource') },
]

const COLUMN_LABELS = {
  stage: 'Stage', deals: 'Deals', value: 'Value', avg_age_days: 'Avg. age',
  opportunity: 'Opportunity', outcome: 'Outcome', reason: 'Reason',
  source: 'Source', leads: 'Leads', qualified: 'Qualified', conversion_pct: 'Conversion %',
}

function reportsApiCall(method) {
  return (companyId, period, owner) => reportsApi[method](companyId, period, owner)
}

function formatCell(col, value) {
  if (value === null || value === undefined) return '—'
  if (col === 'avg_age_days') return `${value}d`
  if (col === 'value') return `₹${Number(value).toLocaleString('en-IN')}`
  if (col === 'conversion_pct') return `${value}%`
  return String(value)
}

function toCsv(report) {
  const header = report.columns.map((c) => COLUMN_LABELS[c] || c).join(',')
  const lines = report.rows.map((row) =>
    report.columns.map((c) => {
      const v = row[c]
      const s = v === null || v === undefined ? '' : String(v)
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

export default function Reports() {
  const [active, setActive] = useState('pipeline_by_stage')
  const [period, setPeriod] = useState('all_time')
  const [owner, setOwner] = useState('team')
  const [report, setReport] = useState(null)
  const [saved, setSaved] = useState([])
  const { companyId } = useAuth()

  useEffect(() => {
    if (!companyId) return
    setReport(null)
    const def = REPORTS.find((r) => r.key === active)
    def.fetch(companyId, period, owner).then(setReport)
  }, [active, period, owner, companyId])

  useEffect(() => {
    reportsApi.saved().then(setSaved)
  }, [])

  async function save() {
    const created = await reportsApi.save({ report_key: active, name: report.name })
    setSaved((prev) => [...prev, created])
  }

  function exportCsv() {
    if (!report) return
    const csv = toCsv(report)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.report_key}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="ikyam-mock reports-page">
        <div className="scr-head">
          <h2>Reports</h2>
          <div className="title-bar" />
          <span className="goal">Pick a report, filter it, and let the AI explain what changed — export or save it for the team.</span>
        </div>
        <div className="frame">
          <div className="reports-split">
            <aside className="reports-sidebar">
              <div className="nav">
                <span className="lab" style={{ padding: '0 10px', marginBottom: 4 }}>Standard reports</span>
                {REPORTS.map((r) => (
                  <a
                    key={r.key}
                    href="#"
                    className={active === r.key ? 'sel' : ''}
                    onClick={(e) => { e.preventDefault(); setActive(r.key) }}
                  >
                    {r.label}
                  </a>
                ))}
                <hr style={{ margin: '14px 0', border: 0, borderTop: '1px solid var(--line)' }} />
                <span className="lab" style={{ padding: '0 10px', marginBottom: 4 }}>My reports</span>
                {saved.length === 0 && <div className="tiny" style={{ padding: '0 10px', color: 'var(--faint)' }}>None saved yet</div>}
                {saved.map((s) => (
                  <div key={s.id} className="tiny" style={{ padding: '6px 10px', color: 'var(--ink)' }}>
                    {s.name}
                  </div>
                ))}
              </div>
            </aside>
            <div className="reports-main">
              <div className="reports-toolbar">
                <div className="rowx" style={{ gap: 10 }}>
                  <select className="rpt-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="all_time">All time</option>
                    <option value="this_quarter">This quarter</option>
                    <option value="last_quarter">Last quarter</option>
                  </select>
                  <select className="rpt-select" value={owner} onChange={(e) => setOwner(e.target.value)}>
                    <option value="team">Owner: team</option>
                    <option value="mine">Owner: mine</option>
                  </select>
                </div>
                <div className="rowx" style={{ gap: 10 }}>
                  <button className="btn ghost" onClick={exportCsv} disabled={!report || report.rows.length === 0}>
                    Export CSV
                  </button>
                  <button className="btn pri" onClick={save} disabled={!report}>
                    ＋ Save report
                  </button>
                </div>
              </div>
              <div className="reports-content">
                {report && (
                  <>
                    <b style={{ font: '600 16px var(--d)', color: 'var(--ink)' }}>{report.name}</b>
                    {report.subtitle && <div className="tiny mut" style={{ marginTop: 2 }}>{report.subtitle}</div>}
                    <div className="table-responsive table-card" style={{ marginTop: 12 }}>
                      <table className="qtable">
                        <thead>
                          <tr>
                            {report.columns.map((c) => (
                              <th key={c}>{COLUMN_LABELS[c] || c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {report.rows.map((row, i) => (
                            <tr key={i}>
                              {report.columns.map((c) => (
                                <td key={c}>{formatCell(c, row[c])}</td>
                              ))}
                            </tr>
                          ))}
                          {report.rows.length === 0 && (
                            <tr>
                              <td colSpan={report.columns.length} className="tiny mut">No data for this filter.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="ai-frame" style={{ padding: 16, marginTop: 16 }}>
                      <span className="ai-tag">AI INSIGHT</span>
                      <div className="tiny" style={{ marginTop: 6, lineHeight: 1.6, color: 'var(--ink)' }}>{report.ai_insight}</div>
                    </div>
                  </>
                )}
                {!report && <div className="tiny">Loading report data…</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
