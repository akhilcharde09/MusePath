import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { api } from '../services/api'
import { CheckCircle, Circle, ChevronDown, ChevronUp, Music, Youtube, Target, Sparkles, ArrowRight, Play, Pause } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function WeekCard({ week, monthIdx, planId, userId, onComplete }) {
  const [open, setOpen] = useState(false)
  const [logging, setLogging] = useState(false)
  const { addToast } = useStore()

  const markComplete = async () => {
    setLogging(true)
    try {
      await api.logProgress({
        userId, planId,
        weekId: week.id,
        durationMinutes: week.practice_minutes || 30,
        notes: `Completed: ${week.title}`
      })
      addToast('Week marked complete! +XP earned 🎯', 'success')
      onComplete()
    } catch (err) {
      addToast('Failed to log progress', 'error')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className={`week-card ${week.is_completed ? 'completed' : ''}`}>
      <div className="week-card-header" onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2">
            <div className="week-number">Week {week.week_number}</div>
            {week.is_completed && <span className="badge badge-success">✓ Done</span>}
          </div>
          <div className="week-title">{week.title}</div>
          {week.practice_goal && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              🕐 {week.practice_goal}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!week.is_completed && (
            <button
              onClick={e => { e.stopPropagation(); markComplete() }}
              disabled={logging}
              className="btn btn-secondary btn-sm"
            >
              <CheckCircle size={14} />
              {logging ? 'Saving...' : 'Mark Done'}
            </button>
          )}
          {open ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
        </div>
      </div>

      {open && (
        <div className="week-body animate-fade-up" style={{ paddingTop: 'var(--space-5)' }}>
          {/* Topics & Skills */}
          {week.topics?.length > 0 && (
            <div className="mb-4">
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Topics</div>
              <div className="chip-row">
                {week.topics.map(t => <span key={t} className="badge badge-primary">{t}</span>)}
              </div>
            </div>
          )}

          {week.skills?.length > 0 && (
            <div className="mb-4">
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Skills</div>
              <div className="chip-row">
                {week.skills.map(s => <span key={s} className="badge badge-accent">{s}</span>)}
              </div>
            </div>
          )}

          {/* Songs */}
          {week.songs?.length > 0 && (
            <div className="mb-4">
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                🎵 Songs to Learn
              </div>
              {week.songs.map((s, i) => (
                <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{s.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>by {s.artist}</div>
                  {s.whyRecommended && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{s.whyRecommended}</div>}
                  {s.skillsLearned?.length > 0 && (
                    <div className="chip-row mt-2">
                      {s.skillsLearned.map(sk => <span key={sk} className="badge badge-muted">{sk}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* YouTube searches */}
          {week.youtubeSearches?.length > 0 && (
            <div className="mb-4">
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                🎬 Suggested Searches
              </div>
              {week.youtubeSearches.map((q, i) => (
                <a key={i} href={`https://youtube.com/results?search_query=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', border: '1px solid var(--border)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'border-color 0.2s' }}
                >
                  <Youtube size={14} color="#ff4444" />
                  {q}
                  <ArrowRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </a>
              ))}
            </div>
          )}

          {/* Milestone */}
          {week.milestone && (
            <div style={{ padding: 'var(--space-4)', background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <Target size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Milestone</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{week.milestone}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LearningPlanPage() {
  const { user, addToast } = useStore()
  const [plan, setPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [switching, setSwitching] = useState(false)
  const [weeks, setWeeks] = useState([])
  const [activeMonth, setActiveMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [activePreviewUrl, setActivePreviewUrl] = useState(null)

  useEffect(() => {
    if (activePreviewUrl) {
      const audio = new Audio(activePreviewUrl)
      audio.play().catch(err => {
        console.error('Audio playback failed:', err.message)
        setActivePreviewUrl(null)
      })
      audio.onended = () => {
        setActivePreviewUrl(null)
      }
      return () => {
        audio.pause()
        audio.src = ''
      }
    }
  }, [activePreviewUrl])

  const load = async () => {
    try {
      const data = await api.getDashboard(user.id)
      setPlan(data.plan)
      // Parse weeks from plan_data
      let planData = data.plan?.plan_data
      if (typeof planData === 'string') {
        try {
          planData = JSON.parse(planData)
        } catch (e) {
          console.error('Error parsing plan_data in load:', e)
        }
      }
      const dbWeeks = data.weeks || []
      const dbWeeksMap = {}
      dbWeeks.forEach(w => {
        dbWeeksMap[`${w.month_number}_${w.week_number}`] = w
      })

      if (planData?.months) {
        // Merge DB week properties (id, is_completed, practice_minutes, etc.) into planData months structure
        const enrichedMonths = planData.months.map(m => ({
          ...m,
          weeks: (m.weeks || []).map(w => {
            const dbWeek = dbWeeksMap[`${m.monthNumber}_${w.weekNumber}`] || {}
            return {
              ...w,
              id: dbWeek.id,
              is_completed: dbWeek.is_completed || false,
              practice_minutes: dbWeek.practice_minutes || w.practiceMinutes || 20,
              week_number: w.weekNumber,
              practice_goal: w.practiceGoal,
              youtubeSearches: w.youtubeSearches || w.youtube_searches || []
            }
          })
        }))
        setWeeks(enrichedMonths)
      }

      // Fetch all plans for switcher
      const plansData = await api.getPlans(user.id)
      setPlans(plansData || [])
    } catch (err) {
      addToast('Failed to load plan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchPlan = async (planId) => {
    if (!planId || planId === plan?.id) return
    setSwitching(true)
    try {
      await api.setActivePlan({ userId: user.id, planId })
      addToast('Active plan switched successfully! 🎸', 'success')
      await load()
    } catch (err) {
      addToast('Failed to switch active plan', 'error')
    } finally {
      setSwitching(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  if (!plan) return (
    <div className="page-content">
      {plans.length > 0 ? (
        <div className="card card-padded text-center" style={{ background: '#0a0a0a', padding: 'var(--space-10)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🗺️</div>
          <h2 className="onboarding-title" style={{ color: '#ffffff' }}>No Active Plan</h2>
          <p className="onboarding-subtitle" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Select one of your existing plans below or generate a new one.</p>
          <div className="flex justify-center items-center gap-4 mb-6" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Select Plan:
            </span>
            <select 
              value="" 
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
          <button onClick={() => navigate('/onboarding')} className="btn btn-primary" style={{ borderRadius: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <Sparkles size={16} />
            Create New Plan
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🗺️</div>
          <div className="empty-state-title">No Plan Yet</div>
          <div className="empty-state-desc">Generate your personalized learning plan to get started.</div>
          <button onClick={() => navigate('/onboarding')} className="btn btn-primary mt-4">
            <Sparkles size={16} />
            Generate My Plan
          </button>
        </div>
      )}
    </div>
  )

  let planData = plan?.plan_data
  if (typeof planData === 'string') {
    try {
      planData = JSON.parse(planData)
    } catch (e) {
      console.error('Error parsing planData in render:', e)
    }
  }
  const months = weeks || []
  const currentMonth = months[activeMonth]

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">{planData?.title || 'My Learning Plan'}</h1>
            <p className="page-description">{planData?.summary}</p>
          </div>
          <div className="flex gap-3">
            <span className="badge badge-primary">{plan.instrument}</span>
            <span className="badge badge-accent">{plan.skill_level}</span>
            <span className="badge badge-muted">{plan.goal_duration}</span>
          </div>
        </div>
      </div>

      {/* Plans Manager Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 'var(--space-3) var(--space-4)', 
        background: '#0a0a0a', 
        border: '1px solid var(--border)',
        marginBottom: 'var(--space-6)',
        gap: 'var(--space-4)',
        flexWrap: 'wrap'
      }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Active Plan:
          </span>
          <select 
            value={plan?.id || ''} 
            onChange={(e) => handleSwitchPlan(e.target.value)}
            disabled={switching}
            className="plan-select"
          >
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

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {months.map((m, i) => (
          <button
            key={i}
            onClick={() => setActiveMonth(i)}
            className={`btn btn-sm ${activeMonth === i ? 'btn-primary' : 'btn-secondary'}`}
          >
            Month {m.monthNumber}: {m.theme}
          </button>
        ))}
      </div>

      {/* Month overview */}
      {currentMonth && (
        <>
          <div className="card card-padded mb-6" style={{ background: 'linear-gradient(135deg, var(--primary-glow-2), rgba(214, 104, 71, 0.04))', borderColor: 'var(--border-hover)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: 'var(--space-2)' }}>
              Month {currentMonth.monthNumber}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              {currentMonth.theme}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
              {currentMonth.overview}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--success-glow)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <Target size={16} color="var(--success)" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}><strong>Goal:</strong> {currentMonth.monthlyMilestone}</span>
            </div>
          </div>

          {/* Weeks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {currentMonth.weeks?.map((week, wi) => (
              <WeekCard
                key={wi}
                week={week}
                monthIdx={activeMonth}
                planId={plan.id}
                userId={user.id}
                onComplete={load}
              />
            ))}
          </div>
        </>
      )}

      {/* Tips */}
      {planData?.tips?.length > 0 && (
        <div className="card card-padded mt-8">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>💡 Pro Tips</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {planData.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>{i+1}.</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
