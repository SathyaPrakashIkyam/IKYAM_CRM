import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { dashboardApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { currentCompanyId } from '../api/client'

export default function Today() {
  const [summary, setSummary] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const companyId = currentCompanyId()
    if (!companyId) return
    dashboardApi.today(companyId).then(setSummary).catch(() => {})
  }, [])

  return (
    <AppShell
      aiPanel={
        <div className="ai-frame" style={{ padding: 13 }}>
          <span className="ai-tag">AI PRIORITY</span>
          <div className="tiny" style={{ marginTop: 4 }}>{summary?.ai_narrative || 'Loading…'}</div>
        </div>
      }
    >
      <div className="rowx sp" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ font: '600 18px var(--d)' }}>Good morning, {(user?.full_name || '').split(' ')[0]}</div>
          <div className="tiny">Here's what's waiting for you today.</div>
        </div>
        <span className="rowx">
          <button className="btn pri" onClick={() => navigate('/leads')}>＋ New lead</button>
        </span>
      </div>

      <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13 }}>
        {(summary?.kpis || []).map((k) => (
          <div className="card kpi" key={k.label}>
            <span className="tiny">{k.label}</span>
            <b style={{ display: 'block', font: '600 21px var(--d)', marginTop: 4 }}>{k.value}</b>
          </div>
        ))}
      </div>

      <div className="lab" style={{ marginTop: 20 }}>Quick links</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 8 }}>
        <QuickLink label="Leads" onClick={() => navigate('/leads')} />
        <QuickLink label="Pipeline" onClick={() => navigate('/pipeline')} />
        <QuickLink label="Accounts" onClick={() => navigate('/accounts')} />
        <QuickLink label="Activities" onClick={() => navigate('/activities')} />
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
