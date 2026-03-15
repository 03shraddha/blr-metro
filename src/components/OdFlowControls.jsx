import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function OdFlowControls({ topN, setTopN, activeLayer, odFlows }) {
  const isMobile = useIsMobile()
  if (activeLayer !== 'odFlow') return null

  // Compute top-3 corridor share
  let pct = null
  if (odFlows?.length) {
    const sorted = [...odFlows].sort((a, b) => b.volume - a.volume)
    const top3Vol = sorted.slice(0, 3).reduce((s, f) => s + f.volume, 0)
    const totalVol = sorted.reduce((s, f) => s + f.volume, 0)
    pct = totalVol > 0 ? Math.round((top3Vol / totalVol) * 100) : 0
  }

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20"
      style={{
        bottom: isMobile ? 16 : 32,
        width: isMobile ? 'calc(100vw - 32px)' : 'auto',
        minWidth: isMobile ? undefined : 420,
        padding: '16px 28px',
        borderRadius: 20,
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow)',
        fontFamily: IOS_FONT,
      }}
    >
      {/* Headline stat — single row on mobile, stays compact */}
      {pct !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: '0.5px solid var(--border)',
        }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.04em', lineHeight: 1, flexShrink: 0 }}>
            {pct}%
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              of all passenger flow
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              carried by the top 3 corridors
            </div>
          </div>
        </div>
      )}

      {/* Slider row — on mobile: stack label above slider to avoid crush */}
      {isMobile ? (
        <>
          {/* Row 1: label + value */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-label)', textTransform: 'uppercase', flexShrink: 0 }}>
              Flows shown
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(251,191,36,0.95)', flexShrink: 0 }}>
              {topN}
            </span>
          </div>
          {/* Row 2: slider only, no min/max labels */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={topN}
              onChange={e => setTopN(Number(e.target.value))}
              className="accent-amber-400 cursor-pointer"
              style={{ flex: 1, minWidth: 0, height: 44 }}
            />
          </div>
        </>
      ) : (
        <div className="flex items-center gap-5">
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-label)', textTransform: 'uppercase', flexShrink: 0 }}>
            Flows shown
          </span>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(251,191,36,0.95)', width: 44, textAlign: 'right', flexShrink: 0 }}>
            {topN}
          </span>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={topN}
            onChange={e => setTopN(Number(e.target.value))}
            className="accent-amber-400 cursor-pointer flex-1"
            style={{ minWidth: 0, height: 44 }}
          />
          <div className="flex gap-2 flex-shrink-0">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>5</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>50</span>
          </div>
        </div>
      )}
    </div>
  )
}
