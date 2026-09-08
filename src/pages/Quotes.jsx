import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { accountsApi, quotesApi, productsApi, priceListsApi, productGroupsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import '../styles/Quotes.css'
import '../styles/Products.css'

const EMPTY_LINE = { description: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_code: 'GST', tax_pct: 18, product_id: null }
const EMPTY_FORM = { account_id: '', lines: [{ ...EMPTY_LINE }] }
const HIGH_DISCOUNT_THRESHOLD = 15

function productLabel(p) {
  return `${p.sku} — ${p.name}`
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [accounts, setAccounts] = useState([])
  const [products, setProducts] = useState([])
  const [groups, setGroups] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const [selectedPriceListId, setSelectedPriceListId] = useState('')
  const [priceMap, setPriceMap] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [editingQuote, setEditingQuote] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [taxCodes, setTaxCodes] = useState([])

  // Product Picker Modal States (Active only when price list is chosen)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [targetLineIndex, setTargetLineIndex] = useState(-1)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerGroupFilter, setPickerGroupFilter] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [pickerSelectedIds, setPickerSelectedIds] = useState([])

  // Line item inline editing & 3-dots action menu
  const [focusedCell, setFocusedCell] = useState(null)
  const [activeMenuRow, setActiveMenuRow] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)

  // Account Picker Modal States (Fast search across 10,000+ accounts)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [accountPickerTarget, setAccountPickerTarget] = useState('filter') // 'filter' or 'form'
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [accountIndustryFilter, setAccountIndustryFilter] = useState('all')
  const [accountTypeFilter, setAccountTypeFilter] = useState('all')
  const [selectedPickerAccountId, setSelectedPickerAccountId] = useState('')

  // Form Validation & Submission States
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')

  const companyId = currentCompanyId()
  const location = useLocation()

  function load() {
    if (!companyId) return
    quotesApi.list(companyId).then((data) => {
      setQuotes(data)
      const openId = location.state?.openId
      const toOpen = openId && data.find((q) => q.id === openId)
      if (toOpen) openEditQuote(toOpen)
    })
    accountsApi.list(companyId).then(setAccounts)
    productsApi.list(companyId).then(setProducts)
    priceListsApi.list(companyId).then(setPriceLists)
    productGroupsApi.list().then(setGroups).catch(() => {})
    quotesApi.taxCodes().then(setTaxCodes).catch(() => {})
  }

  function taxRateFor(code) {
    return taxCodes.find((t) => t.code === code)?.rate_pct ?? 0
  }

  function updateTaxCode(index, code) {
    const lines = [...form.lines]
    lines[index] = { ...lines[index], tax_code: code, tax_pct: taxRateFor(code) }
    setForm({ ...form, lines })
  }

  useEffect(load, [companyId, location.state])

  useEffect(() => {
    if (!selectedPriceListId) {
      setPriceMap({})
      return
    }
    priceListsApi.items(selectedPriceListId).then((items) => {
      const map = {}
      items.forEach((it) => { map[it.product_id] = it.unit_price })
      setPriceMap(map)
    })
  }, [selectedPriceListId])

  useEffect(() => {
    if (!selectedPriceListId) return
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) =>
        l.product_id && priceMap[l.product_id] != null && (!l.unit_price || !editingQuote)
          ? { ...l, unit_price: priceMap[l.product_id] }
          : l
      ),
    }))
  }, [priceMap])

  function updateLine(index, field, value) {
    setForm((f) => {
      const lines = [...f.lines]
      lines[index] = { ...lines[index], [field]: value }
      return { ...f, lines }
    })
  }

  function clearLineProduct(index) {
    setForm((f) => {
      const lines = [...f.lines]
      lines[index] = {
        ...lines[index],
        product_id: null,
        description: '',
        uom: '',
        unit_price: 0,
        discount_pct: 0,
      }
      return { ...f, lines }
    })
  }

  function updateNumericLine(index, field, rawValue) {
    updateLine(index, field, rawValue === '' ? '' : Number(rawValue))
  }

  function removeLine(index) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }))
  }

  function duplicateLine(index) {
    setForm((f) => {
      const lineToCopy = f.lines[index]
      if (!lineToCopy) return f
      const lines = [...f.lines]
      lines.splice(index + 1, 0, { ...lineToCopy })
      return { ...f, lines }
    })
  }

  // Close active 3-dots row menu on click outside or on scroll
  useEffect(() => {
    function handleDocClick(e) {
      if (!e.target.closest('.quote-action-menu-wrap') && !e.target.closest('.quote-action-popover')) {
        setActiveMenuRow(null)
        setMenuAnchor(null)
      }
    }
    function handleScroll() {
      setActiveMenuRow(null)
      setMenuAnchor(null)
    }
    document.addEventListener('click', handleDocClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('click', handleDocClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  function updateDescription(index, value) {
    const lines = [...form.lines]
    const match = products.find((p) => productLabel(p) === value)
    if (match) {
      lines[index] = {
        ...lines[index],
        description: match.name,
        uom: match.uom || '',
        product_id: match.id,
        unit_price: priceMap[match.id] ?? lines[index].unit_price,
      }
    } else {
      lines[index] = { ...lines[index], description: value, product_id: null }
    }
    setForm({ ...form, lines })
  }

  function addLine() {
    setForm({ ...form, lines: [...form.lines, { ...EMPTY_LINE }] })
  }

  function lineTotal(line) {
    const gross = (line.quantity || 0) * (line.unit_price || 0)
    const discount = gross * ((line.discount_pct || 0) / 100)
    const taxable = gross - discount
    const tax = taxable * ((line.tax_pct || 0) / 100)
    return taxable + tax
  }

  function lineTag(line) {
    if (line.product_id && selectedPriceListId && priceMap[line.product_id] != null) {
      const pl = priceLists.find((p) => p.id === selectedPriceListId)
      return { text: `price list · ${pl?.name}`, cls: 'ok' }
    }
    return null
  }

  // Active Selected Price List object
  const selectedPriceList = useMemo(() => {
    return priceLists.find((pl) => pl.id === selectedPriceListId) || null
  }, [priceLists, selectedPriceListId])

  // Fast Product Picker search (Capped at 80 for instant performance with 10,000+ items)
  const filteredPickerProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    const results = []
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (pickerGroupFilter !== 'all' && p.product_group_id !== pickerGroupFilter) {
        continue
      }
      if (q) {
        const sku = (p.sku || '').toLowerCase()
        const name = (p.name || '').toLowerCase()
        const erp = (p.erp_item_code || '').toLowerCase()
        if (!sku.includes(q) && !name.includes(q) && !erp.includes(q)) {
          continue
        }
      }
      results.push(p)
      if (results.length >= 80) break
    }
    return results
  }, [products, pickerSearch, pickerGroupFilter])

  function openProductPicker(lineIndex = -1) {
    if (!selectedPriceListId) return
    setTargetLineIndex(lineIndex)
    setPickerSearch('')
    setPickerGroupFilter('all')
    setSelectedProduct(null)
    setPickerSelectedIds([])
    setShowProductPicker(true)
  }

  function confirmSelectProduct(p) {
    const prod = p || selectedProduct
    if (!prod) return

    // Auto-pull unit price directly from the chosen price list
    const unitPrice = priceMap[prod.id] != null ? Number(priceMap[prod.id]) : 0
    const lines = [...form.lines]

    if (targetLineIndex != null && targetLineIndex >= 0 && targetLineIndex < lines.length) {
      // Update target line
      lines[targetLineIndex] = {
        ...lines[targetLineIndex],
        product_id: prod.id,
        description: prod.name,
        uom: prod.uom || '',
        unit_price: unitPrice,
      }
    } else {
      // Append or replace empty first line
      if (lines.length === 1 && !lines[0].description.trim()) {
        lines[0] = {
          ...lines[0],
          product_id: prod.id,
          description: prod.name,
          uom: prod.uom || '',
          unit_price: unitPrice,
        }
      } else {
        lines.push({
          ...EMPTY_LINE,
          product_id: prod.id,
          description: prod.name,
          uom: prod.uom || '',
          unit_price: unitPrice,
        })
      }
    }

    setForm({ ...form, lines })
    setShowProductPicker(false)
  }

  function confirmBatchSelectProducts() {
    const prodsToAdd = products.filter((p) => pickerSelectedIds.includes(p.id))
    if (prodsToAdd.length === 0) return

    let lines = [...form.lines]
    let replaceFirst = lines.length === 1 && !lines[0].description.trim() && !lines[0].product_id

    prodsToAdd.forEach((prod, idx) => {
      const unitPrice = priceMap[prod.id] != null ? Number(priceMap[prod.id]) : 0
      const newLine = {
        ...EMPTY_LINE,
        product_id: prod.id,
        description: prod.name,
        uom: prod.uom || '',
        unit_price: unitPrice,
      }
      if (replaceFirst && idx === 0) {
        lines[0] = newLine
      } else {
        lines.push(newLine)
      }
    })

    setForm({ ...form, lines })
    setShowProductPicker(false)
    setPickerSelectedIds([])
  }

  // Selected Account for the Create Form
  const selectedFormAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.account_id) || null
  }, [accounts, form.account_id])

  function openEditQuote(q) {
    if (!q) return
    setEditingQuote(q)
    setForm({
      account_id: q.account_id || '',
      lines: (q.lines && q.lines.length > 0)
        ? q.lines.map((l) => ({
            description: l.description || '',
            quantity: l.quantity === '' || l.quantity == null ? 1 : Number(l.quantity),
            unit_price: l.unit_price === '' || l.unit_price == null ? 0 : Number(l.unit_price),
            discount_pct: l.discount_pct === '' || l.discount_pct == null ? 0 : Number(l.discount_pct),
            tax_code: l.tax_code || 'GST',
            tax_pct: l.tax_pct === '' || l.tax_pct == null ? 18 : Number(l.tax_pct),
            product_id: l.product_id || null,
            uom: l.uom || '',
          }))
        : [{ ...EMPTY_LINE }],
    })
    setSelectedPriceListId(q.price_list_id || (priceLists.length > 0 ? priceLists[0].id : ''))
    setFormErrors({})
    setShowNew(true)
  }

  function openNew() {
    setEditingQuote(null)
    setForm(EMPTY_FORM)
    setSelectedPriceListId('')
    setFormErrors({})
    setShowNew(true)
  }

  // Unique industries for the filter dropdown
  const uniqueIndustries = useMemo(() => {
    const set = new Set()
    accounts.forEach((a) => {
      if (a.industry && a.industry.trim()) set.add(a.industry.trim())
    })
    return Array.from(set).sort()
  }, [accounts])

  // Unique account types for filter
  const uniqueAccountTypes = useMemo(() => {
    const set = new Set()
    accounts.forEach((a) => {
      if (a.account_type && a.account_type.trim()) set.add(a.account_type.trim())
    })
    return Array.from(set).sort()
  }, [accounts])

  // High performance filtered accounts (capped at 80 items for instant rendering with 10,000+ records)
  const filteredPickerAccounts = useMemo(() => {
    const q = accountSearchQuery.trim().toLowerCase()
    const results = []
    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i]
      if (accountIndustryFilter !== 'all' && a.industry !== accountIndustryFilter) {
        continue
      }
      if (accountTypeFilter !== 'all' && a.account_type !== accountTypeFilter) {
        continue
      }
      if (q) {
        const no = (a.account_no || '').toLowerCase()
        const name = (a.name || '').toLowerCase()
        const ind = (a.industry || '').toLowerCase()
        const erp = (a.erp_card_code || '').toLowerCase()
        const ph = (a.phone || '').toLowerCase()
        if (!no.includes(q) && !name.includes(q) && !ind.includes(q) && !erp.includes(q) && !ph.includes(q)) {
          continue
        }
      }
      results.push(a)
      if (results.length >= 80) break
    }
    return results
  }, [accounts, accountSearchQuery, accountIndustryFilter, accountTypeFilter])

  function openAccountPicker(target = 'filter') {
    setAccountPickerTarget(target)
    setAccountSearchQuery('')
    setAccountIndustryFilter('all')
    setAccountTypeFilter('all')
    setSelectedPickerAccountId(target === 'form' ? form.account_id : (accountFilter === 'all' ? '' : accountFilter))
    setShowAccountPicker(true)
  }

  function confirmSelectAccount(account) {
    const acc = account !== undefined ? account : accounts.find((a) => a.id === selectedPickerAccountId)
    if (accountPickerTarget === 'form') {
      setForm((f) => ({ ...f, account_id: acc ? acc.id : '' }))
      if (formErrors.account_id) {
        setFormErrors((prev) => ({ ...prev, account_id: null }))
      }
    } else {
      setAccountFilter(acc ? acc.id : 'all')
    }
    setShowAccountPicker(false)
  }

  async function createQuote(e) {
    e.preventDefault()
    const errors = {}
    if (!form.account_id) {
      errors.account_id = 'Please select an account for this quote.'
    }
    if (!selectedPriceListId) {
      errors.price_list = 'Please select a price list.'
    }
    const validLines = form.lines.filter((l) => l.description && l.description.trim())
    if (validLines.length === 0) {
      errors.lines = 'Please add at least one line item with a product description.'
    } else {
      const invalidQty = validLines.some((l) => Number(l.quantity) <= 0)
      if (invalidQty) {
        errors.lines = 'Line item quantity must be at least 1.'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    const lines = validLines.map((l) => ({
      ...l,
      quantity: l.quantity === '' ? 0 : Number(l.quantity),
      unit_price: l.unit_price === '' ? 0 : Number(l.unit_price),
      discount_pct: l.discount_pct === '' ? 0 : Number(l.discount_pct),
      tax_pct: l.tax_pct === '' ? 0 : Number(l.tax_pct),
    }))

    try {
      setSubmitting(true)
      if (editingQuote?.id) {
        await quotesApi.update(companyId, editingQuote.id, {
          ...form,
          price_list_id: selectedPriceListId || undefined,
          lines,
        })
      } else {
        await quotesApi.create(companyId, {
          ...form,
          price_list_id: selectedPriceListId || undefined,
          lines,
        })
      }
      setForm(EMPTY_FORM)
      setEditingQuote(null)
      setSelectedPriceListId('')
      setFormErrors({})
      setShowNew(false)
      load()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to save quote.'
      setFormErrors({ submit: typeof msg === 'string' ? msg : JSON.stringify(msg) })
    } finally {
      setSubmitting(false)
    }
  }

  function cancelNew() {
    setForm(EMPTY_FORM)
    setEditingQuote(null)
    setSelectedPriceListId('')
    setFormErrors({})
    setShowNew(false)
  }

  const totals = form.lines.reduce(
    (acc, l) => {
      const gross = (l.quantity || 0) * (l.unit_price || 0)
      const discount = gross * ((l.discount_pct || 0) / 100)
      const taxable = gross - discount
      const tax = taxable * ((l.tax_pct || 0) / 100)
      acc.subtotal += gross
      acc.discount += discount
      acc.tax += tax
      if (l.tax_code === 'GST') {
        acc.cgst += tax / 2
        acc.sgst += tax / 2
      } else if (l.tax_code === 'IGST') {
        acc.igst += tax
      } else if (tax > 0) {
        acc.otherTax += tax
      }
      return acc
    },
    { subtotal: 0, discount: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, otherTax: 0 }
  )
  const grandTotal = totals.subtotal - totals.discount + totals.tax

  const priorQuoteForAccount = form.account_id
    ? quotes.find((q) => q.account_id === form.account_id)
    : null
  const highDiscountLines = form.lines
    .map((l, i) => ({ ...l, i }))
    .filter((l) => (l.discount_pct || 0) > HIGH_DISCOUNT_THRESHOLD)

  function copyPriorLines() {
    if (!priorQuoteForAccount) return
    const copied = priorQuoteForAccount.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      uom: l.uom,
      unit_price: l.unit_price,
      discount_pct: l.discount_pct,
      tax_code: l.tax_code,
      tax_pct: l.tax_pct,
      product_id: l.product_id,
    }))
    setForm((f) => ({ ...f, lines: [...f.lines.filter((l) => l.description.trim()), ...copied] }))
  }

  // Multi-field search & category filtering
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const accountName = (accounts.find((a) => a.id === q.account_id)?.name || '').toLowerCase()

      // Status filter
      if (statusFilter !== 'all' && q.status !== statusFilter && q.erp_sync_status !== statusFilter) return false

      // Quote type filter
      if (typeFilter !== 'all' && q.quote_type !== typeFilter) return false

      // Account filter
      if (accountFilter !== 'all' && q.account_id !== accountFilter) return false

      // Search query
      if (!searchQuery.trim()) return true
      const s = searchQuery.toLowerCase().trim()
      const lineMatch = (q.lines || []).some((l) => (l.description || '').toLowerCase().includes(s))

      return (
        (q.doc_num || '').toLowerCase().includes(s) ||
        accountName.includes(s) ||
        (q.status || '').toLowerCase().includes(s) ||
        (q.erp_sync_status || '').toLowerCase().includes(s) ||
        (q.quote_type || '').toLowerCase().includes(s) ||
        String(q.total || '').includes(s) ||
        lineMatch
      )
    })
  }, [quotes, accounts, statusFilter, typeFilter, accountFilter, searchQuery])

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
        {!showNew && (
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
                  placeholder="Search quote doc #, account, item description, status..."
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

              {/* Account Filter Trigger */}
              <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
                <span className="tiny mut font-semibold">Account:</span>
                <button
                  type="button"
                  className="quotes-account-filter-trigger"
                  onClick={() => openAccountPicker('filter')}
                  title="Search & filter from all accounts"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="quotes-account-filter-label">
                    {accountFilter === 'all'
                      ? 'All Accounts'
                      : (accounts.find((a) => a.id === accountFilter)?.name || 'Select Account')}
                  </span>
                  {accountFilter !== 'all' ? (
                    <span
                      className="quotes-account-filter-clear"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAccountFilter('all')
                      }}
                      title="Clear account filter"
                    >
                      ✕
                    </span>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ opacity: 0.4 }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>
              </div>
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
              onClick={openNew}
            >
              ＋ New quote
            </button>
          </div>
        )}

        {/* 4-Column Summary Metrics Strip */}
        {!showNew && (
          <div className="quotes-metrics-strip">
            <div className="quotes-metric-col">
              <span className="quotes-metric-label">Total Quotes</span>
              <span className="quotes-metric-num">₹{Math.round(metrics.totalVal).toLocaleString('en-IN')}</span>
              <span className="tiny mut">{quotes.length} total quotes</span>
            </div>
            <div className="quotes-metric-col">
              <span className="quotes-metric-label">Draft & Pending</span>
              <span className="quotes-metric-num" style={{ color: 'var(--amber-ink, #D97706)' }}>
                ₹{Math.round(metrics.draftVal).toLocaleString('en-IN')}
              </span>
              <span className="tiny mut">{metrics.draftQuotes} quotes</span>
            </div>
            <div className="quotes-metric-col">
              <span className="quotes-metric-label">Approved & Synced</span>
              <span className="quotes-metric-num" style={{ color: '#00C9A7' }}>
                ₹{Math.round(metrics.approvedVal).toLocaleString('en-IN')}
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
        )}

        {/* Quote Builder Form */}
        {showNew && (
          <div className="quotes-create-card">
            <form onSubmit={createQuote}>
              <div className="rowx sp" style={{ marginBottom: 12, alignItems: 'center' }}>
                <button type="button" className="btn ghost" onClick={cancelNew}>← Back to quotes</button>
                <div className="rowx" style={{ gap: 10, alignItems: 'center' }}>
                  <b style={{ font: '700 16px var(--d)' }}>
                    {editingQuote ? `Edit Quote · ${editingQuote.doc_num}` : 'Create New Quote'}
                  </b>
                  {editingQuote && (
                    <>
                      <span className="tiny mut">Rev {editingQuote.revision}</span>
                      <span className={`quote-chip ${editingQuote.status || 'draft'}`}>
                        {editingQuote.status || 'draft'}
                      </span>
                      {editingQuote.quote_type === 'sap_b1' && (
                        <span className="quote-chip sap">
                          SAP B1 · {editingQuote.erp_sync_status || 'synced'}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="rowx" style={{ gap: 10 }}>
                  <button type="button" className="btn ghost" onClick={cancelNew}>Cancel</button>
                  <button
                    type="submit"
                    className="btn pri"
                    style={{ background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)', color: '#FFF' }}
                    disabled={submitting}
                  >
                    {submitting
                      ? (editingQuote ? 'Saving quote…' : 'Creating quote…')
                      : (editingQuote ? 'Save & Post quote ✓' : 'Create quote ✓')}
                  </button>
                </div>
              </div>

              {/* Form Validation Error Banner */}
              {(formErrors.account_id || formErrors.price_list || formErrors.lines || formErrors.submit) && (
                <div className="quotes-form-error-banner">
                  <span>⚠️</span>
                  <span>
                    {formErrors.submit ||
                      formErrors.account_id ||
                      formErrors.price_list ||
                      formErrors.lines}
                  </span>
                </div>
              )}

              <div className="rowx" style={{ gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ flex: 2, minWidth: 260 }}>
                  <span className="tiny mut font-semibold" style={{ display: 'block', marginBottom: 4 }}>
                    ACCOUNT <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  {selectedFormAccount ? (
                    <div className="quotes-selected-account-card">
                      <div className="rowx" style={{ gap: 10, alignItems: 'center', minWidth: 0 }}>
                        <span className="quotes-account-no-badge">
                          {selectedFormAccount.account_no || 'ACC'}
                        </span>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <b style={{ font: '700 13.5px var(--d)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedFormAccount.name}
                          </b>
                          <div className="rowx" style={{ gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            {selectedFormAccount.industry && (
                              <span className="tiny mut">{selectedFormAccount.industry}</span>
                            )}
                            {selectedFormAccount.account_type && (
                              <span className="chip" style={{ fontSize: 10.5, padding: '1px 6px', textTransform: 'capitalize' }}>
                                {selectedFormAccount.account_type}
                              </span>
                            )}
                            {selectedFormAccount.erp_card_code && (
                              <span className="mono tiny mut">ERP: {selectedFormAccount.erp_card_code}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="quotes-account-change-btn"
                        onClick={() => openAccountPicker('form')}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        className={`quotes-account-picker-trigger ${formErrors.account_id ? 'has-error' : ''}`}
                        onClick={() => openAccountPicker('form')}
                      >
                        <span className="rowx" style={{ gap: 8, alignItems: 'center', color: formErrors.account_id ? '#EF4444' : 'var(--mut)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>Select account from catalog…</span>
                        </span>
                        <span className="chip" style={{ fontSize: 11, fontWeight: 600 }}>Browse</span>
                      </button>
                      {formErrors.account_id && (
                        <span className="tiny" style={{ color: '#EF4444', marginTop: 4, display: 'block', fontWeight: 600 }}>
                          {formErrors.account_id}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <span className="tiny mut font-semibold" style={{ display: 'block', marginBottom: 4 }}>
                    PRICE LIST <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  <div className={formErrors.price_list ? 'select-has-error' : ''}>
                    <CustomSelect
                      options={[
                        { value: '', label: 'Select price list… (required)' },
                        ...priceLists.map((pl) => ({ value: pl.id, label: `${pl.name} (${pl.currency})` })),
                      ]}
                      value={selectedPriceListId}
                      onChange={(val) => {
                        setSelectedPriceListId(val)
                        if (formErrors.price_list) setFormErrors((prev) => ({ ...prev, price_list: null }))
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                  {formErrors.price_list && (
                    <span className="tiny" style={{ color: '#EF4444', marginTop: 4, display: 'block', fontWeight: 600 }}>
                      {formErrors.price_list}
                    </span>
                  )}
                </div>
              </div>

              {/* Price list requirement notification banner */}
              {!selectedPriceListId ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 14px',
                    borderRadius: 12,
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1.5px solid rgba(245, 158, 11, 0.3)',
                    color: 'var(--amber-ink, #D97706)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  <span>⚠️</span>
                  <span>Please select a Price List above to enable product catalog selection &amp; unit pricing.</span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    borderRadius: 12,
                    background: 'rgba(0, 201, 167, 0.08)',
                    border: '1px solid rgba(0, 201, 167, 0.25)',
                    color: '#007A65',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
                    <span>✓</span>
                    <span>
                      Active Price List: <b>{selectedPriceList?.name}</b> ({selectedPriceList?.currency}) — Product selection enabled
                    </span>
                  </div>
                </div>
              )}

              {/* Lines Management Toolbar */}
              <div className="quotes-lines-toolbar">
                <div className="quotes-toolbar-title-wrap">
                  <span className="quotes-toolbar-title">Line Items</span>
                  <span className="quotes-item-count-chip">
                    {form.lines.length} {form.lines.length === 1 ? 'item' : 'items'}
                  </span>
                  {formErrors.lines && (
                    <span className="tiny" style={{ color: '#EF4444', fontWeight: 600, marginLeft: 8 }}>
                      ⚠️ {formErrors.lines}
                    </span>
                  )}
                </div>

                <div className="quotes-toolbar-actions">
                  <button
                    type="button"
                    className="quotes-add-catalog-btn"
                    disabled={!selectedPriceListId}
                    title={selectedPriceListId ? 'Browse & add product from price list' : 'Select a Price List first'}
                    onClick={() => openProductPicker(-1)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    ＋ Add Product from List
                  </button>
                  <button
                    type="button"
                    className="quotes-add-blank-btn"
                    onClick={addLine}
                  >
                    ＋ Add blank line
                  </button>
                  {form.lines.length > 1 && (
                    <button
                      type="button"
                      className="quotes-clear-lines-btn"
                      onClick={() => {
                        const filled = form.lines.filter((l) => l.description.trim() || l.product_id)
                        setForm({ ...form, lines: filled.length > 0 ? filled : [{ ...EMPTY_LINE }] })
                      }}
                      title="Remove all empty lines"
                    >
                      Clear empty lines
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Lines Table with Sticky Headers (Matches Screenshot) */}
              <div className="quotes-lines-scroll">
                <table className="quote-builder-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: 260, textAlign: 'left' }}>DESCRIPTION &amp; PRODUCT</th>
                      <th style={{ width: 75, textAlign: 'center' }}>
                        QTY <span className="quote-th-info" title="Quantity">ⓘ</span>
                      </th>
                      <th style={{ width: 110, textAlign: 'center' }}>
                        UNIT PRICE (₹) <span className="quote-th-info" title="Unit Price in ₹">ⓘ</span>
                      </th>
                      <th style={{ width: 70, textAlign: 'center' }}>
                        DISC % <span className="quote-th-info" title="Discount Percentage">ⓘ</span>
                      </th>
                      <th style={{ width: 95, textAlign: 'center' }}>
                        TAX CODE <span className="quote-th-info" title="Tax Code">ⓘ</span>
                      </th>
                      <th style={{ width: 70, textAlign: 'center' }}>
                        TAX % <span className="quote-th-info" title="Tax Percentage">ⓘ</span>
                      </th>
                      <th style={{ width: 125, textAlign: 'right' }}>
                        LINE TOTAL (₹) <span className="quote-th-info" title="Calculated Total for this line">ⓘ</span>
                      </th>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, i) => {
                      const isPriceFocused = focusedCell?.row === i && focusedCell?.field === 'unit_price'
                      return (
                        <tr key={i}>
                          {/* 1. # Column */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="quote-row-badge">{i + 1}</div>
                          </td>

                          {/* 2. DESCRIPTION & PRODUCT Column */}
                          <td>
                            <div className="quote-desc-cell">
                              <div className="quote-desc-main">
                                <input
                                  type="text"
                                  className="quote-desc-title"
                                  value={line.description}
                                  onChange={(e) => updateLine(i, 'description', e.target.value)}
                                  placeholder={
                                    selectedPriceListId
                                      ? 'Search or type product…'
                                      : 'Select Price List above first…'
                                  }
                                  disabled={!selectedPriceListId}
                                  onClick={() => {
                                    if (selectedPriceListId && !line.description) openProductPicker(i)
                                  }}
                                />
                                <div className="quote-desc-actions">
                                  {(line.product_id || line.description) && (
                                    <button
                                      type="button"
                                      className="quote-clear-icon-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        clearLineProduct(i)
                                      }}
                                      title="Clear product"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="quote-search-icon-btn"
                                    onClick={() => selectedPriceListId && openProductPicker(i)}
                                    disabled={!selectedPriceListId}
                                    title={selectedPriceListId ? 'Search product from price list' : 'Select a Price List above first'}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                                      <circle cx="11" cy="11" r="8" />
                                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {Boolean(line.uom || (line.product_id && selectedPriceList && priceMap[line.product_id] != null)) && (
                                <div className="quote-desc-meta">
                                  {line.uom && (
                                    <span className="quote-uom-text">
                                      UOM: {line.uom}
                                    </span>
                                  )}
                                  {line.product_id && selectedPriceList && priceMap[line.product_id] != null && (
                                    <span className="quote-pricelist-pill">
                                      price list - {selectedPriceList.name}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 3. QTY Column */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="text"
                              className="quote-pill-input"
                              style={{ width: 64 }}
                              value={line.quantity ?? 1}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '')
                                updateNumericLine(i, 'quantity', val)
                              }}
                            />
                          </td>

                          {/* 4. UNIT PRICE (₹) Column */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="text"
                              className="quote-pill-input"
                              style={{ width: 92 }}
                              value={
                                isPriceFocused
                                  ? (line.unit_price === '' ? '' : line.unit_price)
                                  : Number(line.unit_price || 0).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })
                              }
                              onFocus={(e) => {
                                setFocusedCell({ row: i, field: 'unit_price' })
                                e.target.select()
                              }}
                              onBlur={() => setFocusedCell(null)}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '')
                                updateNumericLine(i, 'unit_price', val)
                              }}
                            />
                          </td>

                          {/* 5. DISC % Column */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="text"
                              className="quote-pill-input"
                              style={{ width: 54 }}
                              value={line.discount_pct ?? 0}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '')
                                updateNumericLine(i, 'discount_pct', val)
                              }}
                            />
                          </td>

                          {/* 6. TAX CODE Column */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="quote-select-pill-wrap">
                              <select
                                className="quote-select-pill"
                                value={line.tax_code || 'GST'}
                                onChange={(e) => updateTaxCode(i, e.target.value)}
                              >
                                {taxCodes.length > 0 ? (
                                  taxCodes.map((t) => (
                                    <option key={t.code} value={t.code}>
                                      {t.code}
                                    </option>
                                  ))
                                ) : (
                                  <>
                                    <option value="GST">GST</option>
                                    <option value="IGST">IGST</option>
                                    <option value="EXEMPT">EXEMPT</option>
                                  </>
                                )}
                              </select>
                              <svg
                                className="quote-chevron-icon"
                                width="9"
                                height="9"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#64748B"
                                strokeWidth="2.5"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </td>

                          {/* 7. TAX % Column */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="text"
                              className="quote-pill-input"
                              style={{ width: 54 }}
                              value={line.tax_pct ?? 18}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '')
                                updateNumericLine(i, 'tax_pct', val)
                              }}
                            />
                          </td>

                          {/* 8. LINE TOTAL (₹) Column */}
                          <td className="quote-col-total">
                            ₹{Number(lineTotal(line) || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          {/* 9. Action Menu Column (3 Vertical Dots) */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="quote-action-menu-wrap">
                              <button
                                type="button"
                                className="quote-dots-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (activeMenuRow === i) {
                                    setActiveMenuRow(null)
                                    setMenuAnchor(null)
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const spaceBelow = window.innerHeight - rect.bottom
                                    const openUp = spaceBelow < 95
                                    setActiveMenuRow(i)
                                    setMenuAnchor({
                                      top: openUp ? Math.max(10, rect.top - 84) : (rect.bottom + 4),
                                      right: Math.max(12, window.innerWidth - rect.right),
                                    })
                                  }
                                }}
                                title="Row actions"
                              >
                                ⋮
                              </button>
                              {activeMenuRow === i && menuAnchor && (
                                <div
                                  className="quote-action-popover"
                                  style={{
                                    top: menuAnchor.top,
                                    right: menuAnchor.right,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="quote-popover-item"
                                    onClick={() => {
                                      duplicateLine(i)
                                      setActiveMenuRow(null)
                                      setMenuAnchor(null)
                                    }}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    Duplicate line
                                  </button>
                                  {form.lines.length > 1 && (
                                    <button
                                      type="button"
                                      className="quote-popover-item danger"
                                      onClick={() => {
                                        removeLine(i)
                                        setActiveMenuRow(null)
                                        setMenuAnchor(null)
                                      }}
                                    >
                                      <span style={{ fontSize: 13, lineHeight: 1 }}>✕</span> Remove line
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="quotes-bottom-grid">
                <div className="ai-frame" style={{ padding: 14 }}>
                  <span className="ai-tag">AI ASSIST</span>
                  <ul className="quotes-ai-list">
                    {priorQuoteForAccount && (
                      <li>
                        <span className="quotes-link" onClick={copyPriorLines}>▸ Copy lines from {priorQuoteForAccount.doc_num} (last quote to this account)</span>
                      </li>
                    )}
                    {highDiscountLines.map((l) => (
                      <li key={l.i} className="tiny">▸ Discount of {l.discount_pct}% on "{l.description}" is unusually high — confirm before sending.</li>
                    ))}
                    {!priorQuoteForAccount && highDiscountLines.length === 0 && (
                      <li className="tiny">No flags for this quote yet.</li>
                    )}
                  </ul>
                </div>

                <div className="card quotes-totals-card">
                  <div className="fld"><span className="lab">Subtotal</span><span className="mono">₹{Math.round(totals.subtotal).toLocaleString('en-IN')}</span></div>
                  <div className="fld"><span className="lab">Discount</span><span className="mono">−₹{Math.round(totals.discount).toLocaleString('en-IN')}</span></div>
                  {totals.cgst > 0 && (
                    <div className="fld"><span className="lab">CGST</span><span className="mono">₹{Math.round(totals.cgst).toLocaleString('en-IN')}</span></div>
                  )}
                  {totals.sgst > 0 && (
                    <div className="fld"><span className="lab">SGST</span><span className="mono">₹{Math.round(totals.sgst).toLocaleString('en-IN')}</span></div>
                  )}
                  {totals.igst > 0 && (
                    <div className="fld"><span className="lab">IGST</span><span className="mono">₹{Math.round(totals.igst).toLocaleString('en-IN')}</span></div>
                  )}
                  {totals.otherTax > 0 && (
                    <div className="fld"><span className="lab">Other tax</span><span className="mono">₹{Math.round(totals.otherTax).toLocaleString('en-IN')}</span></div>
                  )}
                  {totals.tax === 0 && (
                    <div className="fld"><span className="lab">Tax</span><span className="mono">₹0</span></div>
                  )}
                  <div className="fld" style={{ border: 0 }}><b className="mono" style={{ fontSize: 15 }}>Total ₹{Math.round(grandTotal).toLocaleString('en-IN')}</b></div>
                </div>
              </div>

            
            </form>
          </div>
        )}

        {/* Quotes Table */}
        {!showNew && (
          <div className="quotes-table-card">
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
                  <th className="num">Grand Total ₹</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q) => {
                  const acc = accounts.find((a) => a.id === q.account_id)
                  return (
                    <tr key={q.id} className="hov" onClick={() => openEditQuote(q)} style={{ cursor: 'pointer' }}>
                      <td>
                        <b className="mono">{q.doc_num}</b>
                        <span className="tiny mut" style={{ display: 'block', fontSize: 10.5 }}>Rev {q.revision}</span>
                      </td>
                      <td>
                        <b>{acc?.name || '—'}</b>
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
                      <td className="num mono">₹{Math.round(q.subtotal || 0).toLocaleString('en-IN')}</td>
                      <td className="num mono" style={{ color: 'var(--mut)' }}>
                        {q.discount_total ? `−₹${Math.round(q.discount_total).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="num mono" style={{ color: 'var(--mut)' }}>
                        {q.tax_total ? `₹${Math.round(q.tax_total).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="num mono" style={{ fontWeight: 700, fontSize: 14 }}>
                        ₹{Math.round(q.total || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )
                })}
                {filteredQuotes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="tiny mut" style={{ textAlign: 'center', padding: 24 }}>
                      No matching quotes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Account Picker Modal (Handles 1,000s to 10,000s of accounts smoothly) */}
        {showAccountPicker && (
          <div className="products-modal-overlay" onClick={() => setShowAccountPicker(false)}>
            <div className="products-modal-card price-picker-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="products-modal-header">
                <div className="products-modal-title-row">
                  <div className="products-modal-icon-badge" style={{ background: 'rgba(0, 201, 167, 0.12)', color: '#00C9A7' }}>
                    🏢
                  </div>
                  <div>
                    <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>
                      {accountPickerTarget === 'form' ? 'Select Account for Quote' : 'Filter Quotes by Account'}
                    </h3>
                    <span className="tiny mut">
                      {accountPickerTarget === 'form'
                        ? 'Search by account name, account no (A-000013), industry, or ERP code'
                        : 'Choose an account to filter quotes or reset to view all accounts'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="products-modal-close"
                  onClick={() => setShowAccountPicker(false)}
                >
                  ✕
                </button>
              </div>

              {/* Filter Strip */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
                <div className="settings-search-box" style={{ flex: '1 1 240px', minWidth: 200, height: 38 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="settings-search-input"
                    placeholder="Search account name, A-000013, industry, ERP..."
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {accountSearchQuery && (
                    <span style={{ cursor: 'pointer', color: 'var(--mut)', fontSize: 13 }} onClick={() => setAccountSearchQuery('')}>
                      ✕
                    </span>
                  )}
                </div>

                {uniqueIndustries.length > 0 && (
                  <div style={{ width: 160 }}>
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Industries' },
                        ...uniqueIndustries.map((ind) => ({ value: ind, label: ind })),
                      ]}
                      value={accountIndustryFilter}
                      onChange={setAccountIndustryFilter}
                      className="settings-custom-select"
                    />
                  </div>
                )}

                {uniqueAccountTypes.length > 0 && (
                  <div style={{ width: 140 }}>
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Types' },
                        ...uniqueAccountTypes.map((typ) => ({ value: typ, label: typ })),
                      ]}
                      value={accountTypeFilter}
                      onChange={setAccountTypeFilter}
                      className="settings-custom-select"
                    />
                  </div>
                )}

                {accountPickerTarget === 'filter' && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: '6px 12px', fontSize: 12, borderRadius: 10 }}
                    onClick={() => confirmSelectAccount({ id: 'all', name: 'All Accounts' })}
                  >
                    Reset (All Accounts)
                  </button>
                )}

                <span className="tiny mut" style={{ marginLeft: 'auto' }}>
                  Showing {filteredPickerAccounts.length} of {accounts.length} accounts
                </span>
              </div>

              {/* Accounts Table */}
              <div className="price-picker-table-scroll">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Account No</th>
                      <th>Account Name</th>
                      <th style={{ width: 120 }}>Type</th>
                      <th style={{ width: 160 }}>Industry</th>
                      <th style={{ width: 130 }}>ERP Code</th>
                      <th style={{ width: 110, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPickerAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--mut)' }}>
                          No accounts matching your search/filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPickerAccounts.map((a) => {
                        const isSelected = selectedPickerAccountId === a.id
                        return (
                          <tr
                            key={a.id}
                            className={`price-picker-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedPickerAccountId(a.id)}
                            onDoubleClick={() => confirmSelectAccount(a)}
                          >
                            <td>
                              <span className="quotes-account-pill-no">
                                {a.account_no || '—'}
                              </span>
                            </td>
                            <td>
                              <b style={{ font: '600 13px var(--d)', color: 'var(--ink)' }}>{a.name}</b>
                              {a.phone && (
                                <span className="tiny mut" style={{ display: 'block', marginTop: 2 }}>
                                  📞 {a.phone}
                                </span>
                              )}
                            </td>
                            <td>
                              {a.account_type ? (
                                <span className="chip" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                                  {a.account_type}
                                </span>
                              ) : (
                                <span className="tiny mut">—</span>
                              )}
                            </td>
                            <td>
                              <span className="tiny" style={{ fontWeight: 500 }}>
                                {a.industry || '—'}
                              </span>
                            </td>
                            <td>
                              {a.erp_card_code ? (
                                <span className="mono tiny">{a.erp_card_code}</span>
                              ) : (
                                <span className="tiny mut">—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn pri"
                                style={{
                                  padding: '4px 12px',
                                  fontSize: 11.5,
                                  borderRadius: 12,
                                  background: isSelected
                                    ? 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)'
                                    : 'transparent',
                                  color: isSelected ? '#FFFFFF' : '#00C9A7',
                                  border: isSelected ? 'none' : '1px solid #00C9A7',
                                  boxShadow: isSelected ? '0 2px 8px rgba(0, 201, 167, 0.3)' : 'none',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  confirmSelectAccount(a)
                                }}
                              >
                                {isSelected ? 'Selected ✓' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action Bar */}
              <div className="price-picker-bottom-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {selectedPickerAccountId ? (
                  <div>
                    <span className="tiny mut" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                      Selected Account
                    </span>
                    <b style={{ font: '700 14px var(--d)', color: '#00C9A7' }}>
                      {accounts.find((a) => a.id === selectedPickerAccountId)?.name || selectedPickerAccountId}
                    </b>
                    {accounts.find((a) => a.id === selectedPickerAccountId)?.account_no && (
                      <span className="mono tiny mut" style={{ marginLeft: 6 }}>
                        ({accounts.find((a) => a.id === selectedPickerAccountId)?.account_no})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="tiny mut" style={{ font: '500 13px var(--b)' }}>
                    👆 Click any account to select, then click "Confirm Selection ✓" (or double-click)
                  </div>
                )}

                <div className="rowx" style={{ gap: 10 }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: '8px 18px', borderRadius: 18 }}
                    onClick={() => setShowAccountPicker(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn pri"
                    style={{
                      borderRadius: 18,
                      padding: '8px 22px',
                      fontWeight: 700,
                      background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                      boxShadow: '0 4px 12px rgba(0, 201, 167, 0.35)',
                    }}
                    disabled={!selectedPickerAccountId}
                    onClick={() => confirmSelectAccount()}
                  >
                    Confirm Selection ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Catalog Picker Modal (Active only when price list is chosen) */}
        {showProductPicker && selectedPriceList && (
          <div className="products-modal-overlay" onClick={() => setShowProductPicker(false)}>
            <div className="products-modal-card price-picker-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="products-modal-header">
                <div className="products-modal-title-row">
                  <div className="products-modal-icon-badge">📦</div>
                  <div>
                    <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>
                      Select Product · {selectedPriceList.name}
                    </h3>
                    <span className="tiny mut">
                      Unit prices pulled directly from {selectedPriceList.name} ({selectedPriceList.currency})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="products-modal-close"
                  onClick={() => setShowProductPicker(false)}
                >
                  ✕
                </button>
              </div>

              {/* Filter Strip */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
                <div className="settings-search-box" style={{ flex: '1 1 260px', minWidth: 220, height: 38 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="settings-search-input"
                    placeholder="Type SKU or product name to search..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    autoFocus
                  />
                  {pickerSearch && (
                    <span style={{ cursor: 'pointer', color: 'var(--mut)', fontSize: 13 }} onClick={() => setPickerSearch('')}>
                      ✕
                    </span>
                  )}
                </div>

                <div style={{ width: 180 }}>
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Groups' },
                      ...groups.map((g) => ({ value: g.id, label: g.name })),
                    ]}
                    value={pickerGroupFilter}
                    onChange={(val) => setPickerGroupFilter(val)}
                    className="settings-custom-select"
                  />
                </div>

                <span className="tiny mut" style={{ marginLeft: 'auto' }}>
                  Showing {filteredPickerProducts.length} results
                </span>
              </div>

              {/* Products Table */}
              <div className="price-picker-table-scroll">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        {targetLineIndex === -1 && (
                          <input
                            type="checkbox"
                            checked={
                              filteredPickerProducts.length > 0 &&
                              filteredPickerProducts.every((p) => pickerSelectedIds.includes(p.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const ids = Array.from(new Set([...pickerSelectedIds, ...filteredPickerProducts.map((p) => p.id)]))
                                setPickerSelectedIds(ids)
                              } else {
                                const visibleIds = new Set(filteredPickerProducts.map((p) => p.id))
                                setPickerSelectedIds(pickerSelectedIds.filter((id) => !visibleIds.has(id)))
                              }
                            }}
                            title="Select all visible products"
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </th>
                      <th style={{ width: 130 }}>SKU</th>
                      <th>Product Name</th>
                      <th>Group</th>
                      <th style={{ width: 80 }}>UOM</th>
                      <th style={{ textAlign: 'right', width: 140 }}>Price ({selectedPriceList.currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPickerProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--mut)' }}>
                          No products matching your search/filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPickerProducts.map((p) => {
                        const isSelected =
                          targetLineIndex === -1
                            ? pickerSelectedIds.includes(p.id)
                            : selectedProduct?.id === p.id
                        const price = priceMap[p.id]
                        return (
                          <tr
                            key={p.id}
                            className={`price-picker-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (targetLineIndex === -1) {
                                if (pickerSelectedIds.includes(p.id)) {
                                  setPickerSelectedIds(pickerSelectedIds.filter((id) => id !== p.id))
                                } else {
                                  setPickerSelectedIds([...pickerSelectedIds, p.id])
                                }
                              } else {
                                setSelectedProduct(p)
                              }
                            }}
                            onDoubleClick={() => {
                              if (targetLineIndex !== -1) {
                                confirmSelectProduct(p)
                              }
                            }}
                          >
                            <td style={{ textAlign: 'center' }}>
                              {targetLineIndex === -1 ? (
                                <input
                                  type="checkbox"
                                  checked={pickerSelectedIds.includes(p.id)}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    if (e.target.checked) {
                                      setPickerSelectedIds([...pickerSelectedIds, p.id])
                                    } else {
                                      setPickerSelectedIds(pickerSelectedIds.filter((id) => id !== p.id))
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name="quoteProdPick"
                                  checked={isSelected}
                                  onChange={() => setSelectedProduct(p)}
                                  style={{ cursor: 'pointer' }}
                                />
                              )}
                            </td>
                            <td>
                              <b className="mono" style={{ color: '#007A65' }}>{p.sku}</b>
                            </td>
                            <td style={{ maxWidth: 300 }}>
                              <b style={{ display: 'block', color: 'var(--ink)' }}>{p.name}</b>
                              {p.description && (
                                <div
                                  className="tiny mut"
                                  style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 280,
                                  }}
                                  title={p.description}
                                >
                                  {p.description}
                                </div>
                              )}
                            </td>
                            <td>
                              {p.product_group_name ? (
                                <span className="chip" style={{ fontSize: 11 }}>{p.product_group_name}</span>
                              ) : (
                                <span className="tiny mut">—</span>
                              )}
                            </td>
                            <td>
                              <span className="mono tiny">{p.uom || '—'}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {price != null ? (
                                <span className="chip ok" style={{ font: '700 12px var(--m)' }}>
                                  {selectedPriceList.currency} {Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="tiny mut" style={{ fontStyle: 'italic' }}>— Not in price list</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action Bar */}
              <div className="price-picker-bottom-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {targetLineIndex === -1 ? (
                  pickerSelectedIds.length > 0 ? (
                    <div>
                      <span className="tiny mut" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                        Batch Product Selection
                      </span>
                      <b style={{ font: '700 14px var(--d)', color: '#00C9A7' }}>
                        {pickerSelectedIds.length} {pickerSelectedIds.length === 1 ? 'product' : 'products'} selected
                      </b>
                      <span className="tiny mut" style={{ marginLeft: 8 }}>
                        (Will be added to quote lines with prices from {selectedPriceList.name})
                      </span>
                    </div>
                  ) : (
                    <div className="tiny mut" style={{ font: '500 13px var(--b)' }}>
                      👆 Click products to select one or multiple items, then click "Add Selected to Quote ✓"
                    </div>
                  )
                ) : selectedProduct ? (
                  <div>
                    <span className="tiny mut" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                      Selected Product
                    </span>
                    <b style={{ font: '700 14px var(--d)', color: 'var(--ink)' }}>
                      {selectedProduct.sku} — {selectedProduct.name}
                    </b>
                    {selectedProduct.uom && (
                      <span className="mono tiny mut" style={{ marginLeft: 6 }}>({selectedProduct.uom})</span>
                    )}
                    <span className="tiny" style={{ marginLeft: 12, color: '#007A65', fontWeight: 700 }}>
                      List Price: {selectedPriceList.currency} {Number(priceMap[selectedProduct.id] ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <div className="tiny mut" style={{ font: '500 13px var(--b)' }}>
                    👆 Click any product to select, then click "Update Line ✓" (or double-click)
                  </div>
                )}

                <div className="rowx" style={{ gap: 10 }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: '8px 18px', borderRadius: 18 }}
                    onClick={() => setShowProductPicker(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn pri"
                    style={{
                      borderRadius: 18,
                      padding: '8px 22px',
                      fontWeight: 700,
                      background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                      boxShadow: '0 4px 12px rgba(0, 201, 167, 0.35)',
                    }}
                    disabled={targetLineIndex === -1 ? pickerSelectedIds.length === 0 : !selectedProduct}
                    onClick={() => {
                      if (targetLineIndex === -1) {
                        confirmBatchSelectProducts()
                      } else {
                        confirmSelectProduct(selectedProduct)
                      }
                    }}
                  >
                    {targetLineIndex === -1
                      ? `Add ${pickerSelectedIds.length > 0 ? pickerSelectedIds.length : ''} Products to Quote ✓`
                      : 'Update Line ✓'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

const fieldInput = {
  padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12px var(--b)',
}
