/**
 * CivicGrid — Login Page
 * Exclusive Google Sign-In with Separate Register & Login Workflows
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleLogin } from '../api/civicgrid.js'
import useStore from '../store/useStore.js'

export default function Login() {
  const [mode, setMode] = useState('login')      // 'login' | 'register'
  const [role, setRole] = useState('citizen')     // citizen | resolver
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { setAuth } = useStore()
  const navigate = useNavigate()

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true)
    setError(null)
    try {
      const res = await googleLogin(response.credential, role, mode)
      const { access_token, user } = res.data
      setAuth(user, access_token)
      navigate(user.role === 'resolver' ? '/resolver' : '/')
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Google authentication failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = 'google-gsi-client-script'
    let script = document.getElementById(id)
    if (!script) {
      script = document.createElement('script')
      script.id = id
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '477543265007-8m85s33bprqthscd77vhljqqt68c2r78.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
        })
        const btnContainer = document.getElementById('google-signin-btn')
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
          )
        }
      }
    }

    script.onload = initGoogle

    if (window.google) {
      initGoogle()
    }
  }, [role, mode]) // Rebind Google handler to dynamic role & mode selections!

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-text">⚡ CIVICGRID</div>
          <div className="login-logo-sub">AI-Powered Community Platform</div>
        </div>

        {/* Mode Selector (Sign In / Register) */}
        <div className="role-switcher" style={{ marginBottom: '24px' }}>
          <button
            className={`role-option ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            Sign In
          </button>
          <button
            className={`role-option ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null) }}
          >
            Register
          </button>
        </div>

        {/* Role Selector (ONLY visible in Register mode) */}
        {mode === 'register' && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px',
                        textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Select your role (Mandatory)
            </p>
            <div className="role-switcher" style={{ marginBottom: 0 }}>
              {[
                { value: 'citizen',  label: '🏘️ Citizen',  desc: 'Report & track issues' },
                { value: 'resolver', label: '🔧 Resolver', desc: 'Fix & close issues' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`role-option ${role === opt.value ? 'active' : ''}`}
                  onClick={() => setRole(opt.value)}
                  style={{ flexDirection: 'column', height: 'auto', padding: '10px 8px' }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Google Sign-In button container */}
        <div style={{ marginBottom: '20px' }}>
          <div id="google-signin-btn" style={{ width: '100%', minHeight: '40px' }}></div>
        </div>

        {/* Error Feedback Display */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '10px 14px', color: '#FCA5A5', fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Processing Indicator */}
        {loading && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px'
          }}>
            <span className="spinner" style={{ width: 16, height: 16 }} />
            Connecting securely to Google...
          </div>
        )}

        {/* Bottom Toggler */}
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            style={{ background: 'none', border: 'none', color: 'var(--civic-cyan)',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}
