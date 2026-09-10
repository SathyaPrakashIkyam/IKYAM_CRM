import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import CustomSelect from '../../components/CustomSelect'
import { accountsApi, quotesApi, productsApi, priceListsApi, productGroupsApi } from '../../api/endpoints'
import '../../styles/ikyam-mock.css'
import '../../styles/Quotes.css'
import '../../styles/Products.css'
import { useAuth } from '../../context/AuthContext'

const EMPTY_LINE = {
  description: '',
  quantity: 1,
  unit_price: 0,
  discount_pct: 0,
  tax_code: 'GST',
  tax_pct: 18,
  product_id: null,
  sku: '',
}
const EMPTY_FORM = { account_id: '', lines: [{ ...EMPTY_LINE }] }
const HIGH_DISCOUNT_THRESHOLD = 15

function formatINR(val) {
  return Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function NewQuotes() {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId } = useAuth()
  // Coming from a deal's "New quote" button — that account should already
  // be selected here rather than making the user pick it again by hand.
  const prefilledAccountId = location.state?.accountId || ''

  // Form State
  const [form, setForm] = useState(EMPTY_FORM)

  // Master Data — Loaded ONLY when NewQuotes mounts (protects QuotesList from 10,000+ items)
  const [products, setProducts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [groups, setGroups] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const [selectedPriceListId, setSelectedPriceListId] = useState('')
  const [priceMap, setPriceMap] = useState({})
  const [taxCodes, setTaxCodes] = useState([])
  const [priorQuote, setPriorQuote] = useState(null)

  // Product Picker Modal States
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

  // Account Picker Modal States
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [accountSearchQuery, setAccountSearchQuery] = useState('')
  const [accountIndustryFilter, setAccountIndustryFilter] = useState('all')
  const [accountTypeFilter, setAccountTypeFilter] = useState('all')
  const [selectedPickerAccountId, setSelectedPickerAccountId] = useState('')

  // Form Validation & Submission States
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [priceUpdating, setPriceUpdating] = useState(false)

  // Load master data only on mount
  useEffect(() => {
    if (!companyId) return

    productsApi
      .list(companyId)
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((e) => console.error('Failed to load products in quote builder:', e))

    accountsApi
      .list(companyId)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setAccounts(list)
        if (prefilledAccountId && list.some((a) => a.id === prefilledAccountId)) {
          setForm((f) => ({ ...f, account_id: prefilledAccountId }))
        }
      })
      .catch((e) => console.error('Failed to load accounts:', e))

    priceListsApi
      .list(companyId)
      .then((pls) => {
        // Only the account should ever come pre-selected (e.g. arriving
        // here from a deal's "New quote" button) — the price list is left
        // for the user to pick deliberately, not silently defaulted to
        // whichever one happens to be first in the list.
        setPriceLists(Array.isArray(pls) ? pls : [])
      })
      .catch((e) => console.error('Failed to load price lists:', e))

    productGroupsApi
      .list()
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => {})

    quotesApi
      .taxCodes()
      .then((data) => setTaxCodes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [companyId])

  // Fetch prices for active price list
  useEffect(() => {
    if (!selectedPriceListId) {
      setPriceMap({})
      return
    }
    priceListsApi
      .items(selectedPriceListId)
      .then((items) => {
        const map = {}
        if (Array.isArray(items)) {
          items.forEach((it) => {
            if (it && it.product_id) {
              map[it.product_id] = it.unit_price
            }
          })
        }
        setPriceMap(map)
      })
      .catch(() => setPriceMap({}))
  }, [selectedPriceListId])

  // Sync unit prices with selected price list
  useEffect(() => {
    if (!selectedPriceListId) return
    setForm((f) => {
      const lines = Array.isArray(f?.lines) ? f.lines : []
      return {
        ...f,
        lines: lines.map((l) =>
          l.product_id && priceMap[l.product_id] != null && !l.unit_price
            ? { ...l, unit_price: priceMap[l.product_id] }
            : l
        ),
      }
    })
  }, [priceMap])

  // Check prior quote for selected account
  useEffect(() => {
    if (!form.account_id) {
      setPriorQuote(null)
      return
    }
    accountsApi
      .quotes(form.account_id)
      .then((qs) => {
        const arr = Array.isArray(qs) ? qs : []
        setPriorQuote(arr[0] || null)
      })
      .catch(() => setPriorQuote(null))
  }, [form.account_id])

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

  function taxRateFor(code) {
    return taxCodes.find((t) => t.code === code)?.rate_pct ?? 0
  }

  function updateTaxCode(index, code) {
    const lines = [...form.lines]
    lines[index] = { ...lines[index], tax_code: code, tax_pct: taxRateFor(code) }
    setForm({ ...form, lines })
  }

  function updateLine(index, field, value) {
    if (formErrors.lines) {
      setFormErrors((prev) => ({ ...prev, lines: null }))
    }
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
    if (formErrors.lines) {
      setFormErrors((prev) => ({ ...prev, lines: null }))
    }
    if (rawValue === '') {
      updateLine(index, field, '')
      return
    }
    const parts = String(rawValue).split('.')
    if (parts.length > 2) return
    updateLine(index, field, rawValue)
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

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }))
  }

  function lineTotal(line) {
    const qty = Number(line.quantity) || 0
    const price = Number(line.unit_price) || 0
    const disc = Number(line.discount_pct) || 0
    const taxPct = Number(line.tax_pct) || 0
    const gross = qty * price
    const discount = gross * (disc / 100)
    const taxable = gross - discount
    const tax = taxable * (taxPct / 100)
    return taxable + tax
  }

  const selectedPriceList = useMemo(() => {
    return priceLists.find((pl) => pl.id === selectedPriceListId) || null
  }, [priceLists, selectedPriceListId])

  function resolveLineSku(line, prods = products) {
    if (line?.sku && String(line.sku).trim()) return String(line.sku).trim()
    if (line?.product_sku && String(line.product_sku).trim()) return String(line.product_sku).trim()
    if (line?.product_id) {
      const p = prods.find((prod) => prod.id === line.product_id)
      if (p?.sku && String(p.sku).trim()) return String(p.sku).trim()
    }
    if (line?.description) {
      const desc = String(line.description).trim().toLowerCase()
      const p = prods.find(
        (prod) =>
          (prod.name || '').trim().toLowerCase() === desc ||
          (prod.sku || '').trim().toLowerCase() === desc
      )
      if (p?.sku && String(p.sku).trim()) return String(p.sku).trim()
    }
    return null
  }

  async function handlePriceListChange(newPriceListId) {
    setSelectedPriceListId(newPriceListId)
    if (formErrors.price_list) {
      setFormErrors((prev) => ({ ...prev, price_list: null }))
    }

    if (!newPriceListId) return

    // Find all lines that have an associated product or SKU
    const currentLines = form?.lines || []
    const linesToSync = currentLines
      .map((line, idx) => ({ index: idx, sku: resolveLineSku(line, products) }))
      .filter((item) => !!item.sku)

    if (linesToSync.length === 0) return

    try {
      setPriceUpdating(true)
      const results = await Promise.allSettled(
        linesToSync.map(async (item) => {
          const res = await priceListsApi.getItemBySku(newPriceListId, item.sku)
          return { index: item.index, sku: item.sku, data: res }
        })
      )

      setForm((prev) => {
        const nextLines = [...(prev?.lines || [])]
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value) {
            const { index, data } = r.value
            const itemData = data?.data && typeof data.data === 'object' ? data.data : data
            if (nextLines[index] && itemData) {
              const fetchedPrice = itemData.unit_price != null ? Number(itemData.unit_price) : null
              if (fetchedPrice != null && !isNaN(fetchedPrice)) {
                nextLines[index] = {
                  ...nextLines[index],
                  unit_price: fetchedPrice,
                  sku: itemData.product_sku || nextLines[index].sku || '',
                  product_id: itemData.product_id || nextLines[index].product_id,
                }
              }
            }
          } else if (r.status === 'rejected') {
            console.warn(`Could not fetch price for SKU in price list ${newPriceListId}:`, r.reason)
          }
        })
        return { ...prev, lines: nextLines }
      })
    } catch (err) {
      console.error('Error updating line prices for selected price list:', err)
    } finally {
      setPriceUpdating(false)
    }
  }

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

    const unitPrice = priceMap[prod.id] != null ? Number(priceMap[prod.id]) : 0
    const lines = [...form.lines]

    const newLineData = {
      product_id: prod.id,
      sku: prod.sku || '',
      description: prod.name,
      uom: prod.uom || '',
      unit_price: unitPrice,
    }

    if (targetLineIndex != null && targetLineIndex >= 0 && targetLineIndex < lines.length) {
      lines[targetLineIndex] = {
        ...lines[targetLineIndex],
        ...newLineData,
      }
    } else {
      if (lines.length === 1 && !lines[0].description.trim()) {
        lines[0] = {
          ...lines[0],
          ...newLineData,
        }
      } else {
        lines.push({
          ...EMPTY_LINE,
          ...newLineData,
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
        sku: prod.sku || '',
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

  const selectedFormAccount = useMemo(() => {
    return accounts.find((a) => a.id === form.account_id) || null
  }, [accounts, form.account_id])

  const uniqueAccountIndustries = useMemo(() => {
    const set = new Set()
    accounts.forEach((a) => {
      if (a.industry && a.industry.trim()) set.add(a.industry.trim())
    })
    return Array.from(set).sort()
  }, [accounts])

  const uniqueAccountTypes = useMemo(() => {
    const set = new Set()
    accounts.forEach((a) => {
      if (a.account_type && a.account_type.trim()) set.add(a.account_type.trim())
    })
    return Array.from(set).sort()
  }, [accounts])

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

  function openAccountPicker() {
    setAccountSearchQuery('')
    setAccountIndustryFilter('all')
    setAccountTypeFilter('all')
    setSelectedPickerAccountId(form.account_id || '')
    setShowAccountPicker(true)
  }

  function confirmSelectAccount(account) {
    const acc = account !== undefined ? account : accounts.find((a) => a.id === selectedPickerAccountId)
    setForm((f) => ({ ...f, account_id: acc ? acc.id : '' }))
    if (formErrors.account_id) {
      setFormErrors((prev) => ({ ...prev, account_id: null }))
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
      } else {
        const invalidPrice = validLines.some(
          (l) => l.unit_price === '' || l.unit_price == null || Number(l.unit_price) <= 0 || isNaN(Number(l.unit_price))
        )
        if (invalidPrice) {
          errors.lines = 'Unit price cannot be 0 or empty. Please enter a valid unit price for all line items.'
        }
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
      await quotesApi.create(companyId, {
        ...form,
        price_list_id: selectedPriceListId || undefined,
        lines,
      })
      navigate('/quotesList')
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create quote.'
      setFormErrors({ submit: typeof msg === 'string' ? msg : JSON.stringify(msg) })
    } finally {
      setSubmitting(false)
    }
  }

  const safeLines = Array.isArray(form?.lines) ? form.lines : []
  const totals = safeLines.reduce(
    (acc, l) => {
      const qty = Number(l?.quantity) || 0
      const price = Number(l?.unit_price) || 0
      const disc = Number(l?.discount_pct) || 0
      const taxPct = Number(l?.tax_pct) || 0
      const gross = qty * price
      const discount = gross * (disc / 100)
      const taxable = gross - discount
      const tax = taxable * (taxPct / 100)
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

  const highDiscountLines = safeLines
    .map((l, i) => ({ ...l, i }))
    .filter((l) => (l?.discount_pct || 0) > HIGH_DISCOUNT_THRESHOLD)

  function copyPriorLines() {
    if (!priorQuote || !priorQuote.lines) return
    const copied = priorQuote.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      uom: l.uom,
      unit_price: l.unit_price,
      discount_pct: l.discount_pct,
      tax_code: l.tax_code,
      tax_pct: l.tax_pct,
      product_id: l.product_id,
      sku: l.sku || l.product_sku || '',
    }))
    setForm((f) => ({
      ...f,
      lines: [...f.lines.filter((l) => l.description.trim()), ...copied],
    }))
  }

  return (
    <AppShell>
      <div className="ikyam-mock quotes-page">
        <div className="quotes-create-card" style={{ position: 'relative', overflow: 'hidden' }}>
          {(submitting || priceUpdating) && <div className="quote-top-progress-bar" />}
          <form onSubmit={createQuote}>
            <div className="rowx sp" style={{ marginBottom: 12, alignItems: 'center' }}>
              <button type="button" className="btn ghost" onClick={() => navigate('/quotesList')}>
                ← Back to quotes
              </button>
              <div className="rowx" style={{ gap: 10, alignItems: 'center' }}>
                <b style={{ font: '700 16px var(--d)' }}>Create New Quote</b>
              </div>
              <div className="rowx" style={{ gap: 10 }}>
                <button type="button" className="btn ghost" onClick={() => navigate('/quotesList')}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn pri"
                  style={{
                    background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                    color: '#FFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                  disabled={submitting}
                >
                  {submitting && <span className="quote-spinner white" />}
                  {submitting ? 'Creating quote…' : 'Create quote ✓'}
                </button>
              </div>
            </div>

            {/* Form Validation Error Banner */}
            {(formErrors.account_id ||
              formErrors.price_list ||
              formErrors.lines ||
              formErrors.submit) && (
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
                        <b
                          style={{
                            font: '700 13.5px var(--d)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
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
                      onClick={openAccountPicker}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      className={`quotes-account-picker-trigger ${formErrors.account_id ? 'has-error' : ''}`}
                      onClick={openAccountPicker}
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
                <div className="rowx sp" style={{ marginBottom: 4, alignItems: 'center' }}>
                  <span className="tiny mut font-semibold">
                    PRICE LIST <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  {priceUpdating && (
                    <span className="quote-loading-pill" style={{ fontSize: 11, padding: '1px 8px' }}>
                      <span className="quote-spinner xs" /> Updating line prices…
                    </span>
                  )}
                </div>
                <div className={formErrors.price_list ? 'select-has-error' : ''}>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Select price list… (required)' },
                      ...priceLists.map((pl) => ({ value: pl.id, label: `${pl.name} (${pl.currency})` })),
                    ]}
                    value={selectedPriceListId}
                    onChange={handlePriceListChange}
                    disabled={submitting || priceUpdating}
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
                    Active Price List: <b>{selectedPriceList?.name}</b> ({selectedPriceList?.currency}) — {products.length} catalog items ready
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
                <button type="button" className="quotes-add-blank-btn" onClick={addLine}>
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

            {/* Scrollable Lines Table with Sticky Headers */}
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
                  {(Array.isArray(form?.lines) ? form.lines : []).map((line, i) => {
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
                            style={{
                              width: 92,
                              ...(formErrors.lines &&
                              (line.unit_price === '' || line.unit_price == null || Number(line.unit_price) <= 0) &&
                              line.description?.trim()
                                ? { borderColor: '#EF4444', background: 'rgba(239, 68, 68, 0.08)', color: '#DC2626' }
                                : {}),
                            }}
                            value={
                              isPriceFocused
                                ? line.unit_price === '' || line.unit_price == null ? '' : line.unit_price
                                : Number(line.unit_price || 0).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                            }
                            onFocus={(e) => {
                              setFocusedCell({ row: i, field: 'unit_price' })
                              e.target.select()
                              if (formErrors.lines) setFormErrors((prev) => ({ ...prev, lines: null }))
                            }}
                            onBlur={() => {
                              setFocusedCell(null)
                              if (line.unit_price !== '' && line.unit_price != null) {
                                const n = Number(line.unit_price)
                                updateLine(i, 'unit_price', isNaN(n) ? 0 : n)
                              }
                            }}
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
                                    top: openUp ? Math.max(10, rect.top - 84) : rect.bottom + 4,
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
                  {priorQuote && (
                    <li>
                      <span className="quotes-link" onClick={copyPriorLines}>
                        ▸ Copy lines from {priorQuote.doc_num} (last quote to this account)
                      </span>
                    </li>
                  )}
                  {highDiscountLines.map((l) => (
                    <li key={l.i} className="tiny">
                      ▸ Discount of {l.discount_pct}% on "{l.description}" is unusually high — confirm before sending.
                    </li>
                  ))}
                  {!priorQuote && highDiscountLines.length === 0 && (
                    <li className="tiny">No flags for this quote yet.</li>
                  )}
                </ul>
              </div>

              <div className="card quotes-totals-card">
                <div className="fld">
                  <span className="lab">Subtotal</span>
                  <span className="mono">₹{formatINR(totals.subtotal)}</span>
                </div>
                <div className="fld">
                  <span className="lab">Discount</span>
                  <span className="mono">−₹{formatINR(totals.discount)}</span>
                </div>
                {totals.cgst > 0 && (
                  <div className="fld">
                    <span className="lab">CGST</span>
                    <span className="mono">₹{formatINR(totals.cgst)}</span>
                  </div>
                )}
                {totals.sgst > 0 && (
                  <div className="fld">
                    <span className="lab">SGST</span>
                    <span className="mono">₹{formatINR(totals.sgst)}</span>
                  </div>
                )}
                {totals.igst > 0 && (
                  <div className="fld">
                    <span className="lab">IGST</span>
                    <span className="mono">₹{formatINR(totals.igst)}</span>
                  </div>
                )}
                {totals.otherTax > 0 && (
                  <div className="fld">
                    <span className="lab">Other tax</span>
                    <span className="mono">₹{formatINR(totals.otherTax)}</span>
                  </div>
                )}
                <div className="fld">
                  <span className="lab">Tax</span>
                  <span className="mono">₹{formatINR(totals.tax)}</span>
                </div>
                <div className="fld" style={{ border: 0 }}>
                  <b className="mono" style={{ fontSize: 15 }}>
                    Total ₹{formatINR(grandTotal)}
                  </b>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Account Picker Modal */}
        {showAccountPicker && (
          <div className="products-modal-overlay" onClick={() => setShowAccountPicker(false)}>
            <div className="products-modal-card price-picker-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="products-modal-header">
                <div className="products-modal-title-row">
                  <div className="products-modal-icon-badge" style={{ background: 'rgba(0, 201, 167, 0.12)', color: '#00C9A7' }}>
                    🏢
                  </div>
                  <div>
                    <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>
                      Select Account for Quote
                    </h3>
                    <span className="tiny mut">
                      Search &amp; select from {accounts.length} accounts in your directory
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
                    placeholder="Search by account name, code, phone..."
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

                {uniqueAccountIndustries.length > 0 && (
                  <div style={{ width: 160 }}>
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Industries' },
                        ...uniqueAccountIndustries.map((ind) => ({ value: ind, label: ind })),
                      ]}
                      value={accountIndustryFilter}
                      onChange={(val) => setAccountIndustryFilter(val)}
                      className="settings-custom-select"
                    />
                  </div>
                )}

                {uniqueAccountTypes.length > 0 && (
                  <div style={{ width: 140 }}>
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Types' },
                        ...uniqueAccountTypes.map((t) => ({ value: t, label: t })),
                      ]}
                      value={accountTypeFilter}
                      onChange={(val) => setAccountTypeFilter(val)}
                      className="settings-custom-select"
                    />
                  </div>
                )}

                <span className="tiny mut" style={{ marginLeft: 'auto' }}>
                  Showing {filteredPickerAccounts.length} results
                </span>
              </div>

              {/* Accounts Table */}
              <div className="price-picker-table-scroll">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                      <th style={{ width: 110 }}>Acc #</th>
                      <th>Account Name</th>
                      <th>Industry</th>
                      <th style={{ width: 110 }}>Type</th>
                      <th style={{ width: 130 }}>ERP Code</th>
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
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="radio"
                                name="selectedPickerAcc"
                                checked={isSelected}
                                onChange={() => setSelectedPickerAccountId(a.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <b className="mono" style={{ color: '#007A65' }}>{a.account_no || '—'}</b>
                            </td>
                            <td style={{ maxWidth: 260 }}>
                              <b style={{ display: 'block', color: 'var(--ink)' }}>{a.name}</b>
                              {a.city && <span className="tiny mut">{a.city}{a.state ? `, ${a.state}` : ''}</span>}
                            </td>
                            <td>
                              {a.industry ? (
                                <span className="chip" style={{ fontSize: 11 }}>{a.industry}</span>
                              ) : (
                                <span className="tiny mut">—</span>
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
                              <span className="mono tiny">{a.erp_card_code || '—'}</span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Actions */}
              <div className="price-picker-bottom-bar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    {selectedPickerAccountId ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        Selected: {accounts.find((a) => a.id === selectedPickerAccountId)?.name}
                      </span>
                    ) : (
                      <span className="tiny mut">Click an account to select it</span>
                    )}
                  </div>
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
                        borderRadius: 20,
                        padding: '8px 22px',
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                        color: '#FFF',
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
          </div>
        )}

        {/* Product Picker Modal */}
        {showProductPicker && (
          <div className="products-modal-overlay" onClick={() => setShowProductPicker(false)}>
            <div className="products-modal-card price-picker-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="products-modal-header">
                <div className="products-modal-title-row">
                  <div className="products-modal-icon-badge">📦</div>
                  <div>
                    <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>
                      Add Products to Quote
                    </h3>
                    <span className="tiny mut">
                      Search &amp; select from {products.length} products with pricing from{' '}
                      <b>{selectedPriceList?.name}</b> ({selectedPriceList?.currency})
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
                <div className="settings-search-box" style={{ flex: '1 1 240px', minWidth: 220, height: 38 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="settings-search-input"
                    placeholder="Search by SKU, product name, specs..."
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

                {groups.length > 0 && (
                  <div style={{ width: 170 }}>
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
                )}

                <span className="tiny mut" style={{ marginLeft: 'auto' }}>
                  Showing {filteredPickerProducts.length} results
                </span>
              </div>

              {/* Products Table */}
              <div className="price-picker-table-scroll">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: 'center' }}>
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
                      </th>
                      <th style={{ width: 130 }}>SKU</th>
                      <th>Product Name &amp; Description</th>
                      <th>Group</th>
                      <th style={{ width: 80 }}>UOM</th>
                      <th className="num" style={{ width: 120 }}>Unit Price ({selectedPriceList?.currency || '₹'})</th>
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
                        const isChecked = pickerSelectedIds.includes(p.id)
                        const isRadio = selectedProduct?.id === p.id
                        const plPrice = priceMap[p.id]

                        return (
                          <tr
                            key={p.id}
                            className={`price-picker-row ${isChecked || isRadio ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedProduct(p)
                              if (pickerSelectedIds.includes(p.id)) {
                                setPickerSelectedIds(pickerSelectedIds.filter((id) => id !== p.id))
                              } else {
                                setPickerSelectedIds([...pickerSelectedIds, p.id])
                              }
                            }}
                            onDoubleClick={() => confirmSelectProduct(p)}
                          >
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPickerSelectedIds([...pickerSelectedIds, p.id])
                                    setSelectedProduct(p)
                                  } else {
                                    setPickerSelectedIds(pickerSelectedIds.filter((id) => id !== p.id))
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <b className="mono" style={{ color: '#007A65' }}>{p.sku}</b>
                            </td>
                            <td style={{ maxWidth: 280 }}>
                              <b style={{ display: 'block', color: 'var(--ink)' }}>{p.name}</b>
                              {p.description && (
                                <div
                                  className="tiny mut"
                                  style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 260,
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
                            <td className="num mono">
                              {plPrice != null ? (
                                <b style={{ color: '#007A65' }}>
                                  {Number(plPrice).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </b>
                              ) : (
                                <span className="tiny mut">Not on list</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Actions */}
              <div className="price-picker-bottom-bar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    {pickerSelectedIds.length > 0 ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {pickerSelectedIds.length} {pickerSelectedIds.length === 1 ? 'product' : 'products'} selected
                      </span>
                    ) : selectedProduct ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        Selected: {selectedProduct.sku} — {selectedProduct.name}
                      </span>
                    ) : (
                      <span className="tiny mut">
                        Click rows to select products, then click "Add Selected to Quote ✓"
                      </span>
                    )}
                  </div>

                  <div className="rowx" style={{ gap: 10 }}>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '8px 18px', borderRadius: 18 }}
                      onClick={() => setShowProductPicker(false)}
                    >
                      Cancel
                    </button>

                    {selectedProduct && pickerSelectedIds.length <= 1 && (
                      <button
                        type="button"
                        className="btn pri"
                        style={{
                          borderRadius: 20,
                          padding: '8px 18px',
                          fontWeight: 600,
                          background: 'var(--pri)',
                        }}
                        onClick={() => confirmSelectProduct(selectedProduct)}
                      >
                        Add Single Product
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn pri"
                      style={{
                        borderRadius: 20,
                        padding: '8px 22px',
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                        color: '#FFF',
                      }}
                      disabled={pickerSelectedIds.length === 0}
                      onClick={confirmBatchSelectProducts}
                    >
                      {pickerSelectedIds.length > 0
                        ? `Add ${pickerSelectedIds.length} Products to Quote ✓`
                        : 'Select Products'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
