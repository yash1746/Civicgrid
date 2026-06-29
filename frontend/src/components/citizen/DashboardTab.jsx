/**
 * CivicGrid — Screen 1: The Dashboard (Default Home Screen)
 * Top half: Landing Page style Hero section
 * Center: Dashboard statistics banner (Total, Resolved, Pending)
 * Bottom half: Incident cards feed styled as a clean feed grid
 * stuck FAB: Bottom right corner trigger for Upload Problem screen
 */
import { useEffect, useState } from 'react'
import useStore from '../../store/useStore.js'
import useGeolocation from '../../hooks/useGeolocation.js'

// Clean category text mapper
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

const Icons = {
  plus: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
  ),
  pin: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  )
}

export default function DashboardTab({ onReportClick }) {
  const { nearbyIssues } = useStore()
  const { coords, fetchLocation } = useGeolocation()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [feedQuery, setFeedQuery] = useState('')

  useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  // Dynamically extract categories from real-time captured issues
  const uniqueCategories = ['all', ...new Set(nearbyIssues.map(issue => issue.category).filter(Boolean))]
  const categories = uniqueCategories.map(cat => ({
    value: cat,
    label: cat === 'all' 
      ? 'All Reports' 
      : (CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  }))

  // Calculate dynamic dashboard stats
  const totalReported = nearbyIssues.length
  const totalResolved = nearbyIssues.filter(issue => issue.status === 'resolved' || issue.status === 'closed').length
  const totalPending = totalReported - totalResolved

  // Filter issues based on chip selection & search query
  const filteredIssues = nearbyIssues.filter(issue => {
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory
    const matchesSearch = issue.title.toLowerCase().includes(feedQuery.toLowerCase()) || 
                          (issue.address_text && issue.address_text.toLowerCase().includes(feedQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Hero Section (Landing Page Style) ─────────────────── */}
      <div className="hero-section">
        <div className="hero-text-content">
          <h1 className="hero-title">Civic Issue Reporting & Resolution System</h1>
          <p className="hero-subtitle">
            A secure, automated platform linking citizens with municipal authorities. Reports are classified, verified for duplication, and routed to relevant departments in real-time.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={onReportClick}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '8px' }}
          >
            <span>{Icons.plus}</span>
            <span>Report an Issue</span>
          </button>
        </div>
        <div className="hero-image-content">
          <img src="/civicgrid_city_hero.png" alt="Municipal District" />
        </div>
      </div>

      {/* ── Stats Dashboard Section ──────────────────────────── */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '24px 16px' }}>
        <div className="desktop-centered-container" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Total Reports */}
            <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Nearby Reports
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {totalReported}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Logged inside your sector
              </span>
            </div>

            {/* Resolved */}
            <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--status-resolved)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Resolved
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-resolved)' }}>
                {totalResolved}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Closed municipal logs
              </span>
            </div>

            {/* Pending Action */}
            <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--status-progress)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Action
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-progress)' }}>
                {totalPending}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Assigned or in progress
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Category Chips Filter ─────────────────────────────── */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
        <div className="desktop-centered-container" style={{ padding: 0 }}>
          <div className="chip-scroll">
            {categories.map(cat => (
              <button
                key={cat.value}
                className={`chip ${selectedCategory === cat.value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feed Container ────────────────────────────────────── */}
      <div className="desktop-centered-container" style={{ flex: 1, padding: '24px 16px' }}>
        
        {/* Search and Counts Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          {/* Feed Search Input */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {Icons.search}
            </span>
            <input
              className="form-input"
              placeholder="Search reports by title or road..."
              value={feedQuery}
              onChange={e => setFeedQuery(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem', borderRadius: '6px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Nearby Incidents
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '99px', padding: '2px 8px', color: 'var(--text-secondary)' }}>
              {filteredIssues.length} active
            </span>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>{Icons.info}</div>
            <h3>No matching issues found</h3>
            <p style={{ fontSize: '0.8rem' }}>No active reports fit your active category or filter search terms.</p>
          </div>
        ) : (
          <div className="incident-grid">
            {filteredIssues.map(issue => {
              const label = CATEGORY_LABELS[issue.category] || 'Reported Incident'
              return (
                <div key={issue.id} className="card issue-card">
                  {issue.media_urls?.[0] ? (
                    <img className="issue-card-thumb" src={issue.media_urls[0]} alt="evidence thumbnail" />
                  ) : (
                    <div className="issue-card-thumb" style={{ background: 'var(--bg-input)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Icons.pin}
                    </div>
                  )}
                  <div className="issue-card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      {/* Top Category Badge / Label Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                          {label}
                        </span>
                        {issue.distance_m && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {Math.round(issue.distance_m)}m away
                          </span>
                        )}
                      </div>

                      <h4 className="issue-card-title" style={{ fontSize: '0.92rem', fontWeight: 700, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', height: 'auto', marginBottom: '6px' }}>
                        {issue.title}
                      </h4>
                    </div>

                    <div>
                      <div className="issue-card-meta" style={{ marginBottom: '10px' }}>
                        <span>{issue.address_text || 'GPS Coordinates Logged'}</span>
                      </div>
                      
                      <div className="issue-card-badges" style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <span className={`badge badge-${issue.severity_level || 'low'}`} style={{ textTransform: 'uppercase', fontSize: '0.62rem' }}>
                          {issue.severity_level}
                        </span>
                        <span className={`badge badge-${issue.status || 'open'}`} style={{ textTransform: 'uppercase', fontSize: '0.62rem' }}>
                          {issue.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stuck Floating Action Button (Clean plus icon) */}
      <button
        id="dashboard-fab"
        className="fab"
        onClick={onReportClick}
        title="File Incident Report"
        aria-label="File Incident Report"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {Icons.plus}
      </button>
    </div>
  )
}
