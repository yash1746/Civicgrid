/**
 * CivicGrid — IssueMap Component
 * Leaflet map with issue clusters and popup details.
 */
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom severity icons
function createIssueIcon(severity_level) {
  const colors = {
    low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444',
  }
  const color = colors[severity_level] || colors.medium
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:3px solid rgba(255,255,255,0.9);
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;
    ">🔴</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const CATEGORY_ICONS = {
  pothole: '🕳️', water_leak: '💧', broken_streetlight: '💡',
  garbage_overflow: '🗑️', fallen_tree: '🌳', road_damage: '🛣️',
  graffiti: '🎨', flooding: '🌊', sewage_overflow: '⚠️', other: '📌',
}

function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export default function IssueMap({
  issues = [],
  userLocation = null,
  center = [20.5937, 78.9629],
  zoom = 13,
  height = 'calc(100dvh - 64px)',
  onIssueClick,
}) {
  return (
    <div className="map-container" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url={import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />

        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="
                  width:16px;height:16px;border-radius:50%;
                  background:var(--civic-cyan);border:3px solid white;
                  box-shadow:0 0 12px rgba(0,229,255,0.6);
                "></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            >
              <Popup>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  📍 Your Location
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={200}
              pathOptions={{ color: '#00E5FF', fillColor: '#00E5FF', fillOpacity: 0.05, weight: 1 }}
            />
          </>
        )}

        {issues.map((issue) => {
          // Supabase returns location as WKT or GeoJSON — handle both
          let lat, lng
          if (issue.lat && issue.lng) {
            lat = issue.lat; lng = issue.lng
          } else {
            return null
          }

          const icon = CATEGORY_ICONS[issue.category] || '📌'
          return (
            <Marker
              key={issue.id}
              position={[lat, lng]}
              icon={createIssueIcon(issue.severity_level)}
              eventHandlers={{ click: () => onIssueClick?.(issue) }}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                    {icon} {issue.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '8px' }}>
                    {issue.category?.replace('_', ' ')} · {issue.severity_level}
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>
                    Status:{' '}
                    <span style={{ fontWeight: 600, color: '#00E5FF' }}>
                      {issue.status?.replace('_', ' ')}
                    </span>
                  </div>
                  {issue.distance_m != null && (
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                      {issue.distance_m < 1000
                        ? `${Math.round(issue.distance_m)}m away`
                        : `${(issue.distance_m / 1000).toFixed(1)}km away`}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        <RecenterMap center={userLocation ? [userLocation.lat, userLocation.lng] : center} />
      </MapContainer>
    </div>
  )
}
