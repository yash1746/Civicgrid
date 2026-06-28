/**
 * CivicGrid — ProofUploader Component
 * Camera-first media upload for resolver proof-of-work submission.
 * Before/after comparison display with Vision Agent validation result.
 */
import { useRef, useState } from 'react'
import { submitProofOfWork } from '../../api/civicgrid.js'

export default function ProofUploader({ issue, onClose, onValidated }) {
  const [proofFiles, setProofFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const cameraRef = useRef(null)

  const handleFiles = (incoming) => {
    const accepted = Array.from(incoming).slice(0, 5)
    setProofFiles(accepted)
    setPreviews(accepted.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type,
    })))
  }

  const handleSubmit = async () => {
    if (!proofFiles.length) return
    setSubmitting(true)
    setError(null)

    const formData = new FormData()
    proofFiles.forEach(f => formData.append('proof_media', f))

    try {
      const res = await submitProofOfWork(issue.id, formData)
      const data = res.data.data
      setResult(data)
      if (data.is_validated) onValidated?.(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
          {result.is_validated ? '✅' : '⚠️'}
        </div>
        <h3 style={{ marginBottom: '8px' }}>
          {result.is_validated ? 'Proof Accepted!' : 'Needs More Evidence'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {result.notes}
        </p>
        <div className="card" style={{ textAlign: 'left', marginBottom: '16px' }}>
          {[
            ['AI Confidence', `${(result.confidence_score * 100).toFixed(0)}%`],
            ['Resolution Quality', result.resolution_quality],
            ['Ticket Status', result.status?.replace('_', ' ')],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                       padding: '6px 0', fontSize: '0.85rem',
                                       borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" onClick={onClose}>Close</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Before image preview */}
      {issue.media_urls?.[0] && (
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Before (Original Issue)
          </p>
          <img
            src={issue.media_urls[0]}
            alt="before"
            style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '180px' }}
          />
        </div>
      )}

      {/* After image upload */}
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          After (Your Proof of Work)
        </p>

        {/* Camera-first capture */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => cameraRef.current?.click()}
          >
            📷 Take Photo
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => inputRef.current?.click()}
          >
            📁 Gallery
          </button>
        </div>

        {/* Camera input */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
          multiple
        />
        {/* Gallery input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
          multiple
        />

        {/* Previews */}
        {previews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {previews.map((p, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: '8px',
                                    overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                {p.type.startsWith('video/')
                  ? <video src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={p.url} alt="proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                       borderRadius: '8px', padding: '12px', color: 'var(--severity-critical)',
                       fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        🤖 Our AI Vision Agent will compare your before/after photos to validate the fix.
      </p>

      <button
        className="btn btn-accent btn-full"
        disabled={!proofFiles.length || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <><span className="spinner" style={{ width: 16, height: 16 }} /> Validating with AI…</>
        ) : (
          '✅ Submit Proof of Work'
        )}
      </button>
    </div>
  )
}
