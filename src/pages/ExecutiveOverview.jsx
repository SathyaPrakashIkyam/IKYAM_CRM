import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { dashboardApi, opportunitiesApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import '../styles/ExecutiveOverview.css'
import { useAuth } from '../context/AuthContext'

const STRIP_COLORS = ['var(--line2)', 'var(--amber)', 'var(--orange)', 'var(--green)', 'var(--primary)']

export default function ExecutiveOverview() {
  const [summary, setSummary] = useState(null)
  const [columns, setColumns] = useState([])
  const navigate = useNavigate()
  const { companyId } = useAuth()

  useEffect(() => {
    if (!companyId) return
    dashboardApi.quarter(companyId).then(setSummary)
    opportunitiesApi.kanban(companyId).then(setColumns)
  }, [companyId])

  const totalValue = columns.reduce((sum, c) => sum + (c.total_value || 0), 0)
  const totalDeals = columns.reduce((sum, c) => sum + c.cards.length, 0)

  const allCards = columns.flatMap((c) => c.cards.map((card) => ({ ...card, stageName: c.stage.name })))
  const largestOpen = [...allCards].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 4)

  return (
    <AppShell>
      <div className="ikyam-mock exec-page">
        <div className="scr-head"><h2>Executive overview</h2><span className="goal">A single glance at the business, with the AI brief doing the explaining.</span></div>

        <div className="kpis exec-kpis">
          {(summary?.kpis || []).map((k) => (
            <div className="card herokpi" key={k.label}>
              <span className="tiny">{k.label}</span>
              <b style={{ display: 'block', font: '600 24px var(--d)', marginTop: 3 }}>{k.value}</b>
            </div>
          ))}
          {!summary && <div className="tiny">Loading…</div>}
        </div>

        <div className="grid exec-cols">
          <div>
            <div className="card">
              <div className="rowx sp"><b style={{ font: '600 13.5px var(--d)' }}>Pipeline health</b><span className="tiny">₹{Math.round(totalValue).toLocaleString('en-IN')} open across {totalDeals} deal{totalDeals === 1 ? '' : 's'}</span></div>
              {columns.length > 0 ? (
                <>
                  <div className="stagestrip">
                    {columns.map((c, i) => {
                      const pct = totalValue ? Math.round(((c.total_value || 0) / totalValue) * 100) : 0
                      if (pct === 0) return null
                      return (
                        <span key={c.stage.id} style={{ width: `${pct}%`, background: STRIP_COLORS[i % STRIP_COLORS.length] }}>
                          {pct >= 12 ? `${c.stage.name} · ${pct}%` : `${pct}%`}
                        </span>
                      )
                    })}
                  </div>
                  <div className="legend tiny">
                    {columns.map((c, i) => (
                      <span key={c.stage.id}><i style={{ background: STRIP_COLORS[i % STRIP_COLORS.length] }} />{c.stage.name}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="tiny" style={{ marginTop: 8 }}>No open pipeline yet.</div>
              )}
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <div className="rowx sp"><b style={{ font: '600 13.5px var(--d)' }}>Largest open deals</b><span className="tiny">Across all stages</span></div>
              <div style={{ marginTop: 6 }}>
                {largestOpen.map((card) => (
                  <div className="riskrow" key={card.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/record/${card.id}`)}>
                    <div><b style={{ fontSize: 12.5 }}>{card.name}</b><div className="tiny">{card.account_name} · {card.stageName}</div></div>
                    <span className="chip brand">{card.amount ? `₹${Math.round(card.amount).toLocaleString('en-IN')}` : '—'}</span>
                  </div>
                ))}
                {largestOpen.length === 0 && <div className="tiny">Nothing open right now.</div>}
              </div>
            </div>
          </div>

          <div>
            <div className="ai-frame" style={{ padding: 14 }}>
              <span className="ai-tag">AI EXECUTIVE BRIEF</span>
              <div className="tiny" style={{ marginTop: 6, lineHeight: 1.75 }}>{summary?.ai_narrative || 'Loading…'}</div>
            </div>

            <div className="card" style={{ marginTop: 14, textAlign: 'center' }}>
              <b style={{ font: '600 13px var(--d)', display: 'block', textAlign: 'left' }}>Open pipeline</b>
              <div className="exec-badge">
                <b>{totalDeals}</b>
                <span>open deals</span>
              </div>
              <div className="tiny">₹{Math.round(totalValue).toLocaleString('en-IN')} across {columns.length} stage{columns.length === 1 ? '' : 's'}</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
