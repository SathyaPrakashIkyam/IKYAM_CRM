import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { syncApi } from '../api/endpoints'

export default function SyncMonitor() {
  const [summary, setSummary] = useState(null)
  const [jobs, setJobs] = useState([])
  const [conflicts, setConflicts] = useState([])

  function load() {
    syncApi.summary().then(setSummary)
    syncApi.failedJobs().then(setJobs)
    syncApi.conflicts().then(setConflicts)
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

  return (
    <AppShell>
      <div className="scr-head"><h2>Sync monitor</h2><span className="goal">SAP Business One integration health.</span></div>

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
              <div className="tiny"><span className="chip risk">{j.error_class || 'error'}</span> {j.attempts} attempts</div>
            </div>
            <button className="btn pri" onClick={() => retry(j.id)}>Retry</button>
          </div>
        </div>
      ))}

      <div className="lab" style={{ marginTop: 15 }}>Conflict inbox</div>
      {conflicts.length === 0 && <div className="tiny" style={{ marginTop: 8 }}>No open conflicts.</div>}
      {conflicts.map((c) => (
        <div className="card" key={c.id} style={{ marginTop: 8 }}>
          <b style={{ fontSize: 12.5 }}>{c.object_type} · field: {c.field || '—'}</b>
          <div className="conf">
            <div className="confbox"><span className="lab">CRM value</span><br />{JSON.stringify(c.crm_value)}</div>
            <div className="confbox"><span className="lab">SAP value</span><br />{JSON.stringify(c.erp_value)}</div>
          </div>
          <div className="rowx" style={{ marginTop: 9 }}>
            <button className="btn" onClick={() => resolve(c.id, 'crm')}>Keep CRM</button>
            <button className="btn" onClick={() => resolve(c.id, 'erp')}>Keep SAP</button>
            <button className="btn ghost" onClick={() => resolve(c.id, 'dismiss')}>Dismiss</button>
          </div>
        </div>
      ))}
    </AppShell>
  )
}
