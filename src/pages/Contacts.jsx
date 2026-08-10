import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { contactsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newContact, setNewContact] = useState({ first_name: '', last_name: '', title: '' })
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    contactsApi.list(companyId).then((data) => {
      setContacts(data)
      if (data.length && !selected) setSelected(data[0])
    })
  }

  useEffect(load, [companyId])

  async function createContact(e) {
    e.preventDefault()
    const created = await contactsApi.create(companyId, newContact)
    setContacts((prev) => [created, ...prev])
    setSelected(created)
    setNewContact({ first_name: '', last_name: '', title: '' })
    setShowNew(false)
  }

  return (
    <AppShell>
      <div className="scr-head"><h2>Contacts</h2><span className="goal">The people behind each account.</span></div>
      <div className="frame">
        <div className="split">
          <div className="lst">
            <div className="rowx sp" style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)' }}>
              <b style={{ font: '600 13px var(--d)' }}>Contacts · {contacts.length}</b>
              <button className="btn pri" style={{ padding: '4px 9px' }} onClick={() => setShowNew((v) => !v)}>＋ New contact</button>
            </div>
            {showNew && (
              <div className="card" style={{ margin: '10px 12px', padding: 11 }}>
                <form onSubmit={createContact}>
                  <input required placeholder="First name" value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} style={fieldInput} />
                  <input required placeholder="Last name" value={newContact.last_name}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} style={{ ...fieldInput, marginTop: 6 }} />
                  <input placeholder="Title" value={newContact.title}
                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} style={{ ...fieldInput, marginTop: 6 }} />
                  <div className="rowx sp" style={{ marginTop: 8 }}>
                    <button type="button" className="btn ghost" style={{ padding: '4px 9px' }} onClick={() => setShowNew(false)}>Cancel</button>
                    <button className="btn pri" style={{ padding: '4px 9px' }}>Create contact</button>
                  </div>
                </form>
              </div>
            )}
            {contacts.map((c) => (
              <div key={c.id} className={`lead ${selected?.id === c.id ? 'sel' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                <div className="rowx">
                  <span className="av b">{(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}</span>
                  <div><b>{c.first_name} {c.last_name}</b><div className="tiny">{c.title || '—'}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 18 }}>
            {selected ? (
              <>
                <b style={{ font: '600 15px var(--d)' }}>{selected.first_name} {selected.last_name}</b>
                <div className="tiny">{selected.title || '—'}</div>
                <div className="fld" style={{ marginTop: 14 }}><span className="lab">Email</span>{selected.primary_email || '—'}</div>
                <div className="fld" style={{ border: 0 }}><span className="lab">Phone</span>{selected.primary_phone || '—'}</div>
              </>
            ) : (
              <div className="tiny">Select a contact, or create one.</div>
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
