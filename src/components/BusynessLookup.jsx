import { useState, useMemo, useEffect } from 'react'
import { getStationBusyness, formatHour } from '../utils/dataTransforms'

const LINE_COLOR = {
  purple: '#b222b2', green: '#008c46', yellow: '#c8a000',
  pink: '#c83264', red: '#b41e1e', blue: '#1e50c8',
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

// Order: packed → busy → moderate → quiet → unknown
const LEVEL_ORDER = { packed: 0, busy: 1, moderate: 2, quiet: 3, unknown: 4 }

export default function BusynessLookup({ stations, hour, isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [localHour, setLocalHour] = useState(hour)

  // Sync to global hour each time the panel opens
  useEffect(() => {
    if (isOpen) setLocalHour(hour)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // All stations ranked by busyness for the current hour
  // Must be called before any early return (Rules of Hooks)
  const ranked = useMemo(() => {
    return [...stations]
      .map(s => ({ station: s, result: getStationBusyness(s, localHour) }))
      .filter(({ result }) => result.level !== 'unknown')
      .sort((a, b) => {
        const lo = LEVEL_ORDER[a.result.level] - LEVEL_ORDER[b.result.level]
        if (lo !== 0) return lo
        return b.result.current - a.result.current
      })
  }, [stations, localHour])

  if (!isOpen) return null

  // Dynamic slider color based on time-of-day context
  const sliderColor = localHour >= 7 && localHour <= 10 ? '#f97316'  // morning rush - orange
    : localHour >= 17 && localHour <= 20 ? '#ef4444'                  // evening rush - red
    : localHour >= 22 || localHour <= 5  ? '#6366f1'                  // night - indigo
    : '#22c55e'                                                         // off-peak - green

  const filtered = query.trim()
    ? ranked.filter(({ station }) =>
        station.properties.name.toLowerCase().includes(query.toLowerCase())
      )
    : ranked

  const result = selected ? getStationBusyness(selected, localHour) : null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '92vw',
          maxWidth: 380,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--panel-bg)',
          borderRadius: 24,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(32px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
          fontFamily: FONT,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Live station crowding</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>tap any station</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: '2px 6px', lineHeight: 1 }}>✕</button>
          </div>

          {/* Hour scrubber */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>12 AM</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {formatHour(localHour)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>11 PM</span>
            </div>
            <input
              type="range"
              min={0}
              max={23}
              value={localHour}
              onChange={e => { setLocalHour(Number(e.target.value)); setSelected(null) }}
              style={{ width: '100%', height: 28, accentColor: sliderColor, cursor: 'pointer' }}
            />
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
              <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              placeholder="Filter stations..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 12px 8px 30px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: FONT,
              }}
            />
          </div>
        </div>

        {/* Selected station detail */}
        {selected && result && (
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', background: result.color + '10', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 28, lineHeight: 1 }}>{result.emoji}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: result.color }}>
                  {result.level.charAt(0).toUpperCase() + result.level.slice(1)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{selected.properties.name}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{result.description}</div>
            {/* Fill bar */}
            <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(result.pct * 100)}%`, background: result.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
              peak at <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{result.peakHour !== null ? formatHour(result.peakHour) : 'n/a'}</span>
            </div>
          </div>
        )}

        {/* Station list — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              {ranked.length === 0 ? 'loading ridership data…' : 'no stations found'}
            </div>
          ) : (
            filtered.map(({ station, result: r }) => {
              const lineColor = LINE_COLOR[station.properties.line] || '#888'
              const isSelected = selected?.properties?.id === station.properties.id
              return (
                <div
                  key={station.properties.id}
                  onClick={() => setSelected(isSelected ? null : station)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 16px',
                    borderBottom: '0.5px solid var(--border-row)',
                    cursor: 'pointer',
                    background: isSelected ? r.color + '15' : 'transparent',
                    transition: 'background 0.12s',
                  }}
                >
                  {/* Line dot */}
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: lineColor, flexShrink: 0 }} />

                  {/* Name */}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {station.properties.name}
                  </span>

                  {/* Status label */}
                  <span style={{
                    fontSize: 12, fontWeight: 500,
                    padding: '2px 0',
                    color: r.color,
                    flexShrink: 0,
                    letterSpacing: '0.02em',
                  }}>
                    {r.level}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
