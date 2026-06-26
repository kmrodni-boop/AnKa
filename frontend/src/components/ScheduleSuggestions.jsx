import React from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

export default function ScheduleSuggestions({ order }){
  const [suggestions, setSuggestions] = React.useState([])
  const mapRef = React.useRef(null)
  const mapContainerRef = React.useRef(null)

  React.useEffect(()=>{
    if (!order) return
    fetch('/api/schedule/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id }) })
      .then(r=>r.json()).then(setSuggestions)
  },[order])

  React.useEffect(()=>{
    if (!mapContainerRef.current) return
    if (mapRef.current) mapRef.current.remove()
    mapRef.current = L.map(mapContainerRef.current).setView([order.lat || 60.4, order.lng || 5.3], 8)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(mapRef.current)
    L.marker([order.lat, order.lng]).addTo(mapRef.current).bindPopup('Order location')
    suggestions.forEach(s => {
      const t = s.technician
      if (t && t.base_lat && t.base_lng) L.marker([t.base_lat, t.base_lng], { title: t.name }).addTo(mapRef.current).bindPopup(t.name)
    })
  },[mapContainerRef.current, suggestions, order])

  return (
    React.createElement('div', null,
      React.createElement('h3', null, `Suggestions for order ${order.id} (${order.type})`),
      React.createElement('div', null,
        suggestions.length === 0 ? React.createElement('div', null, 'Loading...') : React.createElement('ul', null, suggestions.map((s, i) => React.createElement('li', { key: i },
          React.createElement('strong', null, s.technician.name), ' — ', s.start, ' → ', s.end, ' (score ', s.score, ') ', React.createElement('br', null), s.reason
        )))
      ),
      React.createElement('div', { ref: mapContainerRef, style: { height: 300, marginTop: 12 } })
    )
  )
}
