/**
 * CivicGrid — useGeolocation Hook
 * Browser Geolocation API wrapper with accuracy tracking.
 * CRITICAL: This is the primary location source for reports.
 */
import { useState, useEffect, useCallback } from 'react'

export default function useGeolocation() {
  const [coords, setCoords] = useState(null)      // { lat, lng, accuracy }
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(null)       // 'browser' | 'exif'

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setSource('browser')
        setLoading(false)
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Try enabling GPS.',
          3: 'Location request timed out.',
        }
        setError(messages[err.code] || 'Unknown location error.')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Accept cached position up to 1 minute old
      }
    )
  }, [])

  const setExifCoords = useCallback((lat, lng) => {
    setCoords({ lat, lng, accuracy: 0 })
    setSource('exif')
  }, [])

  return { coords, error, loading, source, fetchLocation, setExifCoords }
}
