import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { accountsApi, quotesApi, productsApi, priceListsApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'
import '../styles/ikyam-mock.css'
import './Quotes.css'

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
  const [priceLists, setPriceLists] = useState([])
  const [selectedPriceListId, setSelectedPriceListId] = useState('')
  const [priceMap, setPriceMap] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [taxCodes, setTaxCodes] = useState([])
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    quotesApi.list(companyId).then(setQuotes)
    accountsApi.list(companyId).then(setAccounts)
    productsApi.list(companyId).then(setProducts)
    priceListsApi.list(companyId).then(setPriceLists)
    quotesApi.taxCodes().then(setTaxCodes).catch(() => {})
  }

  // Single source of truth for what % a tax code means — mirrors the
  // backend's TAX_CODE_RATES exactly, since it's read from the same
  // /quotes/meta/tax-codes endpoint rather than a second hardcoded copy.
  function taxRateFor(code) {
    return taxCodes.find((t) => t.code === code)?.rate_pct ?? 0
  }

  function updateTaxCode(index, code) {
    const lines = [...form.lines]
    lines[index] = { ...lines[index], tax_code: code, tax_pct: taxRateFor(code) }
    setForm({ ...form, lines })
  }

  useEffect(load, [companyId])

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

  // Re-price every already-added catalog-linked line whenever the selected
  // price list (and therefore priceMap) changes — switching from "Enterprise
  // Tier" to "India Standard" should update prices already on the quote, not
  // just new lines added afterwards. Custom lines (no product_id) and any
  // product missing from the new list are left untouched.
  useEffect(() => {
    if (!selectedPriceListId) return
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) =>
        l.product_id && priceMap[l.product_id] != null
          ? { ...l, unit_price: priceMap[l.product_id] }
          : l
      ),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMap])

  function updateLine(index, field, value) {
    const lines = [...form.lines]
    lines[index] = { ...lines[index], [field]: value }
    setForm({ ...form, lines })
  }

  // Number('') is 0, so forcing every keystroke through Number() snapped the
  // field straight back to "0" the instant it was cleared — you could never
  // actually get it empty to type a fresh value. Keep '' as-is while editing
  // (every calculation already treats '' the same as 0 via `|| 0`), and only
  // coerce to a real number for anything sent to the backend.
  function updateNumericLine(index, field, rawValue) {
    updateLine(index, field, rawValue === '' ? '' : Number(rawValue))
  }

  function removeLine(index) {
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) })
  }

  // Each line's own description field doubles as a product search box (via
  // <datalist>). Typing "SKU — Name" and picking a real suggestion links that
  // line to the catalog product and pre-fills its UOM / price-list price;
  // anything else typed is kept as a plain free-text line (product_id stays
  // null).
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

  // Mirrors the backend's QuoteService._line_amounts formula exactly, so the
  // number shown here always matches what gets saved.
  function lineTotal(line) {
    const gross = (line.quantity || 0) * (line.unit_price || 0)
    const discount = gross * ((line.discount_pct || 0) / 100)
    const taxable = gross - discount
    const tax = taxable * ((line.tax_pct || 0) / 100)
    return taxable + tax
  }

  // Only surface a tag when it's actionable for the person building the quote
  // (which price list this price came from). Whether a product's origin is
  // "company" or "SAP B1" is catalog metadata the backend uses internally —
  // not shown here.
  function lineTag(line) {
    if (line.product_id && selectedPriceListId && priceMap[line.product_id] != null) {
      const pl = priceLists.find((p) => p.id === selectedPriceListId)
      return { text: `price list · ${pl?.name}`, cls: 'ok' }
    }
    return null
  }

  async function createQuote(e) {
    e.preventDefault()
    const lines = form.lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        ...l,
        quantity: l.quantity === '' ? 0 : l.quantity,
        unit_price: l.unit_price === '' ? 0 : l.unit_price,
        discount_pct: l.discount_pct === '' ? 0 : l.discount_pct,
        tax_pct: l.tax_pct === '' ? 0 : l.tax_pct,
      }))
    if (lines.length === 0) return
    await quotesApi.create(companyId, { ...form, lines })
    setForm(EMPTY_FORM)
    setSelectedPriceListId('')
    setShowNew(false)
    load()
  }

  function cancelNew() {
    setForm(EMPTY_FORM)
    setShowNew(false)
  }

  // GST is intra-state and, by Indian GST law, splits into two equal halves
  // — CGST (central) + SGST (state) — while IGST (inter-state) stays a
  // single combined line. Purely a display breakdown of the same tax
  // figure; the grand total math is unaffected either way.
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
        // EXEMPT-but-nonzero or no tax code — keeps the breakdown always
        // summing to exactly the same figure as the Tax total below.
        acc.otherTax += tax
      }
      return acc
    },
    { subtotal: 0, discount: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, otherTax: 0 }
  )
  const grandTotal = totals.subtotal - totals.discount + totals.tax

  // Real, computed nudges only — no fabricated "segment median" style stats.
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

  return (
    <AppShell>
      <div className="ikyam-mock quotes-page">
        <div className="scr-head"><h2>Quote builder</h2><span className="goal">Ledger-style numerics; every ₹ figure is monospaced.</span></div>

        {!showNew && (
          <div className="rowx sp" style={{ marginBottom: 12 }}>
            <b style={{ font: '600 13px var(--d)' }}>Quotes · {quotes.length}</b>
            <button className="btn pri" onClick={() => setShowNew(true)}>＋ New quote</button>
          </div>
        )}

        {showNew && (
          <div className="card" style={{ marginBottom: 14 }}>
            <form onSubmit={createQuote}>
              <div className="rowx sp">
                <button type="button" className="btn ghost" onClick={cancelNew}>← Back to quotes</button>
              </div>

              <div className="rowx" style={{ gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} style={{ ...fieldInput, flex: 2, minWidth: 200 }}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>

                <select value={selectedPriceListId} onChange={(e) => setSelectedPriceListId(e.target.value)} style={{ ...fieldInput, minWidth: 170 }}>
                  <option value="">Price list: none</option>
                  {priceLists.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                </select>
              </div>

              <datalist id="products-dl">
                {products.map((p) => <option key={p.id} value={productLabel(p)} />)}
              </datalist>

              <table className="qtable" style={{ marginTop: 10 }}>
                <thead><tr><th>Description (type to search products)</th><th>Qty</th><th>Unit price</th><th>Disc %</th><th>Tax code</th><th>Tax %</th><th className="num">Line total ₹</th><th></th></tr></thead>
                <tbody>
                  {form.lines.map((line, i) => {
                    const tag = lineTag(line)
                    return (
                      <tr key={i}>
                        <td>
                          <input
                            list="products-dl"
                            value={line.description}
                            onChange={(e) => updateDescription(i, e.target.value)}
                            style={fieldInput}
                            placeholder="Item / service or search a product…"
                          />
                          {tag && <span className={`chip ${tag.cls}`} style={{ marginTop: 4, display: 'inline-block' }}>{tag.text}</span>}
                        </td>
                        <td><input type="number" value={line.quantity} onChange={(e) => updateNumericLine(i, 'quantity', e.target.value)} onFocus={(e) => e.target.select()} style={{ ...fieldInput, width: 60 }} /></td>
                        <td><input type="number" value={line.unit_price} onChange={(e) => updateNumericLine(i, 'unit_price', e.target.value)} onFocus={(e) => e.target.select()} style={{ ...fieldInput, width: 90 }} /></td>
                        <td><input type="number" value={line.discount_pct} onChange={(e) => updateNumericLine(i, 'discount_pct', e.target.value)} onFocus={(e) => e.target.select()} style={{ ...fieldInput, width: 60 }} /></td>
                        <td>
                          <select value={line.tax_code || ''} onChange={(e) => updateTaxCode(i, e.target.value)} style={{ ...fieldInput, width: 100 }}>
                            {taxCodes.map((t) => <option key={t.code} value={t.code}>{t.code}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={line.tax_pct}
                            onChange={(e) => updateNumericLine(i, 'tax_pct', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            title="Pre-filled from the tax code — edit freely if this item's actual slab differs"
                            style={{ ...fieldInput, width: 60 }}
                          />
                        </td>
                        <td className="num mono">{Math.round(lineTotal(line)).toLocaleString('en-IN')}</td>
                        <td>{form.lines.length > 1 && <span className="quotes-remove" onClick={() => removeLine(i)} title="Remove line">✕</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button type="button" className="btn ghost" style={{ marginTop: 8 }} onClick={addLine}>＋ Add line</button>

              <div className="quotes-bottom-grid">
                <div className="ai-frame">
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

              <div className="rowx sp" style={{ marginTop: 12 }}>
                <span />
                <span className="rowx">
                  <button type="button" className="btn ghost" onClick={cancelNew}>Cancel</button>
                  <button className="btn pri" disabled={!form.lines.some((l) => l.description.trim())}>Create quote</button>
                </span>
              </div>
            </form>
          </div>
        )}

        {!showNew && (
          <table className="qtable">
            <thead><tr><th>Doc #</th><th>Account</th><th>Type</th><th>Status</th><th className="num">Total ₹</th></tr></thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className="mono">{q.doc_num} rev {q.revision}</td>
                  <td>{accounts.find((a) => a.id === q.account_id)?.name || '—'}</td>
                  <td>
                    {q.quote_type === 'sap_b1'
                      ? <span className="chip brand">SAP B1 · {q.erp_sync_status}</span>
                      : <span className="chip">Standalone</span>}
                  </td>
                  <td><span className="chip">{q.status}</span></td>
                  <td className="num">{q.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr><td colSpan={5} className="tiny">No quotes yet — create one above.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}

const fieldInput = {
  padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12px var(--b)',
}
