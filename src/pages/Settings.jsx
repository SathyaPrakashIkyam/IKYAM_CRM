import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { settingsApi, aiChatApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import './Settings.css'

const TABS = [
  { key: 'general', label: '⚙ General' },
  { key: 'fields', label: '▤ Custom fields' },
  { key: 'ai', label: '✦ AI Assistant' },
]

export default function Settings() {
  const [tab, setTab] = useState('general')

  return (
    <AppShell>
      <div className="ikyam-mock settings-page">
        <div className="scr-head"><h2>Settings</h2><span className="goal">Workspace-level configuration — separate from user management, which is about people.</span></div>
        <div className="frame">
          <div className="shell settings-shell">
            <aside className="rail">
              <div className="nav">
                {TABS.map((t) => (
                  <a key={t.key} href="#" className={tab === t.key ? 'sel' : ''}
                    onClick={(e) => { e.preventDefault(); setTab(t.key) }}>{t.label}</a>
                ))}
              </div>
            </aside>
            <div className="main">
              <div className="content">
                {tab === 'general' && <GeneralPanel />}
                {tab === 'fields' && <CustomFieldsPanel />}
                {tab === 'ai' && <AiAssistantPanel />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function GeneralPanel() {
  const [form, setForm] = useState({ workspace_name: '', default_currency: 'INR', timezone: 'Asia/Kolkata' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsApi.getGeneral().then((data) => setForm((f) => ({
      ...f,
      workspace_name: data.workspace_name,
      default_currency: data.settings?.default_currency || f.default_currency,
      timezone: data.settings?.timezone || f.timezone,
    })))
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
        {saved && <span className="chip ok">✓ Saved</span>}
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
          {fields.length === 0 && <tr><td colSpan={3} className="tiny">No custom fields yet.</td></tr>}
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

function AiAssistantPanel() {
  const [keys, setKeys] = useState([])
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    aiChatApi.keys().then(setKeys)
  }
  useEffect(load, [])

  async function addKey(e) {
    e.preventDefault()
    if (!newKey.trim()) return
    setSaving(true)
    try {
      await aiChatApi.addKey(newKey.trim())
      setNewKey('')
      load()
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id) {
    await aiChatApi.deactivateKey(id)
    load()
  }

  const activeCount = keys.filter((k) => k.is_active).length

  return (
    <>
      <b style={{ font: '600 15px var(--d)' }}>AI Assistant — Gemini API keys</b>
      <p className="tiny" style={{ marginTop: 4, color: 'var(--mut)' }}>
        Powers the chat bubble in the corner of every screen. Add one key, or several —
        with more than one active key, each chat request automatically rotates to
        whichever key was used longest ago, and falls through to the next one if a
        request fails.
      </p>

      <div className="card" style={{ marginTop: 10 }}>
        {keys.length === 0 && <div className="tiny" style={{ marginBottom: 8 }}>No Gemini API key configured yet — the chat widget won't work until you add one.</div>}
        {keys.map((k) => (
          <div className="fld rowx sp" key={k.global_key_id}>
            <div>
              <span className="mono">{k.masked_key}</span>{' '}
              <span className={`chip ${k.is_active ? 'ok' : ''}`} style={{ marginLeft: 6 }}>{k.is_active ? 'Active' : 'Deactivated'}</span>
              {k.last_used_at && <div className="tiny" style={{ color: 'var(--mut)' }}>Last used {new Date(k.last_used_at).toLocaleString()}</div>}
            </div>
            {k.is_active && (
              <span className="tiny" style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--orange-ink)' }} onClick={() => deactivate(k.global_key_id)}>
                Deactivate
              </span>
            )}
          </div>
        ))}

        <form className="rowx" style={{ marginTop: keys.length ? 12 : 0, gap: 8 }} onSubmit={addKey}>
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Paste a Gemini API key…"
            style={{ ...fieldInput, flex: 1 }}
          />
          <button className="btn pri" disabled={saving}>{saving ? 'Adding…' : `＋ Add ${activeCount > 0 ? 'another' : ''} key`}</button>
        </form>
      </div>
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
