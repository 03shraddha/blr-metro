import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function WeekdayControls({ topN, setTopN, activeLayer }) {
  const isMobile = useIsMobile()
  if (activeLayer !== 'weekdayWeekend') return null

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-6"
      style={{
        bottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : 32,
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
      {/* Label — hidden on mobile to save horizontal space */}
      {!isMobile && (
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-label)', textTransform: 'uppercase', flexShrink: 0 }}>
          Stations shown
        </span>
      )}

      {/* Value */}
      <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(120,160,255,0.95)', width: 52, textAlign: 'right', flexShrink: 0 }}>
        {topN}
      </span>

      {/* Slider — flex:1 on mobile so it fills available space */}
      <input
        type="range"
        min={5}
        max={50}
        step={5}
        value={topN}
        onChange={e => setTopN(Number(e.target.value))}
        className="cursor-pointer"
        style={{ flex: 1, minWidth: 0, height: 44, width: isMobile ? undefined : 300, accentColor: 'rgba(80,140,255,0.9)' }}
      />

      {/* Min / Max labels — hidden on mobile to give slider more room */}
      {!isMobile && (
        <div className="flex gap-3 flex-shrink-0">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>5</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>top 50</span>
        </div>
      )}
    </div>
  )
}
