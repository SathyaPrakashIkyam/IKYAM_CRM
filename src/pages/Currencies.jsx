import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { currenciesApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import '../styles/Activities.css'
import '../styles/Masters.css'

export default function Currencies() {
  const navigate = useNavigate()
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [modalError, setModalError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    currenciesApi
      .list()
      .then((data) => setCurrencies(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load currencies:', err)
        setError('Unable to load currencies')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    // Pre-check for duplicate currency locally
    if (currencies.some((c) => (c.code || '').toUpperCase() === trimmed)) {
      setModalError(`Currency "${trimmed}" already exists.`)
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await currenciesApi.create({ code: trimmed })
      setCode('')
      setModalError(null)
      setShowModal(false)
      load()
    } catch (err) {
      console.error('Failed to create currency:', err)
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create currency'
      setModalError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return currencies
    return currencies.filter((c) => {
      const cCode = (c.code || '').toLowerCase()
      const cId = String(c.id || '').toLowerCase()
      return cCode.includes(q) || cId.includes(q)
    })
  }, [currencies, search])

  return (
    <AppShell>
      <div className="ikyam-mock masters-page">
        {/* Header */}
        <div className="scr-head">
          <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)' }}>
                Currencies Master
              </h2>
              <div className="goal" style={{ marginTop: 2 }}>
                Manage transaction currencies for SAP B1 sync and custom price lists
              </div>
            </div>
          
          </div>
          <div className="title-bar" style={{ margin: '10px 0 16px 0' }} />
        </div>

        {/* Masters Navigation Tabs */}
        <div className="masters-nav-tabs">
          <button
            type="button"
            className="actchip"
            onClick={() => navigate('/product-groups')}
          >
            📁 Product Groups
          </button>
          <button
            type="button"
            className="actchip"
            onClick={() => navigate('/uoms')}
          >
            📏 Units of Measure
          </button>
          <button
            type="button"
            className="actchip on"
            onClick={() => navigate('/currencies')}
          >
            💱 Currencies
          </button>
        </div>

        {/* Metrics Strip */}
        <div className="masters-metrics-strip">
          <div className="masters-metric-col">
            <span className="masters-metric-label">Supported Currencies</span>
            <span className="masters-metric-num">{currencies.length}</span>
          </div>
          <div className="masters-metric-col">
            <span className="masters-metric-label">Filtered Results</span>
            <span className="masters-metric-num" style={{ color: '#00C9A7' }}>
              {filteredCurrencies.length}
            </span>
          </div>
          <div className="masters-metric-col">
            <span className="masters-metric-label">Access Level</span>
            <span className="masters-metric-num" style={{ fontSize: 14, marginTop: 7, color: 'var(--mut)' }}>
              🔒 Company Admin Master
            </span>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="masters-controls-bar">
          <div className="masters-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="masters-search-input"
              placeholder="Search by currency code (e.g. INR, USD, EUR)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <span
                style={{ cursor: 'pointer', color: 'var(--mut)', fontSize: 13 }}
                onClick={() => setSearch('')}
              >
                ✕
              </span>
            )}
          </div>
  <button
              className="btn pri"
              style={{
                borderRadius: 24,
                padding: '8px 22px',
                font: '700 13px var(--b)',
                background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                color: '#FFFFFF',
                boxShadow: '0 6px 20px rgba(0, 201, 167, 0.35)',
              }}
              onClick={() => {
                setCode('')
                setError(null)
                setModalError(null)
                setShowModal(true)
              }}
            >
              ＋ New currency
            </button>

        </div>

        {error && (
          <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* Standardized Table Card */}
        <div className="table-card">
          <div className="masters-table-scroll">
            <table className="qtable">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Currency Code</th>
                <th>System ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 36, color: 'var(--mut)' }}>
                    Loading currencies…
                  </td>
                </tr>
              ) : filteredCurrencies.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 36, color: 'var(--mut)' }}>
                    {search ? `No currencies matching "${search}"` : 'No currencies configured yet. Click "＋ New currency" to add one.'}
                  </td>
                </tr>
              ) : (
                filteredCurrencies.map((c, idx) => (
                  <tr key={c.id || idx}>
                    <td className="mono" style={{ color: 'var(--mut)', fontSize: 12 }}>
                      {idx + 1}
                    </td>
                    <td>
                      <span className="chip" style={{ font: '700 13px var(--m)', background: 'rgba(0, 114, 206, 0.12)', color: 'var(--blue-ink, #0072CE)' }}>
                        {c.code}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--mut)' }}>
                      {c.id || '—'}
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
                  <div className="masters-modal-icon-badge">💱</div>
                  <div>
                    <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>New Currency</h3>
                    <span className="tiny mut">Add a 3-letter currency code for prices and quotes</span>
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

                <div style={{ marginBottom: 16 }}>
                  <label className="masters-modal-label">Currency Code (ISO 4217) *</label>
                  <input
                    required
                    autoFocus
                    maxLength={3}
                    placeholder="e.g. INR, USD, EUR, GBP, AED, SGD"
                    className="masters-modal-input"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase())
                      if (modalError) setModalError(null)
                    }}
                    disabled={submitting}
                  />
                  <span className="tiny mut" style={{ display: 'block', marginTop: 6 }}>
                    Enter the standard 3-character currency abbreviation
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
                    disabled={submitting || !code.trim()}
                  >
                    {submitting ? 'Creating…' : 'Create Currency ✓'}
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
