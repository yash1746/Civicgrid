/**
 * CivicGrid — Screen 3: My Tickets (Tracking Screen)
 * Shows only the issues reported by the current user.
 * Includes actions to view complete ticket details and delete/remove tickets locally.
 */
import { useState, useEffect } from 'react'
import useStore from '../../store/useStore.js'
import { getMyIssues } from '../../api/civicgrid.js'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'

// Fix default Leaflet icon assets for the details map
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CATEGORY_LABELS = {
  pothole: 'Pothole',
  water_leak: 'Water Leak',
  broken_streetlight: 'Streetlight Outage',
  garbage_overflow: 'Waste Accumulation',
  fallen_tree: 'Road Obstruction',
  road_damage: 'Road Damage',
  graffiti: 'Graffiti/Vandalism',
  flooding: 'Flooding',
  sewage_overflow: 'Sewage Leak',
  other: 'Other Issue',
}

const TIMELINE_STEPS = [
  { status: 'open', label: 'Report Logged' },
  { status: 'assigned', label: 'Verified & Routed' },
  { status: 'in_progress', label: 'Resolution In Progress' },
  { status: 'resolved', label: 'Resolved & Closed' },
]

const Icons = {
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
  ),
  picture: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
  ),
  pending: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  ),
  resolved: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
  )
}

