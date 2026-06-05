import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useStore } from '../store/useStore'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react'
import signupBg from '../signup-bg.jpg'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', username: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { addToast } = useStore()
  const navigate = useNavigate()

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tab === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { username: form.username } }
        })
        if (error) throw error
        addToast('Account created! Welcome to MusePath 🎵', 'success')
        navigate('/onboarding')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        })
        if (error) throw error
        addToast('Welcome back! 🎸', 'success')
        navigate('/dashboard')
      }
    } catch (err) {
      addToast(err.message || 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.88)), url(${signupBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)'
    }}>
      {/* Centered High Contrast Panel */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#000000',
        border: '3px solid #ffffff',
        padding: 'var(--space-10) var(--space-8)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
        position: 'relative'
      }}>
        {/* Top stark border line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: '#ffffff'
        }} />

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8" style={{ marginTop: 'var(--space-2)' }}>
          <div style={{
            width: 38,
            height: 38,
            border: '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            M
          </div>
          <span style={{
            fontSize: 'var(--text-2xl)',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            MusePath
          </span>
        </div>

        {/* Form Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-4xl)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#ffffff',
          marginBottom: 'var(--space-2)',
          textAlign: 'center'
        }}>
          {tab === 'login' ? 'Enter Stage' : 'Join Fanclub'}
        </h1>
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-8)',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          {tab === 'login' ? 'Sign in to access your roadmaps' : 'Register to generate your custom AI plan'}
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #222222',
          marginBottom: 'var(--space-6)'
        }}>
          {['login', 'signup'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: 'var(--space-3) 0',
                background: 'none',
                border: 'none',
                color: tab === t ? '#ffffff' : '#555555',
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #ffffff' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.1s ease'
              }}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {tab === 'signup' && (
            <div className="input-group">
              <label className="input-label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#888888' }}>Musician Username</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555555' }} />
                <input
                  className="input"
                  style={{
                    paddingLeft: 42,
                    borderRadius: 0,
                    border: '1px solid #333333',
                    background: '#000000',
                    color: '#ffffff'
                  }}
                  name="username"
                  placeholder="e.g. SLAYER_99"
                  value={form.username}
                  onChange={handle}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#888888' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555555' }} />
              <input
                className="input"
                style={{
                  paddingLeft: 42,
                  borderRadius: 0,
                  border: '1px solid #333333',
                  background: '#000000',
                  color: '#ffffff'
                }}
                name="email"
                type="email"
                placeholder="you@metal.com"
                value={form.email}
                onChange={handle}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', color: '#888888' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555555' }} />
              <input
                className="input"
                style={{
                  paddingLeft: 42,
                  paddingRight: 42,
                  borderRadius: 0,
                  border: '1px solid #333333',
                  background: '#000000',
                  color: '#ffffff'
                }}
                name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={handle}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#555555'
                }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Stark Action Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              borderRadius: 0,
              background: '#ffffff',
              color: '#000000',
              border: '2px solid #ffffff',
              fontWeight: 900,
              fontSize: 'var(--text-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            disabled={loading}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#000000'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#000' }} />
                Loading...
              </span>
            ) : (
              <>
                {tab === 'login' ? 'Sign In' : 'Register'}
                <ArrowRight size={16} style={{ marginLeft: 8 }} />
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-xs)', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {tab === 'login' ? "New recruit? " : 'Already registered? '}
          <button
            onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
            style={{
              color: '#ffffff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 900,
              textDecoration: 'underline',
              padding: 0
            }}
          >
            {tab === 'login' ? 'Create Account' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}
