import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { productsApi, productGroupsApi, uomsApi, currenciesApi, priceListsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import { useAuth } from '../context/AuthContext'
import '../styles/ikyam-mock.css'
import './Products.css'

const EMPTY_PRODUCT = { sku: '', name: '', description: '', product_group_id: '', uom: '', is_sellable: true, is_active: true, erp_item_code: '', source: 'company' }

const SECTIONS = [
  {
    key: 'catalog', label: 'Products', icon: '📦',
    description: 'Manage products, groups and units of measure for this company.',
    iconBg: 'var(--primary-soft)', openColor: 'var(--primary)',
  },
  {
    key: 'pricelists', label: 'Price List', icon: '💰',
    description: 'Manage SAP price lists and set item prices.',
    iconBg: 'var(--green-soft)', openColor: 'var(--green-ink)',
  },
]

export default function Products() {
  const { isCompanyAdmin, isSuperAdmin } = useAuth()
  const canManage = isCompanyAdmin || isSuperAdmin
  const companyId = currentCompanyId()
  const [tab, setTab] = useState(null) // null (card picker) | catalog | pricelists

  const [products, setProducts] = useState([])
  const [groups, setGroups] = useState([])
  const [uoms, setUoms] = useState([])
  const [companySource, setCompanySource] = useState('standalone')
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewUom, setShowNewUom] = useState(false)
  const [newUomCode, setNewUomCode] = useState('')
  const [form, setForm] = useState(EMPTY_PRODUCT)

  const [priceLists, setPriceLists] = useState([])
  const [currencies, setCurrencies] = useState([])
  const [showNewPriceList, setShowNewPriceList] = useState(false)
  const [showNewCurrency, setShowNewCurrency] = useState(false)
  const [newCurrencyCode, setNewCurrencyCode] = useState('')
  const [plForm, setPlForm] = useState({ name: '', currency: 'INR' })
  const [selectedPriceList, setSelectedPriceList] = useState(null)
  const [priceItems, setPriceItems] = useState([])
  const [priceRow, setPriceRow] = useState({ product_id: '', unit_price: '' })

  function loadCatalog() {
    if (!companyId) return
    productsApi.list(companyId).then(setProducts)
    productGroupsApi.list().then(setGroups)
    uomsApi.list().then(setUoms)
    productsApi.companySource().then(setCompanySource).catch(() => {})
  }

  function loadPriceLists() {
    if (!companyId) return
    priceListsApi.list(companyId).then(setPriceLists)
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
    await productsApi.create(companyId, { ...form, product_group_id: form.product_group_id || null })
    setForm(EMPTY_PRODUCT)
    setShowNewProduct(false)
    loadCatalog()
  }

  async function createPriceList(e) {
    e.preventDefault()
    await priceListsApi.create(companyId, plForm)
    setPlForm({ name: '', currency: 'INR' })
    setShowNewPriceList(false)
    loadPriceLists()
  }

  function selectPriceList(pl) {
    setSelectedPriceList(pl)
    setPriceRow({ product_id: '', unit_price: '' })
    loadPriceItems(pl.id)
  }

  async function savePrice(e) {
    e.preventDefault()
    if (!priceRow.product_id || priceRow.unit_price === '') return
    await priceListsApi.setItem(selectedPriceList.id, { product_id: priceRow.product_id, unit_price: Number(priceRow.unit_price) })
    setPriceRow({ product_id: '', unit_price: '' })
    loadPriceItems(selectedPriceList.id)
  }

  return (
    <AppShell>
      <div className="ikyam-mock products-page">
        <div className="scr-head">
          <h2>Product catalog</h2>
          <span className="goal">{canManage ? 'Manage products, groups and SAP price lists.' : 'Browse the product catalog and price lists.'}</span>
        </div>

        {!tab ? (
          <div className="products-cardgrid">
            {SECTIONS.map((s) => (
              <div key={s.key} className="products-card" onClick={() => setTab(s.key)}>
                <div className="rowx sp">
                  <span className="chip ok">
                    {s.key === 'catalog' ? `${products.length} product${products.length === 1 ? '' : 's'}` : `${priceLists.length} price list${priceLists.length === 1 ? '' : 's'}`}
                  </span>
                  <div className="products-card-icon" style={{ background: s.iconBg }}>{s.icon}</div>
                </div>
                <b className="products-card-title">{s.label}</b>
                <p className="tiny products-card-desc">{s.description}</p>
                <span className="products-card-open" style={{ color: s.openColor }}>Open {s.label.toLowerCase()} →</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="frame">
            <div className="products-drilldown-header">
              <button type="button" className="btn pri" onClick={() => setTab(null)}>← Back to Products</button>
              <b style={{ font: '600 14px var(--d)' }}>{tab === 'catalog' ? `Products · ${products.length}` : `Price List · ${priceLists.length}`}</b>
              {tab === 'catalog' && canManage && (
                <button className="btn pri" onClick={() => setShowNewProduct((v) => !v)}>＋ New product</button>
              )}
            </div>

            <div className="content" style={{ padding: 16 }}>
                {tab === 'catalog' && (
                  <>
                    {canManage && showNewProduct && (
                      <div className="card" style={{ marginBottom: 14, padding: 14 }}>
                        <form onSubmit={createProduct}>
                          <div className="fld" style={{ border: 0, marginBottom: 10 }}>
                            <span className="lab">Source</span>
                            {companySource === 'standalone' ? (
                              <div className="tiny" style={{ marginTop: 4, color: 'var(--mut)' }}>
                                This company is set up as Standalone — every product is a company product. Change the company's source at onboarding to unlock SAP B1 products.
                              </div>
                            ) : (
                              <div className="rowx products-source-toggle" style={{ marginTop: 4 }}>
                                <button type="button" className={`btn ${form.source === 'company' ? 'pri' : 'ghost'}`} onClick={() => setForm({ ...form, source: 'company' })}>My company</button>
                                <button type="button" className={`btn ${form.source === 'sap_b1' ? 'pri' : 'ghost'}`} onClick={() => setForm({ ...form, source: 'sap_b1' })}>SAP B1</button>
                              </div>
                            )}
                          </div>

                          <div className="grid products-form-grid">
                            <div className="fld"><span className="lab">SKU</span><input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={fieldInput} /></div>
                            <div className="fld"><span className="lab">Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldInput} /></div>
                            <div className="fld">
                              <span className="lab">UOM</span>
                              <select value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} style={{ ...fieldInput, width: '100%' }}>
                                <option value="">— none —</option>
                                {uoms.map((u) => <option key={u.id} value={u.code}>{u.code}</option>)}
                              </select>
                            </div>
                            <div className="fld">
                              <span className="lab">Product group</span>
                              <select value={form.product_group_id} onChange={(e) => setForm({ ...form, product_group_id: e.target.value })} style={{ ...fieldInput, width: '100%' }}>
                                <option value="">— none —</option>
                                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            </div>
                            {form.source === 'sap_b1' && (
                              <div className="fld">
                                <span className="lab">ERP item code (required)</span>
                                <input required value={form.erp_item_code} onChange={(e) => setForm({ ...form, erp_item_code: e.target.value })} style={fieldInput} placeholder="SAP B1 ItemCode" />
                              </div>
                            )}
                            <div className="fld" style={{ border: 0 }}>
                              <span className="lab">Flags</span>
                              <label className="tiny" style={{ display: 'block', marginTop: 4 }}>
                                <input type="checkbox" checked={form.is_sellable} onChange={(e) => setForm({ ...form, is_sellable: e.target.checked })} /> Sellable
                              </label>
                              <label className="tiny" style={{ display: 'block', marginTop: 3 }}>
                                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
                              </label>
                            </div>
                          </div>

                          <div className="fld" style={{ border: 0, marginTop: 4 }}>
                            <span className="lab">Description</span>
                            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...fieldInput, width: '100%' }} />
                          </div>

                          <div className="rowx" style={{ gap: 16, flexWrap: 'wrap' }}>
                            {!showNewGroup ? (
                              <span className="tiny products-link" onClick={() => setShowNewGroup(true)}>＋ Add a new product group</span>
                            ) : (
                              <div className="rowx" style={{ gap: 6 }}>
                                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" style={fieldInput} />
                                <button type="button" className="btn ghost" style={{ padding: '5px 11px' }} onClick={createGroup}>Save group</button>
                                <span className="tiny products-link" onClick={() => setShowNewGroup(false)}>Cancel</span>
                              </div>
                            )}

                            {!showNewUom ? (
                              <span className="tiny products-link" onClick={() => setShowNewUom(true)}>＋ Add a new UOM</span>
                            ) : (
                              <div className="rowx" style={{ gap: 6 }}>
                                <input value={newUomCode} onChange={(e) => setNewUomCode(e.target.value)} placeholder="e.g. BOX" style={{ ...fieldInput, width: 90 }} />
                                <button type="button" className="btn ghost" style={{ padding: '5px 11px' }} onClick={createUom}>Save UOM</button>
                                <span className="tiny products-link" onClick={() => setShowNewUom(false)}>Cancel</span>
                              </div>
                            )}
                          </div>

                          <div className="rowx sp" style={{ marginTop: 14 }}>
                            <span />
                            <span className="rowx">
                              <button type="button" className="btn ghost" onClick={() => setShowNewProduct(false)}>Cancel</button>
                              <button className="btn pri">Create product</button>
                            </span>
                          </div>
                        </form>
                      </div>
                    )}

                    <table className="qtable">
                      <thead><tr><th>SKU</th><th>Name</th><th>Source</th><th>Group</th><th>UOM</th><th>Sellable</th><th>Active</th></tr></thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.id}>
                            <td className="mono">{p.sku}</td>
                            <td><b>{p.name}</b>{p.description && <div className="tiny">{p.description}</div>}</td>
                            <td>
                              {p.source === 'sap_b1'
                                ? <span className="chip brand">SAP B1 · {p.erp_item_code}</span>
                                : <span className="chip">Company</span>}
                            </td>
                            <td>{p.product_group_name ? <span className="chip">{p.product_group_name}</span> : '—'}</td>
                            <td>{p.uom || '—'}</td>
                            <td>{p.is_sellable ? <span className="chip ok">Yes</span> : <span className="chip">No</span>}</td>
                            <td>{p.is_active ? <span className="chip ok">Active</span> : <span className="chip risk">Inactive</span>}</td>
                          </tr>
                        ))}
                        {products.length === 0 && (
                          <tr><td colSpan={7} className="tiny">No products yet{canManage ? ' — create one above.' : '.'}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {tab === 'pricelists' && (
                  <div className="products-pricelists-grid">
                    <div>
                      <div className="rowx sp" style={{ marginBottom: 12 }}>
                        <span className="tiny">All SAP price lists for this company</span>
                        {canManage && <button className="btn pri" onClick={() => setShowNewPriceList((v) => !v)}>＋ New</button>}
                      </div>

                      {canManage && showNewPriceList && (
                        <form className="card" style={{ marginBottom: 12, padding: 10 }} onSubmit={createPriceList}>
                          <input required value={plForm.name} onChange={(e) => setPlForm({ ...plForm, name: e.target.value })} placeholder="Price list name" style={{ ...fieldInput, width: '100%' }} />
                          <div className="rowx" style={{ marginTop: 8, gap: 6 }}>
                            <select value={plForm.currency} onChange={(e) => setPlForm({ ...plForm, currency: e.target.value })} style={{ ...fieldInput, flex: 1 }}>
                              {currencies.map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}
                            </select>
                            <button className="btn pri" style={{ padding: '5px 11px' }}>Create</button>
                          </div>
                          {!showNewCurrency ? (
                            <span className="tiny products-link" onClick={() => setShowNewCurrency(true)}>＋ Add a new currency</span>
                          ) : (
                            <div className="rowx" style={{ marginTop: 6, gap: 6 }}>
                              <input value={newCurrencyCode} onChange={(e) => setNewCurrencyCode(e.target.value)} placeholder="e.g. CHF" style={{ ...fieldInput, width: 90 }} maxLength={3} />
                              <button type="button" className="btn ghost" style={{ padding: '5px 11px' }} onClick={createCurrency}>Save currency</button>
                              <span className="tiny products-link" onClick={() => setShowNewCurrency(false)}>Cancel</span>
                            </div>
                          )}
                        </form>
                      )}

                      <div className="card" style={{ padding: 4 }}>
                        {priceLists.map((pl) => (
                          <div
                            key={pl.id}
                            className="products-pl-row"
                            style={{ background: selectedPriceList?.id === pl.id ? 'var(--primary-soft)' : 'transparent' }}
                            onClick={() => selectPriceList(pl)}
                          >
                            <b className="tiny">{pl.name} · {pl.currency}</b>
                            {!pl.is_active && <span className="chip">inactive</span>}
                          </div>
                        ))}
                        {priceLists.length === 0 && <div className="tiny" style={{ padding: 8 }}>No price lists yet{canManage ? ' — create one above.' : '.'}</div>}
                      </div>
                    </div>

                    <div>
                      {!selectedPriceList ? (
                        <div className="tiny">Select a price list to see its product prices.</div>
                      ) : (
                        <>
                          <b style={{ font: '600 13px var(--d)' }}>{selectedPriceList.name} — item prices</b>

                          {canManage && (
                            <form className="rowx" style={{ marginTop: 10, marginBottom: 10, gap: 6, flexWrap: 'wrap' }} onSubmit={savePrice}>
                              <select required value={priceRow.product_id} onChange={(e) => setPriceRow({ ...priceRow, product_id: e.target.value })} style={{ ...fieldInput, minWidth: 200 }}>
                                <option value="">Select product…</option>
                                {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                              </select>
                              <input required type="number" step="0.01" value={priceRow.unit_price} onChange={(e) => setPriceRow({ ...priceRow, unit_price: e.target.value })} onFocus={(e) => e.target.select()} placeholder="Unit price" style={{ ...fieldInput, width: 120 }} />
                              <button className="btn pri" style={{ padding: '5px 11px' }}>Set price</button>
                            </form>
                          )}

                          <table className="qtable">
                            <thead><tr><th>SKU</th><th>Product</th><th className="num">Unit price</th></tr></thead>
                            <tbody>
                              {priceItems.map((it) => (
                                <tr key={it.product_id}>
                                  <td className="mono">{it.product_sku}</td>
                                  <td>{it.product_name}</td>
                                  <td className="num mono">{Number(it.unit_price).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                              {priceItems.length === 0 && <tr><td colSpan={3} className="tiny">No prices set on this list yet.</td></tr>}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                  </div>
                )}
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
