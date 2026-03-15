import { buildSparkline, formatHour } from '../utils/dataTransforms'
import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function StationPanel({ station, onClose }) {
  const visible = !!station
  const isMobile = useIsMobile()
  if (!station && !visible) return null

  const props    = station?.properties || {}
  const sparkline = station ? buildSparkline(station) : []
  const maxVal   = Math.max(...sparkline, 1)

  const W = 200
  const H = 52

  const points = sparkline.map((v, i) => {
    const px = (i / 23) * W
    const py = H - (v / maxVal) * H
    return `${px},${py}`
  }).join(' ')

  const peakHour = sparkline.indexOf(Math.max(...sparkline))

  // Mobile: slide up from bottom as a sheet. Desktop: slide in from right.
  const panelStyle = isMobile
    ? {
        bottom: 0,
        left: 0,
        right: 0,
        top: 'auto',
        height: '75vh',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 300ms ease',
        borderRadius: '16px 16px 0 0',
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--station-panel-bg)',
        boxShadow: '0 -1px 0 0 var(--station-panel-border)',
        fontFamily: IOS_FONT,
      }
    : {
        top: 0,
        right: 0,
        height: '100%',
        width: 288,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms ease',
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--station-panel-bg)',
        boxShadow: '-1px 0 0 0 var(--station-panel-border)',
        fontFamily: IOS_FONT,
      }

  return (
    <div
      className="absolute z-30 flex flex-col"
      style={panelStyle}
    >
      {/* Drag handle — decorative, mobile only */}
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--text-muted)', opacity: 0.4 }} />
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '0.5px solid var(--border)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
              {props.name || 'Station'}
            </h2>
            {props.line && (
              <span style={{ fontSize: 13, color: 'var(--text-label)', marginTop: 4, display: 'block' }}>
                {capitalize(props.line)} Line
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--btn-close-bg)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--btn-close-color)',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>

      {/* Sparkline */}
      <div style={{ padding: '18px 20px 0' }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Daily ridership pattern
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={0} y1={H * (1 - f)} x2={W} y2={H * (1 - f)} stroke="var(--sparkline-grid)" strokeWidth={1} />
          ))}
          <polyline
            points={`0,${H} ${points} ${W},${H}`}
            fill="rgba(255,140,0,0.10)"
            stroke="none"
          />
          <polyline
            points={points}
            fill="none"
            stroke="rgba(255,140,0,0.75)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {sparkline.length > 0 && (
            <circle
              cx={(peakHour / 23) * W}
              cy={H - (sparkline[peakHour] / maxVal) * H}
              r={3}
              fill="rgba(255,140,0,1)"
            />
          )}
        </svg>
        <div className="flex justify-between" style={{ marginTop: 4 }}>
          {[0, 6, 12, 18, 23].map(h => (
            <span key={h} style={{ fontSize: 10, color: 'var(--text-micro)' }}>{formatHour(h)}</span>
          ))}
        </div>
        {sparkline.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
            Peak: <span style={{ color: 'rgba(251,146,60,0.9)', fontWeight: 600 }}>{formatHour(peakHour)}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      {station?.ridership && (
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Daily totals
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total boardings', value: sparkline.reduce((a, b) => a + b, 0) },
              { label: 'Peak hour', value: formatHour(peakHour) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--stat-bg)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {typeof value === 'number' ? fmt(value) : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '0.5px solid var(--station-panel-border)', marginTop: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text-micro)', margin: 0 }}>Data: BMRCL August 2025 (RTI)</p>
      </div>

      </div>{/* end scrollable content */}
    </div>
  )
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function fmt(n) {
  if (!n) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
