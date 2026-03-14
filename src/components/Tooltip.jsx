import { formatHour } from '../utils/dataTransforms'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function Tooltip({ info, hour }) {
  if (!info || !info.object) return null

  const { x, y, object } = info
  const props = object.properties || {}

  const hr      = object.ridership?.[String(hour)]
  const entries = hr?.entries ?? null
  const exits   = hr?.exits   ?? null

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{ left: x + 14, top: y - 12 }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 14,
          backdropFilter: 'blur(28px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
          background: 'var(--panel-bg)',
          boxShadow: 'var(--panel-shadow-sm)',
          fontFamily: IOS_FONT,
          minWidth: 160,
          maxWidth: 240,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {props.name || 'Station'}
        </div>
        {props.line && (
          <div style={{ marginBottom: entries !== null ? 8 : 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 6,
                letterSpacing: '0.02em',
                background: lineColor(props.line),
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {capitalize(props.line)} Line
            </span>
          </div>
        )}
        {entries !== null && (
          <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: 'rgba(147,197,253,0.9)' }}>+{fmt(entries)} in</span>
            <span style={{ color: 'rgba(253,186,116,0.9)' }}>{fmt(exits)} out</span>
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.01em' }}>
          {formatHour(hour)}
        </div>
      </div>
    </div>
  )
}

function fmt(n) {
  if (n === null || n === undefined) return '-'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function lineColor(line) {
  const map = {
    purple: 'rgba(128,0,128,0.65)',
    green:  'rgba(0,140,70,0.65)',
    yellow: 'rgba(200,160,0,0.65)',
    pink:   'rgba(200,50,100,0.65)',
    red:    'rgba(180,30,30,0.65)',
    blue:   'rgba(30,80,200,0.65)',
  }
  return map[line?.toLowerCase()] || 'rgba(80,80,80,0.55)'
}
