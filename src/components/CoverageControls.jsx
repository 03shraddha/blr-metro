import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

const PRESETS = [
  { label: '5-min walk',        value: 300 },
  { label: 'planning standard', value: 500 },
  { label: 'extended access',   value: 800 },
]

function getHeadline(coveredPct, radius) {
  const uncoveredPct = 100 - coveredPct
  const r = radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`
  if (coveredPct >= 70) return { headline: `Only ${uncoveredPct}% of dense Bengaluru lacks metro access.`, sub: `Surprisingly comprehensive within ${r}, but the remaining gaps are in the densest neighbourhoods.` }
  if (coveredPct < 50)  return { headline: `More than half of dense Bengaluru is beyond metro reach.`, sub: `At a ${r} catchment, ${uncoveredPct}% of where people actually live falls outside the network's promise.` }
  return { headline: `The metro reaches ${coveredPct}% of where dense Bengaluru lives.`, sub: `${uncoveredPct}% of dense population is more than ${r} from any station.` }
}

export default function CoverageControls({ radius, setRadius, activeLayer, coveragePct }) {
  const isMobile = useIsMobile()
  if (activeLayer !== 'coverageGap') return null

  const radiusLabel = radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`
  const { headline, sub } = coveragePct != null ? getHeadline(coveragePct, radius) : { headline: null, sub: null }

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20"
      style={{
        bottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : 20,
        width: isMobile ? 'calc(100vw - 32px)' : 'auto',
        minWidth: isMobile ? undefined : 480,
        padding: '16px 24px',
        borderRadius: 24,
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow)',
        fontFamily: IOS_FONT,
      }}
    >
      {/* Headline narrative — merged from CoverageHeadline */}
      {headline && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            {coveragePct != null && (
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: 'rgba(0,210,100,1)', flexShrink: 0 }}>
                {coveragePct}%
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {headline}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 4 }}>{sub}</div>
          <div style={{ fontSize: 10, color: 'var(--text-label)', letterSpacing: '0.02em' }}>catchment radius: {radiusLabel}</div>
        </div>
      )}

      {/* Scenario preset buttons — side-by-side on mobile to reduce vertical height */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 14,
      }}>
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => setRadius(p.value)}
            style={{
              padding: isMobile ? '6px 8px' : '10px 16px',
              borderRadius: 20,
              background: radius === p.value ? 'rgba(0,200,100,0.15)' : 'var(--stat-bg)',
              border: `1px solid ${radius === p.value ? 'rgba(0,200,100,0.55)' : 'var(--border)'}`,
              color: radius === p.value ? 'rgba(0,210,100,1)' : 'var(--text-secondary)',
              fontSize: isMobile ? 11 : 12,
              fontWeight: radius === p.value ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: IOS_FONT,
              // equal-width on mobile; auto on desktop
              flex: isMobile ? 1 : undefined,
              minHeight: 44,
            }}
          >
            {p.value}m · {p.label}
          </button>
        ))}
      </div>

      {/* Slider row */}
      <div className="flex items-center gap-4">
        {/* "Walking distance" label — hidden on mobile to give slider more room */}
        {!isMobile && (
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-label)', flexShrink: 0 }}>
            walking distance
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>200m</span>
        <input
          type="range"
          min={200}
          max={1000}
          step={50}
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          className="cursor-pointer"
          style={{ flex: 1, minWidth: 0, height: 44, accentColor: 'rgba(0,200,100,0.9)' }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>1km</span>
      </div>
    </div>
  )
}
