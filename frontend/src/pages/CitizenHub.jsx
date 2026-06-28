/**
 * CivicGrid — Citizen PWA App Shell
 * Coordinates:
 * - Global header (topbar)
 * - Navigation: active tab routing to Screen 1, 3, 4, 5
 * - Full-screen overlay sheet: Upload Problem Screen 2
 * - Light/Dark theme syncing
 */
import { useEffect } from 'react'
import useStore from '../store/useStore.js'

// Import Screens
import DashboardTab from '../components/citizen/DashboardTab.jsx'
import MyTicketsTab from '../components/citizen/MyTicketsTab.jsx'
import ChatbotTab from '../components/citizen/ChatbotTab.jsx'
import ProfileTab from '../components/citizen/ProfileTab.jsx'
import UploadProblem from '../components/citizen/UploadProblem.jsx'

// Clean professional SVG Icons
const Icons = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
  ),
  tickets: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  ),
  chatbot: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  ),
  sun: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
  ),
  moon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  )
}

export default function CitizenHub() {
  const {
    activeTab,
    setActiveTab,
    uploadSheetOpen,
    setUploadSheetOpen,
    theme,
    toggleTheme,
    nearbyIssues,
    setNearbyIssues,
    notifCount
  } = useStore()

  // Seed initial mock data if empty (helps local PWA testing)
  useEffect(() => {
    if (nearbyIssues.length === 0) {
      setNearbyIssues([
        { id: 'd1', title: 'Pothole blocks public transit lane', category: 'pothole', severity_level: 'high', severity_score: 8, status: 'open', lat: 19.0760, lng: 72.8777, address_text: 'MG Road, Mumbai', distance_m: 120 },
        { id: 'd2', title: 'Streetlight outage creates visibility hazard', category: 'broken_streetlight', severity_level: 'medium', severity_score: 5, status: 'assigned', lat: 19.0772, lng: 72.8790, address_text: 'Linking Road', distance_m: 340 },
        { id: 'd3', title: 'Main waterline rupture flooding sidewalk', category: 'water_leak', severity_level: 'critical', severity_score: 9, status: 'in_progress', lat: 19.0745, lng: 72.8760, address_text: 'Hill Road', distance_m: 560 },
        { id: 'd4', title: 'Solid waste accumulation near city park', category: 'garbage_overflow', severity_level: 'low', severity_score: 3, status: 'open', lat: 19.0788, lng: 72.8800, address_text: 'Carter Road', distance_m: 820 },
      ])
    }
  }, [nearbyIssues.length, setNearbyIssues])

  // Map tabs to screens
  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab onReportClick={() => setUploadSheetOpen(true)} />
      case 'tickets':
        return <MyTicketsTab />
      case 'chatbot':
        return <ChatbotTab />
      case 'profile':
        return <ProfileTab />
      default:
        return <DashboardTab onReportClick={() => setUploadSheetOpen(true)} />
    }
  }

  // Header Title matching tab
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'City Board'
      case 'tickets': return 'Track Reports'
      case 'chatbot': return 'Civic AI'
      case 'profile': return 'Settings'
      default: return 'CivicGrid'
    }
  }

  const handleUploadSuccess = (mockCreatedIssue) => {
    setUploadSheetOpen(false)
    if (mockCreatedIssue) {
      setNearbyIssues([mockCreatedIssue, ...nearbyIssues])
    }
    setActiveTab('tickets')
  }

  return (
    <div className="app-shell">
      {/* ── Global Top Bar (Landing Page Styled) ────────────────── */}
      <header className="topbar" style={{ padding: '0 24px', height: '72px' }}>
        
        {/* Left Circular Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {Icons.shield}
          </div>
          <span className="topbar-brand" style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>
            CivicGrid <span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </div>

        {/* Desktop Web App Tabs (Clean SVGs) */}
        <div className="topbar-tabs">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
            { id: 'tickets', label: `My Tickets ${notifCount > 0 ? `(${notifCount})` : ''}`, icon: Icons.tickets },
            { id: 'chatbot', label: 'Chatbot', icon: Icons.chatbot },
            { id: 'profile', label: 'Profile', icon: Icons.profile },
          ].map(tab => (
            <button
              key={tab.id}
              className={`topbar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Actions: Language Selector + Gear Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language Selection Dropdown */}
          <select
            className="form-select"
            value="en"
            onChange={() => {}}
            style={{
              width: 'auto',
              padding: '6px 28px 6px 12px',
              fontSize: '0.85rem',
              fontWeight: 500,
              background: 'var(--bg-input) url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3e%3cpath fill=\'none\' stroke=\'%2394a3b8\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'m2 5 6 6 6-6\'/%3e%3c/svg%3e") no-repeat right 10px center/10px 10px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>

          {/* Theme Toggler Button */}
          <button
            className="topbar-action"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
            style={{ width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? Icons.sun : Icons.moon}
          </button>
        </div>
      </header>

      {/* ── Active Tab Screen Render ─────────────────────────── */}
      <main className={activeTab === 'chatbot' ? 'screen screen-full' : 'screen'}>
        {renderScreen()}
      </main>

      {/* ── Sticky Bottom Navigation Bar ─────────────────────── */}
      <nav className="bottom-nav">
        <button
          id="nav-dashboard"
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{Icons.dashboard}</span>
          <span style={{ marginTop: '2px' }}>Dashboard</span>
        </button>

        <button
          id="nav-tickets"
          className={`nav-item ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{Icons.tickets}</span>
          {notifCount > 0 && <span className="nav-badge">{notifCount}</span>}
          <span style={{ marginTop: '2px' }}>My Tickets</span>
        </button>

        <button
          id="nav-chatbot"
          className={`nav-item ${activeTab === 'chatbot' ? 'active' : ''}`}
          onClick={() => setActiveTab('chatbot')}
        >
          <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{Icons.chatbot}</span>
          <span style={{ marginTop: '2px' }}>Chatbot</span>
        </button>

        <button
          id="nav-profile"
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{Icons.profile}</span>
          <span style={{ marginTop: '2px' }}>Profile</span>
        </button>
      </nav>

      {/* ── Screen 2: Upload Problem Slide-up Sheet overlay ───── */}
      {uploadSheetOpen && (
        <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && setUploadSheetOpen(false)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3 className="sheet-title">Report New Issue</h3>
              <button className="sheet-close" onClick={() => setUploadSheetOpen(false)}>×</button>
            </div>
            <div style={{ padding: '0 20px 30px', maxHeight: '80vh', overflowY: 'auto' }}>
              <UploadProblem
                onClose={() => setUploadSheetOpen(false)}
                onSuccess={handleUploadSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
