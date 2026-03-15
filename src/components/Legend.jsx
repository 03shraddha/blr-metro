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

  // Push legend up on mobile so it clears the bottom control panels (~80px tall + spacing)
  // The safe-area inset ensures it also clears notch/home-indicator on iOS devices
  const bottomOffset = isMobile ? 'calc(100px + env(safe-area-inset-bottom, 0px))' : 24

  if (activeLayer === 'weekdayWeekend' && weekdayWeekendMode === 'compare') {
    return (
      <div
        className="absolute right-4 z-10"
        style={{ ...PANEL_STYLE, bottom: bottomOffset, borderRadius: 18, padding: '16px 20px', minWidth: 200 }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-label)', textTransform: 'uppercase', marginBottom: 12 }}>
          Ridership intensity
        </p>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(59,130,246,0.85)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Weekday (filled)</span>
        </div>
        <div style={{ height: 5, borderRadius: 4, background: config.gradient, marginBottom: 12 }} />
        <div className="flex items-center gap-2.5 mb-2.5">
          <div style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid rgba(167,139,250,0.85)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Weekend (ring)</span>
        </div>
        <div style={{ height: 5, borderRadius: 4, background: config.weekendGradient, marginBottom: 8 }} />
        <div className="flex justify-between">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Low</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>High</span>
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

  return (
    <div
      className="absolute right-4 z-10"
      style={{ ...PANEL_STYLE, bottom: bottomOffset, borderRadius: 18, padding: '16px 20px', minWidth: 190 }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-label)', textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </p>
      <div style={{ height: 5, borderRadius: 4, background: gradient, marginBottom: 8 }} />
      <div className="flex justify-between">
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{minLabel}</span>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{maxLabel}</span>
      </div>
      {(config.note || activeLayer === 'coverageGap') && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--border)' }}>
          {activeLayer === 'coverageGap' ? `Green rings = ${catchmentRadius}m walkable catchment` : config.note}
        </p>
      )}
    </div>
  )
}
