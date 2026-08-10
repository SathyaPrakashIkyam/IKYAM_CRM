import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { opportunitiesApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

export default function Pipeline() {
  const [columns, setColumns] = useState([])
  const navigate = useNavigate()
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    opportunitiesApi.kanban(companyId).then(setColumns)
  }

  useEffect(load, [companyId])

  const allStages = columns.map((c) => c.stage)

  async function moveCard(cardId, toStageId) {
    await opportunitiesApi.moveStage(cardId, toStageId)
    load()
  }

  return (
    <AppShell>
      <div className="scr-head">
        <h2>Pipeline kanban</h2>
        <span className="goal">Click a card to open its Record page; use the stage dropdown to move it.</span>
      </div>
      <div className="kwrap frame">
        <div className="kcols" style={{ gridTemplateColumns: `repeat(${columns.length || 1},1fr)` }}>
          {columns.map((col) => (
            <div className="kcol" key={col.stage.id}>
              <h4>
                {col.stage.name}
                <em>{col.cards.length} · ₹{Math.round(col.total_value).toLocaleString('en-IN')}</em>
              </h4>
              {col.cards.map((card) => (
                <div className="kcard" key={card.id}>
                  <b onClick={() => navigate(`/record/${card.id}`)} style={{ cursor: 'pointer' }}>{card.name}</b>
                  <div className="amt">{card.amount ? `₹${Math.round(card.amount).toLocaleString('en-IN')}` : '—'}</div>
                  <div className="rowx sp" style={{ marginTop: 6 }}>
                    <span className="tiny">{card.account_name}</span>
                  </div>
                  <select
                    value={card.stage_id}
                    onChange={(e) => moveCard(card.id, e.target.value)}
                    style={{ marginTop: 6, width: '100%', fontSize: 11, padding: '3px 5px', borderRadius: 6, border: '1px solid var(--line)' }}
                  >
                    {allStages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
