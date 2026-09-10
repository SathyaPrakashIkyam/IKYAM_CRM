import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { settingsApi, aiChatApi, currenciesApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import '../styles/Settings.css'
import '../styles/Masters.css'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { key: 'general', label: '⚙ General', desc: 'Workspace name, default currency & timezones' },
  { key: 'fields', label: '▤ Custom fields', desc: 'Manage entity attributes for leads, accounts & quotes' },
  { key: 'notifications', label: '⏰ Notifications', desc: 'Configure activity reminder timing' },
  { key: 'ai', label: '✦ AI Assistant', desc: 'Configure Gemini API keys and failover rotation' },
]

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST · UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time · UTC+00:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT · UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT · UTC-08:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT · UTC-06:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST · UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST · UTC+01:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST · UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT · UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST · UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT · UTC+10:00)' },
]

const OBJECT_OPTIONS = [
  { value: 'all', label: 'All Objects' },
  { value: 'lead', label: 'Leads' },
  { value: 'account', label: 'Accounts' },
  { value: 'contact', label: 'Contacts' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'quote', label: 'Quotes' },
]

const TARGET_OBJECTS = [
  { value: 'lead', label: 'Lead' },
  { value: 'account', label: 'Account' },
  { value: 'contact', label: 'Contact' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'quote', label: 'Quote' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text (Single Line)' },
  { value: 'number', label: 'Number (Integer or Decimal)' },
  { value: 'boolean', label: 'Checkbox (Yes / No)' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown Selection' },
]

export default function Settings() {
  const [tab, setTab] = useState('general')

  return (
    <AppShell>
      <div className="ikyam-mock settings-page">
        {/* Header */}
        <div className="scr-head">
          <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)' }}>
                Workspace Settings
              </h2>
              <div className="goal" style={{ marginTop: 2 }}>
                Configure global defaults, custom fields, and AI copilot integrations
              </div>
            </div>
            <div className="rowx" style={{ gap: 8 }}>
              <span className="chip ok" style={{ font: '700 11.5px var(--m)' }}>
                ⚡ Active Workspace
              </span>
            </div>
          </div>
          <div className="title-bar" style={{ margin: '10px 0 14px 0' }} />
        </div>

        {/* Navigation Tabs */}
        <div className="settings-tabs-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`settings-tab-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Content Container */}
        <div className="settings-content-scroll">
          {tab === 'general' && <GeneralPanel />}
          {tab === 'fields' && <CustomFieldsPanel />}
          {tab === 'notifications' && <NotificationSettingsPanel />}
          {tab === 'ai' && <AiAssistantPanel />}
        </div>
      </div>
    </AppShell>
  )
}

/* ==========================================================================
   Panel 1: General Settings
   ========================================================================== */
function GeneralPanel() {
  const { companyId } = useAuth()
  const [form, setForm] = useState({ workspace_name: '', default_currency: 'INR', timezone: 'Asia/Kolkata' })
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      settingsApi.getGeneral(),
      currenciesApi.list().catch(() => []),
    ])
      .then(([data, currs]) => {
        setForm({
          workspace_name: data.workspace_name || '',
          default_currency: data.settings?.default_currency || 'INR',
          timezone: data.settings?.timezone || 'Asia/Kolkata',
        })
        setCurrencies(Array.isArray(currs) ? currs : [])
      })
      .catch((err) => {
        console.error('Failed to load settings:', err)
        setError('Unable to load workspace settings')
      })
      .finally(() => setLoading(false))
  }, [])

  const currencyOptions = useMemo(() => {
    const baseCurrs = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'CAD', 'AUD']
    const loaded = currencies.map((c) => c.code).filter(Boolean)
    const combined = Array.from(new Set([...baseCurrs, ...loaded]))
    return combined.map((code) => ({ value: code, label: code }))
  }, [currencies])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.workspace_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await settingsApi.updateGeneral(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError(err?.response?.data?.detail || 'Failed to update workspace settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 840 }}>
      <form onSubmit={handleSave}>
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid rgba(239, 68, 68, 0.28)', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {/* Section 1: Workspace Details */}
        <div className="settings-card">
          <div className="settings-section-head">
            <div className="settings-section-icon">🏢</div>
            <div>
              <h3 className="settings-section-title">Workspace Profile</h3>
              <div className="settings-section-subtitle">
                Display name and organization identification across the CRM
              </div>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-form-label">Workspace Name *</label>
              <input
                required
                value={form.workspace_name}
                onChange={(e) => setForm({ ...form, workspace_name: e.target.value })}
                placeholder="e.g. Acme Corporation"
                className="settings-input"
                disabled={loading || saving}
              />
              <span className="tiny mut" style={{ marginTop: 2 }}>
                Used in outbound quotes, notifications, and top navigation header
              </span>
            </div>

            <div className="settings-form-group">
              <label className="settings-form-label">Company Account ID</label>
              <input
                value={companyId || 'Global Standalone'}
                disabled
                className="settings-input mono"
                style={{ background: 'rgba(0, 0, 0, 0.03)', color: 'var(--mut)' }}
              />
              <span className="tiny mut" style={{ marginTop: 2 }}>
                Internal unique identifier for multi-tenant data isolation
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Localization Defaults */}
        <div className="settings-card">
          <div className="settings-section-head">
            <div className="settings-section-icon">🌐</div>
            <div>
              <h3 className="settings-section-title">Regional Defaults &amp; Localization</h3>
              <div className="settings-section-subtitle">
                Configure primary currency formatting and operational timezone
              </div>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-form-label">Default Currency</label>
              <CustomSelect
                options={currencyOptions}
                value={form.default_currency}
                onChange={(val) => setForm({ ...form, default_currency: val })}
                className="settings-custom-select"
              />
              <span className="tiny mut" style={{ marginTop: 2 }}>
                Standard base currency applied to quotes, pipeline deals, and analytics
              </span>
            </div>

            <div className="settings-form-group">
              <label className="settings-form-label">Primary Timezone</label>
              <CustomSelect
                options={TIMEZONES}
                value={form.timezone}
                onChange={(val) => setForm({ ...form, timezone: val })}
                className="settings-custom-select"
              />
              <span className="tiny mut" style={{ marginTop: 2 }}>
                Activity reminders, task scheduling, and audit logs resolve to this timezone
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="rowx" style={{ gap: 14, alignItems: 'center', marginTop: 4 }}>
          <button
            type="submit"
            className="btn pri"
            style={{
              borderRadius: 22,
              padding: '10px 24px',
              font: '700 13px var(--b)',
              background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0, 201, 167, 0.35)',
            }}
            disabled={saving || loading || !form.workspace_name.trim()}
          >
            {saving ? 'Saving changes…' : 'Save changes ✓'}
          </button>

          {saved && (
            <span className="chip ok" style={{ padding: '6px 14px', fontSize: 12 }}>
              ✓ Settings saved successfully
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

/* ==========================================================================
   Panel 2: Custom Fields
   ========================================================================== */
function CustomFieldsPanel() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [objectFilter, setObjectFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ object_api_name: 'lead', field_key: '', label: '', field_type: 'text' })
  const [modalError, setModalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true)
    settingsApi
      .customFields()
      .then((data) => setFields(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load custom fields:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function handleLabelChange(val) {
    const slug = val
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
    setForm((f) => ({
      ...f,
      label: val,
      field_key: f.field_key && f.field_key !== f.label.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ? f.field_key : slug,
    }))
    if (modalError) setModalError(null)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.label.trim() || !form.field_key.trim()) return

    const sanitizedKey = form.field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')

    // Pre-check for duplicate key on same object
    const duplicate = fields.some(
      (f) =>
        f.object_api_name === form.object_api_name &&
        (f.field_key || '').toLowerCase() === sanitizedKey
    )
    if (duplicate) {
      setModalError(`A custom field with key "${sanitizedKey}" already exists on ${form.object_api_name}.`)
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await settingsApi.createCustomField({
        ...form,
        field_key: sanitizedKey,
      })
      setForm({ object_api_name: 'lead', field_key: '', label: '', field_type: 'text' })
      setShowModal(false)
      load()
    } catch (err) {
      console.error('Failed to create custom field:', err)
      setModalError(err?.response?.data?.detail || 'Failed to create custom field')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      const matchesSearch =
        !search ||
        (f.label || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.field_key || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.object_api_name || '').toLowerCase().includes(search.toLowerCase())

      const matchesObject = objectFilter === 'all' || f.object_api_name === objectFilter
      return matchesSearch && matchesObject
    })
  }, [fields, search, objectFilter])

  const metrics = useMemo(() => {
    return {
      total: fields.length,
      leads: fields.filter((f) => f.object_api_name === 'lead').length,
      accounts: fields.filter((f) => f.object_api_name === 'account').length,
      contacts: fields.filter((f) => f.object_api_name === 'contact').length,
    }
  }, [fields])

  return (
    <>
      {/* 4-Metric Summary Strip */}
      <div className="settings-metrics-strip">
        <div className="settings-metric-col">
          <span className="settings-metric-label">Total Custom Fields</span>
          <span className="settings-metric-num">{metrics.total}</span>
        </div>
        <div className="settings-metric-col">
          <span className="settings-metric-label">Lead Fields</span>
          <span className="settings-metric-num" style={{ color: '#00C9A7' }}>{metrics.leads}</span>
        </div>
        <div className="settings-metric-col">
          <span className="settings-metric-label">Account Fields</span>
          <span className="settings-metric-num" style={{ color: '#0072CE' }}>{metrics.accounts}</span>
        </div>
        <div className="settings-metric-col">
          <span className="settings-metric-label">Contact Fields</span>
          <span className="settings-metric-num" style={{ color: '#8B5CF6' }}>{metrics.contacts}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="settings-controls-bar">
        <div className="rowx" style={{ gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <div className="settings-search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="settings-search-input"
              placeholder="Search by label or API key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <span style={{ cursor: 'pointer', color: 'var(--mut)', fontSize: 13 }} onClick={() => setSearch('')}>
                ✕
              </span>
            )}
          </div>

          <div style={{ width: 180 }}>
            <CustomSelect
              options={OBJECT_OPTIONS}
              value={objectFilter}
              onChange={(val) => setObjectFilter(val)}
              className="settings-custom-select"
            />
          </div>
        </div>

        <button
          type="button"
          className="btn pri"
          style={{
            borderRadius: 22,
            padding: '9px 20px',
            font: '700 13px var(--b)',
            background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(0, 201, 167, 0.35)',
          }}
          onClick={() => {
            setForm({ object_api_name: 'lead', field_key: '', label: '', field_type: 'text' })
            setModalError(null)
            setShowModal(true)
          }}
        >
          ＋ New custom field
        </button>
      </div>

      {/* Standardized Table Card */}
      <div className="table-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="masters-table-scroll">
          <table className="qtable">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Field Label</th>
                <th>API Key</th>
                <th>Target Object</th>
                <th>Data Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: 'var(--mut)' }}>
                    Loading custom fields…
                  </td>
                </tr>
              ) : filteredFields.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: 'var(--mut)' }}>
                    {search ? `No custom fields matching "${search}"` : 'No custom fields defined yet. Click "＋ New custom field" to add one.'}
                  </td>
                </tr>
              ) : (
                filteredFields.map((f, idx) => (
                  <tr key={f.id || idx}>
                    <td className="mono" style={{ color: 'var(--mut)', fontSize: 12 }}>
                      {idx + 1}
                    </td>
                    <td>
                      <b style={{ color: 'var(--ink)', fontSize: 13.5 }}>{f.label}</b>
                    </td>
                    <td>
                      <span className="mono" style={{ color: '#007A65', fontSize: 12.5 }}>
                        {f.field_key}
                      </span>
                    </td>
                    <td>
                      <span className={`obj-badge ${f.object_api_name || 'lead'}`}>
                        {f.object_api_name}
                      </span>
                    </td>
                    <td>
                      <span className="chip" style={{ font: '600 12px var(--m)' }}>
                        {f.field_type}
                      </span>
                    </td>
                    <td>
                      <span className="chip ok" style={{ fontSize: 11 }}>Active</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Centered Frosted Glass Create Modal */}
      {showModal && (
        <div className="masters-modal-overlay" onClick={() => !submitting && setShowModal(false)}>
          <div className="masters-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="masters-modal-header">
              <div className="masters-modal-title-row">
                <div className="masters-modal-icon-badge">▤</div>
                <div>
                  <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>New Custom Field</h3>
                  <span className="tiny mut">Add a custom attribute to capture unique business data</span>
                </div>
              </div>
              <button
                type="button"
                className="products-modal-close"
                onClick={() => !submitting && setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {modalError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1.5px solid rgba(239, 68, 68, 0.28)',
                    color: '#EF4444',
                    fontSize: 13,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: 16 }}>⚠</span>
                  <span>{modalError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="masters-modal-label">Target Object *</label>
                  <CustomSelect
                    options={TARGET_OBJECTS}
                    value={form.object_api_name}
                    onChange={(val) => setForm({ ...form, object_api_name: val })}
                    className="settings-custom-select"
                  />
                </div>
                <div>
                  <label className="masters-modal-label">Data Type *</label>
                  <CustomSelect
                    options={FIELD_TYPES}
                    value={form.field_type}
                    onChange={(val) => setForm({ ...form, field_type: val })}
                    className="settings-custom-select"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="masters-modal-label">Field Label *</label>
                <input
                  required
                  autoFocus
                  placeholder="e.g. Industry Vertical, Tax Exemption No"
                  className="masters-modal-input"
                  value={form.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="masters-modal-label">Field Key (API Name) *</label>
                <input
                  required
                  placeholder="e.g. industry_vertical"
                  className="masters-modal-input mono"
                  value={form.field_key}
                  onChange={(e) => {
                    setForm({ ...form, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
                    if (modalError) setModalError(null)
                  }}
                  disabled={submitting}
                />
                <span className="tiny mut" style={{ display: 'block', marginTop: 4 }}>
                  Machine-readable slug used in API payloads and formula expressions
                </span>
              </div>

              <div className="masters-modal-actions">
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '10px 22px', borderRadius: 20 }}
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn pri masters-modal-submit-btn"
                  disabled={submitting || !form.label.trim() || !form.field_key.trim()}
                >
                  {submitting ? 'Creating…' : 'Create Field ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

/* ==========================================================================
   Panel 3: Notification Settings (activity reminder timing)
   ========================================================================== */
function NotificationSettingsPanel() {
  const [reminderMinutes, setReminderMinutes] = useState(15)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    settingsApi
      .getGeneral()
      .then((data) => setReminderMinutes(data.settings?.activity_reminder_minutes ?? 15))
      .catch((err) => {
        console.error('Failed to load notification settings:', err)
        setError('Unable to load notification settings')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await settingsApi.updateGeneral({ activity_reminder_minutes: reminderMinutes })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save notification settings:', err)
      setError(err?.response?.data?.detail || 'Failed to update reminder timing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 840 }}>
      {/* Hero Explanatory Banner */}
      <div className="ai-hero-banner">
        <div style={{ fontSize: 26, lineHeight: 1 }}>⏰</div>
        <div>
          <h4 style={{ margin: 0, font: '800 16px var(--d)', color: 'var(--ink)' }}>
            In-App Activity Reminders
          </h4>
          <p className="tiny" style={{ marginTop: 4, color: 'var(--mut)', lineHeight: 1.5 }}>
            Every open task, call and meeting fires an in-app notification a set number of minutes before its
            due or start time. Change that lead time here — it applies company-wide and takes effect on the
            next reminder check, no restart needed.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid rgba(239, 68, 68, 0.28)', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        <div className="settings-card">
          <div className="settings-section-head">
            <div className="settings-section-icon">⏰</div>
            <div>
              <h3 className="settings-section-title">Activity Reminder Timing</h3>
              <div className="settings-section-subtitle">
                How long before a task/call/meeting's due or start time its in-app notification fires
              </div>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-form-label">Remind me before (minutes)</label>
              <input
                type="number"
                min={1}
                max={1440}
                required
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="settings-input"
                style={{ maxWidth: 160 }}
                disabled={loading || saving}
              />
              <span className="tiny mut" style={{ marginTop: 2 }}>
                Applies to every open task, call and meeting across the company — e.g. 15 or 30 minutes ahead
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="rowx" style={{ gap: 14, alignItems: 'center', marginTop: 16 }}>
          <button
            type="submit"
            className="btn pri"
            style={{
              borderRadius: 22,
              padding: '10px 24px',
              font: '700 13px var(--b)',
              background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0, 201, 167, 0.35)',
            }}
            disabled={saving || loading || !reminderMinutes || reminderMinutes < 1}
          >
            {saving ? 'Saving changes…' : 'Save changes ✓'}
          </button>

          {saved && (
            <span className="chip ok" style={{ padding: '6px 14px', fontSize: 12 }}>
              ✓ Reminder timing saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

/* ==========================================================================
   Panel 4: AI Assistant (Gemini API Keys)
   ========================================================================== */
function AiAssistantPanel() {
  const [keys, setKeys] = useState([])
  const [newKey, setNewKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  function load() {
    aiChatApi
      .keys()
      .then((data) => setKeys(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load AI keys:', err))
  }

  useEffect(() => {
    load()
  }, [])

  async function addKey(e) {
    e.preventDefault()
    const trimmed = newKey.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await aiChatApi.addKey(trimmed)
      setNewKey('')
      setShowKey(false)
      setSuccess('Gemini API key added successfully')
      setTimeout(() => setSuccess(null), 3000)
      load()
    } catch (err) {
      console.error('Failed to add AI key:', err)
      setError(err?.response?.data?.detail || 'Failed to add Gemini API key')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id) {
    if (!window.confirm('Are you sure you want to deactivate this API key?')) return
    try {
      await aiChatApi.deactivateKey(id)
      load()
    } catch (err) {
      console.error('Failed to deactivate key:', err)
    }
  }

  async function remove(id) {
    if (!window.confirm('Permanently delete this API key? This cannot be undone.')) return
    try {
      await aiChatApi.deleteKey(id)
      load()
    } catch (err) {
      console.error('Failed to delete key:', err)
    }
  }

  const activeCount = keys.filter((k) => k.is_active).length

  return (
    <div style={{ maxWidth: 840 }}>
      {/* Metrics Strip */}
      <div className="settings-metrics-strip" style={{ marginBottom: 16 }}>
        <div className="settings-metric-col">
          <span className="settings-metric-label">Configured Keys</span>
          <span className="settings-metric-num">{keys.length}</span>
        </div>
        <div className="settings-metric-col">
          <span className="settings-metric-label">Active Rotated Keys</span>
          <span className="settings-metric-num" style={{ color: activeCount > 0 ? '#00C9A7' : '#EF4444' }}>
            {activeCount}
          </span>
        </div>
        <div className="settings-metric-col">
          <span className="settings-metric-label">Rotation Strategy</span>
          <span className="settings-metric-num" style={{ fontSize: 14, marginTop: 7, color: 'var(--mut)' }}>
            Round-Robin LRU Failover
          </span>
        </div>
      </div>

      {/* Existing Keys Card */}
      <div className="settings-card">
        <div className="settings-section-head">
          <div className="settings-section-icon">🔑</div>
          <div>
            <h3 className="settings-section-title">Active API Keys</h3>
            <div className="settings-section-subtitle">
              Masked keys registered for this company schema
            </div>
          </div>
        </div>

        {keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--mut)', font: '500 13px var(--b)' }}>
            No Gemini API keys configured yet. Add your key below to activate the AI Chat Copilot.
          </div>
        ) : (
          keys.map((k) => (
            <div className="ai-key-item" key={k.global_key_id}>
              <div>
                <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
                    {k.masked_key}
                  </span>
                  <span className={`chip ${k.is_active ? 'ok' : 'risk'}`} style={{ fontSize: 11 }}>
                    {k.is_active ? '🟢 Active' : '⚪ Deactivated'}
                  </span>
                </div>
                <div className="tiny mut" style={{ marginTop: 4 }}>
                  {k.last_used_at
                    ? `Last used ${new Date(k.last_used_at).toLocaleString()}`
                    : 'Registered · Ready for rotation'}
                </div>
              </div>

              {k.is_active ? (
                <button
                  type="button"
                  className="btn ghost"
                  style={{
                    padding: '5px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                  onClick={() => deactivate(k.global_key_id)}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  className="btn ghost"
                  style={{
                    padding: '5px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                  onClick={() => remove(k.global_key_id)}
                >
                  🗑 Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add New Key Card */}
      <div className="settings-card">
        <div className="settings-section-head">
          <div className="settings-section-icon">＋</div>
          <div>
            <h3 className="settings-section-title">Add Gemini API Key</h3>
            <div className="settings-section-subtitle">
              Obtain your free API key from Google AI Studio (aistudio.google.com)
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid rgba(239, 68, 68, 0.28)', color: '#EF4444', fontSize: 13, marginBottom: 14 }}>
            ⚠ {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(0, 201, 167, 0.12)', border: '1.5px solid rgba(0, 201, 167, 0.28)', color: '#00A68A', fontSize: 13, marginBottom: 14 }}>
            ✓ {success}
          </div>
        )}

        <form onSubmit={addKey}>
          <div className="settings-form-group" style={{ marginBottom: 14 }}>
            <label className="settings-form-label">Gemini API Key *</label>
            <div style={{ position: 'relative' }}>
              <input
                required
                type={showKey ? 'text' : 'password'}
                value={newKey}
                onChange={(e) => {
                  setNewKey(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="AIzaSy..."
                className="settings-input mono"
                style={{ paddingRight: 40 }}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--mut)',
                  fontSize: 14,
                }}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
            <span className="tiny mut" style={{ marginTop: 2 }}>
              Keys are securely encrypted at rest and never exposed back in plain text
            </span>
          </div>

          <button
            type="submit"
            className="btn pri"
            style={{
              borderRadius: 22,
              padding: '10px 22px',
              font: '700 13px var(--b)',
              background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0, 201, 167, 0.35)',
            }}
            disabled={saving || !newKey.trim()}
          >
            {saving ? 'Adding key…' : `＋ Add ${activeCount > 0 ? 'another' : ''} key ✓`}
          </button>
        </form>
      </div>
    </div>
  )
}
