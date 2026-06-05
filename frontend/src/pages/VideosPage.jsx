import { useState } from 'react'
import { api } from '../services/api'
import { useStore } from '../store/useStore'
import { ExternalLink, Play, Search } from 'lucide-react'

const INSTRUMENTS = ['guitar', 'piano', 'drums', 'bass', 'vocals', 'violin']
const LEVELS      = ['beginner', 'intermediate', 'advanced']
const TOPICS      = ['basics', 'chords', 'scales', 'fingerpicking', 'strumming', 'music theory', 'improvisation', 'songs', 'techniques']

function VideoCard({ video }) {
  return (
    <div className="video-card">
      <div className="video-thumbnail">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} loading="lazy" />
        ) : (
          <div className="video-thumbnail-placeholder">🎬</div>
        )}
        {video.duration && <div className="video-duration">{video.duration}</div>}
        <div className="video-play-overlay">
          <div className="video-play-btn">
            <Play size={20} fill="currentColor" />
          </div>
        </div>
      </div>

      <div className="video-info">
        <div className="video-title">{video.title}</div>
        <div className="video-channel" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <span style={{ color: '#ff4444', fontSize: '0.7rem' }}>▶</span>
          {video.channel}
        </div>
        <div className="mt-2">
          <a
            href={video.watch_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-sm w-full"
          >
            <Play size={12} fill="currentColor" />
            Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  )
}

export default function VideosPage() {
  const { addToast } = useStore()
  const [filters, setFilters] = useState({ instrument: 'guitar', level: 'beginner', topic: 'basics', query: '' })
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = filters.query
        ? { query: filters.query }
        : { instrument: filters.instrument, level: filters.level, topic: filters.topic }
      const data = await api.getVideos(params)
      setVideos(data.videos || [])
    } catch (err) {
      addToast('Failed to load videos: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Video Lessons</h1>
        <p className="page-description">Curated YouTube tutorials matched to your instrument, level, and current lesson.</p>
      </div>

      {/* Filter Card */}
      <div className="card card-padded mb-8">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>
          🎬 Find Lessons
        </h2>

        {/* Custom search */}
        <div className="input-group mb-5">
          <label className="input-label">Custom Search (optional)</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="e.g. 'fingerpicking patterns guitar tutorial'"
                value={filters.query}
                onChange={e => setFilters(f => ({ ...f, query: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          {/* Instrument */}
          <div className="input-group">
            <label className="input-label">Instrument</label>
            <div className="flex flex-col gap-1">
              {INSTRUMENTS.map(i => (
                <button key={i} onClick={() => setFilters(f => ({ ...f, instrument: i, query: '' }))}
                  className={`btn btn-sm ${filters.instrument === i && !filters.query ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start' }}>
                  {i.charAt(0).toUpperCase() + i.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="input-group">
            <label className="input-label">Level</label>
            <div className="flex flex-col gap-1">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setFilters(f => ({ ...f, level: l, query: '' }))}
                  className={`btn btn-sm ${filters.level === l && !filters.query ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start' }}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="input-group">
            <label className="input-label">Topic</label>
            <div className="flex flex-col gap-1">
              {TOPICS.map(t => (
                <button key={t} onClick={() => setFilters(f => ({ ...f, topic: t, query: '' }))}
                  className={`btn btn-sm ${filters.topic === t && !filters.query ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={search} disabled={loading} className="btn btn-primary btn-lg">
          {loading ? (
            <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Searching...</>
          ) : (
            <><Search size={18} /> Find Videos</>
          )}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="empty-state">
          <div className="loading-spinner" style={{ width: 50, height: 50 }} />
          <div style={{ color: 'var(--text-secondary)' }}>Searching YouTube...</div>
        </div>
      )}

      {!loading && searched && videos.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <div className="empty-state-title">No videos found</div>
          <div className="empty-state-desc">Try a different search or adjust your filters.</div>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">{videos.length} Videos Found</h2>
              <p className="section-subtitle">{filters.query || `${filters.instrument} · ${filters.topic} · ${filters.level}`}</p>
            </div>
          </div>
          <div className="grid-auto-fill-300">
            {videos.map((v, i) => <VideoCard key={i} video={v} />)}
          </div>
        </>
      )}

      {!searched && (
        <div className="empty-state" style={{ opacity: 0.7 }}>
          <div className="empty-state-icon">🎬</div>
          <div className="empty-state-title">Select filters above</div>
          <div className="empty-state-desc">Choose your instrument, level, and topic — or enter a custom search.</div>
        </div>
      )}
    </div>
  )
}
