/**
 * CivicGrid — Zustand Global Store (with theme support)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),

      // ── Theme ─────────────────────────────────────────────
      theme: 'light', // 'light' | 'dark'
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', next)
        set({ theme: next })
      },
      initTheme: () => {
        const t = get().theme
        document.documentElement.setAttribute('data-theme', t)
      },

      // ── Navigation ────────────────────────────────────────
      activeTab: 'dashboard', // 'dashboard' | 'tickets' | 'chatbot' | 'profile'
      setActiveTab: (tab) => set({ activeTab: tab }),

      // ── Issues ────────────────────────────────────────────
      nearbyIssues: [],
      setNearbyIssues: (issues) => set({ nearbyIssues: issues }),
      myIssues: [],
      setMyIssues: (issues) => set({ myIssues: issues }),
      workQueue: [],
      setWorkQueue: (queue) => set({ workQueue: queue }),

      // ── Upload sheet open ──────────────────────────────────
      uploadSheetOpen: false,
      setUploadSheetOpen: (open) => set({ uploadSheetOpen: open }),

      // ── Notifications count ────────────────────────────────
      notifCount: 2,
    }),
    {
      name: 'civicgrid-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        theme: state.theme,
      }),
    }
  )
)

export default useStore
