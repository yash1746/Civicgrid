/**
 * CivicGrid — Civic Trust Score Component
 * Gamification display with animated ring progress.
 */

const LEVEL_THRESHOLDS = [
  { label: 'Newcomer',    min: 0,    icon: '🌱' },
  { label: 'Contributor', min: 50,   icon: '🔥' },
  { label: 'Guardian',    min: 150,  icon: '⚡' },
  { label: 'Champion',    min: 300,  icon: '🏆' },
  { label: 'Legend',      min: 600,  icon: '🌟' },
]

function getLevel(score) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= LEVEL_THRESHOLDS[i].min) return LEVEL_THRESHOLDS[i]
  }
  return LEVEL_THRESHOLDS[0]
}

function getProgress(score) {
  const idx = LEVEL_THRESHOLDS.findIndex(l => l.min > score)
  if (idx <= 0) return 100
  const prev = LEVEL_THRESHOLDS[idx - 1].min
  const next = LEVEL_THRESHOLDS[idx].min
  return Math.min(100, ((score - prev) / (next - prev)) * 100)
}

export default function CivicTrustScore({ score = 0 }) {
  const level = getLevel(score)
  const progress = getProgress(score)
  const pct = `${progress.toFixed(0)}%`

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
        Civic Trust Score
      </p>

      {/* Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <div
          className="trust-score-ring"
          style={{ '--score-pct': pct }}
        >
          <span className="trust-score-value">{score}</span>
        </div>
      </div>

      {/* Level */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '1.3rem' }}>{level.icon}</span>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 2px',
                    fontFamily: 'var(--font-display)' }}>
          {level.label}
        </p>
      </div>

      {/* Progress bar to next level */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: pct,
          background: 'linear-gradient(90deg, var(--civic-blue), var(--civic-cyan))',
          borderRadius: '99px',
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
        {progress < 100 ? `${Math.round(progress)}% to next level` : 'Max level reached!'}
      </p>

      {/* Points breakdown legend */}
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          ['📋 New report', '+10 pts'],
          ['🔍 Co-verify', '+5 pts'],
          ['✅ Resolve', '+20 pts'],
        ].map(([action, pts]) => (
          <div key={action} style={{ display: 'flex', justifyContent: 'space-between',
                                     fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>{action}</span>
            <span style={{ color: 'var(--civic-cyan)', fontWeight: 600 }}>{pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
