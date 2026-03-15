import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function OdFlowHeadline({ odFlows, topN, isActive }) {
  const isMobile = useIsMobile()
  if (!isActive || !odFlows?.length) return null

  const sorted = [...odFlows].sort((a, b) => b.volume - a.volume)
  const top3Vol = sorted.slice(0, 3).reduce((s, f) => s + f.volume, 0)
  const totalVol = sorted.reduce((s, f) => s + f.volume, 0)
  const pct = totalVol > 0 ? Math.round((top3Vol / totalVol) * 100) : 0

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: isMobile ? 90 : 110,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        fontFamily: IOS_FONT,
        textAlign: 'center',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div
        style={{
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
          boxShadow: 'var(--panel-shadow)',
          borderRadius: 18,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Big % number */}
        <span style={{
          fontSize: 44,
          fontWeight: 800,
          color: '#f59e0b',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}>
          {pct}%
        </span>

        {/* Label block */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            of all passenger flow
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.2 }}>
            carried by just the top 3 corridors
          </div>
        </div>
      </div>
    </div>
  )
}
