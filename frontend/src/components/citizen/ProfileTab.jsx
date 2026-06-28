/**
 * CivicGrid — Screen 4: Profile & Settings
 * Standard settings menu layout
 * Header: profile picture, name, email
 * Google Login Button: for optional sign in
 * Badges: Email Verified badge with checkmark
 * Settings: Toggles for Dark Mode & Push Notifications, Language Selection dropdown
 */
import { useState } from 'react'
import useStore from '../../store/useStore.js'

const Icons = {
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  ),
  sun: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
  ),
  moon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
  ),
  globe: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
  ),
  book: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  logout: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
  )
}

export default function ProfileTab() {
  const { user, token, setAuth, logout, theme, toggleTheme } = useStore()
  const [pushNotifs, setPushNotifs] = useState(true)
  const [language, setLanguage] = useState('en')

  // Simulate Google Sign-In
  const handleGoogleSignIn = () => {
    const mockGoogleUser = {
      id: 'google-user-123',
      email: 'siddharth.sharma@gmail.com',
      full_name: 'Siddharth Sharma',
      role: 'citizen',
      civic_trust_score: 310,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
    }
    setAuth(mockGoogleUser, 'google-oauth-token-civicgrid')
  }

  const handleSignOut = () => {
    logout()
  }

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi (हिन्दी)' },
    { code: 'mr', name: 'Marathi (मराठी)' },
    { code: 'es', name: 'Español' },
  ]

  const isLoggedIn = !!token && !!user

  return (
    <div className="desktop-centered-container" style={{ minHeight: '100%' }}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="profile-header" style={{ borderRadius: '12px' }}>
        <div className="profile-avatar" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {isLoggedIn && user.avatar_url ? (
            <img src={user.avatar_url} alt="Profile Avatar" />
          ) : (
            Icons.user
          )}
        </div>
        <h2 className="profile-name">
          {isLoggedIn ? user.full_name : 'Guest Session'}
        </h2>
        <p className="profile-email">
          {isLoggedIn ? user.email : 'Authentication recommended for persistent tracking'}
        </p>

        {isLoggedIn && (
          <div className="profile-badges">
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10B981',
              border: '1.2px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '99px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ✓ Verified Citizen
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              borderRadius: '99px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              Score Level: {user.civic_trust_score || 0}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '8px 0 30px' }}>
        {/* Google Authentication Box */}
        {!isLoggedIn ? (
          <div style={{ padding: '20px 0 12px' }}>
            <button className="google-btn" onClick={handleGoogleSignIn} style={{ borderRadius: '8px' }}>
              <span className="google-logo" />
              Sign in with Google
            </button>
          </div>
        ) : null}

        {/* ── Settings Section ───────────────────────────────────── */}
        <div className="settings-section-title" style={{ paddingLeft: 0 }}>Preferences</div>
        <div className="settings-section" style={{ margin: '8px 0 16px' }}>
          {/* Dark Mode Toggle */}
          <div className="settings-row" onClick={toggleTheme}>
            <div className="settings-row-label">
              <span className="settings-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>
                {theme === 'dark' ? Icons.moon : Icons.sun}
              </span>
              <span>Theme Color (Dark Mode)</span>
            </div>
            <label className="toggle" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Push Notifications Toggle */}
          <div className="settings-row" onClick={() => setPushNotifs(!pushNotifs)}>
            <div className="settings-row-label">
              <span className="settings-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>
                {Icons.bell}
              </span>
              <span>System Notifications</span>
            </div>
            <label className="toggle" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={pushNotifs}
                onChange={() => setPushNotifs(!pushNotifs)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Language Selection */}
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>
                {Icons.globe}
              </span>
              <span>Language Setting</span>
            </div>
            <select
              className="form-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                width: 'auto',
                padding: '6px 28px 6px 12px',
                fontSize: '0.85rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg-input) url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3e%3cpath fill=\'none\' stroke=\'%2394a3b8\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'m2 5 6 6 6-6\'/%3e%3c/svg%3e") no-repeat right 10px center/10px 10px',
                appearance: 'none',
                color: 'var(--text-primary)'
              }}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── App Info Section ───────────────────────────────────── */}
        <div className="settings-section-title" style={{ paddingLeft: 0 }}>System</div>
        <div className="settings-section" style={{ margin: '8px 0 16px' }}>
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-icon" style={{ background: 'var(--bg-input)' }}>{Icons.book}</span>
              <span>Documentation & Terms</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Docs</span>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-icon" style={{ background: 'var(--bg-input)' }}>{Icons.shield}</span>
              <span>Privacy Regulations</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>→</span>
          </div>
        </div>

        {/* Sign Out (If Logged In) */}
        {isLoggedIn && (
          <div style={{ padding: '0', marginTop: '24px' }}>
            <button className="btn btn-danger btn-full" onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px' }}>
              {Icons.logout}
              <span>Sign Out Session</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
