import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { dashboardApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const companyId = currentCompanyId()

  useEffect(() => {
    if (!companyId) return
    dashboardApi.quarter(companyId).then(setSummary)
  }, [companyId])

  return (
    <AppShell>
      <div className="scr-head"><h2>Dashboard</h2><span className="goal">This quarter, at a glance.</span></div>

      <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13 }}>
        {(summary?.kpis || []).map((k) => (
          <div className="card kpi" key={k.label}>
            <span className="tiny">{k.label}</span>
            <b style={{ display: 'block', marginTop: 4 }}>{k.value}</b>
          </div>
        ))}
      </div>

      <div className="ai-frame" style={{ padding: 14, marginTop: 16 }}>
        <span className="ai-tag">AI READS THE QUARTER</span>
        <div className="tiny" style={{ marginTop: 4, lineHeight: 1.7 }}>{summary?.ai_narrative || 'Loading…'}</div>
      </div>
    </AppShell>
  )
}
