import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowRight, CheckCircle, Volume2, VolumeX } from 'lucide-react'
import ThreeDMusicVisualizer from '../components/ui/ThreeDMusicVisualizer'

const features = [
  {
    icon: '⚡',
    title: 'AI ROADMAPS',
    desc: 'Our advanced AI builds a custom monthly plan with weekly milestones, skill targets, and song recommendations tailored to you.'
  },
  {
    icon: '🎸',
    title: 'SONG DISCOVERY',
    desc: 'Discover the perfect songs to learn based on your mood, genre taste, and skill level. Every song is a lesson.'
  },
  {
    icon: '💿',
    title: 'VIDEO LESSONS',
    desc: 'YouTube tutorials hand-picked to match your current lesson, instrument, and difficulty — no more endless searching.'
  },
  {
    icon: '🔥',
    title: 'STREAK SYSTEM',
    desc: 'Stay motivated with daily streaks, XP points, achievements, and a progress heatmap that makes practice addictive.'
  },
  {
    icon: '📊',
    title: 'TRACKING PORTAL',
    desc: 'Visual dashboard showing completed lessons, practice hours, milestones, and your overall musical journey.'
  },
  {
    icon: '💀',
    title: 'DAILY MISSIONS',
    desc: 'Each week has a clear mission: specific techniques, songs, and exercises to keep you focused and progressing.'
  },
]

// Distortion curve generator for heavy guitar sound
function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50
  const n_samples = 44100
  const curve = new Float32Array(n_samples)
  const deg = Math.PI / 180
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
  }
  return curve
}

