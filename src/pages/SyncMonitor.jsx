import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { syncApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import '../styles/SyncMonitor.css'

function timeAgo(iso) {
  if (!iso) return null
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.round(diffMs / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

function timeUntil(iso) {
  if (!iso) return null
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs <= 0) return 'due now'
  const m = Math.round(diffMs / 60000)
  if (m < 1) return 'in <1 min'
  if (m < 60) return `in ${m} min`
  return `in ${Math.round(m / 60)}h`
}

const ERROR_CHIP = { validation: 'risk', mapping: 'risk', auth: 'risk', transient: 'warn' }

const CONNECTION_LABEL = { connected: 'Live', degraded: 'Degraded', error: 'Error', pending: 'Pending' }
const CONNECTION_DOT = { connected: 'var(--green)', degraded: 'var(--amber)', error: 'var(--orange)', pending: 'var(--faint)' }

export default function SyncMonitor() {
  const [summary, setSummary] = useState(null)
  const [jobs, setJobs] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [connections, setConnections] = useState(null)
  const [watermarks, setWatermarks] = useState([])
  const [expandedPayload, setExpandedPayload] = useState(null)
  const [mappingsOpen, setMappingsOpen] = useState(false)

  function load() {
    syncApi.summary().then(setSummary)
    syncApi.failedJobs().then(setJobs)
    syncApi.conflicts().then(setConflicts)
    syncApi.connections().then(setConnections)
    syncApi.watermarks().then(setWatermarks)
  }

  useEffect(load, [])

  async function retry(id) {
    await syncApi.retryJob(id)
    load()
  }

  async function resolve(id, resolution) {
    await syncApi.resolveConflict(id, resolution)
    load()
  }

  const connection = connections?.[0] || null

  return (
    <AppShell>
      <div className="ikyam-mock sync-page">
        <div className="scr-head"><h2>SAP sync monitor</h2><span className="goal">SAP Business One integration health — queue, conflicts, watermarks.</span></div>

        <div className="card" style={{ padding: 14 }}>
          {connections === null ? (
            <span className="tiny">Connecting…</span>
          ) : connection ? (
            <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="rowx">
                  <span className="sync-pulse" style={{ background: CONNECTION_DOT[connection.status] || 'var(--faint)' }} />
                  <b style={{ fontSize: 13.5 }}>{connection.name} · {(connection.adapter || 'sap_b1').replace('_', ' ').toUpperCase()}</b>
                </div>
                <div className="tiny mut" style={{ marginTop: 3 }}>
                  {CONNECTION_LABEL[connection.status] || connection.status}
                  {connection.capabilities?.version && <> · v{connection.capabilities.version}</>}
                  {connection.last_heartbeat && <> · heartbeat {timeAgo(connection.last_heartbeat)}</>}
                  {connection.capabilities?.db_type && <> · {connection.capabilities.db_type.toUpperCase()}</>}
                  {' · '}{connection.company_db_count} company DB{connection.company_db_count === 1 ? '' : 's'}
                </div>
              </div>
              <button className="btn" onClick={() => setMappingsOpen(true)}>Field mappings</button>
            </div>
          ) : (
            <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div className="rowx">
                <span className="sync-pulse" style={{ background: 'var(--faint)', animation: 'none' }} />
                <b style={{ fontSize: 13.5 }}>Not connected to SAP B1</b>
              </div>
              <span className="tiny mut">This company runs standalone — no ERP connection configured.</span>
            </div>
          )}
        </div>

        <div className="tiles">
          <div className="tile"><b style={{ color: 'var(--green-ink)' }}>{summary?.synced_today ?? '—'}</b><span className="tiny">synced today</span></div>
          <div className="tile"><b>{summary?.queued ?? '—'}</b><span className="tiny">queued</span></div>
          <div className="tile"><b style={{ color: 'var(--orange-ink)' }}>{summary?.failed ?? '—'}</b><span className="tiny">failed (DLQ)</span></div>
          <div className="tile"><b style={{ color: 'var(--amber-ink)' }}>{summary?.conflicts_open ?? '—'}</b><span className="tiny">conflict open</span></div>
        </div>

        <div className="lab">Failed jobs</div>
        {jobs.length === 0 && <div className="tiny" style={{ marginTop: 8 }}>No failed jobs right now.</div>}
        {jobs.map((j) => (
          <div className="card" key={j.id} style={{ marginTop: 8 }}>
            <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div>
                <b style={{ fontSize: 12.5 }}>{j.object_type} · {j.direction}</b>
                <div className="tiny">
                  <span className={`chip ${ERROR_CHIP[j.error_class] || 'risk'}`}>{j.error_class || 'error'}</span>
                  {' '}{j.attempts} attempt{j.attempts === 1 ? '' : 's'}
                  {j.error_class === 'transient' && j.next_attempt_at && <> · next attempt {timeUntil(j.next_attempt_at)}</>}
                </div>
              </div>
              <div className="rowx" style={{ gap: 8 }}>
                {j.payload && (
                  <span className="tiny" style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setExpandedPayload(expandedPayload === j.id ? null : j.id)}>
                    {expandedPayload === j.id ? 'Hide payload' : 'View payload'}
                  </span>
                )}
                <button className="btn pri" onClick={() => retry(j.id)}>Retry</button>
              </div>
            </div>
            {j.error_detail && <div className="tiny mut" style={{ marginTop: 6 }}>{JSON.stringify(j.error_detail)}</div>}
            {expandedPayload === j.id && (
              <pre className="sync-payload">{JSON.stringify(j.payload, null, 2)}</pre>
            )}
          </div>
        ))}

        <div className="lab" style={{ marginTop: 15 }}>Conflict inbox</div>
        {conflicts.length === 0 && <div className="tiny" style={{ marginTop: 8 }}>No open conflicts.</div>}
        {conflicts.map((c) => (
          <div className="card" key={c.id} style={{ marginTop: 8 }}>
            <b style={{ fontSize: 12.5 }}>{c.object_type} · field: {c.field || '—'}</b>
            <div className="conf">
              <div className="confbox">
                <span className="lab">CRM value</span><br />{JSON.stringify(c.crm_value)}
                {c.crm_changed_at && <div className="tiny mut">{timeAgo(c.crm_changed_at)}</div>}
              </div>
              <div className="confbox">
                <span className="lab">SAP value</span><br />{JSON.stringify(c.erp_value)}
                {c.erp_changed_at && <div className="tiny mut">{timeAgo(c.erp_changed_at)}</div>}
              </div>
            </div>
            <div className="rowx" style={{ marginTop: 9 }}>
              <button className="btn" onClick={() => resolve(c.id, 'crm')}>Keep CRM</button>
              <button className="btn" onClick={() => resolve(c.id, 'erp')}>Keep SAP</button>
              <button className="btn ghost" onClick={() => resolve(c.id, 'dismiss')}>Dismiss</button>
            </div>
          </div>
        ))}

        {watermarks.length > 0 && (
          <div className="tiny mut" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            Watermarks — {watermarks.map((w) => `${w.erp_object} ${w.watermark?.at ? new Date(w.watermark.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `cursor ${w.crm_cursor}`}`).join(' · ')}
          </div>
        )}
      </div>

      {mappingsOpen && (
        <FieldMappingsModal onClose={() => setMappingsOpen(false)} />
      )}
    </AppShell>
  )
}

function FieldMappingsModal({ onClose }) {
  const [mappings, setMappings] = useState(null)

  useEffect(() => {
    syncApi.fieldMappings().then(setMappings)
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 20,
          padding: '24px 28px', maxWidth: 560, width: '100%', maxHeight: '70vh', overflowY: 'auto',
          boxShadow: 'var(--shadow-lift), 0 24px 64px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ font: '700 16px var(--d)', color: 'var(--ink)', margin: '0 0 12px' }}>Field mappings</h3>
        {mappings === null && <div className="tiny">Loading…</div>}
        {mappings && mappings.length === 0 && <div className="tiny mut">No field mappings configured for this connection yet.</div>}
        {mappings && mappings.length > 0 && (
          <div className="table-card" style={{ marginTop: 10 }}>
            <table className="qtable">
              <thead><tr><th>Object</th><th>CRM field</th><th>SAP field</th><th>System of record</th></tr></thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id}>
                    <td>{m.object_type} → {m.erp_object}</td>
                    <td className="mono">{m.crm_field}</td>
                    <td className="mono">{m.erp_field}</td>
                    <td><span className="chip">{m.system_of_record}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="rowx" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
