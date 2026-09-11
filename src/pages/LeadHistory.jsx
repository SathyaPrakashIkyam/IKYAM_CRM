import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { activitiesApi, leadsApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import '../styles/Activities.css'

function typeIcon(type) {
  return { call: '☎', task: '✓', meeting: '▤', email: '✉', note: '✎' }[type] || '•'
}

function getFileSrc(file) {
  if (!file || !file.base64_data) return ''
  if (file.base64_data.startsWith('data:')) return file.base64_data
  const mime = file.mime_type || 'application/octet-stream'
  return `data:${mime};base64,${file.base64_data}`
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// Full-screen view (not a modal) of everything tied to one lead: the whole
// activity log — whether logged from the Activities page or a deal
// converted from this lead — plus every file attached across all of it in
// one place, so a rep can actually review a lead's history properly instead
// of squinting at a small popup.
export default function LeadHistory() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFile, setActiveFile] = useState(null) // { file, docSubject }

  useEffect(() => {
    if (!leadId) return
    setLoading(true)
    setError('')
    Promise.all([
      leadsApi.get(leadId).catch(() => null),
      activitiesApi.leadHistory(leadId).catch(() => []),
      activitiesApi.getDocumentsByLeadId(leadId).catch(() => ({ documents: [] })),
    ])
      .then(([leadData, activityData, docsData]) => {
        setLead(leadData)
        setActivities(Array.isArray(activityData) ? activityData : [])
        setDocuments(Array.isArray(docsData?.documents) ? docsData.documents : [])
      })
      .catch(() => setError('Failed to load this lead\'s history.'))
      .finally(() => setLoading(false))
  }, [leadId])

  const allFiles = documents.flatMap((d) =>
    (d.files || []).map((f) => ({ ...f, docSubject: d.subject, docType: d.activity_type }))
  )

  return (
    <AppShell>
      <div className="ikyam-mock activities-page">
        <div className="scr-head" style={{ marginBottom: 16 }}>
          <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <span className="tiny mut" style={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>← Back</span>
              <h2 style={{ font: '800 24px/1.2 var(--d)', letterSpacing: '-0.4px', color: 'var(--ink)', marginTop: 4 }}>
                {lead ? `${lead.name || [lead.first_name, lead.last_name].filter(Boolean).join(' ')} — ${lead.company_name || ''}` : 'Lead History'}
              </h2>
              <div className="goal" style={{ marginTop: 2 }}>
                {lead?.lead_no ? `${lead.lead_no} · ` : ''}Every activity and file logged for this lead
              </div>
            </div>
          </div>
          <div className="title-bar" style={{ margin: '10px 0 16px 0' }} />
        </div>

        {loading && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mut)' }}>
            <span className="quote-spinner" style={{ width: 20, height: 20, display: 'inline-block' }} />
            <div className="tiny" style={{ marginTop: 8 }}>Loading history…</div>
          </div>
        )}

        {error && (
          <div className="tiny" style={{ color: 'var(--danger, #d64545)', background: 'rgba(214, 69, 69, 0.08)', padding: 14, borderRadius: 12 }}>
            ⚠ {error}
          </div>
        )}

        {!loading && !error && (
          <div className="rec" style={{ gridTemplateColumns: '1fr 360px', gap: 24 }}>
            {/* Activity log */}
            <div>
              <div className="lab" style={{ marginBottom: 8 }}>Activity Log ({activities.length})</div>
              <div className="frame activities-main-frame" style={{ padding: 4 }}>
                <div className="activities-scroll-pane">
                  {activities.length === 0 && (
                    <div className="tiny mut" style={{ padding: 24, textAlign: 'center' }}>No activities logged for this lead yet.</div>
                  )}
                  {activities.length > 0 && (
                    <div className="activity-cards-list" style={{ padding: '8px 4px' }}>
                      {activities.map((a) => (
                        <div className="card activity-card" key={a.id}>
                          <div className="rowx sp" style={{ width: '100%' }}>
                            <div className="rowx" style={{ gap: 14 }}>
                              <span className="activity-icon-badge">{typeIcon(a.activity_type)}</span>
                              <div>
                                <b className="activity-subject">{a.subject}</b>
                                <div className="tiny mut" style={{ textTransform: 'capitalize', marginTop: 2 }}>
                                  {a.activity_type} · {a.status}
                                </div>
                                {a.summary && (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      background: 'rgba(0, 201, 167, 0.07)',
                                      borderLeft: '3px solid var(--primary, #00C9A7)',
                                      padding: '6px 12px',
                                      borderRadius: '0 10px 10px 0',
                                      maxWidth: 560,
                                    }}
                                  >
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>{a.summary}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="tiny mut" style={{ whiteSpace: 'nowrap' }}>
                              {a.completed_at
                                ? new Date(a.completed_at).toLocaleString()
                                : a.due_at
                                ? new Date(a.due_at).toLocaleString()
                                : new Date(a.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Files */}
            <div>
              <div className="lab" style={{ marginBottom: 8 }}>Files ({allFiles.length})</div>
              <div className="card" style={{ padding: 12 }}>
                {allFiles.length === 0 && (
                  <div className="tiny mut" style={{ padding: '16px 4px', textAlign: 'center' }}>No files attached to this lead's activities.</div>
                )}
                {allFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {allFiles.map((f, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveFile(f)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid var(--line, rgba(0,0,0,0.08))',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 18 }}>📄</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.file_name}
                          </div>
                          <div className="tiny mut" style={{ marginTop: 1 }}>
                            {f.docSubject}{f.size ? ` · ${formatFileSize(f.size)}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File viewer */}
      {activeFile && (
        <div className="lead-modal-overlay" onClick={() => setActiveFile(null)}>
          <div
            className="lead-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 780, width: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', borderRadius: 24, padding: '24px 28px' }}
          >
            <div className="lead-modal-header" style={{ marginBottom: 12 }}>
              <div className="lead-modal-title-row">
                <div className="lead-modal-icon-badge" style={{ color: '#0072CE', background: 'rgba(0, 114, 206, 0.12)', fontSize: 18 }}>👁</div>
                <div>
                  <h3 style={{ margin: 0 }}>{activeFile.file_name}</h3>
                  <span className="tiny mut">{activeFile.docSubject}</span>
                </div>
              </div>
              <button type="button" className="lead-modal-close" onClick={() => setActiveFile(null)}>✕</button>
            </div>
            <div className="title-bar" style={{ margin: '0 0 16px 0', width: 44, height: 3 }} />

            <div
              style={{
                flex: 1,
                minHeight: 280,
                maxHeight: '58vh',
                background: 'var(--surface2, rgba(240, 246, 250, 0.6))',
                border: '1px solid var(--line, rgba(0, 201, 167, 0.2))',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: 12,
              }}
            >
              {(activeFile.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(activeFile.file_name)) && (
                <img src={getFileSrc(activeFile)} alt={activeFile.file_name} style={{ maxWidth: '100%', maxHeight: '54vh', objectFit: 'contain', borderRadius: 10 }} />
              )}
              {(activeFile.mime_type === 'application/pdf' || /\.pdf$/i.test(activeFile.file_name)) && (
                <iframe src={getFileSrc(activeFile)} title={activeFile.file_name} style={{ width: '100%', height: '54vh', border: 'none', borderRadius: 10 }} />
              )}
              {!activeFile.mime_type?.startsWith('image/') && activeFile.mime_type !== 'application/pdf'
                && !/\.(png|jpe?g|webp|gif|svg|pdf)$/i.test(activeFile.file_name) && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <span style={{ fontSize: 44, display: 'block', marginBottom: 12 }}>📄</span>
                  <b style={{ fontSize: 15, color: 'var(--ink)' }}>{activeFile.file_name}</b>
                  <div className="tiny mut" style={{ marginTop: 4 }}>{activeFile.mime_type || 'Preview not available for this file type'}</div>
                </div>
              )}
            </div>

            <div className="rowx sp" style={{ marginTop: 16, alignItems: 'center' }}>
              <div className="tiny mut">
                <b>{activeFile.file_name}</b>{activeFile.mime_type && ` · ${activeFile.mime_type}`}
              </div>
              <button type="button" className="btn ghost" onClick={() => setActiveFile(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
