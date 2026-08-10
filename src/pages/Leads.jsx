import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { leadsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newLead, setNewLead] = useState({ name: '', company_name: '', source: 'web' })
  const navigate = useNavigate()
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    leadsApi.list(companyId).then((data) => {
      setLeads(data)
      if (data.length && !selected) setSelected(data[0])
    })
  }

  useEffect(load, [companyId])

  async function createLead(e) {
    e.preventDefault()
    const created = await leadsApi.create(companyId, newLead)
    setLeads((prev) => [created, ...prev])
    setSelected(created)
    setNewLead({ name: '', company_name: '', source: 'web' })
    setShowNew(false)
  }

  async function disqualify() {
    if (!selected) return
    const updated = await leadsApi.disqualify(selected.id, 'Not a fit')
    setSelected(updated)
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  async function convert() {
    if (!selected) return
    const opp = await leadsApi.convert(selected.id, {})
    navigate(`/pipeline?opened=${opp.id}`)
  }

  return (
    <AppShell>
      <div className="scr-head">
        <h2>Lead inbox &amp; conversion</h2>
        <span className="goal">Where the sales process starts.</span>
      </div>
      <div className="frame">
        <div className="split">
          <div className="lst">
            <div className="rowx sp" style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)' }}>
              <b style={{ font: '600 13px var(--d)' }}>Leads · {leads.length}</b>
              <button className="btn pri" style={{ padding: '4px 9px' }} onClick={() => setShowNew((v) => !v)}>＋ New lead</button>
            </div>

            {showNew && (
              <div className="card" style={{ margin: '10px 12px', padding: 11 }}>
                <form onSubmit={createLead}>
                  <input required placeholder="Company / lead name" value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value, company_name: e.target.value })}
                    style={fieldInput} />
                  <input placeholder="Source" value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                    style={{ ...fieldInput, marginTop: 6 }} />
                  <div className="rowx sp" style={{ marginTop: 8 }}>
                    <button type="button" className="btn ghost" style={{ padding: '4px 9px' }} onClick={() => setShowNew(false)}>Cancel</button>
                    <button className="btn pri" style={{ padding: '4px 9px' }}>Create lead</button>
                  </div>
                </form>
              </div>
            )}

            {leads.map((lead) => (
              <div key={lead.id} className={`lead ${selected?.id === lead.id ? 'sel' : ''} ${lead.status === 'disqualified' ? 'disqualified' : ''}`}
                onClick={() => setSelected(lead)} style={{ cursor: 'pointer' }}>
                <div className="rowx sp">
                  <div className="rowx">
                    <div className={`scorep ${scoreClass(lead.ai_score)}`}><b>{Math.round(lead.ai_score || 0)}</b></div>
                    <div>
                      <b>{lead.name}</b>
                      <div className="tiny">
                        {lead.source}
                        {lead.status === 'qualified' && <span className="chip ok" style={{ marginLeft: 6 }}>converted</span>}
                        {lead.status === 'disqualified' && <span className="chip risk" style={{ marginLeft: 6 }}>disqualified</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 18 }}>
            {selected ? (
              <>
                <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <b style={{ font: '600 15px var(--d)' }}>{selected.name}</b>
                    <div className="tiny">{selected.lead_no} · {selected.source}</div>
                  </div>
                  <div className="rowx">
                    <button className="btn" disabled={selected.status !== 'new' && selected.status !== 'working'} onClick={disqualify}>Disqualify</button>
                    <button className="btn pri" disabled={selected.status === 'qualified'} onClick={convert}>Convert → Pipeline</button>
                  </div>
                </div>
                <div className="fld" style={{ marginTop: 14 }}><span className="lab">Status</span>{selected.status}</div>
                <div className="fld"><span className="lab">AI score</span>{Math.round(selected.ai_score || 0)}</div>
                <div className="fld" style={{ border: 0 }}><span className="lab">Company</span>{selected.company_name || '—'}</div>
              </>
            ) : (
              <div className="tiny">Select a lead from the list, or create one.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function scoreClass(score) {
  if (score >= 75) return ''
  if (score >= 50) return 'mid'
  return 'low'
}

const fieldInput = {
  width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12px var(--b)',
}
