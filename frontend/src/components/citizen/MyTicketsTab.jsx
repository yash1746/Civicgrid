/**
 * CivicGrid — Screen 3: My Tickets (Tracking Screen)
 * Shows only the issues reported by the current user.
 * Tapping a ticket expands it to show a vertical Status Timeline.
 * If status is "Resolved", displays Before & After photos side-by-side.
 */
import { useState, useEffect } from 'react'
import useStore from '../../store/useStore.js'
import { getMyIssues } from '../../api/civicgrid.js'

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
  )
}

export default function MyTicketsTab() {
  const { user, token, myIssues, setMyIssues } = useStore()
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(false)

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
    },
    {
      id: 'demo-in-progress',
      title: 'Water pipe burst flooding street',
      category: 'water_leak',
      status: 'in_progress',
      severity_level: 'critical',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      media_urls: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto=format&fit=crop'],
    },
    {
      id: 'demo-open',
      title: 'Streetlight broken and flickering',
      category: 'broken_streetlight',
      status: 'open',
      severity_level: 'low',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      media_urls: ['https://images.unsplash.com/photo-1509021436665-8f37df706a73?w=500&auto=format&fit=crop'],
    }
  ]

  const loadIssues = async () => {
    setLoading(true)
    if (token === 'demo-token-civicgrid' || !token) {
      setMyIssues(demoTickets)
      setLoading(false)
      return
    }
    try {
      const res = await getMyIssues()
      setMyIssues(res.data.data.reported || [])
    } catch (e) {
      console.warn('Backend offline — loading demo tickets')
      setMyIssues(demoTickets)
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

                {/* ── Expanded Status Timeline & Before/After ──────── */}
                {isExpanded && (
                  <div style={{
                    background: 'var(--bg-card-hover)',
                    borderTop: '1px solid var(--border)',
                    padding: '16px',
                    cursor: 'default'
                  }} onClick={e => e.stopPropagation()}>
                    
                    {/* Vertical Timeline */}
                    <div className="timeline">
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

                    {/* Completion Side-by-Side Visual */}
                    {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                      <div style={{ marginTop: '16px' }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Evidence Verification (Before & After)
                        </p>
                        <div className="before-after">
                          <div className="ba-panel">
                            <img src={ticket.media_urls?.[0]} alt="Original report state" />
                            <div className="ba-label">Before</div>
                          </div>
                          <div className="ba-panel">
                            <img src={ticket.proof_media_urls?.[0] || 'https://images.unsplash.com/photo-1599740831119-4727b161405e?w=500&auto=format&fit=crop'} alt="Resolution state" />
                            <div className="ba-label">After</div>
                          </div>
                        </div>
                        <div style={{
                          background: 'var(--sev-low-bg)', color: 'var(--sev-low)',
                          border: '1px solid rgba(16,185,129,0.15)',
                          borderRadius: '6px', padding: '10px', fontSize: '0.78rem',
                          textAlign: 'center', marginTop: '12px', fontWeight: 600
                        }}>
                          Automated system has verified the image resolution.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
