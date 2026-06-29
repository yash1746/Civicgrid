import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import CitizenHub from './pages/CitizenHub.jsx'
import Login from './pages/Login.jsx'
import useStore from './store/useStore.js'

export default function App() {
  const { initTheme, token } = useStore()

  useEffect(() => {
    // Initialize light/dark theme preference from store
    initTheme()
  }, [initTheme])

  const isLoggedIn = !!token

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Page */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Main PWA shell containing the 5 mobile screens */}
        <Route
          path="/"
          element={isLoggedIn ? <CitizenHub /> : <Navigate to="/login" replace />}
        />
        
        {/* Fallbacks */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
