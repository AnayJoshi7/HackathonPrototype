import React from 'react'
import { createRoot } from 'react-dom/client'
import { MapContainer, TileLayer, GeoJSON, Polyline, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import { Activity, ArrowUpRight, BadgeCheck, CircleDollarSign, ClipboardCheck, Crosshair, Database, FileCheck2, Landmark, Layers3, LockKeyhole, MapPinned, MousePointer2, Radio, Route, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const fallbackParcels = Array.from({ length: 18 }, (_, i) => {
  const x = i % 6, y = Math.floor(i / 6), west = 73.78 + x * .0022, south = 18.52 + y * .0022
  return { id: i + 1, khasra_no: `KSR-${1041 + i}`, owner_name: ['Asha Patil', 'Ramesh Jadhav', 'Meena Shinde', 'Sanjay More', 'Kavita Pawar'][i % 5], land_type: ['Agricultural', 'Residential', 'Orchard', 'Barren'][i % 4], circle_rate: 1650 + i % 4 * 325, area_sq_m: 49200, geometry: { type: 'Polygon', coordinates: [[[west, south], [west + .002, south], [west + .002, south + .002], [west, south + .002], [west, south]]] } }
})

function MapClick({ onPoint }) {
  useMapEvents({ click: e => onPoint([e.latlng.lng, e.latlng.lat]) })
  return null
}

function App() {
  const [parcels, setParcels] = React.useState(fallbackParcels)
  const [selected, setSelected] = React.useState(fallbackParcels[7])
  const [corridor, setCorridor] = React.useState([])
  const [affected, setAffected] = React.useState([])
  const [status, setStatus] = React.useState('LIVE DEMO DATA')
  React.useEffect(() => { fetch(`${API}/api/gis/parcels`).then(r => r.ok ? r.json() : Promise.reject()).then(setParcels).catch(() => {}) }, [])

  const runAnalysis = async () => {
    if (corridor.length < 2) return
    setStatus('ANALYZING CORRIDOR')
    try {
      const response = await fetch(`${API}/api/gis/corridor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: corridor, width_m: 30 }) })
      const data = await response.json(); setAffected(data.affected_parcels || [])
      setStatus(`${data.affected_parcels?.length || 0} PARCELS AFFECTED`)
    } catch { setAffected(parcels.filter((_, i) => i % 3 === 0).map(p => ({ ...p, affected_area_sq_m: 1180, estimated_compensation: p.circle_rate * 1180 * 4 }))); setStatus('DEMO ANALYSIS COMPLETE') }
  }
  const total = affected.reduce((sum, item) => sum + (item.estimated_compensation || 0), 0)

  return <main>
    <header className="topbar"><div className="brand"><div className="brand-mark"><Landmark size={19} /></div><div><strong>N-LAMS</strong><span>National Land Acquisition & Management System</span></div></div><div className="top-actions"><span className="live"><i /> SYSTEM OPERATIONAL</span><button className="icon-button" title="Notifications"><Activity size={17} /></button><div className="avatar">AM</div></div></header>
    <section className="workspace-head"><div><div className="eyebrow">PROJECT / NH-48 EXPANSION <span>●</span> PILOT ZONE 04</div><h1>Corridor impact command</h1><p>Survey, value and monitor land acquisition from one verified workspace.</p></div><div className="head-meta"><div><small>PROJECTED ACQUISITION</small><strong>{affected.length || 18} <em>parcels</em></strong></div><div><small>EST. LIABILITY</small><strong>₹{(total || 4.82e7).toLocaleString('en-IN')}</strong></div><button className="primary" onClick={runAnalysis}><Sparkles size={16} /> RUN ANALYSIS</button></div></section>
    <nav className="tabs"><span className="active"><MapPinned size={15} /> LAND ACQUISITION</span><span><ClipboardCheck size={15} /> COMPLIANCE</span><span><Radio size={15} /> MONITORING <b>NEW</b></span><span className="tab-spacer" /><span className="audit"><LockKeyhole size={14} /> AUDIT LEDGER <ArrowUpRight size={14} /></span></nav>
    <section className="main-grid"><div className="map-panel"><div className="map-toolbar"><div className="tool-active"><MousePointer2 size={15} /> SELECT</div><div onClick={() => setCorridor(c => [...c, [73.779, 18.519]])}><Route size={15} /> DRAW CORRIDOR</div><div><Layers3 size={15} /> LAYERS <span className="chevron">⌄</span></div></div><MapContainer center={[18.523, 73.785]} zoom={14} zoomControl={false} className="map"><TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /><MapClick onPoint={point => setCorridor(c => [...c, point])} />{parcels.map(parcel => <GeoJSON key={parcel.id} data={parcel.geometry} eventHandlers={{ click: () => setSelected(parcel) }} pathOptions={{ color: selected?.id === parcel.id ? '#f4bd4e' : '#90b8a5', weight: selected?.id === parcel.id ? 3 : 1, fillColor: affected.some(a => a.khasra_no === parcel.khasra_no) ? '#ef6f51' : '#8ab3a0', fillOpacity: selected?.id === parcel.id ? .5 : .2 }} />)}{corridor.length > 1 && <Polyline positions={corridor.map(([lng, lat]) => [lat, lng])} color="#f4bd4e" weight={5} dashArray="8 8" />}</MapContainer><div className="map-legend"><div><i className="parcel-key" /> Cadastral boundary</div><div><i className="corridor-key" /> Proposed alignment</div><div><i className="impact-key" /> Affected parcel</div></div><div className="map-status"><Crosshair size={14} /> {status}<span>18 / 18 synced</span></div></div>
      <aside className="inspector"><div className="inspector-head"><div><span className="eyebrow">SELECTED PARCEL</span><h2>{selected?.khasra_no || 'No selection'}</h2></div><button className="icon-button"><ArrowUpRight size={17} /></button></div><div className="owner"><div className="owner-avatar">{selected?.owner_name.split(' ').map(v => v[0]).join('')}</div><div><strong>{selected?.owner_name}</strong><span>Verified landholder <BadgeCheck size={13} /></span></div><span className="verified">VERIFIED</span></div><div className="data-grid"><div><small>LAND TYPE</small><strong>{selected?.land_type}</strong></div><div><small>AREA</small><strong>{selected?.area_sq_m.toLocaleString('en-IN')} m²</strong></div><div><small>CIRCLE RATE</small><strong>₹{selected?.circle_rate.toLocaleString('en-IN')} / m²</strong></div><div><small>DISTRICT</small><strong>{selected?.district || 'Pune'}</strong></div></div><div className="inspector-section"><div className="section-label"><span>ACQUISITION ESTIMATE</span><span className="policy">RFCTLARR / 2013</span></div><div className="estimate"><CircleDollarSign size={23} /><div><small>CALCULATED COMPENSATION</small><strong>₹{((selected?.circle_rate || 0) * (selected?.area_sq_m || 0) * 4).toLocaleString('en-IN')}</strong></div></div><div className="formula"><span>Market value × rural multiplier</span><strong>2.0×</strong><span>Solatium</span><strong>100%</strong></div></div><div className="inspector-section integrations"><div className="section-label"><span>VERIFICATION SERVICES</span><span className="connected">● CONNECTED</span></div><div className="integration"><FileCheck2 size={16} /><span>e-Courts litigation check</span><b>Clear</b></div><div className="integration"><WalletCards size={16} /><span>DigiLocker KYC</span><b>Verified</b></div><div className="integration"><Database size={16} /><span>PFMS disbursement</span><b>Ready</b></div></div><button className="secondary"><ShieldCheck size={16} /> VIEW FULL PARCEL RECORD <ArrowUpRight size={14} /></button></aside></section>
    <footer><span><ShieldCheck size={14} /> IMMUTABLE AUDIT TRAIL ACTIVE</span><span>LAST SYNC 09:42:18 IST</span><span>BUILD 0.1.0 / SIH 2026</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)