/**
 * CivicGrid — MediaUploader Component
 * CRITICAL: Native geo-extraction from EXIF metadata and browser Geolocation API.
 * Location is NEVER inferred by AI/LLM.
 *
 * Priority chain:
 *   1. EXIF GPS data from uploaded image (most accurate)
 *   2. Browser Geolocation API (fallback)
 *   3. Manual entry (last resort)
 */
import { useRef, useState, useCallback } from 'react'
import useExifExtractor from '../../hooks/useExifExtractor.js'
import useGeolocation from '../../hooks/useGeolocation.js'

const ACCEPT_TYPES = 'image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm'
const MAX_FILES = 5
const MAX_SIZE_MB = 50

export default function MediaUploader({ onMediaChange, onCoordsChange, compact = false }) {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [coordSource, setCoordSource] = useState(null) // 'exif' | 'browser' | 'manual'
  const [coords, setCoords] = useState(null)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const inputRef = useRef(null)

  const { extractFromFile } = useExifExtractor()
  const { fetchLocation, loading: geoLoading, error: geoError } = useGeolocation()

  const applyCoords = useCallback((newCoords, source) => {
    setCoords(newCoords)
    setCoordSource(source)
    onCoordsChange?.(newCoords)
  }, [onCoordsChange])

  const handleFiles = useCallback(async (incoming) => {
    const accepted = Array.from(incoming)
      .filter(f => f.size <= MAX_SIZE_MB * 1024 * 1024)
      .slice(0, MAX_FILES)

    if (accepted.length === 0) return

    // Build preview URLs
    const newPreviews = accepted.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type,
      name: f.name,
    }))
    setFiles(accepted)
    setPreviews(newPreviews)
    onMediaChange?.(accepted)

    // ── Step 1: Try EXIF extraction from first image ───────────────────
    const firstImage = accepted.find(f => f.type.startsWith('image/'))
    if (firstImage) {
      const exifCoords = await extractFromFile(firstImage)
      if (exifCoords) {
        applyCoords(exifCoords, 'exif')
        return // EXIF found — highest priority, stop here
      }
    }

    // ── Step 2: Fallback to Browser Geolocation API ────────────────────
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }, 'browser')
        },
        () => {
          // Step 3: Manual entry — user must type coordinates
          setCoordSource('manual')
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      setCoordSource('manual')
    }
  }, [extractFromFile, applyCoords, onMediaChange])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleRemove = (idx) => {
    const newFiles = files.filter((_, i) => i !== idx)
    const newPreviews = previews.filter((_, i) => i !== idx)
    URL.revokeObjectURL(previews[idx].url)
    setFiles(newFiles)
    setPreviews(newPreviews)
    onMediaChange?.(newFiles)
  }

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      applyCoords({ lat, lng, accuracy: null }, 'manual')
    }
  }

  return (
    <div className="flex-col gap-md" style={{ display: 'flex' }}>
      {/* ── Drop Zone ─────────────────────────────────────────── */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_TYPES}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {previews.length === 0 ? (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📷</div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0' }}>
              Drop photos or videos here
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Up to {MAX_FILES} files · Max {MAX_SIZE_MB}MB each · JPG, PNG, MP4
            </p>
          </div>
        ) : null}
      </div>

      {/* ── Preview Grid ───────────────────────────────────────── */}
      {previews.length > 0 && (
        <div className="upload-preview">
          {previews.map((p, i) => (
            <div key={i} className="upload-preview-item">
              {p.type.startsWith('video/') ? (
                <video src={p.url} muted playsInline />
              ) : (
                <img src={p.url} alt={p.name} />
              )}
              <button className="upload-preview-remove" onClick={(e) => { e.stopPropagation(); handleRemove(i) }}>
                ×
              </button>
            </div>
          ))}
          {previews.length < MAX_FILES && (
            <div
              className="upload-preview-item"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                       border: '2px dashed var(--border-default)', cursor: 'pointer',
                       color: 'var(--text-muted)', fontSize: '1.5rem' }}
              onClick={() => inputRef.current?.click()}
            >
              +
            </div>
          )}
        </div>
      )}

      {/* ── Geo Coordinate Status ──────────────────────────────── */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {coords ? (
              <span className="geo-badge geo-badge-success">
                📍 {coordSource === 'exif' ? 'EXIF GPS' : coordSource === 'browser' ? 'GPS' : 'Manual'} ·{' '}
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            ) : coordSource === 'manual' ? (
              <span className="geo-badge geo-badge-error">📍 Location required</span>
            ) : (
              <span className="geo-badge geo-badge-loading">
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                Detecting location…
              </span>
            )}
          </div>

          {/* Manual entry fallback */}
          {coordSource === 'manual' && !coords && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                placeholder="Latitude (e.g. 19.0760)"
                value={manualLat}
                onChange={e => setManualLat(e.target.value)}
                style={{ flex: 1, minWidth: 140 }}
                type="number"
                step="any"
              />
              <input
                className="form-input"
                placeholder="Longitude (e.g. 72.8777)"
                value={manualLng}
                onChange={e => setManualLng(e.target.value)}
                style={{ flex: 1, minWidth: 140 }}
                type="number"
                step="any"
              />
              <button className="btn btn-ghost btn-sm" onClick={handleManualSubmit}>
                Set
              </button>
            </div>
          )}

          {/* Source explanation */}
          {coordSource && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {coordSource === 'exif'
                ? '✓ Location extracted from image EXIF metadata (most accurate)'
                : coordSource === 'browser'
                ? '✓ Location from device GPS'
                : '⚠ Location entered manually'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
