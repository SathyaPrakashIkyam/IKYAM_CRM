import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  const [editingId, setEditingId] = useState(null)
  const [showConvert, setShowConvert] = useState(false)
  const emptyLead = {
    first_name: '',
    last_name: '',
    company_name: '',
    industry: '',
    email: '',
    phone: '',
    source: 'manual',
    source_other: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    potential_amount: '',
  }
  const [newLead, setNewLead] = useState(emptyLead)
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const companyId = currentCompanyId()

  function toCamelCase(value) {
    return value
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(' ')
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Completion percentage: red < 50, yellow 50–99, green = 100
  function completionColor(pct) {
    if (pct >= 100) return '#1f9d55' // green
    if (pct >= 50) return '#e0a800' // yellow
    return '#d64545' // red
  }

  function openEdit(lead) {
    setFormError('')
    setEditingId(lead.id)
    setNewLead({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      company_name: lead.company_name || '',
      industry: lead.industry || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'manual',
      source_other: lead.source_other || '',
      address_line1: lead.address_line1 || '',
      address_line2: lead.address_line2 || '',
      city: lead.city || '',
      state: lead.state || '',
      country: lead.country || '',
      pincode: lead.pincode || '',
      potential_amount: lead.potential_amount != null ? String(lead.potential_amount) : '',
    })
    setShowNew(true)
  }

  function closeForm() {
    setShowNew(false)
    setEditingId(null)
    setFormError('')
    setNewLead(emptyLead)
  }

  function load() {
    if (!companyId) return
    leadsApi.list(companyId).then((data) => {
      setLeads(data)
      const openId = location.state?.openId
      const toSelect = (openId && data.find((l) => l.id === openId)) || (data.length && !selected ? data[0] : null)
      if (toSelect) setSelected(toSelect)
    })
  }

  useEffect(load, [companyId, location.state])

  async function submitLead(e) {
    e.preventDefault()
    setFormError('')

    const firstName = newLead.first_name.trim()
    const lastName = newLead.last_name.trim()
    const email = newLead.email.trim()
    const phone = newLead.phone.trim()
    const companyName = newLead.company_name.trim()

    if (!firstName) return setFormError('First name is required')
    if (!lastName) return setFormError('Last name is required')
    if (!companyName) return setFormError('Company name is required')
    if (!email && !phone) return setFormError('Either email or phone number is required')
    if (email && !EMAIL_RE.test(email)) return setFormError('Please enter a valid email address')
    if (phone && phone.length !== 10) return setFormError('Phone number must be 10 digits')
    if (!newLead.source) return setFormError('Lead source is required')
    if (newLead.source === 'other' && !newLead.source_other.trim()) {
      return setFormError('Please specify the lead source')
    }
    if (newLead.potential_amount === '' || newLead.potential_amount === null || newLead.potential_amount === undefined) {
      return setFormError('Potential amount is required')
    }
    if (Number(newLead.potential_amount) < 0) {
      return setFormError('Potential amount cannot be negative')
    }

    // Client-side duplicate check against already-loaded leads (server also enforces this)
    const emailDupe = email && leads.find((l) => l.id !== editingId && l.email && l.email.toLowerCase() === email.toLowerCase())
    if (emailDupe) return setFormError('A Lead already exists with this Email ID. Please use a different Email ID.')

    const phoneDupe = phone && leads.find((l) => l.id !== editingId && l.phone && l.phone === phone)
    if (phoneDupe) return setFormError('A Lead already exists with this Phone Number. Please use a different Phone Number.')

    const payload = {
      first_name: toCamelCase(firstName),
      last_name: toCamelCase(lastName),
      company_name: companyName,
      industry: newLead.industry || undefined,
      email: email || undefined,
      phone: phone || undefined,
      source: newLead.source,
      source_other: newLead.source === 'other' ? newLead.source_other.trim() : undefined,
      address_line1: newLead.address_line1 || undefined,
      address_line2: newLead.address_line2 || undefined,
      city: newLead.city || undefined,
      state: newLead.state || undefined,
      country: newLead.country || undefined,
      pincode: newLead.pincode || undefined,
      potential_amount: Number(newLead.potential_amount),
    }

    try {
      if (editingId) {
        const updated = await leadsApi.update(companyId, editingId, payload)
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        setSelected(updated)
      } else {
        const created = await leadsApi.create(companyId, payload)
        setLeads((prev) => [created, ...prev])
        setSelected(created)
      }
      closeForm()
    } catch (err) {
      const detail = err?.response?.data?.detail
      // Pydantic v2 prefixes every custom validator's raised ValueError with
      // "Value error, " (e.g. "Value error, First name is required") — strip
      // that off so the user sees the clean message the validator wrote.
      const cleanMsg = (msg) => (typeof msg === 'string' ? msg.replace(/^Value error,\s*/, '') : msg)
      let message
      if (Array.isArray(detail)) {
        message = detail.map((d) => cleanMsg(d.msg)).join('; ')
      } else if (detail && typeof detail === 'object') {
        message = cleanMsg(detail.message)
      } else {
        message = cleanMsg(detail)
      }
      setFormError(message || `Failed to ${editingId ? 'update' : 'create'} lead`)
    }
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
                <button className="btn pri" style={{ padding: '4px 9px' }} onClick={() => { closeForm(); setShowNew(true) }}>＋ New lead</button>
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
                      <div
                        title="Lead information completeness"
                        style={{
                          width: 32, height: 32, borderRadius: '50%', flex: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: completionColor(lead.completion_percentage),
                          color: '#fff', font: '700 12px var(--d, system-ui, sans-serif)',
                        }}
                      >
                        <b>{Math.round(lead.completion_percentage || 0)}</b>
                      </div>
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
                      <button className="btn" onClick={() => openEdit(selected)}>Edit</button>
                      <button className="btn" disabled={selected.status !== 'new' && selected.status !== 'working'} onClick={disqualify}>Disqualify</button>
                      <button className="btn pri" disabled={selected.status === 'qualified'} onClick={() => setShowConvert((v) => !v)}>Convert…</button>
                    </div>
                  </div>

                  <div className="ai-frame" style={{ padding: 12, marginTop: 13 }}>
                    <span className="ai-tag">AI SCORE {Math.round(selected.ai_score || 0)}</span>
                    <div className="tiny" style={{ marginTop: 3 }}>Scored from source quality, contact completeness and engagement signals.</div>
                  </div>

                  {selected.completion_percentage != null && (
                    <div style={{ marginTop: 13 }}>
                      <div className="rowx sp">
                        <span className="tiny mut">Lead information completeness</span>
                        <b className="tiny" style={{ color: completionColor(selected.completion_percentage) }}>
                          {Math.round(selected.completion_percentage)}%
                        </b>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: 'var(--line)', marginTop: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.round(selected.completion_percentage))}%`,
                            height: '100%',
                            background: completionColor(selected.completion_percentage),
                            transition: 'width .2s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid leads-detail-grid" style={{ marginTop: 13 }}>
                    <div className="card">
                      <span className="lab">Captured</span>
                      <div className="fld"><span className="lab">Status</span>{selected.status}</div>
                      <div className="fld"><span className="lab">Company</span>{selected.company_name || '—'}</div>
                      <div className="fld"><span className="lab">Industry</span>{selected.industry || '—'}</div>
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
          <div className="lead-modal-overlay" onClick={closeForm}>
            <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="lead-modal-header">
                <div className="lead-modal-title-row">
                  <div className="lead-modal-icon-badge">👤</div>
                  <div>
                    <h3>{editingId ? 'Edit lead' : 'Add new lead'}</h3>
                    <span className="tiny mut">
                      {editingId ? 'Update details and save the changes' : 'Fill in details to expand your sales pipeline'}
                    </span>
                  </div>
                </div>
                <button type="button" className="lead-modal-close" onClick={closeForm}>✕</button>
              </div>
              <div className="title-bar" style={{ margin: '0 0 22px 0', width: 48, height: 3 }} />

              <form onSubmit={submitLead}>
                <div className="lead-modal-form-grid">
                  <div>
                    <label className="lead-modal-label">First name *</label>
                    <input
                      required
                      placeholder="First name (e.g. Rahul)"
                      className="lead-modal-input"
                      value={newLead.first_name}
                      onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Last name *</label>
                    <input
                      required
                      placeholder="Last name (e.g. Sharma)"
                      className="lead-modal-input"
                      value={newLead.last_name}
                      onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
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
                    <label className="lead-modal-label">Industry</label>
                    <CustomSelect
                      options={[
                        { value: '', label: 'Select industry' },
                        { value: 'Technology / IT', label: 'Technology / IT' },
                        { value: 'Manufacturing', label: 'Manufacturing' },
                        { value: 'Retail', label: 'Retail' },
                        { value: 'Healthcare', label: 'Healthcare' },
                        { value: 'Finance / Banking', label: 'Finance / Banking' },
                        { value: 'Education', label: 'Education' },
                        { value: 'Real Estate', label: 'Real Estate' },
                        { value: 'Logistics', label: 'Logistics' },
                        { value: 'Hospitality', label: 'Hospitality' },
                        { value: 'Other', label: 'Other' },
                      ]}
                      value={newLead.industry}
                      onChange={(val) => setNewLead({ ...newLead, industry: val })}
                      className="lead-modal-custom-select"
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Work email {!newLead.phone && '*'}</label>
                    <input
                      type="email"
                      placeholder="user@example.com"
                      className="lead-modal-input"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Phone number {!newLead.email && '*'}</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10-digit phone number"
                      className="lead-modal-input"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Lead source *</label>
                    <CustomSelect
                      options={[
                        { value: 'manual', label: 'Manual entry' },
                        { value: 'web', label: 'Website inquiry' },
                        { value: 'referral', label: 'Customer referral' },
                        { value: 'event', label: 'Event / Trade show' },
                        { value: 'partner', label: 'Partner channel' },
                        { value: 'other', label: 'Other' },
                      ]}
                      value={newLead.source}
                      onChange={(val) => setNewLead({ ...newLead, source: val })}
                      className="lead-modal-custom-select"
                    />
                  </div>
                  {newLead.source === 'other' && (
                    <div>
                      <label className="lead-modal-label">Specify source *</label>
                      <input
                        required
                        placeholder="e.g. LinkedIn ad"
                        className="lead-modal-input"
                        value={newLead.source_other}
                        onChange={(e) => setNewLead({ ...newLead, source_other: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <label className="lead-modal-label">Address line 1</label>
                    <input
                      placeholder="Street / building"
                      className="lead-modal-input"
                      value={newLead.address_line1}
                      onChange={(e) => setNewLead({ ...newLead, address_line1: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Address line 2</label>
                    <input
                      placeholder="Area / landmark"
                      className="lead-modal-input"
                      value={newLead.address_line2}
                      onChange={(e) => setNewLead({ ...newLead, address_line2: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">City</label>
                    <input
                      placeholder="City"
                      className="lead-modal-input"
                      value={newLead.city}
                      onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">State</label>
                    <input
                      placeholder="State"
                      className="lead-modal-input"
                      value={newLead.state}
                      onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Country</label>
                    <input
                      placeholder="Country"
                      className="lead-modal-input"
                      value={newLead.country}
                      onChange={(e) => setNewLead({ ...newLead, country: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Pincode</label>
                    <input
                      placeholder="Pincode"
                      className="lead-modal-input"
                      maxLength={10}
                      value={newLead.pincode}
                      onChange={(e) => setNewLead({ ...newLead, pincode: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                  <div>
                    <label className="lead-modal-label">Potential amount *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Estimated deal value"
                      className="lead-modal-input"
                      value={newLead.potential_amount}
                      onChange={(e) => setNewLead({ ...newLead, potential_amount: e.target.value })}
                    />
                  </div>
                </div>
                {formError && (
                  <div className="tiny" style={{ color: 'var(--danger, #d64545)', marginTop: 10 }}>{formError}</div>
                )}
                <div className="lead-modal-actions">
                  <button type="button" className="btn ghost lead-modal-cancel-btn" onClick={closeForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn pri lead-modal-submit-btn">
                    {editingId ? 'Save changes ✓' : 'Create lead ✓'}
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

const fieldInput = {
  width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12px var(--b)',
}
