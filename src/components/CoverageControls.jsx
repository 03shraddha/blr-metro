const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

const PRESETS = [
  { label: '5-min walk',        value: 300 },
  { label: 'Planning standard', value: 500 },
  { label: 'Extended access',   value: 800 },
]

export default function CoverageControls({ radius, setRadius, activeLayer, coveragePct }) {
  if (activeLayer !== 'coverageGap') return null

  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      style={{
        padding: '18px 28px 16px',
        borderRadius: 24,
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow)',
        fontFamily: IOS_FONT,
        minWidth: 480,
      }}
    >
      {/* Live coverage stat */}
      {coveragePct != null && (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: 'rgba(0,210,100,1)' }}>
            {coveragePct}%
          </span>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 10 }}>
            of dense population within {radius}m of a metro station
          </span>
        </div>
      )}

      {/* Scenario preset buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => setRadius(p.value)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              background: radius === p.value ? 'rgba(0,200,100,0.15)' : 'var(--stat-bg)',
              border: `1px solid ${radius === p.value ? 'rgba(0,200,100,0.55)' : 'var(--border)'}`,
              color: radius === p.value ? 'rgba(0,210,100,1)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: radius === p.value ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: IOS_FONT,
            }}
          >
            {p.value}m · {p.label}
          </button>
        ))}
      </div>

      {/* Slider row */}
      <div className="flex items-center gap-4">
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-label)', textTransform: 'uppercase', flexShrink: 0 }}>
          Walking distance
        </span>
        <input
          type="range"
          min={200}
          max={1000}
          step={50}
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          className="cursor-pointer"
          style={{ flex: 1, accentColor: 'rgba(0,200,100,0.9)' }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>200m</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>1km</span>
      </div>
    </div>
  )
}
