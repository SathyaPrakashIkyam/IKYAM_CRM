import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { accountsApi, quotesApi } from '../api/endpoints'
import { currentCompanyId } from '../api/client'

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [accounts, setAccounts] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ account_id: '', lines: [{ description: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_pct: 18 }] })
  const companyId = currentCompanyId()

  function load() {
    if (!companyId) return
    quotesApi.list(companyId).then(setQuotes)
    accountsApi.list(companyId).then(setAccounts)
  }

  useEffect(load, [companyId])

  function updateLine(index, field, value) {
    const lines = [...form.lines]
    lines[index] = { ...lines[index], [field]: value }
    setForm({ ...form, lines })
  }

  function addLine() {
    setForm({ ...form, lines: [...form.lines, { description: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_pct: 18 }] })
  }

  async function createQuote(e) {
    e.preventDefault()
    await quotesApi.create(companyId, form)
    setForm({ account_id: '', lines: [{ description: '', quantity: 1, unit_price: 0, discount_pct: 0, tax_pct: 18 }] })
    setShowNew(false)
    load()
  }

  return (
    <AppShell>
      <div className="scr-head"><h2>Quotes</h2><span className="goal">Ledger-style numerics; every ₹ figure is monospaced.</span></div>

      <div className="rowx sp" style={{ marginBottom: 12 }}>
        <b style={{ font: '600 13px var(--d)' }}>Quotes · {quotes.length}</b>
        <button className="btn pri" onClick={() => setShowNew((v) => !v)}>＋ New quote</button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={createQuote}>
            <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} style={{ ...fieldInput, width: '100%' }}>
              <option value="">Select account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <table className="qtable">
              <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Disc %</th><th>Tax %</th></tr></thead>
              <tbody>
                {form.lines.map((line, i) => (
                  <tr key={i}>
                    <td><input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} style={fieldInput} placeholder="Item / service" /></td>
                    <td><input type="number" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))} style={{ ...fieldInput, width: 60 }} /></td>
                    <td><input type="number" value={line.unit_price} onChange={(e) => updateLine(i, 'unit_price', Number(e.target.value))} style={{ ...fieldInput, width: 90 }} /></td>
                    <td><input type="number" value={line.discount_pct} onChange={(e) => updateLine(i, 'discount_pct', Number(e.target.value))} style={{ ...fieldInput, width: 60 }} /></td>
                    <td><input type="number" value={line.tax_pct} onChange={(e) => updateLine(i, 'tax_pct', Number(e.target.value))} style={{ ...fieldInput, width: 60 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn ghost" style={{ marginTop: 8 }} onClick={addLine}>＋ Add line</button>

            <div className="rowx sp" style={{ marginTop: 12 }}>
              <span />
              <span className="rowx">
                <button type="button" className="btn ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button className="btn pri">Create quote</button>
              </span>
            </div>
          </form>
        </div>
      )}

      <table className="qtable">
        <thead><tr><th>Doc #</th><th>Account</th><th>Status</th><th className="num">Total ₹</th></tr></thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id}>
              <td className="mono">{q.doc_num} rev {q.revision}</td>
              <td>{accounts.find((a) => a.id === q.account_id)?.name || '—'}</td>
              <td><span className="chip">{q.status}</span></td>
              <td className="num">{q.total.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  )
}

const fieldInput = {
  padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12px var(--b)',
}
