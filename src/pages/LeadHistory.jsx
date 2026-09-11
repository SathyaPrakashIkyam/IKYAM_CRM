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

// activity.attachments is a comma-separated list of stored file paths — just
// enough to know an activity HAS files and their names, without fetching
// the (much heavier) base64 content for every file on every activity up
// front. Full content is only fetched lazily, on an actual click.
function parseAttachmentNames(attachments) {
  if (!attachments) return []
  return attachments
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split(/[/\\]/).pop())
}

// Full-screen view (not a modal) of everything tied to one lead: the whole
// activity log — whether logged from the Activities page or a deal
// converted from this lead — with each activity's own attached files shown
// inline and previewable, so a rep can actually review a lead's history
// properly instead of squinting at a small popup.
export default function LeadHistory() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFile, setActiveFile] = useState(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState('')
  // Cached only once the first file is actually opened — never fetched
  // just because the page loaded.
  const [documentsCache, setDocumentsCache] = useState(null)
  // id of the activity currently uploading a file, if any — lets each
  // card's own "Attach" control show its own busy state independently.
  const [uploadingId, setUploadingId] = useState(null)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (!leadId) return
    setLoading(true)
    setError('')
    Promise.all([
      leadsApi.get(leadId).catch(() => null),
      activitiesApi.leadHistory(leadId).catch(() => []),
    ])
      .then(([leadData, activityData]) => {
        setLead(leadData)
        setActivities(Array.isArray(activityData) ? activityData : [])
      })
      .catch(() => setError('Failed to load this lead\'s history.'))
      .finally(() => setLoading(false))
  }, [leadId])

  // Only called the moment a file is actually clicked — fetches (and
  // caches) the full documents-with-content payload for this lead, then
  // opens the one file that was clicked.
  async function openFile(activityId, fileName, docSubject) {
    setFileError('')
    let docs = documentsCache
    if (!docs) {
      setFileLoading(true)
      try {
        const res = await activitiesApi.getDocumentsByLeadId(leadId)
        docs = Array.isArray(res?.documents) ? res.documents : []
        setDocumentsCache(docs)
      } catch (err) {
        setFileError('Failed to load this file.')
        setFileLoading(false)
        return
      }
      setFileLoading(false)
    }
    const doc = docs.find((d) => d.activity_id === activityId)
    const file = doc?.files?.find((f) => f.file_name === fileName)
    if (!file) {
      setFileError('This file could not be found.')
      return
    }
    setActiveFile({ ...file, docSubject })
  }

  // Adds a file directly to the activity whose card this was clicked from,
  // via the PATCH /activities/{id}/attachments route — works whether that
  // activity is open or already completed, no reopening or summary needed.
  async function handleAddAttachment(activityId, e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setUploadingId(activityId)
    setUploadError('')
    try {
      const updated = await activitiesApi.patchAttachments(activityId, files)
      setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, attachments: updated.attachments } : a)))
      // The cache no longer reflects the newly added file — dropped so the
      // next click on any file re-fetches fresh content instead of showing
      // stale data.
      setDocumentsCache(null)
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (detail?.[0]?.msg || 'Failed to add attachment.')
      setUploadError(msg)
    } finally {
      setUploadingId(null)
    }
  }

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
                {lead?.lead_no ? `${lead.lead_no} · ` : ''}Every activity logged for this lead
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
          <div className="frame activities-main-frame">
            <div className="activities-scroll-pane">
              {activities.length === 0 && (
                <div className="tiny mut" style={{ padding: 24, textAlign: 'center' }}>No activities logged for this lead yet.</div>
              )}
              {activities.length > 0 && (
                <div className="activity-cards-list" style={{ padding: '8px 4px' }}>
                  {activities.map((a) => {
                    const fileNames = parseAttachmentNames(a.attachments)
                    return (
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
                              <div className="rowx" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                                {fileNames.length > 0 && (
                                  <>
                                    <span className="tiny mut" style={{ fontWeight: 600 }}>Attachments ({fileNames.length}):</span>
                                    {fileNames.map((name, fIdx) => (
                                      <span
                                        key={fIdx}
                                        className="chip"
                                        style={{
                                          fontSize: 11.5,
                                          padding: '3px 10px',
                                          background: 'var(--surface2, rgba(240, 246, 250, 0.9))',
                                          border: '1px solid var(--line, rgba(0, 201, 167, 0.25))',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                        }}
                                        onClick={() => openFile(a.id, name, a.subject)}
                                        title="Click to preview attachment"
                                      >
                                        📎 {name}
                                      </span>
                                    ))}
                                  </>
                                )}
                                {/* Inline attach — right on this activity's own line, not a
                                    separate page-level picker */}
                                <label
                                  className="tiny"
                                  style={{
                                    cursor: uploadingId === a.id ? 'wait' : 'pointer',
                                    color: 'var(--primary, #00C9A7)',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '3px 10px',
                                    borderRadius: 14,
                                    border: '1px dashed var(--line, rgba(0, 201, 167, 0.35))',
                                  }}
                                >
                                  <input
                                    type="file"
                                    multiple
                                    hidden
                                    disabled={uploadingId === a.id}
                                    onChange={(e) => handleAddAttachment(a.id, e)}
                                  />
                                  📎 {uploadingId === a.id ? 'Uploading…' : '+ Attach'}
                                </label>
                              </div>
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
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {fileError && (
          <div className="tiny" style={{ color: 'var(--danger, #d64545)', marginTop: 10 }}>⚠ {fileError}</div>
        )}
      </div>

      {fileLoading && !activeFile && (
        <div className="lead-modal-overlay">
          <div className="lead-modal-card" style={{ maxWidth: 320, padding: '28px', textAlign: 'center' }}>
            <span className="quote-spinner" style={{ width: 20, height: 20, display: 'inline-block' }} />
            <div className="tiny" style={{ marginTop: 10 }}>Loading file…</div>
          </div>
        </div>
      )}

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
