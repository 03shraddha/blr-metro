import { formatHour } from '../utils/dataTransforms'
import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function TimeSlider({ hour, playing, togglePlay, setHourManual, activeLayer }) {
  const isMobile = useIsMobile()
  const hourlyLayers = ['volume', 'entryExit']
  if (!hourlyLayers.includes(activeLayer)) return null

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-6"
      style={{
        bottom: isMobile ? 16 : 32,
        width: isMobile ? 'calc(100vw - 32px)' : 'auto',
        padding: '16px 28px',
        borderRadius: 32,
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow)',
        fontFamily: IOS_FONT,
      }}
    >
      {/* Play / Pause — always visible, 44px touch target */}
      <button
        onClick={togglePlay}
        className="transition-colors cursor-pointer flex items-center justify-center flex-shrink-0"
        style={{ width: 44, height: 44, color: playing ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width={30} height={30}>
            <rect x="6" y="4" width="4" height="16" rx="1.5" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width={30} height={30}>
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Label — hidden on mobile to save space */}
      {!isMobile && (
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-label)', textTransform: 'uppercase', flexShrink: 0 }}>
          Time
        </span>
      )}

      {/* Hour value */}
      <span
        className="tabular-nums select-none flex-shrink-0"
        style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(251,146,60,0.95)', width: 90, textAlign: 'right' }}
      >
        {formatHour(hour)}
      </span>

      {/* Slider — flex:1 on mobile so it fills available space */}
      <input
        type="range"
        min={0}
        max={23}
        value={hour}
        onChange={e => setHourManual(e.target.value)}
        className="accent-orange-400 cursor-pointer"
        style={{ flex: 1, minWidth: 0, height: 44, width: isMobile ? undefined : 300 }}
      />

      {/* Min / Max labels — hidden on mobile to give slider more room */}
      {!isMobile && (
        <div className="flex gap-3 flex-shrink-0">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>12am</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>11pm</span>
        </div>
      )}
    </div>
  )
}
