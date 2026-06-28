/**
 * CivicGrid — IssueTimeline Component
 * Shows citizen's reported and co-reported issues in reverse chronological order.
 */
import { formatDistanceToNow } from 'date-fns'

const STATUS_ICONS = {
  open: '📋', assigned: '🏛️', in_progress: '🔧',
  resolved: '✅', escalated: '⚠️', closed: '🔒',
}
const CATEGORY_ICONS = {
  pothole: '🕳️', water_leak: '💧', broken_streetlight: '💡',
  garbage_overflow: '🗑️', fallen_tree: '🌳', road_damage: '🛣️',
  graffiti: '🎨', flooding: '🌊', sewage_overflow: '⚠️', other: '📌',
}

function StatusBadge({ status }) {
  const colors = {
    open: 'var(--status-open)',
    assigned: 'var(--status-assigned)',
    in_progress: 'var(--status-progress)',
    resolved: 'var(--status-resolved)',
    escalated: 'var(--status-escalated)',
    closed: 'var(--status-closed)',
  }
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
      background: `${colors[status] || colors.open}22`,
      color: colors[status] || colors.open,
      border: `1px solid ${colors[status] || colors.open}44`,
    }}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function IssueTimeline({ issues = [], coReportedIds = [] }) {
  if (issues.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📭</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No issues reported yet.<br />Tap the + button to report your first issue.
        </p>
      </div>
    )
  }

  return (
    <div>
      {issues.map((issue) => {
        const isCoReport = coReportedIds.includes(issue.id)
        const icon = CATEGORY_ICONS[issue.category] || '📌'
        const statusIcon = STATUS_ICONS[issue.status] || '📋'
        const timeAgo = issue.created_at
          ? formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })
          : '—'

        return (
          <div key={issue.id} className="timeline-item">
            <div className="timeline-dot" style={{
              background: isCoReport
                ? 'rgba(124,58,237,0.2)'
                : 'rgba(0,229,255,0.15)',
              border: `1px solid ${isCoReport ? 'var(--civic-purple)' : 'var(--civic-cyan)'}`,
            }}>
              {icon}
            </div>
            <div className="timeline-content">
              <div className="timeline-title">{issue.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                <StatusBadge status={issue.status} />
                {isCoReport && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--civic-purple)', fontWeight: 600 }}>
                    Co-reporter
                  </span>
                )}
              </div>
              <div className="timeline-meta">{timeAgo}</div>
            </div>
            {issue.media_urls?.[0] && (
              <img
                src={issue.media_urls[0]}
                alt="issue"
                style={{ width: 48, height: 48, borderRadius: '8px',
                         objectFit: 'cover', flexShrink: 0 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
