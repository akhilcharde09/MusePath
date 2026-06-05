import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { api } from '../services/api'
import { Flame, Clock, Star, CheckSquare, Trophy, Calendar, Plus } from 'lucide-react'

function Heatmap({ logs }) {
  // Build 52-week heatmap
  const cells = []
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(today.getFullYear() - 1)

  // Map dates to practice minutes
  const dateMap = {}
  logs.forEach(log => {
    const d = new Date(log.practiced_at).toISOString().split('T')[0]
    dateMap[d] = (dateMap[d] || 0) + (log.duration_minutes || 0)
  })

  for (let i = 0; i < 364; i++) {
    const d = new Date(oneYearAgo)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().split('T')[0]
    const mins = dateMap[key] || 0
    let level = 0
    if (mins > 0 && mins <= 20) level = 1
    else if (mins > 20 && mins <= 45) level = 2
    else if (mins > 45 && mins <= 90) level = 3
    else if (mins > 90) level = 4
    cells.push({ date: key, mins, level })
  }

  return (
    <div>
      <div className="heatmap">
        {cells.map((c, i) => (
          <div
            key={i}
            className="heatmap-cell"
            data-level={c.level}
            title={c.date + (c.mins > 0 ? ` · ${c.mins} min` : '')}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <span>Less</span>
        {[0,1,2,3,4].map(l => (
          <div key={l} className="heatmap-cell" data-level={l} style={{ width: 12, height: 12, borderRadius: 2, flexShrink: 0 }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

function LogPracticeModal({ userId, planId, onClose, onSuccess }) {
  const [mins, setMins] = useState(30)
  const [notes, setNotes] = useState('')
  const [mood, setMood] = useState('Chill')
  const [loading, setLoading] = useState(false)
  const { addToast } = useStore()

  const submit = async () => {
    setLoading(true)
    try {
      await api.logProgress({ userId, planId, durationMinutes: mins, notes, mood })
      addToast(`${mins} minutes logged! Keep going 🔥`, 'success')
      onSuccess()
      onClose()
    } catch (err) {
      addToast('Failed to log practice', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
      <div className="card card-padded animate-scale-in" style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          Log Practice Session 🎸
        </h2>

        <div className="input-group mb-4">
          <label className="input-label">Duration (minutes)</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[15, 20, 30, 45, 60, 90].map(m => (
              <button key={m} onClick={() => setMins(m)}
                className={`btn btn-sm ${mins === m ? 'btn-primary' : 'btn-secondary'}`}>{m} min</button>
            ))}
          </div>
          <input type="number" className="input mt-2" value={mins} min={1} max={300}
            onChange={e => setMins(parseInt(e.target.value) || 0)} />
        </div>

        <div className="input-group mb-4">
          <label className="input-label">Mood</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {['Chill', 'Fun', 'Intense', 'Focused'].map(m => (
              <button key={m} onClick={() => setMood(m)}
                className={`multi-tag ${mood === m ? 'selected' : ''}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="input-group mb-6">
          <label className="input-label">Notes (optional)</label>
          <textarea className="input" rows={3} placeholder="What did you practice?"
            value={notes} onChange={e => setNotes(e.target.value)}
            style={{ resize: 'none' }} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={submit} disabled={loading || mins <= 0} className="btn btn-primary flex-1">
            {loading ? 'Logging...' : 'Log Session ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const { user, addToast } = useStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [dashData, setDashData] = useState(null)

  const load = async () => {
    try {
      const [prog, dash] = await Promise.all([
        api.getProgress(user.id),
        api.getDashboard(user.id)
      ])
      setData(prog)
      setDashData(dash)
    } catch (err) {
      addToast('Failed to load progress', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  const streak = data?.user?.streak_days || 0
  const totalMins = data?.user?.total_practice_minutes || 0
  const xp = data?.user?.xp || 0
  const level = Math.floor(xp / 500) + 1
  const xpProgress = (xp % 500) / 500 * 100

  const achievements = data?.achievements || []
  const logs = data?.logs || []

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Your Progress</h1>
            <p className="page-description">Track your musical journey, streaks, and achievements.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} />
            Log Practice
          </button>
        </div>
      </div>

      {showModal && (
        <LogPracticeModal
          userId={user.id}
          planId={dashData?.plan?.id}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}

      {/* Stats Grid */}
      <div className="grid-4 mb-8">
        {[
          { icon: '🔥', label: 'Day Streak', value: streak, sub: streak > 0 ? 'On fire!' : 'Start today', bg: 'var(--warning-glow)' },
          { icon: '⏱️', label: 'Total Time', value: `${Math.round(totalMins/60)}h`, sub: `${totalMins} minutes`, bg: 'var(--primary-glow)' },
          { icon: '⭐', label: 'Total XP', value: xp, sub: `Level ${level}`, bg: 'var(--accent-glow)' },
          { icon: '🏆', label: 'Achievements', value: achievements.length, sub: 'Badges earned', bg: 'var(--success-glow)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, fontSize: '1.4rem' }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Streak display */}
      <div className="card card-padded mb-8">
        <div className="streak-display">
          <span className="streak-flame">🔥</span>
          <div>
            <div className="streak-count">{streak}</div>
            <div className="streak-label">Day{streak !== 1 ? 's' : ''} in a row</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)' }}>Level {level}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{xp} XP</div>
          </div>
        </div>
        <div className="xp-bar mt-4">
          <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
          <span>Level {level}</span>
          <span>{500 - (xp % 500)} XP to Level {level + 1}</span>
        </div>
      </div>

      {/* Practice Heatmap */}
      <div className="card card-padded mb-8">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Practice Heatmap
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
          Your practice activity over the past year
        </p>
        {logs.length > 0 ? (
          <Heatmap logs={logs} />
        ) : (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No practice sessions yet. Start logging! 🎸
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="mb-8">
        <div className="section-header">
          <div>
            <h2 className="section-title">Achievements</h2>
            <p className="section-subtitle">Milestones you've unlocked</p>
          </div>
        </div>
        {achievements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-title">No achievements yet</div>
            <div className="empty-state-desc">Complete lessons and build streaks to earn badges!</div>
          </div>
        ) : (
          <div className="grid-auto-fill-260">
            {achievements.map((a, i) => (
              <div key={i} className="achievement-badge">
                <div className="achievement-icon">{a.icon}</div>
                <div className="achievement-title">{a.title}</div>
                <div className="achievement-desc">{a.description}</div>
                <div className="badge badge-accent">+{a.xp_reward} XP</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {new Date(a.earned_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Recent Practice Sessions</h2>
        </div>
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No sessions logged</div>
            <div className="empty-state-desc">Click "Log Practice" to record your first session.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {logs.slice(0, 15).map((log, i) => (
              <div key={i} className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎵</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {log.duration_minutes} minute session
                  </div>
                  {log.notes && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{log.notes}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {log.mood && <div className="badge badge-muted mb-1">{log.mood}</div>}
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {new Date(log.practiced_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
