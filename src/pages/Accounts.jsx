import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { accountsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [selected, setSelected] = useState(null)
  const [related, setRelated] = useState({ contacts: [], opportunities: [], quotes: [] })
  const [showNew, setShowNew] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', industry: '' })
  const navigate = useNavigate()
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    accountsApi.list(companyId).then((data) => {
      setAccounts(data)
      if (data.length && !selected) select(data[0])
    })
  }

  useEffect(load, [companyId])

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

  return (
    <AppShell>
      <div className="scr-head"><h2>Accounts</h2><span className="goal">Every company you sell to.</span></div>
      <div className="frame">
        <div className="split">
          <div className="lst">
            <div className="rowx sp" style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)' }}>
              <b style={{ font: '600 13px var(--d)' }}>Accounts · {accounts.length}</b>
              <button className="btn pri" style={{ padding: '4px 9px' }} onClick={() => setShowNew((v) => !v)}>＋ New account</button>
            </div>
            {showNew && (
              <div className="card" style={{ margin: '10px 12px', padding: 11 }}>
                <form onSubmit={createAccount}>
                  <input required placeholder="Company name" value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} style={fieldInput} />
                  <input placeholder="Industry" value={newAccount.industry}
                    onChange={(e) => setNewAccount({ ...newAccount, industry: e.target.value })} style={{ ...fieldInput, marginTop: 6 }} />
                  <div className="rowx sp" style={{ marginTop: 8 }}>
                    <button type="button" className="btn ghost" style={{ padding: '4px 9px' }} onClick={() => setShowNew(false)}>Cancel</button>
                    <button className="btn pri" style={{ padding: '4px 9px' }}>Create account</button>
                  </div>
                </form>
              </div>
            )}
            {accounts.map((a) => (
              <div key={a.id} className={`lead ${selected?.id === a.id ? 'sel' : ''}`} style={{ cursor: 'pointer' }} onClick={() => select(a)}>
                <div className="rowx sp">
                  <div className="rowx">
                    <span className="av a">{a.name.slice(0, 2).toUpperCase()}</span>
                    <div><b>{a.name}</b><div className="tiny">{a.industry || a.account_type}</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 18 }}>
            {selected ? (
              <>
                <b style={{ font: '600 15px var(--d)' }}>{selected.name}</b>
                <div className="tiny">{selected.account_no} · {selected.industry || selected.account_type}</div>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 16 }}>
                  <div>
                    <div className="lab">Contacts ({related.contacts.length})</div>
                    {related.contacts.map((c) => (
                      <div className="card hov" key={c.id} style={{ marginTop: 8, padding: '9px 11px', cursor: 'pointer' }} onClick={() => navigate('/contacts')}>
                        <b style={{ fontSize: 12 }}>{c.first_name} {c.last_name}</b>
                        <div className="tiny">{c.title || '—'}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="lab">Opportunities ({related.opportunities.length})</div>
                    {related.opportunities.map((o) => (
                      <div className="card hov" key={o.id} style={{ marginTop: 8, padding: '9px 11px', cursor: 'pointer' }} onClick={() => navigate(`/record/${o.id}`)}>
                        <b style={{ fontSize: 12 }}>{o.name}</b>
                        <div className="tiny">{o.amount ? `₹${o.amount.toLocaleString('en-IN')}` : '—'} · {o.status}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="lab">Quotes ({related.quotes.length})</div>
                    {related.quotes.map((q) => (
                      <div className="card hov" key={q.id} style={{ marginTop: 8, padding: '9px 11px', cursor: 'pointer' }} onClick={() => navigate('/quotes')}>
                        <b style={{ fontSize: 12 }}>{q.doc_num}</b>
                        <div className="tiny">₹{q.total.toLocaleString('en-IN')} · {q.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="tiny">Select an account, or create one.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

const fieldInput = {
  width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12px var(--b)',
}
