import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { supabase } from './services/supabase'

import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import LearningPlanPage from './pages/LearningPlanPage'
import DiscoverPage from './pages/DiscoverPage'
import VideosPage from './pages/VideosPage'
import ProgressPage from './pages/ProgressPage'
import ProfilePage from './pages/ProfilePage'
import AppLayout from './components/layout/AppLayout'
import Toast from './components/ui/Toast'

function ProtectedRoute({ children }) {
  const { user, loading } = useStore()
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useStore()
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const { setUser, setLoading } = useStore()

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />

        {/* Onboarding (after auth, before plan) */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* Protected App Routes */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="plan" element={<LearningPlanPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Global Running Ticker Banner */}
      <div className="educational-ticker">
        <div className="ticker-text">
          ✦ This project is developed by Akhilesh Charde for educational purposes only ✦ This project is developed by Akhilesh Charde for educational purposes only ✦ This project is developed by Akhilesh Charde for educational purposes only ✦ This project is developed by Akhilesh Charde for educational purposes only ✦ This project is developed by Akhilesh Charde for educational purposes only 
        </div>
      </div>
    </BrowserRouter>
  )
}
