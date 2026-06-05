import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { api } from '../services/api'
import { Flame, Clock, Star, Map, Compass, PlayCircle, TrendingUp, ArrowRight, CheckCircle, BookOpen, Sparkles } from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '☀️ Good morning'
  if (h < 17) return '⚡ Good afternoon'
  return '🌙 Good evening'
}

function XPLevel(xp) {
  const level = Math.floor(xp / 500) + 1
  const progress = (xp % 500) / 500 * 100
  const nextXP = (Math.floor(xp / 500) + 1) * 500
  return { level, progress, nextXP }
}

export default function DashboardPage() {
  const { user, addToast } = useStore()
  const [data, setData] = useState(null)
  const [plans, setPlans] = useState([])
  const [switching, setSwitching] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadDashboard = async () => {
    try {
      const dashData = await api.getDashboard(user.id)
      setData(dashData)
      const plansData = await api.getPlans(user.id)
      setPlans(plansData || [])
    } catch (err) {
      addToast('Failed to load dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchPlan = async (planId) => {
    if (!planId || planId === data?.plan?.id) return
    setSwitching(true)
    try {
      await api.setActivePlan({ userId: user.id, planId })
      addToast('Active plan switched successfully! 🎸', 'success')
      await loadDashboard()
    } catch (err) {
      addToast('Failed to switch active plan', 'error')
    } finally {
      setSwitching(false)
    }
  }

  useEffect(() => {
    if (user) loadDashboard()
  }, [user])

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  const hasPlan = !!data?.plan
  const { level, progress: xpProgress, nextXP } = XPLevel(data?.xp || 0)
  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Musician'
  const streak = data?.streak || 0
  const totalMinutes = data?.totalMinutes || 0

  return (
    <div className="page-content animate-fade-in" style={{ paddingBottom: 'var(--space-16)' }}>
      {/* Greeting */}
      <div className="dashboard-greeting" style={{ borderBottom: '2px solid #222222', paddingBottom: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <h1 className="greeting-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, color: '#ffffff' }}>
          {getGreeting()}, {displayName}!
        </h1>
        <p className="greeting-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8, fontWeight: 700 }}>
          {hasPlan
            ? `TRACKING RIFFS — ON A ${streak}-DAY STREAK!`
            : "READY TO START YOUR LEARNING PLAN?"}
        </p>
      </div>

      {/* Plans Manager Bar */}
      {plans.length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 'var(--space-3) var(--space-4)', 
          background: '#0a0a0a', 
          border: '1px solid var(--border)',
          marginBottom: 'var(--space-8)',
          gap: 'var(--space-4)',
          flexWrap: 'wrap'
        }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Active Plan:
            </span>
            <select 
              value={data?.plan?.id || ''} 
              onChange={(e) => handleSwitchPlan(e.target.value)}
              disabled={switching}
              className="plan-select"
            >
              <option value="" disabled style={{ background: '#000000', color: '#ffffff' }}>-- Select a Plan --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#000000', color: '#ffffff' }}>
                  {p.instrument.toUpperCase()} ({p.skill_level.toUpperCase()}) — {p.title || 'Untitled Plan'}
                </option>
              ))}
            </select>
            {switching && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Switching...</span>}
          </div>
          <button 
            onClick={() => navigate('/onboarding')} 
            className="btn btn-secondary btn-sm"
            style={{ height: '32px', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
          >
            <Sparkles size={12} style={{ marginRight: '4px' }} />
            Create New Plan
          </button>
        </div>
      )}

      {/* No plan CTA */}
      {!hasPlan && (
        <div className="card card-padded" style={{
          padding: 'var(--space-10)',
          textAlign: 'center',
          marginBottom: 'var(--space-8)',
          background: '#0a0a0a',
          border: '2px solid #ffffff'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🎸</div>
          <h2 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#ffffff', marginBottom: 'var(--space-2)' }}>
            READY TO START YOUR JOURNEY?
          </h2>
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px', marginBottom: 'var(--space-6)' }}>
            Get your AI-generated music learning plan in seconds.
          </p>
          <button onClick={() => navigate('/onboarding')} className="btn btn-primary btn-lg" style={{ borderRadius: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '11px' }}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Generate My Plan
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid-4 mb-8">
        {[
          { icon: <Flame size={20} color="#ffffff" />, label: 'Day Streak', value: streak, sub: streak > 0 ? 'KEEP IT UP!' : 'START TODAY!', color: '#111111' },
          { icon: <Clock size={20} color="#ffffff" />, label: 'Practice Time', value: `${Math.round(totalMinutes / 60)}h`, sub: `${totalMinutes} minutes total`, color: '#111111' },
          { icon: <Star size={20} color="#ffffff" />, label: 'XP Points',     value: data?.xp || 0, sub: `Level ${level} • ${nextXP - (data?.xp||0)} to next`, color: '#111111' },
          { icon: <CheckCircle size={20} color="#ffffff" />, label: 'Weeks Done',    value: data?.progress?.completed_weeks || 0, sub: `of ${data?.progress?.total_weeks || 0} total`, color: '#111111' },
        ].map(s => (
          <div key={s.label} className="stat-card card" style={{ transition: 'all 0.2s ease', background: '#0a0a0a' }}>
            <div className="stat-icon" style={{ background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333333', borderRadius: 0 }}>{s.icon}</div>
            <div className="stat-value" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 'var(--text-3xl)', color: '#ffffff' }}>{s.value}</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 'var(--text-xs)', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* XP Bar */}
      <div className="card card-padded mb-8" style={{ background: '#0a0a0a' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'var(--text-lg)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>Level {level}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900 }}>Musician</span>
          </div>
          <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{data?.xp || 0} / {nextXP} XP</span>
        </div>
        <div className="xp-bar" style={{ height: 6, background: '#222222', borderRadius: 0 }}>
          <div className="xp-bar-fill" style={{ width: `${xpProgress}%`, height: '100%', background: '#ffffff', borderRadius: 0 }} />
        </div>
      </div>

      {/* Continue Learning */}
      {hasPlan && data?.currentWeek && (
        <div className="card card-padded mb-8" style={{ display: 'flex', gap: 'var(--space-4)', background: '#0a0a0a', border: '1px solid #222222', alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#111111', border: '1px solid #333333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>🎸</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#ffffff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Month {data.currentWeek.month_number} · Week {data.currentWeek.week_number}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'var(--text-2xl)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: 4 }}>
              {data.currentWeek.title}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {data.currentWeek.practice_goal}
            </div>
          </div>
          <Link to="/plan" className="btn btn-primary" style={{ borderRadius: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            CONTINUE
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid-2 mb-8">
        {[
          { icon: <Map size={20} color="#ffffff" />,       label: 'My Plan',     desc: 'View your full roadmap',         to: '/plan',     color: '#111111' },
          { icon: <Compass size={20} color="#ffffff" />,   label: 'Discover',    desc: 'Find songs to learn',            to: '/discover', color: '#111111' },
          { icon: <PlayCircle size={20} color="#ffffff" />, label: 'Videos',      desc: 'Watch lesson tutorials',         to: '/videos',   color: '#111111' },
          { icon: <TrendingUp size={20} color="#ffffff" />, label: 'Progress',    desc: 'Track your achievements',        to: '/progress', color: '#111111' },
        ].map(a => (
          <Link key={a.to} to={a.to} className="card card-padded flex items-center gap-4" style={{ textDecoration: 'none', transition: 'all 0.2s ease', background: '#0a0a0a' }}>
            <div style={{ width: 48, height: 48, background: a.color, border: '1px solid #333333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {a.icon}
            </div>
            <div>
              <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>{a.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{a.desc}</div>
            </div>
            <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>

      {/* Saved Songs */}
      {data?.savedSongs?.length > 0 && (
        <div className="mb-8">
          <div className="section-header" style={{ borderBottom: '1px solid #222222', paddingBottom: '12px' }}>
            <div>
              <h2 className="section-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ffffff' }}>Saved Songs</h2>
              <p className="section-subtitle" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Songs you're working on</p>
            </div>
            <Link to="/discover" className="btn btn-secondary btn-sm" style={{ borderRadius: 0, fontWeight: 900 }}>VIEW ALL</Link>
          </div>
          <div className="grid-auto-fill-260" style={{ marginTop: '20px' }}>
            {data.savedSongs.slice(0, 4).map((s, i) => (
              <div key={i} className="card card-padded" style={{ background: '#0a0a0a' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>🎸</div>
                <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', textTransform: 'uppercase' }}>{s.song_title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>{s.song_artist}</div>
                {s.difficulty && <div className="badge badge-primary mt-2" style={{ background: '#111111', color: '#ffffff', border: '1px solid #333333', borderRadius: 0, fontSize: '9px', fontWeight: 900 }}>{s.difficulty.toUpperCase()}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {data?.achievements?.length > 0 && (
        <div>
          <div className="section-header" style={{ borderBottom: '1px solid #222222', paddingBottom: '12px' }}>
            <div>
              <h2 className="section-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ffffff' }}>Recent Achievements</h2>
              <p className="section-subtitle" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Milestones you've unlocked</p>
            </div>
            <Link to="/progress" className="btn btn-secondary btn-sm" style={{ borderRadius: 0, fontWeight: 900 }}>VIEW ALL</Link>
          </div>
          <div className="grid-auto-fill-260" style={{ marginTop: '20px' }}>
            {data.achievements.slice(0, 4).map((a, i) => (
              <div key={i} className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#0a0a0a' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', textTransform: 'uppercase' }}>{a.title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{a.description}</div>
                <div className="badge badge-accent mt-2" style={{ background: '#111111', color: '#ffffff', border: '1px solid #333333', borderRadius: 0, alignSelf: 'flex-start', fontSize: '9px', fontWeight: 900 }}>+{a.xp_reward} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
