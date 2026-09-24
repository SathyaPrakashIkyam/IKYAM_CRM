import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import CustomSelect from '../../components/CustomSelect'
import { quotesApi } from '../../api/endpoints'
import '../../styles/ikyam-mock.css'
import '../../styles/Quotes.css'
import '../../styles/Products.css'
import { useAuth } from '../../context/AuthContext'

function getTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—'
  try {
    const clean = String(dateStr).split('T')[0].trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return dateStr
  }
}

function isExpired(dateStr) {
  if (!dateStr) return false
  const clean = String(dateStr).split('T')[0]
  const today = getTodayString()
  return clean < today
}

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
  const [accounts, setAccounts] = useState([])
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    total_count: 0, total_value: 0, draft_count: 0, draft_value: 0,
    approved_count: 0, approved_value: 0, sap_count: 0,
  })

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

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, typeFilter, accountFilter])

  useEffect(() => {
    if (!companyId) return
    quotesApi.accounts(companyId).then(setAccounts).catch((e) => console.error('Failed to load quote accounts:', e))
  }, [companyId])

  // Filtering, pagination and KPIs are all computed by the backend
  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    const filters = {
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      quote_type: typeFilter !== 'all' ? typeFilter : undefined,
      account_id: accountFilter !== 'all' ? accountFilter : undefined,
    }
    setLoading(true)
    Promise.all([
      quotesApi.list(companyId, { page, limit, ...filters }),
      quotesApi.stats(companyId, filters),
    ])
      .then(([res, s]) => {
        if (cancelled) return
        setQuotes(Array.isArray(res?.items) ? res.items : [])
        setTotalCount(res?.total || 0)
        setTotalPages(res?.total_pages || 1)
        setStats(s)
      })
      .catch((e) => console.error('Failed to load quotes:', e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [companyId, page, limit, debouncedSearch, statusFilter, typeFilter, accountFilter])

  const filteredQuotes = quotes

  const accountOptions = useMemo(
    () => [{ value: 'all', label: 'All Accounts' }, ...accounts.map((a) => ({ value: a.id, label: a.name || '—' }))],
    [accounts]
  )

  const metrics = {
    totalVal: stats.total_value,
    draftVal: stats.draft_value,
    draftQuotes: stats.draft_count,
    approvedVal: stats.approved_value,
    approvedQuotes: stats.approved_count,
    sapCount: stats.sap_count,
  }

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
            <span className="tiny mut">{stats.total_count} total quotes</span>
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
                <th>Quote Date</th>
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
                    <span className="mono" style={{ fontSize: 12.5 }}>
                      {formatDateDisplay(q.quote_date || q.created_at)}
                    </span>
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
                  <td colSpan={11} style={{ textAlign: 'center', padding: 36 }}>
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

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
              <span className="tiny mut font-semibold">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount} quotes
              </span>
              <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '5px 14px', fontSize: 13, borderRadius: 14 }}
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span className="tiny font-bold" style={{ padding: '0 6px', color: 'var(--ink)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '5px 14px', fontSize: 13, borderRadius: 14 }}
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
