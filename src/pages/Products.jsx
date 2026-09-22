import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { productsApi, productGroupsApi, uomsApi } from '../api/endpoints'
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
  const { isCompanyAdmin, isSuperAdmin, can } = useAuth()
  const canManage = isCompanyAdmin || isSuperAdmin || can('PRODUCTS', 'create')
  const companyId = currentCompanyId()


  // Products state
  const [products, setProducts] = useState([])
  const [groups, setGroups] = useState([])
  const [uoms, setUoms] = useState([])
  const [companySource, setCompanySource] = useState('standalone')
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_PRODUCT)
  const [editModalError, setEditModalError] = useState(null)
  const [editFieldErrors, setEditFieldErrors] = useState({})
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


function loadCatalog() {
    if (!companyId) return
    productsApi.list(companyId).then(setProducts).catch((e) => console.error('Failed to load products:', e))
    productGroupsApi.list().then(setGroups).catch((e) => console.error('Failed to load product groups:', e))
    uomsApi.list().then(setUoms).catch((e) => console.error('Failed to load UOMs:', e))
    productsApi.companySource().then(setCompanySource).catch(() => {})
  }

  useEffect(loadCatalog, [companyId])

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


  async function createProduct(e) {
    e.preventDefault()
    const trimmedSku = form.sku.trim()
    const trimmedName = form.name.trim()
    const uomVal = form.uom ? String(form.uom).trim() : ''
    const groupIdVal = form.product_group_id ? String(form.product_group_id).trim() : ''

    const errors = {}
    const missing = []

    if (!trimmedSku) {
      errors.sku = true
      missing.push('SKU')
    }
    if (!trimmedName) {
      errors.name = true
      missing.push('Product Name')
    }
    if (!uomVal) {
      errors.uom = true
      missing.push('Unit of Measure (UOM)')
    }
    if (!groupIdVal) {
      errors.product_group_id = true
      missing.push('Product Group')
    }

    if (missing.length > 0) {
      setFieldErrors(errors)
      setModalError(
        missing.length === 1
          ? `${missing[0]} is mandatory.`
          : `Please fill in all mandatory fields: ${missing.join(', ')}.`
      )
      return
    }

    // Pre-check for duplicate SKU locally
    if (products.some((p) => (p.sku || '').toLowerCase() === trimmedSku.toLowerCase())) {
      setFieldErrors({ sku: true })
      setModalError(`A product with SKU "${trimmedSku}" already exists.`)
      return
    }

    setSubmitting(true)
    setModalError(null)
    setFieldErrors({})
    try {
      await productsApi.create(companyId, {
        ...form,
        sku: trimmedSku,
        name: trimmedName,
        uom: uomVal,
        product_group_id: groupIdVal,
      })
      setForm(EMPTY_PRODUCT)
      setShowNewProduct(false)
      setModalError(null)
      setFieldErrors({})
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
    setEditFieldErrors({})
  }

  async function updateProduct(e) {
    e.preventDefault()
    if (!editingProduct) return
    const trimmedSku = editForm.sku.trim()
    const trimmedName = editForm.name.trim()
    const uomVal = editForm.uom ? String(editForm.uom).trim() : ''
    const groupIdVal = editForm.product_group_id ? String(editForm.product_group_id).trim() : ''

    const errors = {}
    const missing = []

    if (!trimmedSku) {
      errors.sku = true
      missing.push('SKU')
    }
    if (!trimmedName) {
      errors.name = true
      missing.push('Product Name')
    }
    if (!uomVal) {
      errors.uom = true
      missing.push('Unit of Measure (UOM)')
    }
    if (!groupIdVal) {
      errors.product_group_id = true
      missing.push('Product Group')
    }

    if (missing.length > 0) {
      setEditFieldErrors(errors)
      setEditModalError(
        missing.length === 1
          ? `${missing[0]} is mandatory.`
          : `Please fill in all mandatory fields: ${missing.join(', ')}.`
      )
      return
    }

    // Pre-check for duplicate SKU locally on other products
    if (
      trimmedSku.toLowerCase() !== (editingProduct.sku || '').toLowerCase() &&
      products.some((p) => p.id !== editingProduct.id && (p.sku || '').toLowerCase() === trimmedSku.toLowerCase())
    ) {
      setEditFieldErrors({ sku: true })
      setEditModalError(`A product with SKU "${trimmedSku}" already exists.`)
      return
    }

    setEditSubmitting(true)
    setEditModalError(null)
    setEditFieldErrors({})
    try {
      await productsApi.update(editingProduct.id, {
        ...editForm,
        sku: trimmedSku,
        name: trimmedName,
        uom: uomVal,
        product_group_id: groupIdVal,
      })
      setEditingProduct(null)
      setEditModalError(null)
      setEditFieldErrors({})
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
            <h2>Product Catalog</h2>
            <span className="goal">
              {canManage
                ? 'Manage products, groups, and units of measure.'
                : 'Browse the product catalog.'}
            </span>
          </div>
        </div>

        {/* Products Catalog */}
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
                    setFieldErrors({})
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

                  <form onSubmit={createProduct} noValidate>
                    {modalError && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 14,
                          background: 'rgba(236, 105, 105, 0.12)',
                          border: '1.5px solid rgba(236, 105, 105, 0.35)',
                          color: '#ec6969',
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
                          value={form.sku}
                          onChange={(e) => {
                            setForm({ ...form, sku: e.target.value })
                            if (fieldErrors.sku) setFieldErrors((prev) => ({ ...prev, sku: false }))
                            if (modalError) setModalError(null)
                          }}
                          placeholder="e.g. PRD-001"
                          className={`products-modal-input ${fieldErrors.sku ? 'error' : ''}`}
                          disabled={submitting}
                        />
                        {fieldErrors.sku && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            SKU is mandatory
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="products-modal-label">Product Name *</label>
                        <input
                          value={form.name}
                          onChange={(e) => {
                            setForm({ ...form, name: e.target.value })
                            if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: false }))
                            if (modalError) setModalError(null)
                          }}
                          placeholder="e.g. Industrial Servo Motor"
                          className={`products-modal-input ${fieldErrors.name ? 'error' : ''}`}
                          disabled={submitting}
                        />
                        {fieldErrors.name && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            Product name is mandatory
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="products-modal-label">Unit of Measure (UOM) *</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select UOM —' },
                            ...uoms.map((u) => ({ value: u.code, label: u.code })),
                          ]}
                          value={form.uom}
                          onChange={(val) => {
                            setForm({ ...form, uom: val })
                            if (fieldErrors.uom) setFieldErrors((prev) => ({ ...prev, uom: false }))
                            if (modalError) setModalError(null)
                          }}
                          className={`products-modal-custom-select ${fieldErrors.uom ? 'error' : ''}`}
                        />
                        {fieldErrors.uom && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            Unit of measure is mandatory
                          </span>
                        )}
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
                        <label className="products-modal-label">Product Group *</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select Group —' },
                            ...groups.map((g) => ({ value: g.id, label: g.name })),
                          ]}
                          value={form.product_group_id}
                          onChange={(val) => {
                            setForm({ ...form, product_group_id: val })
                            if (fieldErrors.product_group_id) setFieldErrors((prev) => ({ ...prev, product_group_id: false }))
                            if (modalError) setModalError(null)
                          }}
                          className={`products-modal-custom-select ${fieldErrors.product_group_id ? 'error' : ''}`}
                        />
                        {fieldErrors.product_group_id && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            Product group is mandatory
                          </span>
                        )}
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
                        disabled={submitting}
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

                  <form onSubmit={updateProduct} noValidate>
                    {editModalError && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 14,
                          background: 'rgba(236, 105, 105, 0.12)',
                          border: '1.5px solid rgba(236, 105, 105, 0.35)',
                          color: '#ec6969',
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
                          value={editForm.sku}
                          onChange={(e) => {
                            setEditForm({ ...editForm, sku: e.target.value })
                            if (editFieldErrors.sku) setEditFieldErrors((prev) => ({ ...prev, sku: false }))
                            if (editModalError) setEditModalError(null)
                          }}
                          placeholder="e.g. PRD-001"
                          className={`products-modal-input ${editFieldErrors.sku ? 'error' : ''}`}
                          disabled={editSubmitting}
                        />
                        {editFieldErrors.sku && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            SKU is mandatory
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="products-modal-label">Product Name *</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => {
                            setEditForm({ ...editForm, name: e.target.value })
                            if (editFieldErrors.name) setEditFieldErrors((prev) => ({ ...prev, name: false }))
                            if (editModalError) setEditModalError(null)
                          }}
                          placeholder="e.g. Industrial Servo Motor"
                          className={`products-modal-input ${editFieldErrors.name ? 'error' : ''}`}
                          disabled={editSubmitting}
                        />
                        {editFieldErrors.name && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            Product name is mandatory
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="products-modal-label">Unit of Measure (UOM) *</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select UOM —' },
                            ...uoms.map((u) => ({ value: u.code, label: u.code })),
                          ]}
                          value={editForm.uom}
                          onChange={(val) => {
                            setEditForm({ ...editForm, uom: val })
                            if (editFieldErrors.uom) setEditFieldErrors((prev) => ({ ...prev, uom: false }))
                            if (editModalError) setEditModalError(null)
                          }}
                          className={`products-modal-custom-select ${editFieldErrors.uom ? 'error' : ''}`}
                        />
                        {editFieldErrors.uom && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            Unit of measure is mandatory
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="products-modal-label">Product Group *</label>
                        <CustomSelect
                          options={[
                            { value: '', label: '— Select Group —' },
                            ...groups.map((g) => ({ value: g.id, label: g.name })),
                          ]}
                          value={editForm.product_group_id}
                          onChange={(val) => {
                            setEditForm({ ...editForm, product_group_id: val })
                            if (editFieldErrors.product_group_id) setEditFieldErrors((prev) => ({ ...prev, product_group_id: false }))
                            if (editModalError) setEditModalError(null)
                          }}
                          className={`products-modal-custom-select ${editFieldErrors.product_group_id ? 'error' : ''}`}
                        />
                        {editFieldErrors.product_group_id && (
                          <span className="tiny" style={{ color: '#ec6969', marginTop: 4, display: 'block', fontWeight: 500 }}>
                            Product group is mandatory
                          </span>
                        )}
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
                        disabled={editSubmitting}
                      >
                        {editSubmitting ? 'Saving changes…' : 'Save Changes ✓'}
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
