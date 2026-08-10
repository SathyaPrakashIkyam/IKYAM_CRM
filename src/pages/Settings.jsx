import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { settingsApi } from '../api/endpoints'

const TABS = [
  { key: 'general', label: '⚙ General' },
  { key: 'fields', label: '▤ Custom fields' },
  { key: 'api', label: '◇ API & webhooks' },
]

export default function Settings() {
  const [tab, setTab] = useState('general')

  return (
    <AppShell>
      <div className="scr-head"><h2>Settings</h2><span className="goal">Workspace-level configuration.</span></div>
      <div className="frame">
        <div className="shell" style={{ gridTemplateColumns: '206px 1fr' }}>
          <aside className="rail">
            <div className="nav">
              {TABS.map((t) => (
                <a key={t.key} href="#" className={tab === t.key ? 'sel' : ''}
                  onClick={(e) => { e.preventDefault(); setTab(t.key) }}>{t.label}</a>
              ))}
            </div>
          </aside>
          <div className="main"><div className="content">
            {tab === 'general' && <GeneralPanel />}
            {tab === 'fields' && <CustomFieldsPanel />}
            {tab === 'api' && <ApiPanel />}
          </div></div>
        </div>
      </div>
    </AppShell>
  )
}

function GeneralPanel() {
  const [form, setForm] = useState({ workspace_name: '', default_currency: 'INR', timezone: 'Asia/Kolkata' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsApi.getGeneral().then((data) => setForm((f) => ({ ...f, workspace_name: data.workspace_name })))
  }, [])

  async function save(e) {
    e.preventDefault()
    await settingsApi.updateGeneral(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form onSubmit={save}>
      <b style={{ font: '600 15px var(--d)' }}>General</b>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="fld"><span className="lab">Workspace name</span>
          <input value={form.workspace_name} onChange={(e) => setForm({ ...form, workspace_name: e.target.value })} style={inputStyle} />
        </div>
        <div className="fld" style={{ border: 0 }}><span className="lab">Default currency</span>
          <input value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} style={inputStyle} />
        </div>
      </div>
      <div className="rowx" style={{ marginTop: 12, gap: 10 }}>
        <button className="btn pri">Save changes</button>
        {saved && <span className="tiny">✓ Saved</span>}
      </div>
    </form>
  )
}

function CustomFieldsPanel() {
  const [fields, setFields] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ object_api_name: 'lead', field_key: '', label: '', field_type: 'text' })

  function load() {
    settingsApi.customFields().then(setFields)
  }
  useEffect(load, [])

  async function create(e) {
    e.preventDefault()
    await settingsApi.createCustomField(form)
    setForm({ object_api_name: 'lead', field_key: '', label: '', field_type: 'text' })
    setShowNew(false)
    load()
  }

  return (
    <>
      <b style={{ font: '600 15px var(--d)' }}>Custom fields</b>
      <table className="qtable">
        <thead><tr><th>Object</th><th>Field</th><th>Type</th></tr></thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.id}><td>{f.object_api_name}</td><td>{f.label}</td><td>{f.field_type}</td></tr>
          ))}
        </tbody>
      </table>

      {showNew && (
        <div className="card" style={{ marginTop: 10, padding: 11 }}>
          <form onSubmit={create}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <input placeholder="Object (lead/account…)" value={form.object_api_name} onChange={(e) => setForm({ ...form, object_api_name: e.target.value })} style={fieldInput} />
              <input placeholder="Field key" value={form.field_key} onChange={(e) => setForm({ ...form, field_key: e.target.value, label: e.target.value })} style={fieldInput} />
              <input placeholder="Type (text/checkbox…)" value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })} style={fieldInput} />
            </div>
            <div className="rowx sp" style={{ marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn pri">Add field</button>
            </div>
          </form>
        </div>
      )}
      <button className="btn pri" style={{ marginTop: 10 }} onClick={() => setShowNew((v) => !v)}>＋ Add field</button>
    </>
  )
}

function ApiPanel() {
  const [keys, setKeys] = useState([])
  const [webhooks, setWebhooks] = useState([])
  const [newKey, setNewKey] = useState(null)

  function load() {
    settingsApi.apiKeys().then(setKeys)
    settingsApi.webhooks().then(setWebhooks)
  }
  useEffect(load, [])

  async function createKey() {
    const created = await settingsApi.createApiKey('Default key')
    setNewKey(created.full_key)
    load()
  }

  async function addWebhook() {
    const url = window.prompt('Webhook URL?', 'https://hooks.example.com/crm')
    if (!url) return
    const event_type = window.prompt('Event type?', 'lead.converted') || 'lead.converted'
    await settingsApi.createWebhook({ url, event_type })
    load()
  }

  return (
    <>
      <b style={{ font: '600 15px var(--d)' }}>API &amp; webhooks</b>
      <div className="card" style={{ marginTop: 10 }}>
        {newKey && <div className="chip ok" style={{ display: 'block', marginBottom: 8 }}>New key (copy now — shown once): <span className="mono">{newKey}</span></div>}
        {keys.map((k) => (
          <div className="fld" key={k.id}><span className="lab">{k.name}</span><span className="mono">{k.key_prefix}••••••••</span></div>
        ))}
        <button className="btn" onClick={createKey}>Generate new key</button>
      </div>

      <div className="lab" style={{ marginTop: 14 }}>Webhooks</div>
      {webhooks.map((w) => (
        <div className="card hov" key={w.id} style={{ marginTop: 8 }}>
          <b style={{ fontSize: 12.5 }}>{w.event_type}</b>
          <div className="tiny mono">{w.url}</div>
        </div>
      ))}
      <button className="btn pri" style={{ marginTop: 10 }} onClick={addWebhook}>＋ Add webhook</button>
    </>
  )
}

const inputStyle = {
  display: 'block', width: '100%', border: 0, background: 'transparent',
  color: 'var(--ink)', font: '500 13px var(--b)', outline: 'none', padding: 0,
}
const fieldInput = {
  padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12px var(--b)',
}
