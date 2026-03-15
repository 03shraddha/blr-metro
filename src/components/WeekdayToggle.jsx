import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

const SEGMENT_STYLES = {
  weekday: { bg: 'rgba(59,130,246,0.22)', text: 'rgba(147,197,253,0.95)' },
  weekend: { bg: 'rgba(168,85,247,0.22)', text: 'rgba(216,180,254,0.95)' },
  delta:   { bg: 'rgba(245,158,11,0.22)', text: 'rgba(252,211,77,0.95)' },
  compare: { bg: 'rgba(20,184,166,0.22)', text: 'rgba(94,234,212,0.95)' },
}

export default function WeekdayToggle({ mode, setMode, activeLayer }) {
  const isMobile = useIsMobile()
  if (activeLayer !== 'weekdayWeekend') return null

  const buttons = [
    { id: 'weekday',  label: 'Weekday',  short: 'Wd'  },
    { id: 'weekend',  label: 'Weekend',  short: 'We'  },
    { id: 'delta',    label: 'Delta',    short: 'Δ'   },
    { id: 'compare',  label: 'Compare',  short: '≈'   },
  ]

  return (
    <div
      className="absolute z-10 flex rounded-2xl p-1 gap-0.5"
      style={{
        // On mobile: centered below the hamburger; on desktop: top-right
        top: isMobile ? 68 : 16,
        left: isMobile ? '50%' : 'auto',
        right: isMobile ? 'auto' : 16,
        transform: isMobile ? 'translateX(-50%)' : 'none',
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow-sm)',
        fontFamily: IOS_FONT,
      }}
    >
      {buttons.map(b => {
        const isActive = mode === b.id
        const style = SEGMENT_STYLES[b.id]
        return (
          <button
            key={b.id}
            onClick={() => setMode(b.id)}
            className="transition-all duration-200 cursor-pointer rounded-xl"
            style={{
              padding: isMobile ? '7px 14px' : '9px 18px',
              minHeight: 40,
              display: 'flex',
              alignItems: 'center',
              background: isActive ? style.bg : 'transparent',
              color: isActive ? style.text : 'var(--segment-inactive)',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              letterSpacing: '-0.01em',
              boxShadow: isActive ? 'inset 0 0 0 0.5px rgba(255,255,255,0.12)' : 'none',
              outline: 'none',
              border: 'none',
            }}
          >
            {isMobile ? b.short : b.label}
          </button>
        )
      })}
    </div>
  )
}
