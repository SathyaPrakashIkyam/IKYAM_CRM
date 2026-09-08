import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { productsApi, productGroupsApi, uomsApi, currenciesApi, priceListsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import '../styles/Products.css'
import '../styles/Masters.css'

const EMPTY_PRODUCT = {
  sku: '',
  name: '',
  description: '',
  product_group_id: '',
  uom: '',
  is_sellable: true,
  is_active: true,
  erp_item_code: '',
  source: 'company',
}

export default function Products() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth()
  const canManage = isCompanyAdmin || isSuperAdmin
  const companyId = currentCompanyId()

  // Active view tab: 'catalog' | 'pricelists'
  const [tab, setTab] = useState('catalog')

  // Products state
  const [products, setProducts] = useState([])
  const [groups, setGroups] = useState([])
  const [uoms, setUoms] = useState([])
  const [companySource, setCompanySource] = useState('standalone')
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_PRODUCT)
  const [editModalError, setEditModalError] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewUom, setShowNewUom] = useState(false)
  const [newUomCode, setNewUomCode] = useState('')
  const [form, setForm] = useState(EMPTY_PRODUCT)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sellableFilter, setSellableFilter] = useState('all')

  // Price Lists state
  const [priceLists, setPriceLists] = useState([])
  const [currencies, setCurrencies] = useState([])
  const [showNewPriceList, setShowNewPriceList] = useState(false)
  const [plModalError, setPlModalError] = useState(null)
  const [plSubmitting, setPlSubmitting] = useState(false)
  const [showNewCurrency, setShowNewCurrency] = useState(false)
  const [newCurrencyCode, setNewCurrencyCode] = useState('')
  const [plForm, setPlForm] = useState({ name: '', currency: 'INR' })
  const [selectedPriceList, setSelectedPriceList] = useState(null)
  const [priceItems, setPriceItems] = useState([])
  const [pricedSearch, setPricedSearch] = useState('')

  // Dedicated Price Picker & Filter modal states
  const [showPricePickerModal, setShowPricePickerModal] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerGroupFilter, setPickerGroupFilter] = useState('all')
  const [selectedPickerProduct, setSelectedPickerProduct] = useState(null)
  const [pickerUnitPrice, setPickerUnitPrice] = useState('')
  const [pickerSaving, setPickerSaving] = useState(false)
  const [pickerSuccessMsg, setPickerSuccessMsg] = useState(null)
  const [pickerErrorMsg, setPickerErrorMsg] = useState(null)

