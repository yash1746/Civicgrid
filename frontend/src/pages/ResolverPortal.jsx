/**
 * CivicGrid — Dashboard B: Resolver Portal
 * SLA-sorted work queue with geolocation proximity and proof-of-work upload.
 */
import { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/common/Navbar.jsx'
import TaskCard from '../components/resolver/TaskCard.jsx'
import ProofUploader from '../components/resolver/ProofUploader.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import useStore from '../store/useStore.js'
import { getWorkQueue, acceptIssue } from '../api/civicgrid.js'
import useGeolocation from '../hooks/useGeolocation.js'

const IS_DEMO = (token) => token === 'demo-token-civicgrid'

const DEMO_QUEUE = [
  { id: 'r1', title: 'Sewage overflow on main road', category: 'sewage_overflow', severity_level: 'critical', severity_score: 9, status: 'open', department: 'Water & Sanitation Authority', address_text: 'Station Road, Pune', distance_m: 210, sla_urgency: 'overdue', hours_remaining: 6.5, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), media_urls: [], sla_deadline: new Date(Date.now() - 86400000).toISOString() },
  { id: 'r2', title: 'Large pothole blocking left lane', category: 'pothole', severity_level: 'high', severity_score: 8, status: 'assigned', department: 'Department of Roads & Infrastructure', address_text: 'FC Road, Pune', distance_m: 480, sla_urgency: 'critical', hours_remaining: 2.3, created_at: new Date(Date.now() - 86400000).toISOString(), media_urls: [], sla_deadline: new Date(Date.now() + 8280000).toISOString() },
  { id: 'r3', title: 'Broken streetlight near school', category: 'broken_streetlight', severity_level: 'medium', severity_score: 5, status: 'in_progress', department: 'Electrical & Public Lighting', address_text: 'Model Colony', distance_m: 930, sla_urgency: 'high', hours_remaining: 18, created_at: new Date(Date.now() - 43200000).toISOString(), media_urls: [], sla_deadline: new Date(Date.now() + 64800000).toISOString() },
  { id: 'r4', title: 'Garbage bins overflowing at park', category: 'garbage_overflow', severity_level: 'low', severity_score: 3, status: 'open', department: 'Solid Waste Management', address_text: 'Laxmi Road', distance_m: 1200, sla_urgency: 'normal', hours_remaining: 54, created_at: new Date(Date.now() - 21600000).toISOString(), media_urls: [], sla_deadline: new Date(Date.now() + 194400000).toISOString() },
]

const SLA_TABS = [
  { label: 'All', filter: 'open,assigned,in_progress' },
  { label: '🔴 Overdue', filter: 'open,assigned,in_progress', urgency: 'overdue' },
  { label: '🟡 High', filter: 'open,assigned,in_progress', urgency: 'high' },
  { label: '✅ In Progress', filter: 'in_progress' },
]

export default function ResolverPortal() {
  const { user, workQueue, setWorkQueue, token } = useStore()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [proofIssue, setProofIssue] = useState(null)
  const [accepting, setAccepting] = useState(null)
  const { coords, fetchLocation } = useGeolocation()

  useEffect(() => { fetchLocation() }, [fetchLocation])

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    if (IS_DEMO(token)) {
      setWorkQueue(DEMO_QUEUE)
      setLoading(false)
      return
    }
    try {
      const res = await getWorkQueue(coords?.lat, coords?.lng)
      setWorkQueue(res.data.data || [])
    } catch (e) {
      console.warn('Backend offline — using demo data')
      setWorkQueue(DEMO_QUEUE)
    } finally {
      setLoading(false)
    }
  }, [coords, setWorkQueue, token])

  useEffect(() => { fetchQueue() }, [coords, fetchQueue])

  const handleAccept = async (issueId) => {
    setAccepting(issueId)
    try {
      await acceptIssue(issueId)
      fetchQueue()
    } catch (e) {
      console.error('Accept failed:', e)
    } finally {
      setAccepting(null)
    }
  }

  // Filter by active tab
  const filteredQueue = workQueue.filter(issue => {
    const tab = SLA_TABS[activeTab]
    if (tab.urgency) return issue.sla_urgency === tab.urgency
    const statuses = tab.filter.split(',')
    return statuses.includes(issue.status)
  })

  // Sort: overdue > critical > high > normal
  const urgencyOrder = { overdue: 0, critical: 1, high: 2, normal: 3 }
  const sorted = [...filteredQueue].sort(
    (a, b) => (urgencyOrder[a.sla_urgency] || 3) - (urgencyOrder[b.sla_urgency] || 3)
  )

  const overdueCnt = workQueue.filter(i => i.sla_urgency === 'overdue').length
  const criticalCnt = workQueue.filter(i => i.sla_urgency === 'critical').length

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <Navbar
        title="Resolver Portal"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {overdueCnt > 0 && (
              <span style={{
                background: 'var(--severity-critical)', color: '#fff',
                borderRadius: '99px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700,
                animation: 'pulse-red 2s infinite',
              }}>
                {overdueCnt} Overdue
              </span>
            )}
            <button className="btn btn-ghost btn-sm" onClick={fetchQueue}>Refresh</button>
          </div>
        }
      />

      <div style={{ paddingTop: 64, maxWidth: 900, margin: '0 auto', padding: '80px 16px 24px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                       gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Queue', value: workQueue.length, color: 'var(--civic-cyan)' },
            { label: 'Overdue', value: overdueCnt, color: 'var(--severity-critical)' },
            { label: 'Critical', value: criticalCnt, color: 'var(--severity-high)' },
            { label: 'In Progress', value: workQueue.filter(i => i.status === 'in_progress').length,
              color: 'var(--status-progress)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700,
                             color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Location banner */}
        {coords && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
                         background: 'rgba(0,229,255,0.05)', border: '1px solid var(--border-accent)',
                         borderRadius: '8px', padding: '8px 14px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--civic-cyan)' }}>
              📍 Showing distances from your location · Tasks sorted by SLA urgency
            </span>
          </div>
        )}

        {/* Tab Filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {SLA_TABS.map((tab, i) => (
            <button
              key={tab.label}
              className={`btn ${activeTab === i ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Work Queue */}
        {loading ? (
          <LoadingSpinner text="Loading work queue…" size="lg" />
        ) : sorted.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
            <h3>Queue Empty</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              No issues in this category. Great work!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sorted.map(issue => (
              <TaskCard
                key={issue.id}
                issue={issue}
                onAccept={handleAccept}
                onViewProof={setProofIssue}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Proof Upload Modal ─────────────────────────────────── */}
      {proofIssue && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setProofIssue(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>📸 Submit Proof of Work</h3>
              <button className="modal-close" onClick={() => setProofIssue(null)}>×</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {proofIssue.title}
              </p>
            </div>
            <ProofUploader
              issue={proofIssue}
              onClose={() => { setProofIssue(null); fetchQueue() }}
              onValidated={() => fetchQueue()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
