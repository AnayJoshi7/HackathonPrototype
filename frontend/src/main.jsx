import React from 'react'
import { createRoot } from 'react-dom/client'
import { GeoJSON, MapContainer, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import { ArrowRight, ArrowUpRight, BadgeCheck, CheckCircle2, Database, Eye, EyeOff, FileCheck2, Layers3, LockKeyhole, Route, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { authenticate, clearSession, getLandingPath, persistSession, readSession, setWorkspace, submitAccessRequest, validateAccessRequest } from './auth'
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

function Dashboard({ onLogout }) {
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
        <div className="top-actions"><span className="live"><i /> System Online</span><button className="session-logout" onClick={onLogout}>Sign out</button><div className="avatar" aria-label="User profile">AM</div></div>
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

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function AuthShell({ children, footer = true }) {
  return <div className="auth-shell">
    <header className="auth-header">
      <button className="auth-brand" onClick={() => navigate('/')} aria-label="Go to N-LAMS welcome screen"><strong>N-LAMS</strong><span>National Land Acquisition &amp; Management System</span></button>
      <div className="secure-connection"><i /> SECURE CONNECTION</div>
    </header>
    <main className="auth-main">{children}</main>
    {footer && <footer className="auth-footer"><span>OFFICIAL USE ONLY • MINISTRY OF ROAD TRANSPORT &amp; HIGHWAYS • GOVT OF INDIA</span><div><span>Security Policy</span><span>System Support</span><span>Privacy Protocol</span></div></footer>}
  </div>
}

function Welcome() {
  return <AuthShell>
    <section className="welcome-content">
      <div className="welcome-intro"><h1>One workspace for every stage of land acquisition.</h1><p>Map affected land, review land history, manage acquisition workflows and monitor changes from a single workspace.</p></div>
      <div className="capability-grid">
        <div><strong>GIS Mapping</strong><span>Interactive parcel plotting along national corridors.</span></div>
        <div><strong>Land Verification</strong><span>Owner authentication, e-Courts and KYC checks.</span></div>
        <div><strong>Acquisition Management</strong><span>Automated RFCTLARR calculations and PFMS tracking.</span></div>
        <div><strong>Satellite Monitoring</strong><span>Multi-spectral timeline tracking of structural changes.</span></div>
      </div>
      <div className="welcome-actions"><button className="auth-button compact" onClick={() => navigate('/login')}>Get Started <ArrowRight size={16} /></button><span><CheckCircle2 size={16} /> Secure Government Workspace</span></div>
    </section>
  </AuthShell>
}

function Login({ onAuthenticated }) {
  const [credentials, setCredentials] = React.useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = React.useState(false)
  const [status, setStatus] = React.useState({ error: '', loading: false })

  const submit = async event => {
    event.preventDefault()
    setStatus({ error: '', loading: true })
    try {
      const user = await authenticate(credentials)
      const error = onAuthenticated(user)
      if (error) throw new Error(error)
    } catch (error) {
      setStatus({ error: error instanceof Error ? error.message : 'Authentication failed. Please try again.', loading: false })
    } finally {
      setStatus(current => current.loading ? { ...current, loading: false } : current)
    }
  }

  return <AuthShell><section className="auth-card login-card"><div className="auth-card-header"><h1>Sign in to N-LAMS</h1><p><LockKeyhole size={16} /> Secure Government Workspace</p></div><form onSubmit={submit}>
    <label>Official Email / User ID<input type="email" value={credentials.email} onChange={event => setCredentials({ ...credentials, email: event.target.value })} placeholder="e.g., s.more@nic.in" autoComplete="username" required /></label>
    <label>Password<div className="password-input"><input type={showPassword ? 'text' : 'password'} value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} placeholder="••••••••••••" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
    {status.error && <p className="form-error" role="alert">{status.error}</p>}
    <button className="auth-button" type="submit" disabled={status.loading}>{status.loading ? 'Authenticating…' : 'Sign In →'}</button>
    <div className="form-links"><button type="button" className="text-link" onClick={() => setStatus({ error: 'Password recovery is pending connection to the government identity provider.', loading: false })}>Forgot Password?</button><button type="button" className="text-link accent" onClick={() => navigate('/request-access')}>Request Access</button></div>
  </form></section></AuthShell>
}

function RequestAccess() {
  const [details, setDetails] = React.useState({ fullName: '', email: '', employeeId: '', department: '', designation: '', authority: '' })
  const [status, setStatus] = React.useState({ error: '', success: '', loading: false })
  const fields = [['fullName', 'Full Name', 'e.g., Sanjay More'], ['email', 'Official Email', 'e.g., s.more@nic.in'], ['employeeId', 'Employee / Officer ID', 'e.g., SG-1094-MO'], ['department', 'Department', 'e.g., Revenue Department'], ['designation', 'Designation', 'e.g., Revenue Officer'], ['authority', 'District / Authority', 'e.g., Pune / NHAI-MH']]
  const submit = async event => {
    event.preventDefault()
    const error = validateAccessRequest(details)
    if (error) return setStatus({ error, success: '', loading: false })
    setStatus({ error: '', success: '', loading: true })
    await submitAccessRequest(details)
    setStatus({ error: '', success: 'Request submitted. An authorized administrator will review your official details.', loading: false })
  }
  return <AuthShell><section className="auth-card request-card"><div className="auth-card-header"><h1>Request Access</h1><p>Submit your official details to request workspace credentials. Access is restricted to verified government authorities and revenue officials.</p></div><form onSubmit={submit}><div className="request-grid">{fields.map(([name, label, placeholder]) => <label key={name}>{label}<input type={name === 'email' ? 'email' : 'text'} value={details[name]} onChange={event => setDetails({ ...details, [name]: event.target.value })} placeholder={placeholder} required /></label>)}</div>{status.error && <p className="form-error" role="alert">{status.error}</p>}{status.success && <p className="form-success" role="status">{status.success}</p>}<p className="access-note">Access is subject to authorization by the relevant administrator.</p><button className="auth-button compact" type="submit" disabled={status.loading}>{status.loading ? 'Submitting…' : 'Submit Access Request →'}</button></form></section></AuthShell>
}

function Workspace({ user, onSelected }) {
  const [selected, setSelected] = React.useState(user.roles[0])
  return <AuthShell footer={false}><section className="workspace-select"><div className="workspace-intro"><h1>Select your workspace</h1><p>Choose an authorized workspace to continue.</p></div><div className="role-grid">{user.roles.map(role => <button key={role.id} className={`role-card ${selected.id === role.id ? 'active' : ''}`} onClick={() => setSelected(role)}><strong>{role.label}</strong><span>{role.description}</span></button>)}</div><div className="workspace-action"><button className="auth-button compact" onClick={() => { setWorkspace(selected); onSelected() }}>Enter Workspace <ArrowRight size={16} /></button><ShieldCheck size={14} /></div></section></AuthShell>
}

function App() {
  const [path, setPath] = React.useState(window.location.pathname)
  const [session, setSession] = React.useState(readSession)
  React.useEffect(() => { const update = () => setPath(window.location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update) }, [])

  const handleAuthenticated = user => {
    const destination = getLandingPath(user)
    if (!user.roles.length) return 'Your account is authenticated, but no authorized workspace has been assigned. Contact your administrator.'
    if (user.roles.length === 1) { persistSession({ user, workspace: user.roles[0] }) }
    setSession(readSession())
    navigate(destination)
    return ''
  }
  const handleLogout = () => { clearSession(); setSession(null); navigate('/login') }

  if (path === '/') return <Welcome />
  if (path === '/login') return <Login onAuthenticated={handleAuthenticated} />
  if (path === '/request-access') return <RequestAccess />
  if (path === '/workspace') {
    if (!session?.user?.roles?.length) { navigate('/login'); return null }
    if (session.user.roles.length === 1) { navigate('/dashboard'); return null }
    return <Workspace user={session.user} onSelected={() => { setSession(readSession()); navigate('/dashboard') }} />
  }
  if (path === '/dashboard') {
    if (!session?.user || !session.workspace || !session.user.roles.some(role => role.id === session.workspace.id)) { navigate(session?.user?.roles?.length > 1 ? '/workspace' : '/login'); return null }
    return <div className="dashboard-shell"><Dashboard onLogout={handleLogout} /></div>
  }
  navigate('/')
  return null
}

createRoot(document.getElementById('root')).render(<App />)
