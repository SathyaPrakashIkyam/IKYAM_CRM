import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { leadsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import './Leads.css'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [newLead, setNewLead] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    source: 'manual',
  })
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
    setNewLead({ name: '', company_name: '', email: '', phone: '', source: 'manual' })
    setShowNew(false)
  }

  async function disqualify() {
    if (!selected) return
    const updated = await leadsApi.disqualify(selected.id, 'Not a fit')
    setSelected(updated)
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    setShowConvert(false)
  }

  async function convert() {
    if (!selected) return
    const opp = await leadsApi.convert(selected.id, {})
    navigate(`/pipeline?opened=${opp.id}`)
  }

  return (
    <AppShell>
      <div className="ikyam-mock leads-page">
        <div className="scr-head">
          <h2>Lead inbox &amp; conversion</h2>
          <span className="goal">Where the sales process starts — Convert qualifies a lead into the Pipeline.</span>
        </div>
        <div className="frame">
          <div className="split">
            <div className="lst">
              <div className="rowx sp" style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)' }}>
                <b style={{ font: '600 13px var(--d)' }}>Leads · {leads.length}</b>
                <button className="btn pri" style={{ padding: '4px 9px' }} onClick={() => setShowNew((v) => !v)}>＋ New lead</button>
              </div>

              {showNew && (
                <div className="card" style={{ margin: '10px 12px', padding: 14 }}>
                  <b style={{ font: '600 13px var(--d)', color: 'var(--ink)', display: 'block', marginBottom: 10 }}>＋ Add new lead</b>
                  <form onSubmit={createLead}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <label className="tiny mut" style={{ display: 'block', marginBottom: 2 }}>Lead name *</label>
                        <input required placeholder="Full name (e.g. Rahul Sharma)" value={newLead.name}
                          onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} style={fieldInput} />
                      </div>
                      <div>
                        <label className="tiny mut" style={{ display: 'block', marginBottom: 2 }}>Company name *</label>
                        <input required placeholder="Company name (e.g. Acme Corp)" value={newLead.company_name}
                          onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })} style={fieldInput} />
                      </div>
                      <div>
                        <label className="tiny mut" style={{ display: 'block', marginBottom: 2 }}>Work email</label>
                        <input type="email" placeholder="user@example.com" value={newLead.email}
                          onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} style={fieldInput} />
                      </div>
                      <div>
                        <label className="tiny mut" style={{ display: 'block', marginBottom: 2 }}>Phone number</label>
                        <input type="text" maxLength={10} placeholder="10-digit phone no" value={newLead.phone}
                          onChange={(e) => setNewLead({ ...newLead, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          style={fieldInput} />
                      </div>
                      <div>
                        <label className="tiny mut" style={{ display: 'block', marginBottom: 2 }}>Lead source</label>
                        <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                          style={{ ...fieldInput, width: '100%', background: 'var(--surface)', cursor: 'pointer' }}>
                          <option value="manual">manual</option>
                          <option value="web">web</option>
                          <option value="referral">referral</option>
                          <option value="event">event</option>
                          <option value="partner">partner</option>
                        </select>
                      </div>
                    </div>
                    <div className="rowx sp" style={{ marginTop: 12 }}>
                      <button type="button" className="btn ghost" style={{ padding: '4px 10px' }} onClick={() => setShowNew(false)}>Cancel</button>
                      <button className="btn pri" style={{ padding: '4px 12px' }}>Create lead ✓</button>
                    </div>
                  </form>
                </div>
              )}

              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className={`lead ${selected?.id === lead.id ? 'sel' : ''} ${lead.status === 'disqualified' ? 'disqualified' : ''}`}
                  onClick={() => { setSelected(lead); setShowConvert(false) }}
                  style={{ cursor: 'pointer' }}
                >
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
                      <div className="tiny">{selected.lead_no} · {selected.source} · {selected.company_name || 'no company on file'}</div>
                    </div>
                    <div className="rowx">
                      <button className="btn" disabled={selected.status !== 'new' && selected.status !== 'working'} onClick={disqualify}>Disqualify</button>
                      <button className="btn pri" disabled={selected.status === 'qualified'} onClick={() => setShowConvert((v) => !v)}>Convert…</button>
                    </div>
                  </div>

                  <div className="ai-frame" style={{ padding: 12, marginTop: 13 }}>
                    <span className="ai-tag">AI SCORE {Math.round(selected.ai_score || 0)}</span>
                    <div className="tiny" style={{ marginTop: 3 }}>Scored from source quality, contact completeness and engagement signals.</div>
                  </div>

                  <div className="grid leads-detail-grid" style={{ marginTop: 13 }}>
                    <div className="card">
                      <span className="lab">Captured</span>
                      <div className="fld"><span className="lab">Status</span>{selected.status}</div>
                      <div className="fld"><span className="lab">Company</span>{selected.company_name || '—'}</div>
                      <div className="fld"><span className="lab">Email</span>{selected.email || '—'}</div>
                      <div className="fld" style={{ border: 0 }}><span className="lab">Phone</span>{selected.phone || '—'}</div>
                    </div>
                    <div className="ai-frame" style={{ padding: 12 }}>
                      <span className="ai-tag">FIRST TOUCH</span>
                      <div className="tiny" style={{ marginTop: 3 }}>
                        This lead hasn't been contacted yet — a quick call or email referencing what they asked for is the fastest way to move it out of the inbox.
                      </div>
                      <button className="btn" style={{ marginTop: 9, padding: '5px 11px' }} onClick={() => navigate('/activities')}>Log first touch</button>
                    </div>
                  </div>

                  {showConvert && selected.status !== 'qualified' && (
                    <div className="modal" style={{ margin: '16px 0 0' }}>
                      <b style={{ font: '600 14px var(--d)' }}>Convert lead</b>
                      <div className="fld"><span className="lab">Account</span>{selected.company_name || selected.name} <span className="chip brand">will be created / matched</span></div>
                      <div className="fld" style={{ border: 0 }}><span className="lab">Opportunity</span>New opportunity in Qualification stage</div>
                      <div className="rowx" style={{ marginTop: 11, justifyContent: 'flex-end' }}>
                        <button className="btn ghost" onClick={() => setShowConvert(false)}>Cancel</button>
                        <button className="btn pri" onClick={convert}>Convert → Pipeline</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="tiny">Select a lead from the list, or create one.</div>
              )}
            </div>
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
