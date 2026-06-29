import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import CitizenHub from './pages/CitizenHub.jsx'
import ResolverPortal from './pages/ResolverPortal.jsx'
import Login from './pages/Login.jsx'
import useStore from './store/useStore.js'

export default function App() {
  const { initTheme, token, user } = useStore()

  useEffect(() => {
    // Initialize light/dark theme preference from store
    initTheme()
  }, [initTheme])

  const isLoggedIn = !!token
  const isResolver = isLoggedIn && user?.role === 'resolver'

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Page */}
        <Route
          path="/login"
          element={isLoggedIn ? (isResolver ? <Navigate to="/resolver" replace /> : <Navigate to="/" replace />) : <Login />}
        />

        {/* Resolver Portal */}
        <Route
          path="/resolver"
          element={isLoggedIn ? (isResolver ? <ResolverPortal /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
        />

        {/* Main PWA shell for citizens */}
        <Route
          path="/"
          element={isLoggedIn ? (isResolver ? <Navigate to="/resolver" replace /> : <CitizenHub />) : <Navigate to="/login" replace />}
        />
        
        {/* Fallbacks */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
