/**
 * CivicGrid — App Root
 * Sets up the main routing table.
 * By default, launches the mobile-first app shell.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import CitizenHub from './pages/CitizenHub.jsx'
import useStore from './store/useStore.js'

export default function App() {
  const { initTheme } = useStore()

  useEffect(() => {
    // Initialize light/dark theme preference from store
    initTheme()
  }, [initTheme])

  return (
    <BrowserRouter>
      <Routes>
        {/* Main PWA shell containing the 5 mobile screens */}
        <Route path="/" element={<CitizenHub />} />
        
        {/* Fallbacks */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
