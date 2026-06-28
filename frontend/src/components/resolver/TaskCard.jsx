/**
 * CivicGrid — TaskCard (Resolver Portal)
 * Displays an individual work queue item with SLA countdown.
 */
import { formatDistanceToNow } from 'date-fns'

const CATEGORY_ICONS = {
  pothole: '🕳️', water_leak: '💧', broken_streetlight: '💡',
  garbage_overflow: '🗑️', fallen_tree: '🌳', road_damage: '🛣️',
  graffiti: '🎨', flooding: '🌊', sewage_overflow: '⚠️', other: '📌',
}

function SLACountdown({ urgency, hoursRemaining }) {
  const cls = urgency === 'overdue' || urgency === 'critical'
    ? 'sla-countdown-critical'
    : urgency === 'high'
    ? 'sla-countdown-high'
    : 'sla-countdown-normal'

  if (hoursRemaining == null) return null

  const label = urgency === 'overdue'
    ? `${hoursRemaining}h overdue ⚠`
    : urgency === 'critical'
    ? `${hoursRemaining}h left ⏰`
    : `${Math.round(hoursRemaining)}h remaining`

  return (
    <span className={`sla-countdown ${cls}`}>{label}</span>
  )
}

export default function TaskCard({ issue, onAccept, onViewProof }) {
  const icon = CATEGORY_ICONS[issue.category] || '📌'
  const slaClass = `sla-${issue.sla_urgency || 'normal'}`
  const timeAgo = issue.created_at
    ? formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })
    : '—'

  return (
    <div className={`queue-item ${slaClass}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Thumbnail */}
        {issue.media_urls?.[0] ? (
          <img className="queue-item-thumb" src={issue.media_urls[0]} alt="issue" />
        ) : (
          <div className="queue-item-thumb" style={{
            background: 'var(--bg-elevated)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
          }}>
            {icon}
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="queue-item-title">{issue.title}</div>
          <div className="queue-item-meta" style={{ margin: '2px 0' }}>
            {icon} {issue.category?.replace('_', ' ')} · {issue.department}
          </div>
          {issue.address_text && (
            <div className="queue-item-meta">📍 {issue.address_text}</div>
          )}
          {issue.distance_m != null && (
            <div className="queue-item-meta">
              📏 {issue.distance_m < 1000
                ? `${Math.round(issue.distance_m)}m from you`
                : `${(issue.distance_m / 1000).toFixed(1)}km from you`}
            </div>
          )}
        </div>

        {/* Severity badge */}
        <span className={`badge badge-${issue.severity_level}`}>
          {issue.severity_level} · {issue.severity_score}/10
        </span>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '8px' }}>
        <SLACountdown urgency={issue.sla_urgency} hoursRemaining={issue.hours_remaining} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo}</span>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {issue.status !== 'in_progress' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onAccept?.(issue.id)}
            >
              Accept Task
            </button>
          )}
          <button
            className="btn btn-accent btn-sm"
            onClick={() => onViewProof?.(issue)}
          >
            Submit Proof
          </button>
        </div>
      </div>
    </div>
  )
}
