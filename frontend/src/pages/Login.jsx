/**
 * CivicGrid — Login Page
 * Dual role selector: Citizen Hub vs Resolver Portal
 * Includes Demo Mode for UI preview without a backend.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api/civicgrid.js'
import useStore from '../store/useStore.js'

// ── Demo users (no backend needed) ────────────────────────────────────────
const DEMO_USERS = {
  citizen: {
    id: 'demo-citizen-001',
    email: 'citizen@demo.civicgrid',
    full_name: 'Aryan Demo',
    role: 'citizen',
    civic_trust_score: 175,
  },
  resolver: {
    id: 'demo-resolver-001',
    email: 'resolver@demo.civicgrid',
    full_name: 'Priya Resolver',
    role: 'resolver',
    civic_trust_score: 520,
  },
}

export default function Login() {
  const [mode, setMode] = useState('login')      // 'login' | 'register'
  const [role, setRole] = useState('citizen')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { setAuth } = useStore()
  const navigate = useNavigate()

  // ── Demo Mode login (no backend required) ────────────────────────────
  const handleDemoLogin = (demoRole) => {
    const demoUser = DEMO_USERS[demoRole]
    setAuth(demoUser, 'demo-token-civicgrid')
    navigate(demoRole === 'resolver' ? '/resolver' : '/citizen')
  }

  // ── Real backend login ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let res
      if (mode === 'login') {
        res = await login(email, password)
        const { access_token, user } = res.data
        setAuth(user, access_token)
        navigate(user.role === 'resolver' ? '/resolver' : '/citizen')
      } else {
        res = await register({ email, password, full_name: fullName, role })
        const { access_token, user } = res.data
        setAuth(user, access_token)
        navigate(user.role === 'resolver' ? '/resolver' : '/citizen')
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Connection failed.'
      if (msg.includes('fetch') || msg.includes('Network') || e.code === 'ERR_NETWORK') {
        setError('Backend not reachable. Use Demo Mode below to preview the UI.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-text">⚡ CIVICGRID</div>
          <div className="login-logo-sub">AI-Powered Community Platform</div>
        </div>

        {/* ── DEMO MODE BANNER ─────────────────────────────────────── */}
        <div style={{
          background: 'rgba(0,229,255,0.07)',
          border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--civic-cyan)',
                       marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ⚡ Quick Demo — No Backend Required
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              id="demo-citizen-btn"
              className="btn btn-ghost btn-sm"
              style={{ borderColor: 'rgba(0,229,255,0.4)', color: 'var(--civic-cyan)',
                       flexDirection: 'column', height: 'auto', padding: '10px 8px' }}
              onClick={() => handleDemoLogin('citizen')}
            >
              <span style={{ fontSize: '1.2rem' }}>🏘️</span>
              <span style={{ fontWeight: 700, marginTop: '3px' }}>Citizen Hub</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Map · Report · Timeline
              </span>
            </button>
            <button
              id="demo-resolver-btn"
              className="btn btn-ghost btn-sm"
              style={{ borderColor: 'rgba(124,58,237,0.4)', color: 'var(--civic-purple)',
                       flexDirection: 'column', height: 'auto', padding: '10px 8px' }}
              onClick={() => handleDemoLogin('resolver')}
            >
              <span style={{ fontSize: '1.2rem' }}>🔧</span>
              <span style={{ fontWeight: 700, marginTop: '3px' }}>Resolver Portal</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Queue · SLA · Proof
              </span>
            </button>
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            or sign in with your account
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Mode toggle */}
        <div className="role-switcher" style={{ marginBottom: '20px' }}>
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

        {/* Role picker (register only) */}
        {mode === 'register' && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px',
                        textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              I am a…
            </p>
            <div className="role-switcher" style={{ marginBottom: 0 }}>
              {[
                { value: 'citizen',  label: '🏘️ Citizen',  desc: 'Report & track issues' },
                { value: 'resolver', label: '🔧 Resolver', desc: 'Fix & close issues' },
              ].map(opt => (
                <button
                  key={opt.value}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="fullName"
                className="form-input"
                placeholder="Your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '10px 14px', color: '#FCA5A5', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <button
            id="auth-submit"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: '4px' }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Loading…</>
            ) : (
              mode === 'login' ? 'Sign In →' : 'Create Account →'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