function loadCatalog() {
    if (!companyId) return
    productsApi.list(companyId).then(setProducts).catch((e) => console.error('Failed to load products:', e))
    productGroupsApi.list().then(setGroups).catch((e) => console.error('Failed to load product groups:', e))
    uomsApi.list().then(setUoms).catch((e) => console.error('Failed to load UOMs:', e))
    productsApi.companySource().then(setCompanySource).catch(() => {})
  }

  function loadPriceLists() {
    if (!companyId) return
    priceListsApi.list(companyId).then((pls) => {
      setPriceLists(pls)
      if (pls.length > 0 && !selectedPriceList) {
        selectPriceList(pls[0])
      }
    })
    currenciesApi.list().then(setCurrencies)
  }

  useEffect(loadCatalog, [companyId])
  useEffect(loadPriceLists, [companyId])

  function loadPriceItems(priceListId) {
    priceListsApi.items(priceListId).then(setPriceItems)
  }

  async function createGroup(e) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const g = await productGroupsApi.create({ name: newGroupName.trim() })
    setGroups((prev) => [...prev, g].sort((a, b) => a.name.localeCompare(b.name)))
    setForm((f) => ({ ...f, product_group_id: g.id }))
    setNewGroupName('')
    setShowNewGroup(false)
  }

  async function createUom(e) {
    e.preventDefault()
    if (!newUomCode.trim()) return
    const u = await uomsApi.create({ code: newUomCode.trim().toUpperCase() })
    setUoms((prev) => [...prev, u].sort((a, b) => a.code.localeCompare(b.code)))
    setForm((f) => ({ ...f, uom: u.code }))
    setNewUomCode('')
    setShowNewUom(false)
  }

  async function createCurrency(e) {
    e.preventDefault()
    if (!newCurrencyCode.trim()) return
    const c = await currenciesApi.create({ code: newCurrencyCode.trim().toUpperCase() })
    setCurrencies((prev) => [...prev, c].sort((a, b) => a.code.localeCompare(b.code)))
    setPlForm((f) => ({ ...f, currency: c.code }))
    setNewCurrencyCode('')
    setShowNewCurrency(false)
  }

  async function createProduct(e) {
    e.preventDefault()
    const trimmedSku = form.sku.trim()
    if (!trimmedSku) return

    // Pre-check for duplicate SKU locally
    if (products.some((p) => (p.sku || '').toLowerCase() === trimmedSku.toLowerCase())) {
      setModalError(`A product with SKU "${trimmedSku}" already exists.`)
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await productsApi.create(companyId, {
        ...form,
        sku: trimmedSku,
        product_group_id: form.product_group_id || null,
      })
      setForm(EMPTY_PRODUCT)
      setShowNewProduct(false)
      setModalError(null)
      loadCatalog()
    } catch (err) {
      console.error('Failed to create product:', err)
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create product'
      setModalError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  function openEditProduct(p) {
    setEditingProduct(p)
    setEditForm({
      sku: p.sku || '',
      name: p.name || '',
      description: p.description || '',
      product_group_id: p.product_group_id || '',
      uom: p.uom || '',
      is_sellable: p.is_sellable !== false,
      is_active: p.is_active !== false,
      erp_item_code: p.erp_item_code || '',
      source: p.source || 'company',
    })
    setEditModalError(null)
  }

  async function updateProduct(e) {
    e.preventDefault()
    if (!editingProduct) return
    const trimmedSku = editForm.sku.trim()
    if (!trimmedSku) return

    // Pre-check for duplicate SKU locally on other products
    if (
      trimmedSku.toLowerCase() !== (editingProduct.sku || '').toLowerCase() &&
      products.some((p) => p.id !== editingProduct.id && (p.sku || '').toLowerCase() === trimmedSku.toLowerCase())
    ) {
      setEditModalError(`A product with SKU "${trimmedSku}" already exists.`)
      return
    }

    setEditSubmitting(true)
    setEditModalError(null)
    try {
      await productsApi.update(editingProduct.id, {
        ...editForm,
        sku: trimmedSku,
        product_group_id: editForm.product_group_id || null,
      })
      setEditingProduct(null)
      setEditModalError(null)
      loadCatalog()
    } catch (err) {
      console.error('Failed to update product:', err)
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update product'
      setEditModalError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function createPriceList(e) {
    e.preventDefault()
    const trimmedName = plForm.name.trim()
    if (!trimmedName) return

    setPlSubmitting(true)
    setPlModalError(null)
    try {
      const created = await priceListsApi.create(companyId, {
        name: trimmedName,
        currency: plForm.currency || 'INR',
      })
      setPlForm({ name: '', currency: 'INR' })
      setShowNewPriceList(false)
      loadPriceLists()
      selectPriceList(created)
    } catch (err) {
      console.error('Failed to create price list:', err)
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create price list'
      setPlModalError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setPlSubmitting(false)
    }
  }

  function selectPriceList(pl) {
    setSelectedPriceList(pl)
    setPricedSearch('')
    loadPriceItems(pl.id)
  }

  const currentPriceMap = useMemo(() => {
    const map = {}
    for (const it of priceItems) {
      map[it.product_id] = it.unit_price
    }
    return map
  }, [priceItems])

  const filteredPricedItems = useMemo(() => {
    const q = pricedSearch.trim().toLowerCase()
    if (!q) return priceItems
    return priceItems.filter((it) => {
      const sku = (it.product_sku || '').toLowerCase()
      const name = (it.product_name || '').toLowerCase()
      return sku.includes(q) || name.includes(q)
    })
  }, [priceItems, pricedSearch])

  const filteredPickerProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    const results = []
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      // Group filter
      if (pickerGroupFilter !== 'all' && p.product_group_id !== pickerGroupFilter) {
        continue
      }
      // Search filter
      if (q) {
        const sku = (p.sku || '').toLowerCase()
        const name = (p.name || '').toLowerCase()
        const erp = (p.erp_item_code || '').toLowerCase()
        if (!sku.includes(q) && !name.includes(q) && !erp.includes(q)) {
          continue
        }
      }
      results.push(p)
      // Capped for instant 60 FPS rendering even with 10,000+ items
      if (results.length >= 80) break
    }
    return results
  }, [products, pickerSearch, pickerGroupFilter])

  function handleSelectPickerProduct(p) {
    setSelectedPickerProduct(p)
    const existingPrice = currentPriceMap[p.id]
    setPickerUnitPrice(existingPrice !== undefined ? String(existingPrice) : '')
    setPickerSuccessMsg(null)
    setPickerErrorMsg(null)
  }

  async function handleSavePickerPrice(e) {
    e.preventDefault()
    if (!selectedPickerProduct || pickerUnitPrice === '' || isNaN(pickerUnitPrice)) {
      setPickerErrorMsg('Please enter a valid unit price')
      return
    }
    if (!selectedPriceList) return

    setPickerSaving(true)
    setPickerErrorMsg(null)
    try {
      await priceListsApi.setItem(selectedPriceList.id, {
        product_id: selectedPickerProduct.id,
        unit_price: parseFloat(pickerUnitPrice),
      })
      setPickerSuccessMsg(
        `Price for ${selectedPickerProduct.sku} set to ${selectedPriceList.currency} ${parseFloat(
          pickerUnitPrice
        ).toLocaleString('en-IN')}`
      )
      setTimeout(() => setPickerSuccessMsg(null), 3000)
      loadPriceItems(selectedPriceList.id)
    } catch (err) {
      console.error('Failed to set price:', err)
      setPickerErrorMsg(err?.response?.data?.detail || 'Failed to update item price')
    } finally {
      setPickerSaving(false)
    }
  }

  function openEditPriceForItem(it) {
    const prod = products.find((p) => p.id === it.product_id) || {
      id: it.product_id,
      sku: it.product_sku,
      name: it.product_name,
    }
    setSelectedPickerProduct(prod)
    setPickerUnitPrice(String(it.unit_price))
    setPickerSearch('')
    setPickerGroupFilter('all')
    setPickerSuccessMsg(null)
    setPickerErrorMsg(null)
    setShowPricePickerModal(true)
  }

  // Filtered Products logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Group filter
      if (groupFilter !== 'all' && p.product_group_id !== groupFilter) return false

      // Source filter
      if (sourceFilter !== 'all' && p.source !== sourceFilter) return false

      // Sellable filter
      if (sellableFilter === 'sellable' && !p.is_sellable) return false
      if (sellableFilter === 'non_sellable' && p.is_sellable) return false
      if (sellableFilter === 'active' && !p.is_active) return false
      if (sellableFilter === 'inactive' && p.is_active) return false

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        (p.sku || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.product_group_name || '').toLowerCase().includes(q) ||
        (p.uom || '').toLowerCase().includes(q) ||
        (p.erp_item_code || '').toLowerCase().includes(q)
      )
    })
  }, [products, groupFilter, sourceFilter, sellableFilter, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = products.length
    const sellable = products.filter((p) => p.is_sellable).length
    const sapCount = products.filter((p) => p.source === 'sap_b1').length
    const groupsCount = groups.length
    return { total, sellable, sapCount, groupsCount }
  }, [products, groups])

  return (
    <AppShell>
      <div className="ikyam-mock products-page">
        {/* Top Header & Segmented Tab Navigation */}
        <div className="scr-head rowx sp" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>Product Catalog &amp; Price Lists</h2>
            <span className="goal">
              {canManage
                ? 'Manage products, groups, units of measure, and SAP price lists.'
                : 'Browse the product catalog and price lists.'}
            </span>
          </div>

          <div className="products-tab-nav">
            <button
              type="button"
              className={`products-tab-btn ${tab === 'catalog' ? 'active' : ''}`}
              onClick={() => setTab('catalog')}
            >
              📦 Products ({products.length})
            </button>
            <button
              type="button"
              className={`products-tab-btn ${tab === 'pricelists' ? 'active' : ''}`}
              onClick={() => setTab('pricelists')}
            >
              💰 Price Lists ({priceLists.length})
            </button>
          </div>
        </div>

        {/* TAB 1: PRODUCTS CATALOG */}
        {tab === 'catalog' && (
          <>
            {/* Controls Toolbar */}
            <div className="products-controls-bar">
              <div className="products-controls-left">
                {/* Search Box */}
                <div className="products-search-box">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by product name, SKU, group, UOM..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="products-search-input"
                  />
                  {searchQuery && (
                    <button type="button" style={{ border: 0, background: 'transparent', color: 'var(--mut)', cursor: 'pointer', fontSize: 11 }} onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>

                {/* Group Filter */}
                <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
                  <span className="tiny mut font-semibold">Group:</span>
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Groups' },
                      ...groups.map((g) => ({ value: g.id, label: g.name })),
                    ]}
                    value={groupFilter}
                    onChange={setGroupFilter}
                    style={{ minWidth: 140 }}
                  />
                </div>

                {/* Source Filter */}
                <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
                  <span className="tiny mut font-semibold">Source:</span>
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Sources' },
                      { value: 'company', label: 'Company' },
                      { value: 'sap_b1', label: 'SAP B1' },
                    ]}
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    style={{ minWidth: 130 }}
                  />
                </div>

                {/* Sellable / Status Filter */}
                <div className="rowx" style={{ gap: 6, alignItems: 'center' }}>
                  <span className="tiny mut font-semibold">Status:</span>
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Items' },
                      { value: 'sellable', label: 'Sellable Only' },
                      { value: 'non_sellable', label: 'Non-Sellable' },
                      { value: 'active', label: 'Active Only' },
                      { value: 'inactive', label: 'Inactive Only' },
                    ]}
                    value={sellableFilter}
                    onChange={setSellableFilter}
                    style={{ minWidth: 135 }}
                  />
                </div>
              </div>

              {canManage && (
                <button
                  className="btn pri"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 20,
                    background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(0, 201, 167, 0.3)',
                  }}
                  onClick={() => {
                    setForm(EMPTY_PRODUCT)
                    setModalError(null)
                    setShowNewProduct(true)
                  }}
                >
                  ＋ New product
                </button>
              )}
            </div>

            {/* 4-Column Summary Metrics Strip */}
            <div className="products-metrics-strip">
              <div className="products-metric-col">
                <span className="products-metric-label">Total Products</span>
                <span className="products-metric-num">{metrics.total}</span>
                <span className="tiny mut">in catalog</span>
              </div>
              <div className="products-metric-col">
                <span className="products-metric-label">Sellable Items</span>
                <span className="products-metric-num" style={{ color: '#00C9A7' }}>{metrics.sellable}</span>
                <span className="tiny mut">ready to quote</span>
              </div>
              <div className="products-metric-col">
                <span className="products-metric-label">SAP B1 Synced</span>
                <span className="products-metric-num" style={{ color: '#0072CE' }}>{metrics.sapCount}</span>
                <span className="tiny mut">ERP items</span>
              </div>
              <div className="products-metric-col">
                <span className="products-metric-label">Product Groups</span>
                <span className="products-metric-num" style={{ color: 'var(--amber-ink, #D97706)' }}>{metrics.groupsCount}</span>
                <span className="tiny mut">categories</span>
              </div>
            </div>

            {/* Products Table Card */}
            <div className="products-table-card">
              <div className="products-table-scroll">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name &amp; Description</th>
                      <th>Source</th>
                      <th>Group</th>
                      <th>UOM</th>
                      <th>Sellable</th>
                      <th>Status</th>
                      {canManage && <th style={{ textAlign: 'right', width: 90 }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr
                        key={p.id}
                        className="hov"
                        style={{ cursor: canManage ? 'pointer' : 'default' }}
                        onClick={() => canManage && openEditProduct(p)}
                      >
                        <td>
                          <b className="mono" style={{ color: '#007A65' }}>{p.sku}</b>
                        </td>
                        <td style={{ maxWidth: 320, minWidth: 200 }}>
                          <b style={{ display: 'block', color: 'var(--ink)' }}>{p.name}</b>
                          {p.description && (
                            <div
                              className="tiny mut"
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 300,
                              }}
                              title={p.description}
                            >
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td>
                          {p.source === 'sap_b1' ? (
                            <span className="product-chip brand">SAP B1 · {p.erp_item_code || 'Synced'}</span>
                          ) : (
                            <span className="product-chip">Company</span>
                          )}
                        </td>
                        <td>
                          {p.product_group_name ? (
                            <span className="chip">{p.product_group_name}</span>
                          ) : (
                            <span className="tiny mut">—</span>
                          )}
                        </td>
                        <td>
                          <span className="mono tiny">{p.uom || '—'}</span>
                        </td>
                        <td>
                          {p.is_sellable ? (
                            <span className="product-chip ok">✓ Sellable</span>
                          ) : (
                            <span className="product-chip risk">No</span>
                          )}
                        </td>
                        <td>
                          {p.is_active ? (
                            <span className="product-chip ok">🟢 Active</span>
                          ) : (
                            <span className="product-chip risk">🔴 Inactive</span>
                          )}
                        </td>
                        {canManage && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn ghost"
                              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 14 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditProduct(p)
                              }}
                              title="Edit product"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={canManage ? 8 : 7} className="tiny mut" style={{ textAlign: 'center', padding: 24 }}>
                          No matching products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Centered Frosted Glass "Add New Product" Modal */}
            {showNewProduct && (
              <div className="products-modal-overlay" onClick={() => !submitting && setShowNewProduct(false)}>
                <div className="products-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="products-modal-header">
                    <div className="products-modal-title-row">
                      <div className="products-modal-icon-badge">📦</div>
                      <div>
                        <h3>Add New Product</h3>
                        <span className="tiny mut">Add a new item to your product catalog</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="products-modal-close"
                      onClick={() => !submitting && setShowNewProduct(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={createProduct}>
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

                    <div className="fld" style={{ border: 0, marginBottom: 14 }}>
                      <span className="products-modal-label">Source</span>
                      {companySource === 'standalone' ? (
                        <div className="tiny mut">Standalone company — product is saved locally.</div>
                      ) : (
                        <div className="products-source-toggle" style={{ marginTop: 4 }}>
                          <button
                            type="button"
                            className={`btn ${form.source === 'company' ? 'pri' : 'ghost'}`}
                            onClick={() => setForm({ ...form, source: 'company' })}
                            disabled={submitting}
                          >
                            My company
                          </button>
                          <button
                            type="button"
                            className={`btn ${form.source === 'sap_b1' ? 'pri' : 'ghost'}`}
                            onClick={() => setForm({ ...form, source: 'sap_b1' })}
                            disabled={submitting}
                          >
                            SAP B1
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="products-modal-form-grid">
                      <div>
                        <label className="products-modal-label">SKU *</label>
                        <input
                          required
                          value={form.sku}
                          onChange={(e) => {
                            setForm({ ...form, sku: e.target.value })
                            if (modalError) setModalError(null)
                          }}
                          placeholder="e.g. PRD-001"
                          className="products-modal-input"
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Product Name *</label>
                        <input
                          required
                          value={form.name}
                          onChange={(e) => {
                            setForm({ ...form, name: e.target.value })
                            if (modalError) setModalError(null)
                          }}
                          placeholder="e.g. Industrial Servo Motor"
                          className="products-modal-input"
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Unit of Measure (UOM)</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select UOM —' },
                            ...uoms.map((u) => ({ value: u.code, label: u.code })),
                          ]}
                          value={form.uom}
                          onChange={(val) => setForm({ ...form, uom: val })}
                          className="products-modal-custom-select"
                        />
                        {!showNewUom ? (
                          <span className="tiny products-link" onClick={() => setShowNewUom(true)} style={{ marginTop: 4 }}>
                            ＋ New UOM
                          </span>
                        ) : (
                          <div className="rowx" style={{ gap: 6, marginTop: 4 }}>
                            <input value={newUomCode} onChange={(e) => setNewUomCode(e.target.value)} placeholder="e.g. BOX" className="products-modal-input" style={{ height: 32 }} />
                            <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={createUom}>Save</button>
                            <span className="tiny products-link" onClick={() => setShowNewUom(false)}>✕</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="products-modal-label">Product Group</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select Group —' },
                            ...groups.map((g) => ({ value: g.id, label: g.name })),
                          ]}
                          value={form.product_group_id}
                          onChange={(val) => setForm({ ...form, product_group_id: val })}
                          className="products-modal-custom-select"
                        />
                        {!showNewGroup ? (
                          <span className="tiny products-link" onClick={() => setShowNewGroup(true)} style={{ marginTop: 4 }}>
                            ＋ New Group
                          </span>
                        ) : (
                          <div className="rowx" style={{ gap: 6, marginTop: 4 }}>
                            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" className="products-modal-input" style={{ height: 32 }} />
                            <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={createGroup}>Save</button>
                            <span className="tiny products-link" onClick={() => setShowNewGroup(false)}>✕</span>
                          </div>
                        )}
                      </div>

                      {form.source === 'sap_b1' && (
                        <div className="products-modal-full-width">
                          <label className="products-modal-label">ERP Item Code *</label>
                          <input
                            required
                            value={form.erp_item_code}
                            onChange={(e) => setForm({ ...form, erp_item_code: e.target.value })}
                            placeholder="SAP B1 ItemCode"
                            className="products-modal-input"
                            disabled={submitting}
                          />
                        </div>
                      )}

                      <div className="products-modal-full-width">
                        <label className="products-modal-label">Description</label>
                        <input
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Short description or technical specs..."
                          className="products-modal-input"
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Sellable</label>
                        <CustomSelect
                          options={[
                            { value: true, label: '✓ Sellable on Quotes' },
                            { value: false, label: '✕ Not Sellable' },
                          ]}
                          value={form.is_sellable}
                          onChange={(val) => setForm({ ...form, is_sellable: val })}
                          className="products-modal-custom-select"
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Status</label>
                        <CustomSelect
                          options={[
                            { value: true, label: '🟢 Active' },
                            { value: false, label: '🔴 Inactive' },
                          ]}
                          value={form.is_active}
                          onChange={(val) => setForm({ ...form, is_active: val })}
                          className="products-modal-custom-select"
                        />
                      </div>
                    </div>

                    <div className="products-modal-actions">
                      <button
                        type="button"
                        className="btn ghost products-modal-cancel-btn"
                        onClick={() => setShowNewProduct(false)}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn pri products-modal-submit-btn"
                        disabled={submitting || !form.sku.trim() || !form.name.trim()}
                      >
                        {submitting ? 'Creating…' : 'Create product ✓'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Centered Frosted Glass "Edit Product" Modal */}
            {editingProduct && (
              <div className="products-modal-overlay" onClick={() => !editSubmitting && setEditingProduct(null)}>
                <div className="products-modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="products-modal-header">
                    <div className="products-modal-title-row">
                      <div className="products-modal-icon-badge">✏️</div>
                      <div>
                        <h3>Edit Product</h3>
                        <span className="tiny mut">Update product details · {editingProduct.sku}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="products-modal-close"
                      onClick={() => !editSubmitting && setEditingProduct(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={updateProduct}>
                    {editModalError && (
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
                        <span>{editModalError}</span>
                      </div>
                    )}

                    <div className="fld" style={{ border: 0, marginBottom: 14 }}>
                      <span className="products-modal-label">Source</span>
                      <div style={{ marginTop: 4 }}>
                        <span className={`product-chip ${editForm.source === 'sap_b1' ? 'brand' : ''}`}>
                          {editForm.source === 'sap_b1' ? `SAP B1 · ${editForm.erp_item_code || 'Synced'}` : 'Company Local'}
                        </span>
                      </div>
                    </div>

                    <div className="products-modal-form-grid">
                      <div>
                        <label className="products-modal-label">SKU *</label>
                        <input
                          required
                          value={editForm.sku}
                          onChange={(e) => {
                            setEditForm({ ...editForm, sku: e.target.value })
                            if (editModalError) setEditModalError(null)
                          }}
                          placeholder="e.g. PRD-001"
                          className="products-modal-input"
                          disabled={editSubmitting}
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Product Name *</label>
                        <input
                          required
                          value={editForm.name}
                          onChange={(e) => {
                            setEditForm({ ...editForm, name: e.target.value })
                            if (editModalError) setEditModalError(null)
                          }}
                          placeholder="e.g. Industrial Servo Motor"
                          className="products-modal-input"
                          disabled={editSubmitting}
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Unit of Measure (UOM)</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select UOM —' },
                            ...uoms.map((u) => ({ value: u.code, label: u.code })),
                          ]}
                          value={editForm.uom}
                          onChange={(val) => setEditForm({ ...editForm, uom: val })}
                          className="products-modal-custom-select"
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Product Group</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select Group —' },
                            ...groups.map((g) => ({ value: g.id, label: g.name })),
                          ]}
                          value={editForm.product_group_id}
                          onChange={(val) => setEditForm({ ...editForm, product_group_id: val })}
                          className="products-modal-custom-select"
                        />
                      </div>

                      {editForm.source === 'sap_b1' && (
                        <div className="products-modal-full-width">
                          <label className="products-modal-label">ERP Item Code</label>
                          <input
                            value={editForm.erp_item_code}
                            onChange={(e) => setEditForm({ ...editForm, erp_item_code: e.target.value })}
                            placeholder="SAP B1 ItemCode"
                            className="products-modal-input"
                            disabled={editSubmitting}
                          />
                        </div>
                      )}

                      <div className="products-modal-full-width">
                        <label className="products-modal-label">Description</label>
                        <input
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Short description or technical specs..."
                          className="products-modal-input"
                          disabled={editSubmitting}
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Sellable</label>
                        <CustomSelect
                          options={[
                            { value: true, label: '✓ Sellable on Quotes' },
                            { value: false, label: '✕ Not Sellable' },
                          ]}
                          value={editForm.is_sellable}
                          onChange={(val) => setEditForm({ ...editForm, is_sellable: val })}
                          className="products-modal-custom-select"
                        />
                      </div>

                      <div>
                        <label className="products-modal-label">Status</label>
                        <CustomSelect
                          options={[
                            { value: true, label: '🟢 Active' },
                            { value: false, label: '🔴 Inactive' },
                          ]}
                          value={editForm.is_active}
                          onChange={(val) => setEditForm({ ...editForm, is_active: val })}
                          className="products-modal-custom-select"
                        />
                      </div>
                    </div>

                    <div className="products-modal-actions">
                      <button
                        type="button"
                        className="btn ghost products-modal-cancel-btn"
                        onClick={() => setEditingProduct(null)}
                        disabled={editSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn pri products-modal-submit-btn"
                        disabled={editSubmitting || !editForm.sku.trim() || !editForm.name.trim()}
                      >
                        {editSubmitting ? 'Saving changes…' : 'Save Changes ✓'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: PRICE LISTS */}
        {tab === 'pricelists' && (
          <div className="products-pricelists-split">
            {/* Left: Price Lists selector */}
            <div className="products-table-card" style={{ padding: 16 }}>
              <div className="rowx sp" style={{ marginBottom: 12 }}>
                <b style={{ font: '700 13.5px var(--d)' }}>Price Lists ({priceLists.length})</b>
                {canManage && (
                  <button
                    type="button"
                    className="btn pri"
                    style={{ padding: '5px 12px', borderRadius: 16, fontSize: 12 }}
                    onClick={() => {
                      setPlForm({ name: '', currency: currencies[0]?.code || 'INR' })
                      setPlModalError(null)
                      setShowNewCurrency(false)
                      setShowNewPriceList(true)
                    }}
                  >
                    ＋ New
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {priceLists.map((pl) => {
                  const isSel = selectedPriceList?.id === pl.id
                  return (
                    <div
                      key={pl.id}
                      className={`products-pl-item ${isSel ? 'selected' : ''}`}
                      onClick={() => selectPriceList(pl)}
                    >
                      <div>
                        <b>{pl.name}</b>
                        <div className="tiny mut">{pl.currency}</div>
                      </div>
                      {!pl.is_active && <span className="product-chip risk">inactive</span>}
                    </div>
                  )
                })}
                {priceLists.length === 0 && (
                  <div className="tiny mut" style={{ padding: 12 }}>No price lists found.</div>
                )}
              </div>
            </div>

            {/* Right: Selected Price List Items */}
            <div className="products-table-card" style={{ padding: 18 }}>
              {!selectedPriceList ? (
                <div className="tiny mut" style={{ padding: 24, textAlign: 'center' }}>
                  Select a price list from the left panel to view and set item prices.
                </div>
              ) : (
                <>
                  <div className="rowx sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <div>
                      <b style={{ font: '800 17px var(--d)', color: 'var(--ink)' }}>{selectedPriceList.name}</b>
                      <span className="tiny mut" style={{ marginLeft: 8 }}>({selectedPriceList.currency})</span>
                    </div>
                    <div className="rowx" style={{ gap: 10, alignItems: 'center' }}>
                      <span className="chip ok" style={{ font: '600 12px var(--m)' }}>
                        {priceItems.length} priced items
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          className="btn pri"
                          style={{
                            borderRadius: 20,
                            padding: '7px 18px',
                            font: '700 12.5px var(--b)',
                            background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                            color: '#FFFFFF',
                            boxShadow: '0 4px 12px rgba(0, 201, 167, 0.35)',
                          }}
                          onClick={() => {
                            setPickerSearch('')
                            setPickerGroupFilter('all')
                            setSelectedPickerProduct(null)
                            setPickerUnitPrice('')
                            setPickerSuccessMsg(null)
                            setPickerErrorMsg(null)
                            setShowPricePickerModal(true)
                          }}
                        >
                          ＋ Set / Update Product Price
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search Bar for Priced Items */}
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="settings-search-box" style={{ flex: 1, maxWidth: 360, height: 38 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        className="settings-search-input"
                        placeholder="Search priced items by SKU or name..."
                        value={pricedSearch}
                        onChange={(e) => setPricedSearch(e.target.value)}
                      />
                      {pricedSearch && (
                        <span style={{ cursor: 'pointer', color: 'var(--mut)', fontSize: 13 }} onClick={() => setPricedSearch('')}>
                          ✕
                        </span>
                      )}
                    </div>
                    {pricedSearch && (
                      <span className="tiny mut">Showing {filteredPricedItems.length} of {priceItems.length}</span>
                    )}
                  </div>

                  <div className="products-table-scroll" style={{ maxHeight: 'calc(100vh - 310px)' }}>
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th style={{ width: 130 }}>SKU</th>
                          <th>Product Name</th>
                          <th className="num" style={{ width: 170 }}>Unit Price ({selectedPriceList.currency})</th>
                          {canManage && <th style={{ textAlign: 'right', width: 90 }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPricedItems.map((it) => (
                          <tr key={it.product_id} className="hov">
                            <td className="mono" style={{ color: '#007A65', fontWeight: 600 }}>
                              {it.product_sku}
                            </td>
                            <td style={{ maxWidth: 320, minWidth: 200 }}>
                              <b style={{ display: 'block', color: 'var(--ink)' }}>{it.product_name}</b>
                            </td>
                            <td className="num mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                              {Number(it.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {canManage && (
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn ghost"
                                  style={{ padding: '4px 10px', fontSize: 11.5, borderRadius: 12 }}
                                  onClick={() => openEditPriceForItem(it)}
                                  title="Edit price"
                                >
                                  ✏️ Edit
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {priceItems.length === 0 && (
                          <tr>
                            <td colSpan={canManage ? 4 : 3} className="tiny mut" style={{ textAlign: 'center', padding: 32 }}>
                              No prices set on this price list yet. Click <b>"＋ Set / Update Product Price"</b> to begin.
                            </td>
                          </tr>
                        )}
                        {priceItems.length > 0 && filteredPricedItems.length === 0 && (
                          <tr>
                            <td colSpan={canManage ? 4 : 3} className="tiny mut" style={{ textAlign: 'center', padding: 24 }}>
                              No priced items matching "{pricedSearch}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Centered Frosted Glass Create Price List Modal */}
        {canManage && showNewPriceList && (
          <div
            className="masters-modal-overlay"
            onClick={() => !plSubmitting && setShowNewPriceList(false)}
          >
            <div className="masters-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="masters-modal-header">
                <div className="masters-modal-title-row">
                  <div className="masters-modal-icon-badge">🏷️</div>
                  <div>
                    <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>New Price List</h3>
                    <span className="tiny mut">Define a new price list with custom currency</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="products-modal-close"
                  onClick={() => !plSubmitting && setShowNewPriceList(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={createPriceList}>
                {plModalError && (
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
                    <span>{plModalError}</span>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label className="masters-modal-label">Price List Name *</label>
                  <input
                    required
                    autoFocus
                    placeholder="e.g. Standard Wholesale, Retail 2026, VIP Corporate"
                    className="masters-modal-input"
                    value={plForm.name}
                    onChange={(e) => {
                      setPlForm({ ...plForm, name: e.target.value })
                      if (plModalError) setPlModalError(null)
                    }}
                    disabled={plSubmitting}
                  />
                  <span className="tiny mut" style={{ display: 'block', marginTop: 6 }}>
                    Unique name identifying this pricing structure
                  </span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="masters-modal-label">Currency *</label>
                  <CustomSelect
                    options={currencies.map((c) => ({ value: c.code, label: c.code }))}
                    value={plForm.currency}
                    onChange={(val) => setPlForm({ ...plForm, currency: val })}
                    className="products-modal-custom-select"
                  />
                  {!showNewCurrency ? (
                    <span
                      className="tiny products-link"
                      onClick={() => setShowNewCurrency(true)}
                      style={{ marginTop: 6, display: 'inline-block', cursor: 'pointer' }}
                    >
                      ＋ New currency
                    </span>
                  ) : (
                    <div className="rowx" style={{ gap: 6, marginTop: 8 }}>
                      <input
                        value={newCurrencyCode}
                        onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                        placeholder="e.g. USD"
                        className="masters-modal-input"
                        style={{ height: 34, width: 100, textTransform: 'uppercase' }}
                        maxLength={3}
                        disabled={plSubmitting}
                      />
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '4px 12px', fontSize: 12, borderRadius: 14 }}
                        onClick={createCurrency}
                        disabled={plSubmitting || !newCurrencyCode.trim()}
                      >
                        Save
                      </button>
                      <span
                        className="tiny products-link"
                        onClick={() => setShowNewCurrency(false)}
                        style={{ cursor: 'pointer', padding: '0 4px' }}
                      >
                        ✕
                      </span>
                    </div>
                  )}
                </div>

                <div className="masters-modal-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: '10px 22px', borderRadius: 20 }}
                    onClick={() => setShowNewPriceList(false)}
                    disabled={plSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn pri masters-modal-submit-btn"
                    disabled={plSubmitting || !plForm.name.trim()}
                  >
                    {plSubmitting ? 'Creating…' : 'Create Price List ✓'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dedicated "Set / Update Product Price" Modal */}
        {showPricePickerModal && selectedPriceList && (
          <div
            className="products-modal-overlay"
            onClick={() => !pickerSaving && setShowPricePickerModal(false)}
          >
            <div
              className="products-modal-card price-picker-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="products-modal-header">
                <div className="products-modal-title-row">
                  <div className="products-modal-icon-badge">💰</div>
                  <div>
                    <h3 style={{ margin: 0, font: '800 18px var(--d)', color: 'var(--ink)' }}>
                      Set Product Price · {selectedPriceList.name}
                    </h3>
                    <span className="tiny mut">
                      Search &amp; filter among {products.length} products to assign pricing in {selectedPriceList.currency}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="products-modal-close"
                  onClick={() => !pickerSaving && setShowPricePickerModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* Filter Strip */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
                {/* Search Box */}
                <div className="settings-search-box" style={{ flex: '1 1 240px', minWidth: 220, height: 38 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="settings-search-input"
                    placeholder="Search by SKU, name, specs..."
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

                {/* Group Filter */}
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

                <span className="tiny mut" style={{ marginLeft: 'auto' }}>
                  Showing {filteredPickerProducts.length} results
                </span>
              </div>

              {/* Products Table */}
              <div className="price-picker-table-scroll">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                      <th style={{ width: 130 }}>SKU</th>
                      <th>Product Name</th>
                      <th>Group</th>
                      <th style={{ width: 80 }}>UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPickerProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--mut)' }}>
                          No products matching your search/filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPickerProducts.map((p) => {
                        const isSelected = selectedPickerProduct?.id === p.id
                        return (
                          <tr
                            key={p.id}
                            className={`price-picker-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectPickerProduct(p)}
                          >
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="radio"
                                name="selectedPickerProd"
                                checked={isSelected}
                                onChange={() => handleSelectPickerProduct(p)}
                                style={{ cursor: 'pointer' }}
                              />
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
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action Bar */}
              <div className="price-picker-bottom-bar">
                {pickerSuccessMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(0, 201, 167, 0.12)', border: '1px solid rgba(0, 201, 167, 0.3)', color: '#00A68A', fontSize: 12.5, fontWeight: 600 }}>
                    ✓ {pickerSuccessMsg}
                  </div>
                )}

                {pickerErrorMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', fontSize: 12.5 }}>
                    ⚠ {pickerErrorMsg}
                  </div>
                )}

                {selectedPickerProduct ? (
                  <form onSubmit={handleSavePickerPrice} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <div>
                      <span className="tiny mut" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                        Selected Product
                      </span>
                      <b style={{ font: '700 14px var(--d)', color: 'var(--ink)' }}>
                        {selectedPickerProduct.sku} — {selectedPickerProduct.name}
                      </b>
                      {selectedPickerProduct.uom && (
                        <span className="mono tiny mut" style={{ marginLeft: 6 }}>({selectedPickerProduct.uom})</span>
                      )}
                    </div>

                    <div className="rowx" style={{ gap: 10, alignItems: 'center' }}>
                      <div>
                        <label className="tiny mut" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                          Unit Price ({selectedPriceList.currency}) *
                        </label>
                        <input
                          required
                          autoFocus
                          type="number"
                          step="0.01"
                          min="0"
                          value={pickerUnitPrice}
                          onChange={(e) => {
                            setPickerUnitPrice(e.target.value)
                            if (pickerErrorMsg) setPickerErrorMsg(null)
                          }}
                          placeholder={`0.00 in ${selectedPriceList.currency}`}
                          className="products-modal-input"
                          style={{ width: 170, height: 38 }}
                          disabled={pickerSaving}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn pri"
                        style={{
                          borderRadius: 20,
                          padding: '10px 22px',
                          fontWeight: 700,
                          marginTop: 18,
                          background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                          boxShadow: '0 4px 14px rgba(0, 201, 167, 0.35)',
                        }}
                        disabled={pickerSaving || pickerUnitPrice === ''}
                      >
                        {pickerSaving ? 'Saving…' : 'Set Price ✓'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '8px', color: 'var(--mut)', font: '500 13px var(--b)' }}>
                    👆 Click any product from the catalog table above to set or edit its unit price
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '8px 20px', borderRadius: 18 }}
                  onClick={() => setShowPricePickerModal(false)}
                  disabled={pickerSaving}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
