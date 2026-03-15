import { useMemo } from 'react'
import { timePhase } from '../utils/dataTransforms'
import { useIsMobile } from '../hooks/useIsMobile'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

// Build a phase-aware micro-story from live OD flow data
function buildNarrative(odFlows, hour) {
  if (!odFlows?.length) return { headline: '', sub: '' }

  const sorted = [...odFlows].sort((a, b) => b.volume - a.volume)
  const top = sorted[0]
  const top3Vol = sorted.slice(0, 3).reduce((s, f) => s + f.volume, 0)
  const totalVol = sorted.reduce((s, f) => s + f.volume, 0)
  const top3Pct = totalVol > 0 ? Math.round((top3Vol / totalVol) * 100) : 0

  // Top station name by volume (origin of the busiest corridor)
  const topStation = top?.from ?? 'the network'
  const topVolumeK = top ? (top.volume / 1000).toFixed(1) : '?'

  // Count corridors with meaningful volume (> 1% of total)
  const activeCorridors = sorted.filter(f => f.volume > totalVol * 0.01).length

  const phase = timePhase(hour)

  if (phase.label === 'Morning Rush') {
    return {
      headline: `bengaluru's suburbs are draining into the centre.`,
      sub: `${topStation} is the busiest origin right now, ${topVolumeK}k riders. ${top3Pct}% of all flow is concentrated in just 3 corridors.`,
    }
  }

  if (phase.label === 'Evening Rush') {
    return {
      headline: `the tide reverses. workers are flowing outbound.`,
      sub: `${topStation} is the busiest corridor, ${topVolumeK}k riders heading out. the same arteries that filled the city are now emptying it.`,
    }
  }

  if (phase.label === 'Midday') {
    return {
      headline: `the rush subsides. the network finds its breath.`,
      sub: `${topStation} is still the top corridor but volume is spread thinner. only ${top3Pct}% of flow in the top 3 routes. errands and meetings, not commutes.`,
    }
  }

  if (phase.label === 'Afternoon Lull') {
    return {
      headline: `the city is between rhythms.`,
      sub: `${activeCorridors} corridors carry meaningful volume. ${topStation} leads at ${topVolumeK}k, a quieter version of the morning pattern.`,
    }
  }

  if (phase.label === 'Night Wind-down' || phase.label === 'Late Night') {
    return {
      headline: `only ${activeCorridors} corridors move significant volume.`,
      sub: `the skeleton network serves shift workers and late commuters. ${topStation} anchors ${top3Pct}% of remaining flow.`,
    }
  }

  if (phase.label === 'Early Morning') {
    return {
      headline: `the first wave is building.`,
      sub: `early risers and shift workers: ${activeCorridors} corridors active. ${topStation} leads with ${topVolumeK}k. the city hasn't hit its stride yet.`,
    }
  }

  // Fallback for any unlabelled hour (e.g. midnight edge)
  return {
    headline: `${top3Pct}% of all flow in just 3 corridors.`,
    sub: `${topStation} is the busiest route right now at ${topVolumeK}k riders.`,
  }
}

export default function OdFlowHeadline({ odFlows, topN, isActive, hour = 8 }) {
  const isMobile = useIsMobile()
  const { headline, sub } = useMemo(
    () => buildNarrative(odFlows, hour),
    [odFlows, hour]
  )

  if (!isActive || !odFlows?.length) return null

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: isMobile ? 'calc(230px + env(safe-area-inset-bottom, 0px))' : 110,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        fontFamily: IOS_FONT,
        textAlign: 'center',
        maxWidth: isMobile ? 'calc(100vw - 32px)' : 520,
        width: '100%',
      }}
    >
      <div
        style={{
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
          boxShadow: 'var(--panel-shadow)',
          borderRadius: 18,
          padding: isMobile ? '12px 18px' : '14px 24px',
          textAlign: 'left',
        }}
      >
        {/* Phase-aware headline */}
        <div style={{
          fontSize: isMobile ? 12 : 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>
          {headline}
        </div>

        {/* Supporting detail */}
        <div style={{
          fontSize: isMobile ? 10 : 11,
          color: 'var(--text-muted)',
          marginTop: 4,
          lineHeight: 1.4,
        }}>
          {sub}
        </div>
      </div>
    </div>
  )
}