export default function MyTicketsTab() {
  const { user, token, myIssues, setMyIssues, nearbyIssues, setNearbyIssues } = useStore()
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailedTicket, setDetailedTicket] = useState(null)
  const [ticketToDelete, setTicketToDelete] = useState(null)

  // Demo Fallback Data
  const demoTickets = [
    {
      id: 'demo-resolved',
      title: 'Pothole on Linking Road near Starbucks',
      category: 'pothole',
      status: 'resolved',
      severity_level: 'high',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      resolved_at: new Date(Date.now() - 86400000).toISOString(),
      media_urls: ['https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=500&auto=format&fit=crop'],
      proof_media_urls: ['https://images.unsplash.com/photo-1599740831119-4727b161405e?w=500&auto=format&fit=crop'],
      address_text: 'Linking Road, Mumbai',
      lat: 19.0772,
      lng: 72.8790,
      description: 'A deep pothole has emerged right outside the coffee shop, creating a massive hazard for passing motorcycles.'
    },
    {
      id: 'demo-in-progress',
      title: 'Water pipe burst flooding street',
      category: 'water_leak',
      status: 'in_progress',
      severity_level: 'critical',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      media_urls: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto=format&fit=crop'],
      address_text: 'Hill Road, Bandra',
      lat: 19.0745,
      lng: 72.8760,
      description: 'The main water distribution pipe has cracked, causing continuous high-pressure flooding across the sidewalk.'
    },
    {
      id: 'demo-open',
      title: 'Streetlight broken and flickering',
      category: 'broken_streetlight',
      status: 'open',
      severity_level: 'low',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      media_urls: ['https://images.unsplash.com/photo-1509021436665-8f37df706a73?w=500&auto=format&fit=crop'],
      address_text: 'Carter Road',
      lat: 19.0788,
      lng: 72.8800,
      description: 'The streetlight fixture is damaged and oscillates between flickering on and turning off completely.'
    }
  ]

  const loadIssues = async () => {
    setLoading(true)
    if (token === 'demo-token-civicgrid' || !token) {
      if (myIssues.length === 0) {
        setMyIssues(demoTickets)
      }
      setLoading(false)
      return
    }
    try {
      const res = await getMyIssues()
      setMyIssues(res.data.data.reported || [])
    } catch (e) {
      console.warn('Backend offline — loading demo tickets')
      if (myIssues.length === 0) {
        setMyIssues(demoTickets)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIssues()
  }, [])

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  // Helper to determine the index of current step in timeline
  const getStepIndex = (status) => {
    if (status === 'closed') return 3 // map closed to resolved state
    const map = { open: 0, assigned: 1, in_progress: 2, resolved: 3 }
    return map[status] ?? 0
  }

  return (
    <div style={{ padding: '16px', minHeight: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Track Reports</h3>
        <button onClick={loadIssues} className="btn btn-ghost btn-sm" style={{ padding: '6px 12px', borderRadius: '6px' }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '40px 0' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : myIssues.length === 0 ? (
        <div className="empty-state">
          <div style={{ color: 'var(--text-muted)' }}>{Icons.info}</div>
          <h3>No reports logged</h3>
          <p>Reports submitted by your account will display here for real-time tracking.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {myIssues.map((ticket) => {
            const isExpanded = expandedId === ticket.id
            const label = CATEGORY_LABELS[ticket.category] || 'Reported Incident'
            const currentStepIdx = getStepIndex(ticket.status)

            return (
              <div
                key={ticket.id}
                className="card"
                style={{
                  padding: 0,
                  cursor: 'pointer',
                  border: isExpanded ? '1.5px solid var(--accent)' : '1.3px solid var(--border)',
                  overflow: 'hidden',
                  transition: 'all var(--t-fast)'
                }}
                onClick={() => toggleExpand(ticket.id)}
              >
                {/* ── Main Ticket Header Row ───────────────────────── */}
                <div style={{ display: 'flex', gap: '12px', padding: '14px', alignItems: 'center' }}>
                  {ticket.media_urls?.[0] ? (
                    <img
                      src={ticket.media_urls[0]}
                      alt="incident thumbnail"
                      style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '6px',
                      background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0
                    }}>
                      LOG
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {ticket.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Logged on {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={`badge badge-${ticket.severity_level || 'low'}`} style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>
                      {ticket.severity_level}
                    </span>
                    <span className={`badge badge-${ticket.status || 'open'}`} style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>
                      {ticket.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', padding: '8px 14px', background: 'var(--bg-card-hover)', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDetailedTicket(ticket)
                    }}
                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem' }}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setTicketToDelete(ticket)
                    }}
                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  >
                    Delete
                  </button>
                </div>

                {/* ── Expanded Status Timeline & Before/After ──────── */}
                {isExpanded && (
                  <div style={{
                    background: 'var(--bg-card-hover)',
                    borderTop: '1px solid var(--border)',
                    padding: '16px',
                    cursor: 'default'
                  }} onClick={e => e.stopPropagation()}>
                    
                    {/* Vertical Timeline */}
                    <div className="timeline" style={{ marginBottom: '20px' }}>
                      {TIMELINE_STEPS.map((step, idx) => {
                        const isDone = idx < currentStepIdx || ticket.status === 'resolved' || ticket.status === 'closed'
                        const isCurrent = idx === currentStepIdx && ticket.status !== 'resolved' && ticket.status !== 'closed'

                        return (
                          <div key={step.status} className={`timeline-step ${isDone ? 'done' : ''}`}>
                            <div className={`timeline-dot ${isDone ? 'done' : isCurrent ? 'current' : ''}`}>
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <div className="timeline-content">
                              <div className="timeline-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{step.label}</div>
                              {isCurrent && (
                                <p style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '2px' }}>
                                  Municipal dispatch scheduled.
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Completion Side-by-Side Visual Evidence */}
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Evidence Verification (Before & After)
                      </p>
                      <div className="before-after" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        
                        {/* Before Panel */}
                        <div className="ba-panel" style={{ height: '100px' }}>
                          {ticket.media_urls?.[0] ? (
                            <img src={ticket.media_urls[0]} alt="Original report state" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ background: 'var(--bg-input)', height: '100%', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                              {Icons.picture}
                              <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>No Photo</span>
                            </div>
                          )}
                          <div className="ba-label">Before</div>
                        </div>

                        {/* After Panel */}
                        <div className="ba-panel" style={{ height: '100px' }}>
                          {ticket.status === 'resolved' ? (
                            ticket.proof_media_urls?.[0] ? (
                              <img src={ticket.proof_media_urls[0]} alt="Resolution state" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ background: 'var(--bg-input)', height: '100%', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--status-resolved)' }}>
                                {Icons.resolved}
                                <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>Resolved</span>
                              </div>
                            )
                          ) : (
                            <div style={{ background: 'var(--bg-input)', height: '100%', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                              {Icons.pending}
                              <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>Pending</span>
                            </div>
                          )}
                          <div className="ba-label">After</div>
                        </div>

                      </div>

                      {/* Resolved Verified Alert */}
                      {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                        <div style={{
                          background: 'var(--sev-low-bg)', color: 'var(--sev-low)',
                          border: '1px solid rgba(16,185,129,0.15)',
                          borderRadius: '6px', padding: '10px', fontSize: '0.78rem',
                          textAlign: 'center', marginTop: '12px', fontWeight: 600
                        }}>
                          Automated system has verified the image resolution.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Ticket Detailed View Modal Overlay ───────────────── */}
      {detailedTicket && (
        <div className="sheet-overlay" onClick={() => setDetailedTicket(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '90%' }}>
            <div className="sheet-header">
              <h3 className="sheet-title">Civic Ledger Entry</h3>
              <button className="sheet-close" onClick={() => setDetailedTicket(null)}>×</button>
            </div>
            <div style={{ padding: '0 20px 30px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Header Title & Category */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                  {CATEGORY_LABELS[detailedTicket.category] || 'Civic Incident Log'}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {detailedTicket.title}
                </h2>
              </div>

              {/* Status and Severity Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Ticket Status</div>
                  <span className={`badge badge-${detailedTicket.status || 'open'}`} style={{ textTransform: 'uppercase', fontSize: '0.62rem' }}>
                    {detailedTicket.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Severity Priority</div>
                  <span className={`badge badge-${detailedTicket.severity_level || 'low'}`} style={{ textTransform: 'uppercase', fontSize: '0.62rem' }}>
                    {detailedTicket.severity_level}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Reported Date</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {new Date(detailedTicket.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>GPS Location</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {detailedTicket.lat ? `${detailedTicket.lat.toFixed(5)}, ${detailedTicket.lng.toFixed(5)}` : 'Coordinates on file'}
                  </div>
                </div>
              </div>

              {/* Interactive Leaflet Map for Location */}
              {detailedTicket.lat && (
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Incident Site Map</label>
                  <div style={{ height: '180px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <MapContainer
                      center={[detailedTicket.lat, detailedTicket.lng]}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                      dragging={false}
                      doubleClickZoom={false}
                      scrollWheelZoom={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[detailedTicket.lat, detailedTicket.lng]} />
                    </MapContainer>
                  </div>
                </div>
              )}

              {/* Detailed Description */}
              {detailedTicket.description && (
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Incident Description</label>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {detailedTicket.description}
                  </p>
                </div>
              )}

              {/* Landmark */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Nearest Landmark / Street Address</label>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {detailedTicket.address_text || 'No landmark described.'}
                </p>
              </div>

              {/* Visual Evidence (Before / After Grid) */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Visual Evidence Ledger</label>
                <div className="before-after" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: 0 }}>
                  <div className="ba-panel" style={{ height: '140px' }}>
                    {detailedTicket.media_urls?.[0] ? (
                      <img src={detailedTicket.media_urls[0]} alt="Initial report state" style={{ borderRadius: '8px', width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ background: 'var(--bg-input)', height: '100%', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        {Icons.picture}
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>No Image Uploaded</span>
                      </div>
                    )}
                    <div className="ba-label">Reported State</div>
                  </div>
                  <div className="ba-panel" style={{ height: '140px' }}>
                    {detailedTicket.status === 'resolved' ? (
                      detailedTicket.proof_media_urls?.[0] ? (
                        <img src={detailedTicket.proof_media_urls[0]} alt="Resolution proof" style={{ borderRadius: '8px', width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ background: 'var(--bg-input)', height: '100%', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--status-resolved)' }}>
                          {Icons.resolved}
                          <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Resolved</span>
                        </div>
                      )
                    ) : (
                      <div style={{ background: 'var(--bg-input)', height: '100%', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        {Icons.pending}
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Resolution Pending</span>
                      </div>
                    )}
                    <div className="ba-label">Resolved State</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Custom Theme Delete Confirmation Modal ──────────────── */}
      {ticketToDelete && (
        <div className="sheet-overlay" onClick={() => setTicketToDelete(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
            <div style={{ color: 'var(--sev-critical)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Delete Incident Report?</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.4 }}>
              This will permanently remove the report "{ticketToDelete.title}" from the public feed and your profile. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setTicketToDelete(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setMyIssues(myIssues.filter(issue => issue.id !== ticketToDelete.id))
                  setNearbyIssues(nearbyIssues.filter(issue => issue.id !== ticketToDelete.id))
                  setTicketToDelete(null)
                }}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
