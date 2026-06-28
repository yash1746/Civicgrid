/**
 * CivicGrid — useExifExtractor Hook
 * Extracts GPS coordinates from image EXIF metadata using the `exifr` library.
 * This is the PRIMARY location source — no AI/LLM involvement.
 *
 * Priority: EXIF GPS data > Browser Geolocation API
 */
import { useCallback, useState } from 'react'
import * as exifr from 'exifr'

export default function useExifExtractor() {
  const [exifData, setExifData] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  /**
   * Extract GPS coordinates from an image File object.
   * Returns { lat, lng } or null if no GPS data present.
   */
  const extractFromFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setExifData(null)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // exifr.gps() extracts only GPS tags — fast and lightweight
      const gps = await exifr.gps(file)

      if (gps && gps.latitude != null && gps.longitude != null) {
        const coords = {
          lat: parseFloat(gps.latitude.toFixed(7)),
          lng: parseFloat(gps.longitude.toFixed(7)),
          source: 'exif',
        }
        setExifData(coords)
        setLoading(false)
        return coords
      }

      // GPS tags not found in EXIF
      setExifData(null)
      setLoading(false)
      return null
    } catch (err) {
      console.warn('[EXIF] Extraction failed:', err)
      setError('Could not read EXIF data from image.')
      setExifData(null)
      setLoading(false)
      return null
    }
  }, [])

  /**
   * Extract additional EXIF metadata (camera info, timestamp, etc.)
   * Used for display purposes only — NOT for location determination.
   */
  const extractMetadata = useCallback(async (file) => {
    try {
      return await exifr.parse(file, {
        pick: ['DateTimeOriginal', 'Make', 'Model', 'ImageWidth', 'ImageHeight'],
      })
    } catch {
      return null
    }
  }, [])

  return { exifData, loading, error, extractFromFile, extractMetadata }
}
