import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import CustomSelect from '../components/CustomSelect'
import { priceListsApi, currenciesApi, productsApi, productGroupsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import '../styles/Products.css'
import '../styles/Masters.css'

export default function ProductPriceList() {
  const navigate = useNavigate()
  const { isCompanyAdmin, isSuperAdmin, can } = useAuth()
  const companyId = currentCompanyId()

  // Permissions based on Role Management PRICE_LISTS module
  const canView = isCompanyAdmin || isSuperAdmin || can('PRICE_LISTS', 'view')
  const canCreate = isCompanyAdmin || isSuperAdmin || can('PRICE_LISTS', 'create')
  const canEdit = isCompanyAdmin || isSuperAdmin || can('PRICE_LISTS', 'edit')
  const canDelete = isCompanyAdmin || isSuperAdmin || can('PRICE_LISTS', 'delete')

  // Price Lists state
  const [priceLists, setPriceLists] = useState([])
  const [currencies, setCurrencies] = useState([])
  const [selectedPriceList, setSelectedPriceList] = useState(null)
  const [priceItems, setPriceItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters & Search
  const [priceListSearch, setPriceListSearch] = useState('')
  const [pricedSearch, setPricedSearch] = useState('')

  // Create Price List Modal
  const [showNewPriceList, setShowNewPriceList] = useState(false)
  const [plForm, setPlForm] = useState({ name: '', currency: 'INR' })
  const [plModalError, setPlModalError] = useState(null)
  const [plSubmitting, setPlSubmitting] = useState(false)
  const [showNewCurrency, setShowNewCurrency] = useState(false)
  const [newCurrencyCode, setNewCurrencyCode] = useState('')

  // Set / Update Product Price Modal
  const [showPricePickerModal, setShowPricePickerModal] = useState(false)
  const [catalogProducts, setCatalogProducts] = useState([])
  const [groups, setGroups] = useState([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerGroupFilter, setPickerGroupFilter] = useState('all')
  const [selectedPickerProduct, setSelectedPickerProduct] = useState(null)
  const [pickerUnitPrice, setPickerUnitPrice] = useState('')
  const [pickerSaving, setPickerSaving] = useState(false)
  const [pickerSuccessMsg, setPickerSuccessMsg] = useState(null)
  const [pickerErrorMsg, setPickerErrorMsg] = useState(null)

  // Delete Price Item state
  const [deletingItemId, setDeletingItemId] = useState(null)

  function loadPriceLists() {
    if (!companyId) return
    setLoading(true)
    setError(null)
    priceListsApi
      .list(companyId)
      .then((pls) => {
        const list = Array.isArray(pls) ? pls : []
        setPriceLists(list)
        if (list.length > 0) {
          // If none selected or previous selection no longer exists, select first
          setSelectedPriceList((prev) => {
            if (!prev) return list[0]
            const stillExists = list.find((p) => p.id === prev.id)
            return stillExists || list[0]
          })
        } else {
          setSelectedPriceList(null)
        }
      })
      .catch((err) => {
        console.error('Failed to load price lists:', err)
        setError('Failed to load price lists. Please try again.')
      })
      .finally(() => setLoading(false))

    currenciesApi.list().then(setCurrencies).catch(() => {})
  }

  function loadCatalog() {
    if (!companyId) return
    productsApi.list(companyId).then((prods) => {
      setCatalogProducts(Array.isArray(prods) ? prods : [])
    }).catch(() => {})
    productGroupsApi.list().then((g) => {
      setGroups(Array.isArray(g) ? g : [])
    }).catch(() => {})
  }

  useEffect(() => {
    if (canView) {
      loadPriceLists()
      loadCatalog()
    }
  }, [companyId, canView])

  function loadPriceItems(priceListId) {
    if (!priceListId) {
      setPriceItems([])
      return
    }
    priceListsApi
      .items(priceListId)
      .then((items) => setPriceItems(Array.isArray(items) ? items : []))
      .catch((err) => {
        console.error('Failed to load price list items:', err)
        setPriceItems([])
      })
  }

  useEffect(() => {
    if (selectedPriceList?.id) {
      loadPriceItems(selectedPriceList.id)
    } else {
      setPriceItems([])
    }
  }, [selectedPriceList?.id])

  function selectPriceList(pl) {
    setSelectedPriceList(pl)
    setPricedSearch('')
  }

  async function createCurrency(e) {
    e.preventDefault()
    const code = newCurrencyCode.trim().toUpperCase()
    if (!code) return
    try {
      const c = await currenciesApi.create({ code })
      setCurrencies((prev) => [...prev, c].sort((a, b) => a.code.localeCompare(b.code)))
      setPlForm((f) => ({ ...f, currency: c.code }))
      setNewCurrencyCode('')
      setShowNewCurrency(false)
    } catch (err) {
      console.error('Failed to create currency:', err)
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
      setSelectedPriceList(created)
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

  async function handleDeletePriceList(pl, e) {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete price list "${pl.name}"?`)) return
    try {
      if (priceListsApi.remove) {
        await priceListsApi.remove(pl.id)
      }
      loadPriceLists()
      if (selectedPriceList?.id === pl.id) {
        setSelectedPriceList(null)
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete price list')
    }
  }

  const currentPriceMap = useMemo(() => {
    const map = {}
    for (const it of priceItems) {
      map[it.product_id] = it.unit_price
    }
    return map
  }, [priceItems])

  const filteredPriceLists = useMemo(() => {
    const q = priceListSearch.trim().toLowerCase()
    if (!q) return priceLists
    return priceLists.filter((pl) => {
      const name = (pl.name || '').toLowerCase()
      const curr = (pl.currency || '').toLowerCase()
      return name.includes(q) || curr.includes(q)
    })
  }, [priceLists, priceListSearch])

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
    for (let i = 0; i < catalogProducts.length; i++) {
      const p = catalogProducts[i]
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
  }, [catalogProducts, pickerSearch, pickerGroupFilter])

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
    const prod = catalogProducts.find((p) => p.id === it.product_id) || {
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

  async function handleRemovePriceItem(it) {
    if (!selectedPriceList || deletingItemId) return
    if (!window.confirm(`Remove price for "${it.product_sku} — ${it.product_name}" from ${selectedPriceList.name}?`)) {
      return
    }
    setDeletingItemId(it.product_id)
    try {
      await priceListsApi.removeItem(selectedPriceList.id, it.product_id)
      loadPriceItems(selectedPriceList.id)
    } catch (err) {
      console.error('Failed to remove price item:', err)
      alert(err?.response?.data?.detail || 'Failed to remove price item.')
    } finally {
      setDeletingItemId(null)
    }
  }

  // Access check guard
  if (!canView) {
    return (
      <AppShell>
        <div className="ikyam-mock masters-page" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🔒</div>
          <h2 style={{ font: '800 22px var(--d)', color: 'var(--ink)' }}>Access Restricted</h2>
          <p className="tiny mut" style={{ maxWidth: 440, margin: '10px auto 22px', fontSize: 13, lineHeight: 1.5 }}>
            You do not have permission to view Price Lists. Please contact your company administrator to grant you the <b>PRICE_LISTS</b> View permission.
          </p>
          <button className="btn pri" style={{ padding: '8px 24px', borderRadius: 20 }} onClick={() => navigate('/today')}>
            Go to Home
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="ikyam-mock masters-page" style={{ overflowY: 'auto' }}>
        {/* Header */}
        <div className="scr-head">
          <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)' }}>
                Price Lists Master
              </h2>
              <div className="goal" style={{ marginTop: 2 }}>
                Manage price books, multi-currency rates, customer pricing and tiered discounts
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
            className="actchip"
            onClick={() => navigate('/currencies')}
          >
            💱 Currencies
          </button>
          <button
            type="button"
            className="actchip on"
            onClick={() => navigate('/price-lists')}
          >
            💰 Price Lists
          </button>
          <button
            type="button"
            className="actchip"
            onClick={() => navigate('/products')}
          >
            📦 Products
          </button>
        </div>

        {/* Metrics Strip */}
        <div className="masters-metrics-strip">
          <div className="masters-metric-col">
            <span className="masters-metric-label">Total Price Lists</span>
            <span className="masters-metric-num">{priceLists.length}</span>
          </div>
          <div className="masters-metric-col">
            <span className="masters-metric-label">Selected Price List</span>
            <span className="masters-metric-num" style={{ fontSize: 16, marginTop: 4, color: '#00C9A7' }}>
              {selectedPriceList ? selectedPriceList.name : '—'}
            </span>
          </div>
          <div className="masters-metric-col">
            <span className="masters-metric-label">Priced Products</span>
            <span className="masters-metric-num" style={{ color: '#0072CE' }}>
              {priceItems.length}
            </span>
          </div>
          <div className="masters-metric-col">
            <span className="masters-metric-label">Currency</span>
            <span className="masters-metric-num" style={{ fontSize: 16, marginTop: 4 }}>
              {selectedPriceList ? selectedPriceList.currency : '—'}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 14,
              background: 'rgba(236, 105, 105, 0.12)',
              border: '1.5px solid rgba(236, 105, 105, 0.35)',
              color: '#ec6969',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
            }}
          >
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Split View: Left = Price Lists, Right = Priced Items */}
        <div className="products-pricelists-split" style={{ flex: 1, minHeight: 0 }}>
          {/* Left Column: Price Lists */}
          <div className="products-table-card" style={{ padding: 16 }}>
            <div className="rowx sp" style={{ marginBottom: 12 }}>
              <b style={{ font: '700 14px var(--d)' }}>Price Lists ({priceLists.length})</b>
              {canCreate && (
                <button
                  type="button"
                  className="btn pri"
                  style={{
                    padding: '5px 14px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                    boxShadow: '0 3px 10px rgba(0, 201, 167, 0.3)',
                  }}
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

            {/* Search Price Lists */}
            {priceLists.length > 3 && (
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Filter price lists..."
                  value={priceListSearch}
                  onChange={(e) => setPriceListSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--line, #EFE4D6)',
                    background: 'var(--surface, #FFFFFF)',
                    color: 'var(--ink)',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
              {filteredPriceLists.map((pl) => {
                const isSel = selectedPriceList?.id === pl.id
                return (
                  <div
                    key={pl.id}
                    className={`products-pl-item ${isSel ? 'selected' : ''}`}
                    onClick={() => selectPriceList(pl)}
                    style={{ position: 'relative' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {pl.name}
                      </b>
                      <div className="tiny mut" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                        <span className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{pl.currency}</span>
                        {pl.is_active === false && <span className="chip risk" style={{ fontSize: 9.5 }}>inactive</span>}
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePriceList(pl, e)}
                        title="Delete price list"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--mut)',
                          fontSize: 13,
                          padding: '4px 6px',
                          borderRadius: 6,
                          opacity: 0.6,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )
              })}

              {priceLists.length === 0 && !loading && (
                <div className="tiny mut" style={{ padding: 20, textAlign: 'center' }}>
                  No price lists found.
                  {canCreate && (
                    <div style={{ marginTop: 8 }}>
                      Click <b>"＋ New"</b> to create the first price list.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Price List Details & Items */}
          <div className="products-table-card" style={{ padding: 20 }}>
            {!selectedPriceList ? (
              <div className="tiny mut" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏷️</div>
                Select a price list from the left panel to view and configure product rates.
              </div>
            ) : (
              <>
                <div className="rowx sp" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <div>
                    <b style={{ font: '800 18px var(--d)', color: 'var(--ink)' }}>{selectedPriceList.name}</b>
                    <span className="chip ok" style={{ marginLeft: 8, font: '700 11.5px var(--m)' }}>
                      {selectedPriceList.currency}
                    </span>
                  </div>

                  <div className="rowx" style={{ gap: 10, alignItems: 'center' }}>
                    <span className="chip" style={{ font: '600 12px var(--m)' }}>
                      {priceItems.length} priced items
                    </span>

                    {canEdit && (
                      <button
                        type="button"
                        className="btn pri"
                        style={{
                          borderRadius: 20,
                          padding: '8px 20px',
                          font: '700 13px var(--b)',
                          background: 'linear-gradient(90deg, #00C9A7 0%, #0072CE 100%)',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 14px rgba(0, 201, 167, 0.35)',
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
                <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="settings-search-box" style={{ flex: 1, maxWidth: 380, height: 38 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--mut)', flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      className="settings-search-input"
                      placeholder="Search priced items by SKU or product name..."
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

                {/* Items Table */}
                <div className="products-table-scroll" style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>SKU</th>
                        <th>Product Name</th>
                        <th className="num" style={{ width: 180 }}>Unit Price ({selectedPriceList.currency})</th>
                        {(canEdit || canDelete) && <th style={{ textAlign: 'right', width: 140 }}>Actions</th>}
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
                            {Number(it.unit_price).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          {(canEdit || canDelete) && (
                            <td style={{ textAlign: 'right' }}>
                              <div className="rowx" style={{ justifyContent: 'flex-end', gap: 6 }}>
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="btn ghost"
                                    style={{ padding: '4px 10px', fontSize: 11.5, borderRadius: 12 }}
                                    onClick={() => openEditPriceForItem(it)}
                                    title="Edit price"
                                  >
                                    ✏️ Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="btn ghost"
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: 11.5,
                                      borderRadius: 12,
                                      color: '#ec6969',
                                    }}
                                    onClick={() => handleRemovePriceItem(it)}
                                    disabled={deletingItemId === it.product_id}
                                    title="Remove from price list"
                                  >
                                    {deletingItemId === it.product_id ? '…' : '✕ Remove'}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}

                      {priceItems.length === 0 && (
                        <tr>
                          <td colSpan={canEdit || canDelete ? 4 : 3} className="tiny mut" style={{ textAlign: 'center', padding: 36 }}>
                            No prices assigned to this price list yet. Click <b>"＋ Set / Update Product Price"</b> to add prices.
                          </td>
                        </tr>
                      )}

                      {priceItems.length > 0 && filteredPricedItems.length === 0 && (
                        <tr>
                          <td colSpan={canEdit || canDelete ? 4 : 3} className="tiny mut" style={{ textAlign: 'center', padding: 24 }}>
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

        {/* Modal: Create Price List */}
        {canCreate && showNewPriceList && (
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
                    <span className="tiny mut">Define a new price list with currency assignment</span>
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
                      background: 'rgba(236, 105, 105, 0.12)',
                      border: '1.5px solid rgba(236, 105, 105, 0.35)',
                      color: '#ec6969',
                      fontSize: 13,
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 600,
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
                    Unique identifier for this price structure
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
                      style={{ marginTop: 6, display: 'inline-block', cursor: 'pointer', color: '#0072CE' }}
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

        {/* Modal: Set / Update Product Price */}
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
                      Select a product from the catalog to assign or update its unit price in {selectedPriceList.currency}
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
                    placeholder="Search catalog by SKU, name, specs..."
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

              {/* Products Catalog Table */}
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
                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'rgba(0, 201, 167, 0.12)',
                      border: '1px solid rgba(0, 201, 167, 0.3)',
                      color: '#00A68A',
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginBottom: 10,
                    }}
                  >
                    ✓ {pickerSuccessMsg}
                  </div>
                )}

                {pickerErrorMsg && (
                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'rgba(236, 105, 105, 0.12)',
                      border: '1px solid rgba(236, 105, 105, 0.35)',
                      color: '#ec6969',
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginBottom: 10,
                    }}
                  >
                    ⚠ {pickerErrorMsg}
                  </div>
                )}

                {selectedPickerProduct ? (
                  <form
                    onSubmit={handleSavePickerPrice}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                      flexWrap: 'wrap',
                    }}
                  >
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
                          style={{ width: 180, height: 38 }}
                          disabled={pickerSaving}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn pri"
                        style={{
                          borderRadius: 20,
                          padding: '10px 24px',
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
                  style={{ padding: '8px 22px', borderRadius: 18 }}
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
