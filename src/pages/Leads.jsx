import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { leadsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import '../styles/Leads.css'

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
          <div className="title-bar" />
          <span className="goal">Where the sales process starts — Convert qualifies a lead into the Pipeline.</span>
        </div>
        <div className="frame">
          <div className="split">
            <div className="lst">
              <div className="rowx sp" style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)' }}>
                <b style={{ font: '600 13px var(--d)' }}>Leads · {leads.length}</b>
                <button className="btn pri" style={{ padding: '4px 9px' }} onClick={() => setShowNew((v) => !v)}>＋ New lead</button>
              </div>

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

            <div className="leads-detail-pane">
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

        {showNew && (
          <div className="lead-modal-overlay" onClick={() => setShowNew(false)}>
            <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="lead-modal-header">
                <div className="lead-modal-title-row">
                  <div className="lead-modal-icon-badge">👤</div>
                  <div>
                    <h3>Add new lead</h3>
                    <span className="tiny mut">Fill in details to expand your sales pipeline</span>
                  </div>
                </div>
                <button type="button" className="lead-modal-close" onClick={() => setShowNew(false)}>✕</button>
              </div>
              <div className="title-bar" style={{ margin: '0 0 22px 0', width: 48, height: 3 }} />

              <form onSubmit={createLead}>
                <div className="lead-modal-form-grid">
                  <div>
                    <label className="lead-modal-label">Lead name *</label>
                    <input
                      required
                      placeholder="Full name (e.g. Rahul Sharma)"
                      className="lead-modal-input"
                      value={newLead.name}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Company name *</label>
                    <input
                      required
                      placeholder="Company name (e.g. Acme Corp)"
                      className="lead-modal-input"
                      value={newLead.company_name}
                      onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Work email</label>
                    <input
                      type="email"
                      placeholder="user@example.com"
                      className="lead-modal-input"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Phone number</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10-digit phone number"
                      className="lead-modal-input"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                  <div className="">
                    <label className="lead-modal-label">Lead source</label>
                    <CustomSelect
                      options={[
                        { value: 'manual', label: 'Manual entry' },
                        { value: 'web', label: 'Website inquiry' },
                        { value: 'referral', label: 'Customer referral' },
                        { value: 'event', label: 'Event / Trade show' },
                        { value: 'partner', label: 'Partner channel' },
                      ]}
                      value={newLead.source}
                      onChange={(val) => setNewLead({ ...newLead, source: val })}
                      className="lead-modal-custom-select"
                    />
                  </div>
                </div>
                <div className="lead-modal-actions">
                  <button type="button" className="btn ghost lead-modal-cancel-btn" onClick={() => setShowNew(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn pri lead-modal-submit-btn">
                    Create lead ✓
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