export default function LandingPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const audioCtxRef = useRef(null)
  const oscNodesRef = useRef([])
  const gainNodeRef = useRef(null)
  const timerRef = useRef(null)

  // Clean up Web Audio on unmount
  useEffect(() => {
    return () => {
      stopSynth()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startSynth = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx

      // Create distortion (Waveshaper)
      const dist = ctx.createWaveShaper()
      dist.curve = makeDistortionCurve(130)
      dist.oversample = '4x'

      // Cabinet simulator filter (low-pass to smooth high fizz)
      const cabFilter = ctx.createBiquadFilter()
      cabFilter.type = 'lowpass'
      cabFilter.frequency.setValueAtTime(1300, ctx.currentTime)

      // Scoop mid filter for iconic metal tone
      const scoopFilter = ctx.createBiquadFilter()
      scoopFilter.type = 'peaking'
      scoopFilter.Q.setValueAtTime(1.2, ctx.currentTime)
      scoopFilter.frequency.setValueAtTime(680, ctx.currentTime)
      scoopFilter.gain.setValueAtTime(-7, ctx.currentTime)

      // Master volume controller
      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 0.6) // fade-in
      
      // Connections: Oscs -> Dist -> Scoop -> Cab -> Gain -> Destination
      dist.connect(scoopFilter)
      scoopFilter.connect(cabFilter)
      cabFilter.connect(gainNode)
      gainNode.connect(ctx.destination)
      gainNodeRef.current = gainNode

      // Heavy power chord chord frequencies (C2, C3, G3, C4)
      const frequencies = [65.41, 130.81, 196.0, 261.63]
      const nodes = []

      frequencies.forEach((freq, index) => {
        // Main oscillator
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        osc.connect(dist)
        osc.start()
        nodes.push(osc)

        // Detuned double tracker
        const detuneOsc = ctx.createOscillator()
        detuneOsc.type = 'sawtooth'
        detuneOsc.frequency.setValueAtTime(freq + (index % 2 === 0 ? 0.75 : -0.75), ctx.currentTime)
        detuneOsc.connect(dist)
        detuneOsc.start()
        nodes.push(detuneOsc)
      })

      oscNodesRef.current = nodes
      setIsPlaying(true)

      // Start counter
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setPlaybackTime((t) => (t + 1) % 184)
      }, 1000)

    } catch (e) {
      console.error('Failed to initialize AudioContext:', e)
    }
  }

  const stopSynth = () => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, ctx.currentTime)
      gainNodeRef.current.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.2)
    }

    setTimeout(() => {
      if (oscNodesRef.current.length) {
        oscNodesRef.current.forEach((n) => {
          try { n.stop() } catch (err) {}
        })
        oscNodesRef.current = []
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close()
      }
      setIsPlaying(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, 200)
  }

  const togglePlayback = () => {
    if (isPlaying) {
      stopSynth()
    } else {
      startSynth()
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div style={{ background: '#000000', minHeight: '100vh', position: 'relative', color: '#ffffff' }}>
      
      {/* Stark 3D Wireframe Wave Background in Hero */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '85vh', overflow: 'hidden', pointerEvents: 'none' }}>
        <ThreeDMusicVisualizer isPlaying={isPlaying} speedMultiplier={isPlaying ? 1.4 : 1} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '25vh',
          background: 'linear-gradient(to top, #000000, transparent)'
        }} />
      </div>

      {/* Nav - Stark Black Navigation */}
      <nav style={{ 
        position: 'relative', 
        zIndex: 10, 
        borderBottom: '2px solid #222222',
        background: '#000000',
        padding: 'var(--space-4) var(--space-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 32,
            height: 32,
            border: '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            M
          </div>
          <span style={{ 
            fontSize: 'var(--text-xl)', 
            fontFamily: 'var(--font-display)', 
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            MusePath
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/auth" style={{ fontSize: 'var(--text-xs)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Sign In</Link>
          <Link to="/auth" className="btn" style={{ 
            background: '#ffffff', 
            color: '#000000', 
            borderRadius: 0, 
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-xs)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            border: '2px solid #ffffff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#000000'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff'
            e.currentTarget.style.color = '#000000'
          }}
          >
            JOIN CLUB
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: 'var(--space-20) var(--space-8)' }}>
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          


          <h1 className="hero-title" style={{ 
            fontFamily: 'var(--font-display)', 
            lineHeight: 0.95,
            fontSize: '100px', // Massive rock heading
            letterSpacing: '-0.01em',
            margin: 'var(--space-2) 0 var(--space-6)',
            textTransform: 'uppercase',
            fontWeight: 900,
            color: '#ffffff'
          }}>
            LEARN MUSIC.<br />
            YOUR WAY.
          </h1>

          <p className="hero-description" style={{ 
            fontSize: '14px', 
            color: '#aaaaaa',
            maxWidth: '560px',
            margin: '0 auto var(--space-10)',
            lineHeight: 1.6,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            MusePath builds your custom heavy metal roadmap — AI learning paths, song discovery, 
            interactive video lessons, and raw daily missions to level up your craft.
          </p>

          <div className="hero-actions" style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
            <Link to="/auth" className="btn btn-primary" style={{ 
              minWidth: '220px', 
              background: '#ffffff', 
              color: '#000000', 
              borderRadius: 0,
              border: '2px solid #ffffff',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontSize: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#000000'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
            >
              Start Free Riffing
              <ArrowRight size={14} style={{ marginLeft: 6 }} />
            </Link>
            <button onClick={togglePlayback} className="btn" style={{ 
              minWidth: '180px', 
              borderRadius: 0, 
              border: '2px solid #444444', 
              background: '#000000',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#444444'
            }}
            >
              {isPlaying ? <VolumeX size={14} style={{ marginRight: 6 }} /> : <Volume2 size={14} style={{ marginRight: 6 }} />}
              {isPlaying ? 'MUTE DISTORTION' : 'PLAY GUITAR RIFF'}
            </button>
          </div>

          {/* Trust signals */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
            marginTop: 'var(--space-12)', justifyContent: 'center',
            fontSize: '11px', color: '#666666',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 900
          }}>
            {['No credit card required', 'Free to get started', 'Cancel anytime'].map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <CheckCircle size={12} color="#ffffff" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ 
        padding: 'var(--space-16) var(--space-8) var(--space-20)', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        position: 'relative', 
        zIndex: 2,
        borderTop: '2px solid #222222'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'var(--text-4xl)', 
            fontWeight: 900, 
            color: '#ffffff', 
            marginBottom: 'var(--space-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Everything to <span style={{ textDecoration: 'line-through' }}>Master</span> Shred Your Guitar
          </h2>
          <p style={{ fontSize: '13px', color: '#888888', maxWidth: '600px', margin: '0 auto', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            No more boring tutorials. MusePath generates raw challenges to unlock your potential.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0px', border: '1px solid #222222' }}>
          {features.map((f) => (
            <div key={f.title} style={{ 
              border: '1px solid #222222', 
              padding: 'var(--space-8)', 
              background: '#0a0a0a',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#111111'
              e.currentTarget.style.borderColor = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0a0a0a'
              e.currentTarget.style.borderColor = '#222222'
            }}
            >
              <div style={{ 
                fontSize: '2rem',
                marginBottom: 'var(--space-4)'
              }}>
                {f.icon}
              </div>
              <h3 style={{ 
                fontFamily: 'var(--font-display)', 
                fontSize: 'var(--text-lg)', 
                fontWeight: 900, 
                color: '#ffffff', 
                marginBottom: 'var(--space-2)',
                letterSpacing: '0.1em'
              }}>{f.title}</h3>
              <p style={{ fontSize: '12px', color: '#aaaaaa', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Atmospheric Quote Section */}
      <section style={{
        padding: 'var(--space-20) var(--space-8)',
        textAlign: 'center',
        background: '#050505',
        borderTop: '2px solid #222222',
        borderBottom: '2px solid #222222',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <blockquote style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'var(--text-3xl)', 
            color: '#ffffff', 
            marginBottom: 'var(--space-6)', 
            lineHeight: 1.3,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            IF IT IS TOO LOUD, YOU ARE TOO OLD.
          </blockquote>
          <cite style={{ fontFamily: 'var(--font-body)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#555555', fontWeight: 900 }}>— HEAVY METAL CODE</cite>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-12) var(--space-10) var(--space-24)', 
        borderTop: '2px solid #222222',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#000000',
        position: 'relative',
        zIndex: 2
      }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 28,
            height: 28,
            border: '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            M
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: '#ffffff', fontSize: 'var(--text-sm)', letterSpacing: '0.1em' }}>
            MUSEPATH
          </span>
        </div>
        <p style={{ fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 900 }}>
          © 2026 MUSEPATH. SHRED THE WORLD.
        </p>
      </footer>

      {/* Floating Stark Cassette / Audio Riff Player Footer */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '680px',
        background: '#000000',
        borderRadius: 0,
        padding: 'var(--space-4) var(--space-6)',
        border: '3px solid #ffffff',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95)'
      }}>
        <div className="flex items-center gap-4">
          <div style={{
            width: '42px',
            height: '42px',
            background: '#111111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            border: '2px solid #ffffff',
            boxShadow: isPlaying ? '0 0 15px rgba(255, 255, 255, 0.2)' : 'none'
          }}>
            💀
          </div>
          <div>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 900, color: '#ffffff', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>HEAVY DISTORTION</h4>
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888888', fontWeight: 900 }}>Web Audio Oscillator Riff</p>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-4">
          <button 
            onClick={togglePlayback}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 0,
              background: '#ffffff',
              color: '#000000',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 900,
              transition: 'all 0.1s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#000000'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
          >
            {isPlaying ? (
              <span style={{ fontSize: '10px' }}>STOP</span>
            ) : (
              <span style={{ fontSize: '10px' }}>PLAY</span>
            )}
          </button>
        </div>

        {/* Progress Bar (Mock) */}
        <div className="player-progress flex flex-col gap-1" style={{ width: '160px' }}>
          <div style={{ height: '4px', background: '#222222', borderRadius: 0, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${(playbackTime / 184) * 100}%`, 
              background: '#ffffff',
              transition: 'width 1s linear'
            }} />
          </div>
          <div className="flex justify-between" style={{ fontSize: '9px', fontFamily: 'monospace', color: '#555555', fontWeight: 900 }}>
            <span>{formatTime(playbackTime)}</span>
            <span>03:04</span>
          </div>
        </div>
      </div>

    </div>
  )
}
