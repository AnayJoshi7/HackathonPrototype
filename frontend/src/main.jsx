import React from 'react'
import { createRoot } from 'react-dom/client'
import { GeoJSON, MapContainer, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import { ArrowUpRight, BadgeCheck, Database, FileCheck2, Layers3, Route, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './styles.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const owners = ['Amar Soni', 'Ananya Yadav', 'Aditya Shukla', 'Akshay Gupta', 'Mahesh Kadu']
const landTypes = ['Agricultural', 'Residential', 'Orchard', 'Barren']
const satelliteSamples = {
  101: {
    parcelId: '101',
    title: 'Plot 101',
    status: 'No significant change detected',
    changeType: 'No significant change',
    changePercentage: 0.8,
    confidence: 0.12,
    requiresVerification: false,
    before: '/assets/satellite/parcel-101-before.svg',
    after: '/assets/satellite/parcel-101-after.svg',
    detectionDate: '2026-09-18'
  },
  102: {
    parcelId: '102',
    title: 'Plot 102',
    status: 'Significant change detected',
    changeType: 'Possible new structure',
    changePercentage: 4.7,
    confidence: 0.82,
    requiresVerification: true,
    before: '/assets/satellite/parcel-102-before.svg',
    after: '/assets/satellite/parcel-102-after.svg',
    detectionDate: '2026-09-18'
  },
  103: {
    parcelId: '103',
    title: 'Plot 103',
    status: 'Minor vegetation change',
    changeType: 'Vegetation / minor change',
    changePercentage: 1.8,
    confidence: 0.58,
    requiresVerification: true,
    before: '/assets/satellite/parcel-103-before.svg',
    after: '/assets/satellite/parcel-103-after.svg',
    detectionDate: '2026-09-18'
  }
}
const fallbackParcels = Array.from({ length: 18 }, (_, index) => {
  const column = index % 6
  const row = Math.floor(index / 6)
  const west = 73.78 + column * 0.0022
  const south = 18.52 + row * 0.0022
  return {
    id: index + 1,
    khasra_no: `KSR-${1041 + index}`,
    owner_name: owners[index % owners.length],
    land_type: landTypes[index % landTypes.length],
    circle_rate: 1650 + (index % 4) * 325,
    area_sq_m: 49200,
    district: 'Pune',
    geometry: { type: 'Polygon', coordinates: [[[west, south], [west + 0.002, south], [west + 0.002, south + 0.002], [west, south + 0.002], [west, south]]] }
  }
})

function MapClick({ onPoint }) {
  useMapEvents({ click: event => onPoint([event.latlng.lng, event.latlng.lat]) })
  return null
}

function App() {
  const [parcels, setParcels] = React.useState(fallbackParcels)
  const [selected, setSelected] = React.useState(fallbackParcels[7])
  const [corridor, setCorridor] = React.useState([])
  const [affected, setAffected] = React.useState([])
  const [status, setStatus] = React.useState('LIVE DEMO DATA')
  const [monitoringOpen, setMonitoringOpen] = React.useState(false)
  const [monitoring, setMonitoring] = React.useState(satelliteSamples[102])

  React.useEffect(() => {
    fetch(`${API}/api/gis/parcels`).then(response => response.ok ? response.json() : Promise.reject()).then(setParcels).catch(() => {})
  }, [])

  React.useEffect(() => {
    if (monitoringOpen && selected) {
      const sampleKey = selected.id % 3 === 0 ? 103 : selected.id % 2 === 0 ? 102 : 101
      setMonitoring(satelliteSamples[sampleKey])
    }
  }, [selected, monitoringOpen])

  const runAnalysis = async () => {
    if (corridor.length < 2) return
    setStatus('ANALYZING CORRIDOR')
    try {
      const response = await fetch(`${API}/api/gis/corridor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: corridor, width_m: 30 }) })
      const data = await response.json()
      setAffected(data.affected_parcels || [])
      setStatus(`${data.affected_parcels?.length || 0} PARCELS AFFECTED`)
    } catch {
      setAffected(parcels.filter((_, index) => index % 3 === 0).map(parcel => ({ ...parcel, affected_area_sq_m: 1180, estimated_compensation: parcel.circle_rate * 1180 * 4 })))
      setStatus('DEMO ANALYSIS COMPLETE')
    }
  }

  const total = affected.reduce((sum, item) => sum + (item.estimated_compensation || 0), 0)
  const initials = selected?.owner_name.split(' ').map(value => value[0]).join('')

  const openSatelliteMonitoring = () => {
    setMonitoringOpen(true)
    const sampleKey = selected?.id % 3 === 0 ? 103 : selected?.id % 2 === 0 ? 102 : 101
    setMonitoring(satelliteSamples[sampleKey])
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><strong>N-LAMS</strong><span>National Land Acquisition &amp; Management System</span></div>
        <div className="top-actions"><span className="live"><i /> System Online</span><div className="avatar" aria-label="User profile">AM</div></div>
      </header>

      <section className="workspace-head">
        <div><div className="eyebrow">Project / NH-48 Expansion</div><h1>Corridor impact command</h1><p>Survey, value and monitor land acquisition from one verified workspace.</p></div>
        <div className="head-meta"><div className="metric"><small>Projected<br />Acquisition</small><strong>{affected.length || 18} parcels</strong></div><div className="metric"><small>Est. Liability</small><strong>₹{(total || 48200000).toLocaleString('en-IN')}</strong></div><button className="primary" onClick={runAnalysis} aria-label="Run analysis"><Sparkles size={28} /><span>Run Analysis</span></button></div>
      </section>

      <section className="main-grid">
        <div className="map-panel">
          <div className="map-toolbar">
            <div className="tool-active">⌁ Select</div>
            <div onClick={() => setCorridor(points => [...points, [73.779, 18.519]])}><Route size={13} /> Draw Corridor</div>
            <div onClick={() => setCorridor([])}><Route size={13} /> Undo</div>
            <div><Layers3 size={13} /> Layers</div>
          </div>
          <MapContainer center={[18.523, 73.785]} zoom={14} zoomControl={false} className="map">
            <TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            <MapClick onPoint={point => setCorridor(points => [...points, point])} />
            {parcels.map(parcel => <GeoJSON key={parcel.id} data={parcel.geometry} eventHandlers={{ click: () => setSelected(parcel) }} pathOptions={{ color: selected?.id === parcel.id ? '#3DDC84' : '#FFFFFF', weight: selected?.id === parcel.id ? 3 : 1, fillColor: affected.some(item => item.khasra_no === parcel.khasra_no) ? '#3DDC84' : '#FFFFFF', fillOpacity: selected?.id === parcel.id ? 0.5 : 0.2 }} />)}
            {corridor.length > 1 && <Polyline positions={corridor.map(([longitude, latitude]) => [latitude, longitude])} color="#3DDC84" weight={5} dashArray="8 8" />}
          </MapContainer>
          <div className="map-legend"><span><i className="legend-parcel" /> Cadastral boundary</span><span><i className="legend-corridor" /> Proposed alignment</span><span><i className="legend-affected" /> Affected parcel</span></div>
          <div className="map-status">{status}<span>18 / 18 synced</span></div>
        </div>

        <aside className="inspector">
          <div className="inspector-head"><div><h2>{selected?.khasra_no || 'No selection'}</h2></div><button className="icon-button"><ArrowUpRight size={15} /></button></div>
          <div className="owner"><div className="owner-avatar">{initials}</div><div><strong>{selected?.owner_name}</strong><span>Verified landholder <BadgeCheck size={13} /></span></div><span className="verified">VERIFIED</span></div>
          <div className="data-grid"><div><small>LAND TYPE</small><strong>{selected?.land_type}</strong></div><div><small>AREA</small><strong>{selected?.area_sq_m.toLocaleString('en-IN')} m²</strong></div><div><small>CIRCLE RATE</small><strong>₹{selected?.circle_rate.toLocaleString('en-IN')} / m²</strong></div><div><small>DISTRICT</small><strong>{selected?.district || 'Pune'}</strong></div></div>
          <div className="inspector-section"><div className="section-label"><span>ACQUISITION ESTIMATE</span><span className="policy">RFCTLARR / 2013</span></div><div className="estimate"><small>CALCULATED COMPENSATION</small><strong>₹{((selected?.circle_rate || 0) * (selected?.area_sq_m || 0) * 4).toLocaleString('en-IN')}</strong></div><div className="formula"><span>Market value × rural multiplier</span><strong>2.0×</strong><span>Solatium</span><strong>100%</strong></div></div>
          <div className="inspector-section integrations"><div className="section-label"><span>VERIFICATION SERVICES</span><span className="connected">● CONNECTED</span></div><div className="integration"><FileCheck2 size={16} /><span>e-Courts litigation check</span><b>Clear</b></div><div className="integration"><WalletCards size={16} /><span>DigiLocker KYC</span><b>Verified</b></div><div className="integration"><Database size={16} /><span>PFMS disbursement</span><b>Ready</b></div></div>
          <button className="satellite-trigger" onClick={openSatelliteMonitoring}><ShieldCheck size={16} /> SATELLITE MONITORING</button>
          {monitoringOpen && (
            <div className="inspector-section satellite-monitoring">
              <div className="section-label"><span>SATELLITE MONITORING</span><span className="connected">● {monitoring?.status}</span></div>
              <div className="satellite-header"><strong>{monitoring?.title}</strong><span>{selected?.khasra_no}</span></div>
              <div className="satellite-grid">
                <div className="satellite-card">
                  <small>BEFORE</small>
                  <img src={monitoring?.before} alt="Parcel before image" />
                </div>
                <div className="satellite-card">
                  <small>AFTER</small>
                  <img src={monitoring?.after} alt="Parcel after image" />
                </div>
              </div>
              <div className="satellite-summary">
                <strong>{monitoring?.changeType}</strong>
                <span>Change area: {monitoring?.changePercentage}%</span>
                <span>Confidence: {monitoring?.confidence}</span>
              </div>
              <div className="satellite-actions">
                <button className="satellite-action primary-action" onClick={() => setMonitoring(current => ({ ...current, requiresVerification: true, status: 'Requires field verification' }))}>Requires Field Verification</button>
                <button className="satellite-action" onClick={() => setMonitoring(current => ({ ...current, requiresVerification: false, status: 'No significant change' }))}>No Significant Change</button>
              </div>
            </div>
          )}
          <button className="secondary"><ShieldCheck size={16} /> VIEW FULL PARCEL RECORD</button>
        </aside>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
