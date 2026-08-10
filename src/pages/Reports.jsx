import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { reportsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

const REPORTS = [
  { key: 'pipeline_by_stage', label: 'Pipeline by stage', fetch: reportsApiCall('pipelineByStage') },
  { key: 'win_loss', label: 'Win / loss', fetch: reportsApiCall('winLoss') },
  { key: 'leads_by_source', label: 'Leads by source', fetch: reportsApiCall('leadsBySource') },
]

function reportsApiCall(method) {
  return (companyId) => reportsApi[method](companyId)
}

export default function Reports() {
  const [active, setActive] = useState('pipeline_by_stage')
  const [report, setReport] = useState(null)
  const [saved, setSaved] = useState([])
  const companyId = currentCompanyId()

  useEffect(() => {
    if (!companyId) return
    const def = REPORTS.find((r) => r.key === active)
    def.fetch(companyId).then(setReport)
  }, [active, companyId])

  useEffect(() => {
    reportsApi.saved().then(setSaved)
  }, [])

  async function save() {
    const created = await reportsApi.save({ report_key: active, name: report.name })
    setSaved((prev) => [...prev, created])
  }

  return (
    <AppShell>
      <div className="scr-head"><h2>Reports</h2><span className="goal">Pick a report, filter it, let AI explain what changed.</span></div>
      <div className="frame">
        <div className="shell" style={{ gridTemplateColumns: '206px 1fr' }}>
          <aside className="rail">
            <div className="nav">
              {REPORTS.map((r) => (
                <a key={r.key} href="#" className={active === r.key ? 'sel' : ''}
                  onClick={(e) => { e.preventDefault(); setActive(r.key) }}>{r.label}</a>
              ))}
              <hr />
              <span className="lab" style={{ padding: '0 10px' }}>My reports</span>
              {saved.length === 0 && <div className="tiny" style={{ padding: '0 10px', color: 'var(--faint)' }}>None saved yet</div>}
              {saved.map((s) => <div key={s.id} className="tiny" style={{ padding: '4px 10px' }}>{s.name}</div>)}
            </div>
          </aside>
          <div className="main">
            <div className="topbar">
              <span />
              <button className="btn pri" onClick={save}>＋ Save report</button>
            </div>
            <div className="content">
              {report && (
                <>
                  <b style={{ font: '600 15px var(--d)' }}>{report.name}</b>
                  <table className="qtable">
                    <thead><tr>{report.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>
                      {report.rows.map((row, i) => (
                        <tr key={i}>
                          {report.columns.map((c) => <td key={c}>{String(row[c] ?? '—')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="ai-frame" style={{ padding: 13, marginTop: 13 }}>
                    <span className="ai-tag">INSIGHT</span>
                    <div className="tiny" style={{ marginTop: 2 }}>{report.ai_insight}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
