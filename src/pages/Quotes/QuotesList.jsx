import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import CustomSelect from '../../components/CustomSelect'
import { quotesApi } from '../../api/endpoints'
import '../../styles/ikyam-mock.css'
import '../../styles/Quotes.css'
import '../../styles/Products.css'
import { useAuth } from '../../context/AuthContext'

function formatINR(val) {
  return Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function QuotesList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(false)

  // Filter States (Clean & optimized: no heavy account/product lists loaded)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  // Arriving here via a deal's "Related > Quotes" link (when it has more
  // than one quote) passes the account to filter by — without this it
  // always landed on every quote across every account, which looked
  // identical to the unfiltered "no quotes yet" redirect it used to be.
  const [accountFilter, setAccountFilter] = useState(location.state?.accountId || 'all')

  const { companyId } = useAuth()

  function loadQuotes() {
    if (!companyId) return
    setLoading(true)
    quotesApi
      .list(companyId)
      .then((data) => {
        setQuotes(Array.isArray(data) ? data : [])
      })
      .catch((e) => console.error('Failed to load quotes:', e))
      .finally(() => setLoading(false))
  }

  useEffect(loadQuotes, [companyId])

  // Multi-field search & category filtering
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Status filter
      if (statusFilter !== 'all' && q.status !== statusFilter && q.erp_sync_status !== statusFilter) return false

      // Quote type filter
      if (typeFilter !== 'all' && q.quote_type !== typeFilter) return false

      // Account filter (arrived here from a specific deal/account)
      if (accountFilter !== 'all' && q.account_id !== accountFilter) return false

      // Search query
      if (!searchQuery.trim()) return true
      const s = searchQuery.toLowerCase().trim()
      const lineMatch = (q.lines || []).some((l) => (l.description || '').toLowerCase().includes(s))

      return (
        (q.doc_num || '').toLowerCase().includes(s) ||
        (q.account_name || '').toLowerCase().includes(s) ||
        (q.status || '').toLowerCase().includes(s) ||
        (q.erp_sync_status || '').toLowerCase().includes(s) ||
        (q.quote_type || '').toLowerCase().includes(s) ||
        `v-${q.revision || 1}`.toLowerCase().includes(s) ||
        String(q.total || '').includes(s) ||
        String(q.previous_total || '').includes(s) ||
        lineMatch
      )
    })
  }, [quotes, statusFilter, typeFilter, accountFilter, searchQuery])

  // Built from the quotes actually loaded (each already carries
  // account_id/account_name) — no separate accounts fetch needed just for
  // this filter dropdown.
  const accountOptions = useMemo(() => {
    const seen = new Map()
    for (const q of quotes) {
      if (q.account_id && !seen.has(q.account_id)) {
        seen.set(q.account_id, q.account_name || '—')
      }
    }
    return [{ value: 'all', label: 'All Accounts' }, ...Array.from(seen, ([value, label]) => ({ value, label }))]
  }, [quotes])

  // Metric strip summary
  const metrics = useMemo(() => {
    const totalVal = quotes.reduce((sum, q) => sum + (q.total || 0), 0)
    const draftQuotes = quotes.filter((q) => q.status === 'draft' || q.erp_sync_status === 'pending')
    const draftVal = draftQuotes.reduce((sum, q) => sum + (q.total || 0), 0)
    const approvedQuotes = quotes.filter((q) => q.status === 'approved' || q.erp_sync_status === 'synced')
    const approvedVal = approvedQuotes.reduce((sum, q) => sum + (q.total || 0), 0)
    const sapCount = quotes.filter((q) => q.quote_type === 'sap_b1').length
    return { totalVal, draftVal, draftQuotes: draftQuotes.length, approvedVal, approvedQuotes: approvedQuotes.length, sapCount }
  }, [quotes])

  return (
    <AppShell>
      <div className="ikyam-mock quotes-page">
        <div className="scr-head">
          <h2>Quote builder</h2>
          <span className="goal">Ledger-style numerics; every ₹ figure is monospaced.</span>
        </div>

        {/* Top Controls Toolbar */}
        <div className="quotes-controls-bar">
          <div className="quotes-controls-left">
            {/* Search Box */}
            <div className="quotes-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search quote doc #, item description, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="quotes-search-input"
              />
              {searchQuery && (
                <button type="button" className="quotes-search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
              <span className="tiny mut font-semibold">Status:</span>
              <CustomSelect
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'pending', label: 'Pending Sync' },
                  { value: 'synced', label: 'Synced to ERP' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ minWidth: 150 }}
              />
            </div>

            {/* Type Filter Dropdown */}
            <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
              <span className="tiny mut font-semibold">Type:</span>
              <CustomSelect
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'sap_b1', label: 'SAP B1' },
                  { value: 'standalone', label: 'Standalone' },
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ minWidth: 140 }}
              />
            </div>

            {/* Account Filter Dropdown */}
            {accountOptions.length > 1 && (
              <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
                <span className="tiny mut font-semibold">Account:</span>
                <CustomSelect
                  options={accountOptions}
                  value={accountFilter}
                  onChange={setAccountFilter}
                  style={{ minWidth: 160 }}
                />
              </div>
            )}
          </div>

          <button
            className="btn pri"
            style={{
              padding: '9px 18px',
              borderRadius: 20,
              background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0, 201, 167, 0.3)',
            }}
            onClick={() => navigate('/newQuotes')}
          >
            ＋ New quote
          </button>
        </div>

        {/* 4-Column Summary Metrics Strip */}
        <div className="quotes-metrics-strip">
          <div className="quotes-metric-col">
            <span className="quotes-metric-label">Total Quotes</span>
            <span className="quotes-metric-num">₹{formatINR(metrics.totalVal)}</span>
            <span className="tiny mut">{quotes.length} total quotes</span>
          </div>
          <div className="quotes-metric-col">
            <span className="quotes-metric-label">Draft &amp; Pending</span>
            <span className="quotes-metric-num" style={{ color: 'var(--amber-ink, #D97706)' }}>
              ₹{formatINR(metrics.draftVal)}
            </span>
            <span className="tiny mut">{metrics.draftQuotes} quotes</span>
          </div>
          <div className="quotes-metric-col">
            <span className="quotes-metric-label">Approved &amp; Synced</span>
            <span className="quotes-metric-num" style={{ color: '#00C9A7' }}>
              ₹{formatINR(metrics.approvedVal)}
            </span>
            <span className="tiny mut">{metrics.approvedQuotes} quotes</span>
          </div>
          <div className="quotes-metric-col">
            <span className="quotes-metric-label">SAP B1 Integrated</span>
            <span className="quotes-metric-num" style={{ color: '#0072CE' }}>
              {metrics.sapCount}
            </span>
            <span className="tiny mut">ERP synced quotes</span>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="quotes-table-card" style={{ position: 'relative', overflow: 'hidden' }}>
          {loading && <div className="quote-top-progress-bar" />}
          <table className="quotes-table">
            <thead>
              <tr>
                <th>Doc #</th>
                <th>Account</th>
                <th>Quote Type</th>
                <th>Status</th>
                <th className="num">Subtotal ₹</th>
                <th className="num">Discount ₹</th>
                <th className="num">Tax ₹</th>
                <th className="num">Prev Total ₹</th>
                <th className="num">Grand Total ₹</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((q) => (
                <tr
                  key={q.id}
                  className="hov"
                  onClick={() => navigate(`/quotesDetails/${q.id}`, { state: { id: q.id, quote: q } })}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
                      <b className="mono">{q.doc_num}</b>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(0, 114, 206, 0.08)',
                          color: '#0072CE',
                          border: '1px solid rgba(0, 114, 206, 0.2)',
                          display: 'inline-block',
                        }}
                      >
                        V-{q.revision ?? 1}
                      </span>
                    </div>
                  </td>
                  <td>
                    <b>{q.account_name || '—'}</b>
                  </td>
                  <td>
                    {q.quote_type === 'sap_b1' ? (
                      <span className="quote-chip sap">
                        SAP B1 · {q.erp_sync_status || 'pending'}
                      </span>
                    ) : (
                      <span className="quote-chip standalone">Standalone</span>
                    )}
                  </td>
                  <td>
                    <span className={`quote-chip ${q.status || 'draft'}`}>
                      {q.status || 'draft'}
                    </span>
                  </td>
                  <td className="num mono">₹{formatINR(q.subtotal)}</td>
                  <td className="num mono" style={{ color: 'var(--mut)' }}>
                    {q.discount_total ? `−₹${formatINR(q.discount_total)}` : '—'}
                  </td>
                  <td className="num mono" style={{ color: 'var(--mut)' }}>
                    {q.tax_total ? `₹${formatINR(q.tax_total)}` : '—'}
                  </td>
                  <td className="num mono" style={{ color: 'var(--mut)' }}>
                    {q.previous_total != null ? (
                      <div>
                        <span style={{ fontWeight: 600 }}>
                          ₹{formatINR(q.previous_total)}
                        </span>
                        {q.previous_revision != null && (
                          <span className="tiny mut" style={{ display: 'block', fontSize: 10 }}>
                            (V-{q.previous_revision})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="tiny mut">—</span>
                    )}
                  </td>
                  <td className="num mono" style={{ fontWeight: 700, fontSize: 14 }}>
                    <div>₹{formatINR(q.total)}</div>
                    {q.previous_total != null && (
                      <div
                        className="tiny mut"
                        style={{ fontSize: 10.5, fontWeight: 500, marginTop: 2 }}
                        title={`Previous version (V-${q.previous_revision ?? (q.revision - 1)}) total`}
                      >
                        Prev: ₹{formatINR(q.previous_total)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 36 }}>
                    {loading ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--mut)' }}>
                        <span className="quote-spinner" style={{ width: 18, height: 18 }} />
                        <span style={{ font: '600 13px var(--d)' }}>Loading quotes…</span>
                      </div>
                    ) : (
                      <span className="tiny mut">No matching quotes found.</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
