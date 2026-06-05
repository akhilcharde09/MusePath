import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Auth
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  // Dashboard
  dashboardData: null,
  setDashboardData: (data) => set({ dashboardData: data }),

  // Active plan
  activePlan: null,
  setActivePlan: (plan) => set({ activePlan: plan }),

  // Toast notifications
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now()
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  // Discover filters
  discoverFilters: { mood: 'Chill', genre: 'Pop', level: 'beginner' },
  setDiscoverFilters: (filters) => set({ discoverFilters: filters }),

  // Video filters
  videoFilters: { instrument: 'guitar', topic: 'basics', level: 'beginner' },
  setVideoFilters: (filters) => set({ videoFilters: filters }),
}))
