/**
 * CivicGrid — LocationPickerMap Component
 * Interactive Leaflet map allowing user to click to place a marker
 * or drag the marker to adjust incident coordinates.
 */
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'

// Fix default Leaflet icon assets
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Listen to map click events to select coordinate locations
function MapEventsHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

// Recenter map viewport when center coordinate updates
function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  return null
}

export default function LocationPickerMap({ coords, onLocationSelect, zoom = 14, disabled = false }) {
  const center = coords ? [coords.lat, coords.lng] : [19.076, 72.8777]

  return (
    <div style={{ height: '240px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', opacity: disabled ? 0.8 : 1, transition: 'opacity var(--t-fast)' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={!disabled}
        dragging={!disabled}
        doubleClickZoom={!disabled}
        scrollWheelZoom={!disabled}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />

        {coords && (
          <Marker
            position={[coords.lat, coords.lng]}
            draggable={!disabled}
            eventHandlers={{
              dragend(e) {
                const marker = e.target
                const position = marker.getLatLng()
                onLocationSelect(position.lat, position.lng)
              }
            }}
          />
        )}

        {!disabled && <MapEventsHandler onLocationSelect={onLocationSelect} />}
        <RecenterMap center={center} />
      </MapContainer>
    </div>
  )
}
