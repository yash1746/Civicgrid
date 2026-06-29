/**
 * CivicGrid — Citizen PWA App Shell
 * Coordinates:
 * - Global header (topbar)
 * - Navigation: active tab routing to Screen 1, 3, 4, 5
 * - Full-screen overlay sheet: Upload Problem Screen 2
 * - Light/Dark theme syncing
 * - Dynamic notification badge count
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
    myIssues,
    setMyIssues
  } = useStore()

  // Seed initial mock data if empty (helps local PWA testing)
  useEffect(() => {
    if (nearbyIssues.length === 0) {
      const initialIssues = [
        {
          id: 'ticket-1',
          title: 'Pothole blocks public transit lane',
          category: 'pothole',
          severity_level: 'high',
          severity_score: 8,
          status: 'resolved',
          lat: 19.0760,
          lng: 72.8777,
          address_text: 'MG Road, Mumbai',
          distance_m: 120,
          description: 'A deep pothole has emerged right in the middle of the bus lane, causing transit buses to swerve dangerously into oncoming traffic.',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          resolved_at: new Date(Date.now() - 86400000).toISOString(),
          media_urls: ['https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=500&auto=format&fit=crop'],
          proof_media_urls: ['https://images.unsplash.com/photo-1599740831119-4727b161405e?w=500&auto=format&fit=crop']
        },
        {
          id: 'ticket-2',
          title: 'Streetlight outage creates visibility hazard',
          category: 'broken_streetlight',
          severity_level: 'medium',
          severity_score: 5,
          status: 'assigned',
          lat: 19.0772,
          lng: 72.8790,
          address_text: 'Linking Road, Mumbai',
          distance_m: 340,
          description: 'The main streetlight fixture at the intersection is completely broken, causing pitch black conditions at night for pedestrians.',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          media_urls: ['https://images.unsplash.com/photo-1509021436665-8f37df706a73?w=500&auto=format&fit=crop']
        },
        {
          id: 'ticket-3',
          title: 'Main waterline rupture flooding sidewalk',
          category: 'water_leak',
          severity_level: 'critical',
          severity_score: 9,
          status: 'in_progress',
          lat: 19.0745,
          lng: 72.8760,
          address_text: 'Hill Road, Bandra',
          distance_m: 560,
          description: 'A high-pressure clean water pipe has ruptured, flooding the shopping sidewalk and leaking thousands of gallons of water.',
          created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          media_urls: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto=format&fit=crop']
        },
        {
          id: 'ticket-4',
          title: 'Solid waste accumulation near city park',
          category: 'garbage_overflow',
          severity_level: 'low',
          severity_score: 3,
          status: 'open',
          lat: 19.0788,
          lng: 72.8800,
          address_text: 'Carter Road, Mumbai',
          distance_m: 820,
          description: 'A large heap of uncollected household garbage bags has accumulated near the children\'s park entrance, attracting stray dogs.',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          media_urls: ['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=500&auto=format&fit=crop']
        }
      ]
      setNearbyIssues(initialIssues)
      // Make the first 3 issues belong to the current user (myIssues)
      setMyIssues(initialIssues.slice(0, 3))
    }
  }, [nearbyIssues.length, setNearbyIssues, setMyIssues])

  // Calculate dynamic notification count based on user's active/pending tickets
  const notifCount = myIssues.filter(ticket => ticket.status !== 'resolved' && ticket.status !== 'closed').length

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

  const handleUploadSuccess = () => {
    setUploadSheetOpen(false)
    setActiveTab('tickets')
  }

  return (
    <div className="app-shell">
      {/* ── Desktop Header ── */}
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
            {Icons.shield}
          </span>
          <span className="logo-text">CivicGrid</span>
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
