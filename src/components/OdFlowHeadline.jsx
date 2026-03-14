const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

export default function OdFlowHeadline({ odFlows, topN, isActive }) {
  if (!isActive || !odFlows?.length) return null

  const sorted = [...odFlows].sort((a, b) => b.volume - a.volume)
  const top3Vol = sorted.slice(0, 3).reduce((s, f) => s + f.volume, 0)
  const totalVol = sorted.reduce((s, f) => s + f.volume, 0)
  const pct = totalVol > 0 ? Math.round((top3Vol / totalVol) * 100) : 0

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 15,
        fontFamily: IOS_FONT,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'var(--panel-shadow-sm)',
          borderRadius: 14,
          padding: '10px 20px',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', letterSpacing: '-0.01em' }}>
          Top 3 corridors
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 6px' }}>carry</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {pct}%
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 6 }}>
          of all passenger flow
        </span>
      </div>
    </div>
  )
}
