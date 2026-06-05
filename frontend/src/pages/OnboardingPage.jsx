import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { api } from '../services/api'
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

const STEPS = [
  {
    id: 'instrument',
    title: 'What do you play?',
    subtitle: 'Choose your primary instrument',
    type: 'single',
    options: [
      { value: 'guitar',  emoji: '\uD83C\uDFB8', label: 'Guitar' },
      { value: 'piano',   emoji: '\uD83C\uDFB9', label: 'Piano' },
      { value: 'drums',   emoji: '\uD83E\uDD41', label: 'Drums' },
      { value: 'bass',    emoji: '\uD83C\uDFB8', label: 'Bass' },
      { value: 'vocals',  emoji: '\uD83C\uDFA4', label: 'Vocals' },
      { value: 'violin',  emoji: '\uD83C\uDFBB', label: 'Violin' },
    ],
    grid: 3
  },
  {
    id: 'level',
    title: "What's your current level?",
    subtitle: "Be honest - we will build the perfect plan for where you are",
    type: 'single',
    options: [
      { value: 'beginner',     emoji: '\uD83C\uDF31', label: 'Beginner',     sub: 'Just starting out' },
      { value: 'intermediate', emoji: '\uD83D\uDD25', label: 'Intermediate', sub: 'Know the basics' },
      { value: 'advanced',     emoji: '\u26A1', label: 'Advanced',     sub: 'Ready for mastery' },
    ],
    grid: 3
  },
  {
    id: 'duration',
    title: 'What is your goal duration?',
    subtitle: "We will structure your roadmap to match your timeline",
    type: 'single',
    options: [
      { value: '1 month',  emoji: '\uD83C\uDFC3', label: '1 Month',  sub: 'Quick intensive sprint' },
      { value: '3 months', emoji: '\uD83D\uDDD3\uFE0F', label: '3 Months', sub: 'Solid foundation' },
      { value: '6 months', emoji: '\uD83D\uDCC8', label: '6 Months', sub: 'Deep skill building' },
      { value: '1 year',   emoji: '\uD83C\uDFC6', label: '1 Year',   sub: 'Full mastery path' },
    ],
    grid: 2
  },
  {
    id: 'dailyTime',
    title: 'How much time can you practice daily?',
    subtitle: 'Even 20 minutes a day creates massive progress',
    type: 'single',
    options: [
      { value: '20 mins', emoji: '\u26A1', label: '20 Minutes', sub: 'Quick daily sessions' },
      { value: '45 mins', emoji: '\uD83C\uDFAF', label: '45 Minutes', sub: 'Focused practice' },
      { value: '1 hour',  emoji: '\uD83D\uDD25', label: '1 Hour',    sub: 'Serious commitment' },
      { value: '2 hours', emoji: '\uD83D\uDE80', label: '2+ Hours',  sub: 'Intensive learning' },
    ],
    grid: 2
  },
  {
    id: 'interests',
    title: 'What music are you into?',
    subtitle: 'Select all genres that excite you',
    type: 'multi',
    options: ['Blues', 'Indie', 'Pop', 'Rock', 'Jazz', 'Fingerstyle', 'Classical', 'Hip Hop', 'R&B', 'Metal', 'Folk', 'Electronic', 'Country', 'Funk', 'Soul'],
  },
  {
    id: 'mood',
    title: 'Pick your learning vibe',
    subtitle: 'This shapes how your plan is structured',
    type: 'single',
    options: [
      { value: 'Chill',   emoji: '\uD83D\uDE0C', label: 'Chill',   sub: 'Relaxed and gradual' },
      { value: 'Fun',     emoji: '\uD83C\uDF89', label: 'Fun',     sub: 'Playful and upbeat' },
      { value: 'Intense', emoji: '\uD83D\uDCAA', label: 'Intense', sub: 'Push hard and fast' },
      { value: 'Relaxed', emoji: '\uD83C\uDF0A', label: 'Relaxed', sub: 'Slow and mindful' },
    ],
    grid: 2
  },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ instrument: '', level: '', duration: '', dailyTime: '', interests: [], mood: '' })
  const [generating, setGenerating] = useState(false)
  const { user, addToast } = useStore()
  const navigate = useNavigate()

  const current = STEPS[step]

  const select = (field, value) => {
    if (current.type === 'multi') {
      setData(d => ({
        ...d,
        interests: d.interests.includes(value)
          ? d.interests.filter(i => i !== value)
          : [...d.interests, value]
      }))
    } else {
      setData(d => ({ ...d, [field]: value }))
    }
  }

  const isValid = () => {
    if (current.type === 'multi') return data[current.id]?.length > 0
    return !!data[current.id]
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else generatePlan()
  }

  const back = () => step > 0 && setStep(s => s - 1)

  const generatePlan = async () => {
    setGenerating(true)
    try {
      await api.generatePlan({
        userId: user.id,
        instrument: data.instrument,
        level: data.level,
        duration: data.duration,
        dailyTime: data.dailyTime,
        interests: data.interests,
        mood: data.mood
      })
      addToast('Your personalized plan is ready!', 'success')
      navigate('/dashboard')
    } catch (err) {
      addToast('Failed to generate plan: ' + err.message, 'error')
      setGenerating(false)
    }
  }

  const progress = (step / STEPS.length) * 100

  const stepsLabels = ['Analyzing your goals', 'Selecting songs', 'Building roadmap', 'Finalizing plan']

  return (
    <>
      {generating && (
        <div className="generating-overlay">
          <div style={{ position: 'relative' }}>
            <div className="generating-spinner" />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              {''}
            </div>
          </div>
          <div className="text-center">
            <div className="generating-text">Crafting your personalized plan...</div>
            <div className="generating-sub">MusePath AI is building your perfect roadmap</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {stepsLabels.map((t) => (
              <div key={t} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-1) var(--space-3)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="onboarding-container">
        <div className="onboarding-bg" />

        <div className="onboarding-card animate-scale-in">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div style={{
              width: 30,
              height: 30,
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#ffffff',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              M
            </div>
            <span style={{ 
              fontSize: 'var(--text-lg)', 
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 'bold',
              color: '#ffffff'
            }}>
              MusePath
            </span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar mb-6">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Step dots */}
          <div className="onboarding-step-indicator mb-8">
            {STEPS.map((_, i) => (
              <div key={i} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`} />
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          {/* Content */}
          <div className="animate-fade-up" key={step}>
            <h2 className="onboarding-title">{current.title}</h2>
            <p className="onboarding-subtitle">{current.subtitle}</p>

            {current.type === 'multi' ? (
              <div className="multi-select-grid">
                {current.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => select(current.id, opt)}
                    className={`multi-tag ${data.interests.includes(opt) ? 'selected' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className={`option-grid option-grid-${current.grid || 2}`}>
                {current.options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => select(current.id, opt.value)}
                    className={`option-card ${data[current.id] === opt.value ? 'selected' : ''}`}
                  >
                    <span className="option-card-icon">{opt.emoji}</span>
                    <span className="option-card-label">{opt.label}</span>
                    {opt.sub && <span className="option-card-sub">{opt.sub}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button onClick={back} className="btn btn-ghost" disabled={step === 0}>
              <ArrowLeft size={16} />
              Back
            </button>

            <button
              onClick={next}
              disabled={!isValid() || generating}
              className="btn btn-primary"
              style={{ minWidth: 160 }}
            >
              {step === STEPS.length - 1 ? (
                <>
                  <Sparkles size={16} />
                  Generate My Plan
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
