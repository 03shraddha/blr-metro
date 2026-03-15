import { LAYER_LEGENDS } from '../utils/colorScales'
import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

const PANEL_STYLE = {
  backdropFilter: 'blur(28px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
  background: 'var(--panel-bg)',
  boxShadow: 'var(--panel-shadow-sm)',
  fontFamily: IOS_FONT,
}

export default function Legend({ activeLayer, weekdayWeekendMode, catchmentRadius = 500 }) {
  const isMobile = useIsMobile()
  const config = LAYER_LEGENDS[activeLayer]
  if (!config) return null

  // Always fixed to the viewport — never relative to a parent, never drifts.
  // Mobile: top-right below the watermark, compact strip.
  // Desktop: bottom-right corner.
  // On weekdayWeekend layer, WeekdayToggle sits at top:68 — push legend below it
  const mobileTop = activeLayer === 'weekdayWeekend' ? 120 : 68
  const positionStyle = isMobile
    ? { position: 'fixed', right: 12, top: mobileTop, zIndex: 20 }
    : { position: 'fixed', right: 16, bottom: 24, zIndex: 20 }

  if (activeLayer === 'weekdayWeekend' && weekdayWeekendMode === 'compare') {
    return (
      <div
        style={{ ...PANEL_STYLE, ...positionStyle, borderRadius: 18, padding: '16px 20px', minWidth: 200 }}
      >
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-label)', marginBottom: 12 }}>
          ridership intensity
        </p>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(59,130,246,0.85)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Weekday (filled)</span>
        </div>
        <div style={{ height: 5, borderRadius: 4, background: config.gradient, marginBottom: 12 }} />
        <div className="flex items-center gap-2.5 mb-2.5">
          <div style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid rgba(167,139,250,0.85)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Weekend (ring)</span>
        </div>
        <div style={{ height: 5, borderRadius: 4, background: config.weekendGradient, marginBottom: 8 }} />
        <div className="flex justify-between">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Low</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>High</span>
        </div>
      </div>
    )
  }

  let gradient = config.gradient
  if (activeLayer === 'weekdayWeekend') {
    if (weekdayWeekendMode === 'weekend') gradient = config.weekendGradient || config.gradient
    else if (weekdayWeekendMode === 'delta') gradient = config.deltaGradient || config.gradient
  }

  const minLabel = activeLayer === 'weekdayWeekend' && weekdayWeekendMode === 'delta' ? 'Weekday' : config.minLabel
  const maxLabel = activeLayer === 'weekdayWeekend' && weekdayWeekendMode === 'delta' ? 'Weekend' : config.maxLabel
  const title    = activeLayer === 'weekdayWeekend' && weekdayWeekendMode === 'delta' ? 'Weekday vs Weekend' : config.label

  // On mobile: compact strip — just the gradient bar + min/max labels, no title
  if (isMobile) {
    return (
      <div style={{ ...PANEL_STYLE, ...positionStyle, borderRadius: 12, padding: '8px 12px', minWidth: 130 }}>
        <div style={{ height: 4, borderRadius: 3, background: gradient, marginBottom: 5 }} />
        <div className="flex justify-between">
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{minLabel}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{maxLabel}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ ...PANEL_STYLE, ...positionStyle, borderRadius: 18, padding: '16px 20px', minWidth: 190 }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-label)', marginBottom: 12 }}>
        {title}
      </p>
      <div style={{ height: 5, borderRadius: 4, background: gradient, marginBottom: 8 }} />
      <div className="flex justify-between">
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{minLabel}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{maxLabel}</span>
      </div>
      {(config.note || activeLayer === 'coverageGap') && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--border)' }}>
          {activeLayer === 'coverageGap' ? `green rings = ${catchmentRadius}m walkable catchment` : config.note}
        </p>
      )}
    </div>
  )
}
