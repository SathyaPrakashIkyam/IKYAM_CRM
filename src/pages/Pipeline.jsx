import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { opportunitiesApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import '../styles/Pipeline.css'

const AV_CLASSES = ['a', 'b', 'c']
function avatarFor(name) {
  const initials = (name || '—').slice(0, 2).toUpperCase()
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = (hash + name.charCodeAt(i)) % AV_CLASSES.length
  return { initials, cls: AV_CLASSES[hash] }
}

function probClass(p) {
  if (p == null) return ''
  if (p >= 66) return 'hot'
  if (p >= 33) return 'warn'
  return 'risk'
}

function probChip(p) {
  if (p == null) return null
  if (p >= 66) return 'ok'
  if (p >= 33) return 'warn'
  return 'risk'
}

export default function Pipeline() {
  const [columns, setColumns] = useState([])
  const [view, setView] = useState('board') // board | table | forecast
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState(['all'])
  const [dragCard, setDragCard] = useState(null) // { id, fromStageId }
  const [dragOverStage, setDragOverStage] = useState(null)
  const navigate = useNavigate()
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    opportunitiesApi.kanban(companyId).then(setColumns)
  }

  useEffect(load, [companyId])

  const allStages = columns.map((c) => c.stage)
  const openColumns = columns.filter((c) => c.stage.stage_kind === 'open')
  const wonColumns = columns.filter((c) => c.stage.stage_kind === 'won')

  const forecast = useMemo(() => {
    let commit = 0, bestCase = 0, openPipeline = 0, weighted = 0
    for (const col of openColumns) {
      for (const card of col.cards) {
        const amt = card.amount || 0
        const prob = card.win_probability ?? col.stage.default_probability ?? 0
        openPipeline += amt
        weighted += amt * (prob / 100)
        if (prob >= 75) bestCase += amt
        if (prob >= 75 && col.stage.name.toLowerCase().includes('negotiat')) commit += amt
      }
    }
    if (commit === 0 && openColumns.length) {
      const maxProb = Math.max(...openColumns.map((c) => c.stage.default_probability || 0))
      commit = openColumns
        .filter((c) => (c.stage.default_probability || 0) === maxProb)
        .reduce((sum, c) => sum + c.cards.reduce((s, card) => s + (card.amount || 0), 0), 0)
    }
    return { commit, bestCase, openPipeline, weighted }
  }, [columns])

  const wonThisTotal = wonColumns.reduce((sum, c) => sum + (c.total_value || 0), 0)
  const totalDeals = columns.reduce((sum, c) => sum + c.cards.length, 0)

  // Filter helper — matches deal name, opp #, account, owner, amount, or stage name across multi-selected stages
  function cardMatchesFilter(card, stageId, stageName) {
    const isStageAllowed = Array.isArray(stageFilter)
      ? stageFilter.includes('all') || stageFilter.includes(stageId)
      : stageFilter === 'all' || stageFilter === stageId
    if (!isStageAllowed) return false

    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      (card.name || '').toLowerCase().includes(q) ||
      (card.opportunity_no || '').toLowerCase().includes(q) ||
      (card.account_name || '').toLowerCase().includes(q) ||
      (card.owner_initials || '').toLowerCase().includes(q) ||
      (stageName || '').toLowerCase().includes(q) ||
      (card.amount ? String(card.amount) : '').includes(q) ||
      (card.id || '').toLowerCase().includes(q)
    )
  }

  async function moveCard(cardId, toStageId) {
    await opportunitiesApi.moveStage(cardId, toStageId)
    load()
  }

  function handleDragStart(card, stageId) {
    setDragCard({ id: card.id, fromStageId: stageId })
  }

  function handleDragEnd() {
    setDragCard(null)
    setDragOverStage(null)
  }

  function handleDrop(stageId) {
    if (dragCard && dragCard.fromStageId !== stageId) {
      moveCard(dragCard.id, stageId)
    }
    setDragCard(null)
    setDragOverStage(null)
  }

  return (
    <AppShell>
      <div className="ikyam-mock pipeline-page">
        {/* Header Row with Title and Subtitle */}
        <div className="scr-head" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)' }}>
              Pipeline Kanban
            </h2>
            <div className="goal" style={{ marginTop: 2 }}>
              {totalDeals} open deal{totalDeals === 1 ? '' : 's'} · {columns.length} stages · Drag cards to change stage or double-click to view details
            </div>
          </div>
          <div className="title-bar" style={{ margin: '10px 0 12px 0' }} />
        </div>

        {/* Unified Controls Toolbar: Search + Stage Filter on Left, View Toggle on Right */}
        <div className="rowx sp pipeline-controls-bar" style={{ gap: 16, alignItems: 'center', marginBottom: 14 }}>
          <div className="rowx" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            <div className="pipeline-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by deal name, opp #, account, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pipeline-search-input"
              />
              {searchQuery && (
                <button type="button" className="pipeline-search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
              <span className="tiny mut font-semibold">Stage:</span>
              <CustomSelect
                multiple
                options={[
                  { value: 'all', label: `All Stages (${columns.length})` },
                  ...allStages.map((s) => ({ value: s.id, label: s.name })),
                ]}
                value={stageFilter}
                onChange={setStageFilter}
                style={{ minWidth: 170 }}
              />
            </div>
          </div>

          <div className="rowx pipeline-viewtoggle" style={{ gap: 6 }}>
            <button className={`btn ${view === 'board' ? 'pri' : 'ghost'}`} onClick={() => setView('board')}>Board</button>
            <button className={`btn ${view === 'table' ? 'pri' : 'ghost'}`} onClick={() => setView('table')}>Table</button>
            <button className={`btn ${view === 'forecast' ? 'pri' : 'ghost'}`} onClick={() => setView('forecast')}>Forecast</button>
          </div>
        </div>

        {/* Balanced 4-Column Metric Strip */}
        <div className="card pipeline-strip">
          <div className="pipeline-strip-col">
            <span className="lab">Commit</span>
            <div className="mono pipeline-strip-num">₹{Math.round(forecast.commit).toLocaleString('en-IN')}</div>
          </div>
          <div className="pipeline-strip-col">
            <span className="lab">Best case</span>
            <div className="mono pipeline-strip-num">₹{Math.round(forecast.bestCase).toLocaleString('en-IN')}</div>
          </div>
          <div className="pipeline-strip-col">
            <span className="lab">Open pipeline</span>
            <div className="mono pipeline-strip-num">₹{Math.round(forecast.openPipeline).toLocaleString('en-IN')}</div>
          </div>
          <div className="pipeline-strip-col pipeline-strip-ai">
            <span className="lab pipeline-strip-ai-lab">AI-weighted</span>
            <div className="mono pipeline-strip-num">₹{Math.round(forecast.weighted).toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Board View */}
        {view === 'board' && (
          <div className="kwrap frame" style={{ marginTop: 14 }}>
            <div className="kcols" style={{ gridTemplateColumns: `repeat(${columns.length || 1},1fr)` }}>
              {columns.map((col) => {
                const filteredCards = col.cards.filter((c) => cardMatchesFilter(c, col.stage.id, col.stage.name))
                return (
                  <div
                    className={`kcol ${dragOverStage === col.stage.id ? 'pipeline-drop-target' : ''}`}
                    key={col.stage.id}
                    onDragOver={(e) => { e.preventDefault(); setDragOverStage(col.stage.id) }}
                    onDragLeave={() => setDragOverStage((s) => (s === col.stage.id ? null : s))}
                    onDrop={(e) => { e.preventDefault(); handleDrop(col.stage.id) }}
                  >
                    <h4 style={col.stage.stage_kind === 'won' ? { color: 'var(--green-ink)' } : col.stage.stage_kind === 'lost' ? { color: 'var(--orange-ink)' } : undefined}>
                      {col.stage.name}
                      <em>{filteredCards.length} · ₹{Math.round(col.total_value).toLocaleString('en-IN')}</em>
                    </h4>
                    {filteredCards.map((card) => {
                      const av = avatarFor(card.account_name)
                      return (
                        <div
                          className={`kcard ${probClass(card.win_probability ?? col.stage.default_probability)} ${dragCard?.id === card.id ? 'pipeline-dragging' : ''}`}
                          key={card.id}
                          draggable
                          onDragStart={() => handleDragStart(card, col.stage.id)}
                          onDragEnd={handleDragEnd}
                          onDoubleClick={(e) => {
                            if (e.target.closest('.custom-select-container') || e.target.closest('select')) return
                            navigate(`/record/${card.id}`)
                          }}
                          title="Double-click to open"
                        >
                          {card.opportunity_no && (
                            <span className="tiny mut" style={{ fontSize: 10.5, letterSpacing: '0.4px', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                              {card.opportunity_no}
                            </span>
                          )}
                          <b>{card.name}</b>
                          <div className="amt">{card.amount ? `₹${Math.round(card.amount).toLocaleString('en-IN')}` : '—'}</div>
                          <div className="rowx sp" style={{ marginTop: 6 }}>
                            {dragCard?.id === card.id ? (
                              <span className="chip brand">dragging…</span>
                            ) : (
                              <span className="tiny" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 100 }}>
                                {card.account_name}
                              </span>
                            )}
                            <div className="rowx" style={{ gap: 6 }}>
                              {dragCard?.id !== card.id && (card.win_probability ?? col.stage.default_probability) != null && (
                                <span className={`chip ${probChip(card.win_probability ?? col.stage.default_probability)}`}>
                                  {Math.round(card.win_probability ?? col.stage.default_probability)}%
                                </span>
                              )}
                              <span className={`av ${av.cls}`}>{card.owner_initials || av.initials}</span>
                            </div>
                          </div>
                          <CustomSelect
                            options={allStages.map((s) => ({ value: s.id, label: s.name }))}
                            value={card.stage_id}
                            onChange={(newStageId) => moveCard(card.id, newStageId)}
                            className="pipeline-card-stage-select"
                          />
                        </div>
                      )
                    })}
                    {filteredCards.length === 0 && <div className="tiny mut" style={{ padding: '8px 4px', textAlign: 'center' }}>No matching deals.</div>}
                  </div>
                )
              })}
              {columns.length === 0 && <div className="tiny" style={{ padding: 16 }}>Loading pipeline…</div>}
            </div>
          </div>
        )}

        {/* Table View */}
        {view === 'table' && (
          <div className="table-card pipeline-table-container">
            <table className="qtable">
              <thead>
                <tr>
                  <th>Opp No</th>
                  <th>Deal Name</th>
                  <th>Account</th>
                  <th>Stage</th>
                  <th>Win Prob</th>
                  <th>Owner</th>
                  <th className="num">Amount ₹</th>
                </tr>
              </thead>
              <tbody>
                {columns.flatMap((col) =>
                  col.cards
                    .filter((card) => cardMatchesFilter(card, col.stage.id, col.stage.name))
                    .map((card) => (
                      <tr key={card.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/record/${card.id}`)}>
                        <td>
                          <span className="mono" style={{ font: '600 11.5px var(--m)', color: 'var(--mut)' }}>
                            {card.opportunity_no || `O-${card.id.slice(0, 6)}`}
                          </span>
                        </td>
                        <td><b>{card.name}</b></td>
                        <td>{card.account_name || '—'}</td>
                        <td>
                          <span className="chip" style={{ background: 'rgba(0, 201, 167, 0.12)', color: 'var(--green-ink)' }}>
                            {col.stage.name}
                          </span>
                        </td>
                        <td>
                          {(card.win_probability ?? col.stage.default_probability) != null ? (
                            <span className={`chip ${probChip(card.win_probability ?? col.stage.default_probability)}`}>
                              {Math.round(card.win_probability ?? col.stage.default_probability)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {card.owner_initials ? (
                            <span className="chip" style={{ font: '700 11px var(--d)' }}>{card.owner_initials}</span>
                          ) : '—'}
                        </td>
                        <td className="num font-semibold">
                          {card.amount ? `₹${Math.round(card.amount).toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))
                )}
                {totalDeals === 0 && <tr><td colSpan={7} className="tiny" style={{ textAlign: 'center', padding: 20 }}>No deals in pipeline.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Forecast View */}
        {view === 'forecast' && (
          <div className="table-card" style={{ marginTop: 14 }}>
            <table className="qtable">
              <thead><tr><th>Stage</th><th>Deals</th><th>Win %</th><th className="num">Stage value ₹</th><th className="num">Weighted ₹</th></tr></thead>
              <tbody>
                {columns
                  .filter((col) => (Array.isArray(stageFilter) ? stageFilter.includes('all') || stageFilter.includes(col.stage.id) : stageFilter === 'all' || stageFilter === col.stage.id))
                  .map((col) => {
                    const filteredCards = col.cards.filter((card) => cardMatchesFilter(card, col.stage.id, col.stage.name))
                    const stageVal = filteredCards.reduce((s, c) => s + (c.amount || 0), 0)
                    const prob = col.stage.default_probability || 0
                    return (
                      <tr key={col.stage.id}>
                        <td><b>{col.stage.name}</b></td>
                        <td>{filteredCards.length}</td>
                        <td>{Math.round(prob)}%</td>
                        <td className="num">₹{Math.round(stageVal).toLocaleString('en-IN')}</td>
                        <td className="num">₹{Math.round(stageVal * (prob / 100)).toLocaleString('en-IN')}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
            <div className="ai-frame" style={{ padding: 16, margin: 16 }}>
              <span className="ai-tag">AI-WEIGHTED FORECAST</span>
              <div className="tiny" style={{ marginTop: 6, lineHeight: 1.6 }}>
                Every open deal's amount is weighted by its stage's win probability (an AI-maintained figure). Sum: ₹{Math.round(forecast.weighted).toLocaleString('en-IN')} against ₹{Math.round(forecast.openPipeline).toLocaleString('en-IN')} of total open pipeline.
              </div>
            </div>
          </div>
        )}

        {wonThisTotal > 0 && (
          <div className="tiny" style={{ marginTop: 12 }}>
            <span className="chip ok">Won</span> ₹{Math.round(wonThisTotal).toLocaleString('en-IN')} closed to date
          </div>
        )}
      </div>
    </AppShell>
  )
}
