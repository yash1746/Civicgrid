/**
 * CivicGrid — ReportFlow Component
 * Multi-step issue reporting wizard with native geo extraction.
 */
import { useState } from 'react'
import MediaUploader from '../common/MediaUploader.jsx'
import { reportIssue } from '../../api/civicgrid.js'

const STEPS = ['Media & Location', 'Issue Details', 'Review & Submit']

export default function ReportFlow({ onClose, onSuccess }) {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState([])
  const [coords, setCoords] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const canProceedStep0 = files.length > 0 && coords
  const canProceedStep1 = title.trim().length >= 5

  const handleSubmit = async () => {
    if (!coords || !files.length) return
    setSubmitting(true)
    setError(null)

    const formData = new FormData()
    files.forEach(f => formData.append('media', f))
    formData.append('latitude', coords.lat)
    formData.append('longitude', coords.lng)
    formData.append('title', title)
    if (description) formData.append('description', description)
    if (address) formData.append('address_text', address)

    try {
      const res = await reportIssue(formData)
      setResult(res.data.data)
      onSuccess?.(res.data.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
          {result.is_duplicate ? '🔗' : '✅'}
        </div>
        <h3 style={{ marginBottom: '8px' }}>
          {result.is_duplicate ? 'Linked to Existing Issue' : 'Issue Reported!'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {result.message}
        </p>
        {!result.is_duplicate && (
          <div className="card" style={{ textAlign: 'left', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                ['Category', result.category?.replace('_', ' ')],
                ['Severity', result.severity_score + '/10'],
                ['Routed to', result.department],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                          fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-accent btn-full" onClick={onClose}>Done</button>
      </div>
    )
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <>
            <div
              key={s}
              className={`step ${i === step ? 'step-active' : i < step ? 'step-done' : 'step-idle'}`}
              title={s}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div key={`line-${i}`} className={`step-line ${i < step ? 'step-line-done' : ''}`} />
            )}
          </>
        ))}
      </div>

      <h3 style={{ marginBottom: '16px' }}>{STEPS[step]}</h3>

      {/* Step 0: Media Upload */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <MediaUploader
            onMediaChange={setFiles}
            onCoordsChange={setCoords}
          />
          {!canProceedStep0 && files.length > 0 && !coords && (
            <p style={{ fontSize: '0.8rem', color: 'var(--severity-medium)' }}>
              ⚠ Waiting for location detection…
            </p>
          )}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Issue Title *</label>
            <input
              className="form-input"
              placeholder="e.g., Large pothole blocking bicycle lane"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Describe the issue in more detail…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Address / Landmark (optional)</label>
            <input
              className="form-input"
              placeholder="e.g., Near Raj Bhavan, MG Road"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '16px' }}>
            {[
              ['Files', `${files.length} media file(s)`],
              ['Location', coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : '—'],
              ['Title', title],
              ['Description', description || '—'],
              ['Address', address || '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '6px 0', borderBottom: '1px solid var(--border-subtle)',
                                        fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 500, maxWidth: '60%', textAlign: 'right',
                               wordBreak: 'break-word' }}>{val}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🤖 Our AI will classify the issue category and route it to the right department automatically.
          </p>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                           borderRadius: '8px', padding: '12px', color: 'var(--severity-critical)',
                           fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
            ← Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
            onClick={() => setStep(s => s + 1)}
          >
            Next →
          </button>
        ) : (
          <button
            className="btn btn-accent"
            style={{ flex: 1 }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</>
            ) : (
              '🚀 Submit Report'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
