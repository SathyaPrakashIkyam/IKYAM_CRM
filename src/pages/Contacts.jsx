import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { accountsApi, contactsApi, leadsApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import '../styles/Contacts.css'
import { useAuth } from '../context/AuthContext'

export default function Contacts() {
  const location = useLocation()
  const [contacts, setContacts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Arriving here via a deal's "Related > Contacts" link passes the
  // account to filter by — without this it always landed on "All accounts"
  // and made the user re-find + reselect the account by hand.
  const [accountFilter, setAccountFilter] = useState(location.state?.accountFilter || 'all')
  const [formError, setFormError] = useState('')

  const emptyContact = {
    first_name: '',
    last_name: '',
    title: '',
    account_id: '',
    lead_id: '',
    primary_email: '',
    primary_phone: '',
  }
  const [newContact, setNewContact] = useState(emptyContact)

  const navigate = useNavigate()
  const { companyId } = useAuth()

  function load() {
    if (!companyId) return
    contactsApi.list(companyId).then((data) => {
      setContacts(data)
      const openId = location.state?.openId
      const toSelect = (openId && data.find((c) => c.id === openId)) || (data.length && !selected ? data[0] : null)
      if (toSelect) setSelected(toSelect)
    })
    accountsApi.list(companyId).then(setAccounts).catch(() => {})
    leadsApi.list(companyId).then(setLeads).catch(() => {})
  }

  useEffect(load, [companyId, location.state])

  async function createContact(e) {
    e.preventDefault()
    setFormError('')
    if (!newContact.first_name.trim()) return setFormError('First name is required')
    if (!newContact.last_name.trim()) return setFormError('Last name is required')

    const payload = {
      ...newContact,
      account_id: newContact.account_id || undefined,
      lead_id: newContact.lead_id || undefined,
      primary_email: newContact.primary_email || undefined,
      primary_phone: newContact.primary_phone || undefined,
      title: newContact.title || undefined,
    }

    try {
      const created = await contactsApi.create(companyId, payload)
      setContacts((prev) => [created, ...prev])
      setSelected(created)
      setNewContact(emptyContact)
      setShowNew(false)
    } catch (err) {
      const detail = err?.response?.data?.detail
      const message = Array.isArray(detail) ? detail.map((d) => d.msg).join('; ') : (detail?.message || detail)
      setFormError(message || 'Failed to create contact')
    }
  }

  // Filtered contacts list
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Account filter
      if (accountFilter !== 'all' && c.account_id !== accountFilter) return false

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const accName = (accounts.find((a) => a.id === c.account_id)?.name || '').toLowerCase()
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()

      return (
        fullName.includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.primary_email || '').toLowerCase().includes(q) ||
        (c.primary_phone || '').toLowerCase().includes(q) ||
        accName.includes(q)
      )
    })
  }, [contacts, accounts, searchQuery, accountFilter])

  function avatarInitials(c) {
    const f = (c.first_name || '')[0] || ''
    const l = (c.last_name || '')[0] || (c.last_name || '').slice(0, 2)
    return (f + l).toUpperCase() || 'CT'
  }

  const selectedAccount = selected ? accounts.find((a) => a.id === selected.account_id) : null
  const selectedLead = selected ? leads.find((l) => l.id === selected.lead_id) : null

  return (
    <AppShell>
      <div className="ikyam-mock contacts-page">
        <div className="scr-head">
          <h2>Contacts</h2>
          <span className="goal">The key decision makers behind each account.</span>
        </div>

        <div className="frame">
          <div className="split">
            {/* Left Sidebar List */}
            <div className="lst">
              <div className="contacts-sidebar-header">
                <div className="rowx sp" style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)' }}>
                  <b style={{ font: '600 13px var(--d)' }}>Contacts · {filteredContacts.length}</b>
                  <button
                    className="btn pri"
                    style={{ padding: '6px 14px', borderRadius: 18 }}
                    onClick={() => { setFormError(''); setNewContact(emptyContact); setShowNew(true) }}
                  >
                    ＋ New contact
                  </button>
                </div>

                {/* Search Box */}
                <div className="contact-search-box">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search name, title, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="contact-search-input"
                  />
                  {searchQuery && (
                    <button type="button" style={{ border: 0, background: 'transparent', color: 'var(--mut)', cursor: 'pointer', fontSize: 11 }} onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>

                {/* Account Filter */}
                {accounts.length > 0 && (
                  <div style={{ padding: '4px 12px 6px 12px' }}>
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Accounts' },
                        ...accounts.map((a) => ({ value: a.id, label: a.name })),
                      ]}
                      value={accountFilter}
                      onChange={setAccountFilter}
                      style={{ width: '100%', height: 32, fontSize: 11.5 }}
                    />
                  </div>
                )}
              </div>

              {/* Scrollable Contacts List */}
              <div className="contacts-scroll-list">
                {filteredContacts.map((c) => {
                  const initials = avatarInitials(c)
                  const isSel = selected?.id === c.id
                  const acc = accounts.find((a) => a.id === c.account_id)
                  const lead = leads.find((l) => l.id === c.lead_id)
                  return (
                    <div
                      key={c.id}
                      className={`lead ${isSel ? 'sel' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelected(c)}
                    >
                      <div className="rowx sp">
                        <div className="rowx" style={{ gap: 10 }}>
                          <span className="av b">{initials}</span>
                          <div>
                            <b>{c.first_name ? `${c.first_name} ${c.last_name}` : c.last_name}</b>
                            <div className="tiny" style={{ color: 'var(--mut)' }}>
                              {c.title || acc?.name || lead?.name || '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredContacts.length === 0 && (
                  <div className="tiny mut" style={{ padding: '16px', textAlign: 'center' }}>
                    No matching contacts found.
                  </div>
                )}
              </div>
            </div>

            {/* Right Contact Detail Panel */}
            <div className="contact-detail-panel">
              {selected ? (
                <>
                  {/* Header Card */}
                  <div className="contact-header-card">
                    <div className="rowx" style={{ gap: 14 }}>
                      <div className="contact-avatar-lg">{avatarInitials(selected)}</div>
                      <div>
                        <b style={{ font: '800 18px var(--d)' }}>
                          {selected.first_name ? `${selected.first_name} ${selected.last_name}` : selected.last_name}
                        </b>
                        <div className="tiny mut" style={{ fontSize: 12, marginTop: 2 }}>
                          {selected.title || 'Executive Contact'}
                          {selectedAccount && ` · ${selectedAccount.name}`}
                        </div>
                      </div>
                    </div>

                    {selectedAccount && (
                      <button
                        className="btn ghost"
                        style={{ borderRadius: 16, fontSize: 12 }}
                        onClick={() => navigate('/accounts')}
                      >
                        🏢 View Account
                      </button>
                    )}
                  </div>

                  {/* Contact Info Cards */}
                  <div className="contact-info-grid">
                    <div className="contact-info-card">
                      <span className="lab" style={{ display: 'block', marginBottom: 6 }}>Work Email</span>
                      {selected.primary_email ? (
                        <a href={`mailto:${selected.primary_email}`} style={{ color: '#00C9A7', fontWeight: 600, textDecoration: 'none' }}>
                          ✉ {selected.primary_email}
                        </a>
                      ) : (
                        <span className="tiny mut">Not specified</span>
                      )}
                    </div>

                    <div className="contact-info-card">
                      <span className="lab" style={{ display: 'block', marginBottom: 6 }}>Phone Number</span>
                      {selected.primary_phone ? (
                        <a href={`tel:${selected.primary_phone}`} style={{ color: '#0072CE', fontWeight: 600, textDecoration: 'none' }}>
                          📞 {selected.primary_phone}
                        </a>
                      ) : (
                        <span className="tiny mut">Not specified</span>
                      )}
                    </div>

                    <div className="contact-info-card">
                      <span className="lab" style={{ display: 'block', marginBottom: 6 }}>Account / Company</span>
                      <b style={{ font: '600 13px var(--d)' }}>
                        {selectedAccount ? selectedAccount.name : 'Unassigned'}
                      </b>
                    </div>

                    <div className="contact-info-card">
                      <span className="lab" style={{ display: 'block', marginBottom: 6 }}>Lead</span>
                      <b style={{ font: '600 13px var(--d)' }}>
                        {selectedLead ? `${selectedLead.name} (${selectedLead.lead_no})` : 'None'}
                      </b>
                    </div>

                    <div className="contact-info-card">
                      <span className="lab" style={{ display: 'block', marginBottom: 6 }}>Contact ID</span>
                      <span className="mono tiny mut">{selected.id ? selected.id.slice(0, 8) : '—'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="tiny mut" style={{ padding: 20 }}>
                  Select a contact from the list, or create a new contact above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Centered Frosted Glass Add Contact Modal */}
        {showNew && (
          <div className="contact-modal-overlay" onClick={() => setShowNew(false)}>
            <div className="contact-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="contact-modal-header">
                <div className="contact-modal-title-row">
                  <div className="contact-modal-icon-badge">👤</div>
                  <div>
                    <h3>Add new contact</h3>
                    <span className="tiny mut">Add a new key person to your contacts list</span>
                  </div>
                </div>
                <button type="button" className="account-modal-close" onClick={() => setShowNew(false)}>
                  ✕
                </button>
              </div>

              <form onSubmit={createContact}>
                <div className="contact-modal-form-grid">
                  <div>
                    <label className="contact-modal-label">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul"
                      className="contact-modal-input"
                      value={newContact.first_name}
                      onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="contact-modal-label">Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sharma"
                      className="contact-modal-input"
                      value={newContact.last_name}
                      onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                    />
                  </div>

                  <div className="contact-modal-full-width">
                    <label className="contact-modal-label">Job Title / Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. VP of Procurement / Technical Director"
                      className="contact-modal-input"
                      value={newContact.title}
                      onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                    />
                  </div>

                  <div className="contact-modal-full-width">
                    <label className="contact-modal-label">Lead - Company</label>
                    <CustomSelect
                      options={[
                        { value: '', label: 'Select a lead\'s company...' },
                        ...leads
                          .filter((l) => l.company_name)
                          .map((l) => ({ value: l.id, label: `${l.company_name} (Lead ${l.lead_no})` })),
                      ]}
                      value={newContact.lead_id}
                      onChange={(val) => {
                        // Driven by the Lead's own company name now, not a
                        // separate Account picker — the matching Account (if
                        // this lead has already converted) is found by
                        // company name and attached automatically, instead
                        // of making the user pick both by hand.
                        const lead = leads.find((l) => l.id === val)
                        const matchedAccount = lead
                          ? accounts.find((a) => (a.name || '').trim().toLowerCase() === (lead.company_name || '').trim().toLowerCase())
                          : null
                        setNewContact({ ...newContact, lead_id: val, account_id: matchedAccount?.id || '' })
                      }}
                      className="contact-modal-custom-select"
                      placeholder="Select a lead's company..."
                    />
                  </div>

                  <div>
                    <label className="contact-modal-label">Work Email</label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className="contact-modal-input"
                      value={newContact.primary_email}
                      onChange={(e) => setNewContact({ ...newContact, primary_email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="contact-modal-label">Phone Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10-digit phone number"
                      className="contact-modal-input"
                      value={newContact.primary_phone}
                      onChange={(e) =>
                        setNewContact({ ...newContact, primary_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                    />
                  </div>
                </div>

                {formError && (
                  <div className="tiny" style={{ color: 'var(--danger, #d64545)', marginTop: 10 }}>{formError}</div>
                )}

                <div className="contact-modal-actions">
                  <button type="button" className="btn ghost account-modal-cancel-btn" onClick={() => setShowNew(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn pri contact-modal-submit-btn">
                    Create contact ✓
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
