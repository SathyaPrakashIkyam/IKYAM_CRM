import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { accountsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import '../styles/Accounts.css'

const INDUSTRY_OPTIONS = [
  { value: '', label: 'Select industry...' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Technology', label: 'Technology / Software' },
  { value: 'Healthcare', label: 'Healthcare & Pharma' },
  { value: 'Financial Services', label: 'Financial Services' },
  { value: 'Retail', label: 'Retail & E-commerce' },
  { value: 'Automotive', label: 'Automotive' },
  { value: 'Real Estate', label: 'Real Estate & Construction' },
  { value: 'Education', label: 'Education' },
  { value: 'Services', label: 'Professional Services' },
  { value: 'Other', label: 'Other' },
]

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [selected, setSelected] = useState(null)
  const [related, setRelated] = useState({ contacts: [], opportunities: [], quotes: [] })
  const [showNew, setShowNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newAccount, setNewAccount] = useState({ name: '', industry: '' })
  const navigate = useNavigate()
  const location = useLocation()
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    accountsApi.list(companyId).then((data) => {
      setAccounts(data)
      const openId = location.state?.openId
      const toSelect = (openId && data.find((a) => a.id === openId)) || (data.length && !selected ? data[0] : null)
      if (toSelect) select(toSelect)
    })
  }

  useEffect(load, [companyId, location.state])

  function select(account) {
    setSelected(account)
    Promise.all([
      accountsApi.contacts(account.id),
      accountsApi.opportunities(account.id),
      accountsApi.quotes(account.id),
    ]).then(([contacts, opportunities, quotes]) => setRelated({ contacts, opportunities, quotes }))
  }

  async function createAccount(e) {
    e.preventDefault()
    const created = await accountsApi.create(companyId, newAccount)
    setAccounts((prev) => [created, ...prev])
    select(created)
    setNewAccount({ name: '', industry: '' })
    setShowNew(false)
  }

  const openValue = related.opportunities
    .filter((o) => o.status === 'open')
    .reduce((sum, o) => sum + (o.amount || 0), 0)

  const filteredAccounts = accounts.filter((a) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (a.name || '').toLowerCase().includes(q) || (a.industry || '').toLowerCase().includes(q)
  })

  return (
    <AppShell>
      <div className="ikyam-mock accounts-page">
        <div className="scr-head">
          <h2>Accounts</h2>
          <span className="goal">Every company you sell to.</span>
        </div>
        <div className="frame">
          <div className="split">
            <div className="lst">
              <div className="accounts-sidebar-header">
                <div className="rowx sp" style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)' }}>
                  <b style={{ font: '600 13px var(--d)' }}>Accounts · {filteredAccounts.length}</b>
                  <button className="btn pri" style={{ padding: '6px 14px', borderRadius: 18 }} onClick={() => setShowNew(true)}>
                    ＋ New account
                  </button>
                </div>

                <div className="account-search-box">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search account name or industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="account-search-input"
                  />
                  {searchQuery && (
                    <button type="button" style={{ border: 0, background: 'transparent', color: 'var(--mut)', cursor: 'pointer', fontSize: 11 }} onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>
              </div>

              <div className="accounts-scroll-list">
                {filteredAccounts.map((a) => (
                  <div key={a.id} className={`lead ${selected?.id === a.id ? 'sel' : ''}`} style={{ cursor: 'pointer' }} onClick={() => select(a)}>
                    <div className="rowx sp">
                      <div className="rowx">
                        <span className="av a">{a.name.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <b>{a.name}</b>
                          <div className="tiny">{a.industry || a.account_type || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredAccounts.length === 0 && (
                  <div className="tiny mut" style={{ padding: '16px', textAlign: 'center' }}>No matching accounts.</div>
                )}
              </div>
            </div>

            <div style={{ padding: 18, overflowY: 'auto', height: '100%' }}>
              {selected ? (
                <>
                  <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <b style={{ font: '600 15px var(--d)' }}>{selected.name}</b>
                      <div className="tiny">{selected.account_no} · {selected.industry || selected.account_type || 'General'}</div>
                    </div>
                    <button className="btn pri" onClick={() => navigate('/pipeline')}>＋ New opportunity</button>
                  </div>

                  <div className="ai-frame" style={{ padding: 12, marginTop: 13 }}>
                    <span className="ai-tag">ACCOUNT SNAPSHOT</span>
                    <div className="tiny" style={{ marginTop: 3 }}>
                      ₹{openValue.toLocaleString('en-IN')} open across {related.opportunities.filter((o) => o.status === 'open').length} opportunit{related.opportunities.filter((o) => o.status === 'open').length === 1 ? 'y' : 'ies'} ·{' '}
                      {related.quotes.length} quote{related.quotes.length === 1 ? '' : 's'} on file · {related.contacts.length} contact{related.contacts.length === 1 ? '' : 's'} known.
                    </div>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 13 }}>
                    <div>
                      <div className="lab">Contacts ({related.contacts.length})</div>
                      {related.contacts.map((c) => (
                        <div className="card hov" key={c.id} style={{ marginTop: 8, padding: '9px 11px', cursor: 'pointer' }} onClick={() => navigate('/contacts')}>
                          <b style={{ fontSize: 12 }}>{c.first_name} {c.last_name}</b>
                          <div className="tiny">{c.title || '—'}</div>
                        </div>
                      ))}
                      {related.contacts.length === 0 && <div className="tiny" style={{ marginTop: 6 }}>None yet.</div>}
                    </div>
                    <div>
                      <div className="lab">Opportunities ({related.opportunities.length})</div>
                      {related.opportunities.map((o) => (
                        <div className="card hov" key={o.id} style={{ marginTop: 8, padding: '9px 11px', cursor: 'pointer' }} onClick={() => navigate(`/record/${o.id}`)}>
                          <b style={{ fontSize: 12 }}>{o.name}</b>
                          <div className="tiny">{o.amount ? `₹${o.amount.toLocaleString('en-IN')}` : '—'} · {o.status}</div>
                        </div>
                      ))}
                      {related.opportunities.length === 0 && <div className="tiny" style={{ marginTop: 6 }}>None yet.</div>}
                    </div>
                    <div>
                      <div className="lab">Quotes ({related.quotes.length})</div>
                      {related.quotes.map((q) => (
                        <div className="card hov" key={q.id} style={{ marginTop: 8, padding: '9px 11px', cursor: 'pointer' }} onClick={() => navigate('/quotes')}>
                          <b style={{ fontSize: 12 }}>{q.doc_num}</b>
                          <div className="tiny">₹{q.total.toLocaleString('en-IN')} · {q.status}</div>
                        </div>
                      ))}
                      {related.quotes.length === 0 && <div className="tiny" style={{ marginTop: 6 }}>None yet.</div>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="tiny">Select an account, or create one.</div>
              )}
            </div>
          </div>
        </div>

        {/* Centered Frosted Glass Add Account Modal */}
        {showNew && (
          <div className="account-modal-overlay" onClick={() => setShowNew(false)}>
            <div className="account-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <div className="account-modal-title-row">
                  <div className="account-modal-icon-badge">🏢</div>
                  <div>
                    <h3>Add new account</h3>
                    <span className="tiny mut">Company details for your sales pipeline</span>
                  </div>
                </div>
                <button type="button" className="account-modal-close" onClick={() => setShowNew(false)}>✕</button>
              </div>

              <form onSubmit={createAccount}>
                <div className="account-modal-form-grid">
                  <div className="account-modal-full-width">
                    <label className="account-modal-label">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gleason Works Pvt Ltd"
                      className="account-modal-input"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    />
                  </div>

                  <div className="account-modal-full-width">
                    <label className="account-modal-label">Industry</label>
                    <CustomSelect
                      options={INDUSTRY_OPTIONS}
                      value={newAccount.industry}
                      onChange={(val) => setNewAccount({ ...newAccount, industry: val })}
                      className="account-modal-custom-select"
                      placeholder="Select industry..."
                    />
                  </div>
                </div>

                <div className="account-modal-actions">
                  <button type="button" className="btn ghost account-modal-cancel-btn" onClick={() => setShowNew(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn pri account-modal-submit-btn">
                    Create account ✓
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
