import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { api } from '../services/api'
import { Music, Clock, BookOpen, Trophy, Bookmark, User, Edit2, Check } from 'lucide-react'

export default function ProfilePage() {
  const { user, addToast } = useStore()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')

  const load = async () => {
    try {
      const data = await api.getProfile(user.id)
      setProfile(data)
      setUsername(data.user?.username || user?.email?.split('@')[0] || '')
    } catch (err) {
      addToast('Failed to load profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  const saveUsername = async () => {
    try {
      await api.updateProfile({ userId: user.id, username })
      addToast('Profile updated! ✓', 'success')
      setEditing(false)
      load()
    } catch (err) {
      addToast('Failed to update profile', 'error')
    }
  }

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  const { stats, savedSongs, achievements, plans } = profile || {}
  const userData = profile?.user
  const initials = (username || user?.email || 'MP').slice(0, 2).toUpperCase()
  const activePlan = plans?.find(p => p.is_active)

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-description">Your musical identity and learning stats.</p>
      </div>

      {/* Profile Card */}
      <div className="card card-padded mb-8" style={{ background: 'linear-gradient(135deg, var(--primary-glow-2), rgba(214, 104, 71, 0.04))', borderColor: 'var(--border-hover)' }}>
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'white',
            flexShrink: 0, boxShadow: '0 0 30px var(--primary-glow)'
          }}>
            {initials}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-3 mb-1">
              {editing ? (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <input
                    className="input"
                    style={{ width: 200, padding: 'var(--space-2) var(--space-3)' }}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveUsername()}
                    autoFocus
                  />
                  <button onClick={saveUsername} className="btn btn-primary btn-sm"><Check size={14} /></button>
                  <button onClick={() => setEditing(false)} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)' }}>
                    {username || 'Musician'}
                  </div>
                  <button onClick={() => setEditing(true)} className="btn btn-ghost btn-icon">
                    <Edit2 size={14} />
                  </button>
                </>
              )}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              {user?.email}
            </div>
            <div className="chip-row">
              {userData?.instrument && <span className="badge badge-primary">🎸 {userData.instrument}</span>}
              {userData?.skill_level && <span className="badge badge-accent">{userData.skill_level}</span>}
              {userData?.goal_duration && <span className="badge badge-muted">📅 {userData.goal_duration}</span>}
              {userData?.daily_time && <span className="badge badge-muted">⏰ {userData.daily_time}/day</span>}
            </div>
          </div>

          {/* XP Level */}
          <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', minWidth: 120 }}>
            <div style={{ fontSize: '2rem', marginBottom: 4 }}>⭐</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 900, color: 'var(--text-primary)' }}>
              {Math.floor((userData?.xp || 0) / 500) + 1}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Level</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>{userData?.xp || 0} XP</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mb-8">
        {[
          { icon: '⏱️', label: 'Practice Time', value: `${stats?.totalHours || 0}h`, sub: `${stats?.totalMinutes || 0} min total` },
          { icon: '📚', label: 'Sessions', value: stats?.totalSessions || 0, sub: 'Practice sessions' },
          { icon: '🎵', label: 'Saved Songs', value: stats?.savedSongsCount || 0, sub: 'In your library' },
          { icon: '🏆', label: 'Achievements', value: stats?.achievementsCount || 0, sub: 'Badges earned' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: '1.8rem' }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Music Interests */}
      {userData?.music_interests?.length > 0 && (
        <div className="card card-padded mb-8">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
            🎵 Music Interests
          </h2>
          <div className="chip-row">
            {userData.music_interests.map(g => <span key={g} className="badge badge-primary">{g}</span>)}
          </div>
        </div>
      )}

      {/* Active Plan */}
      {activePlan && (
        <div className="card card-padded mb-8">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
            🗺️ Active Plan
          </h2>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{activePlan.title}</div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>{activePlan.summary}</p>
          <div className="chip-row">
            <span className="badge badge-primary">{activePlan.instrument}</span>
            <span className="badge badge-accent">{activePlan.skill_level}</span>
            <span className="badge badge-muted">{activePlan.goal_duration}</span>
          </div>
        </div>
      )}

      {/* Saved Songs */}
      {savedSongs?.length > 0 && (
        <div className="mb-8">
          <div className="section-header">
            <h2 className="section-title">Saved Songs ({savedSongs.length})</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {savedSongs.map((s, i) => (
              <div key={i} className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{s.song_title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>by {s.song_artist}</div>
                </div>
                <div className="flex items-center gap-2">
                  {s.difficulty && <span className="badge badge-muted">{s.difficulty}</span>}
                  <span className="badge badge-accent">{s.action?.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements?.length > 0 && (
        <div>
          <div className="section-header">
            <h2 className="section-title">Achievements</h2>
          </div>
          <div className="grid-auto-fill-260">
            {achievements.map((a, i) => (
              <div key={i} className="achievement-badge">
                <div className="achievement-icon">{a.icon}</div>
                <div className="achievement-title">{a.title}</div>
                <div className="achievement-desc">{a.description}</div>
                <div className="badge badge-accent">+{a.xp_reward} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
