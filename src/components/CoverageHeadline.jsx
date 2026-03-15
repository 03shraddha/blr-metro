import { useMemo } from 'react'

const IOS_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

function haverDist([lng1, lat1], [lng2, lat2]) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Build a contextual narrative depending on how much of the city is covered
function buildCoverageNarrative(coveredPct, uncoveredPct, catchmentRadius) {
  const radiusLabel = catchmentRadius >= 1000
    ? `${(catchmentRadius / 1000).toFixed(1)}km`
    : `${catchmentRadius}m`

  // Extra walking cost framing — an auto-rickshaw costs roughly ₹20/km
  const extraKm = ((catchmentRadius - 500) / 1000).toFixed(1)
  const extraCost = Math.round((catchmentRadius - 500) / 1000 * 20)

  if (coveredPct >= 70) {
    return {
      headline: `only ${uncoveredPct}% of dense Bengaluru lacks metro access.`,
      sub: `the network is surprisingly comprehensive within ${radiusLabel}, but the remaining gaps are in the densest neighbourhoods where the need is highest.`,
    }
  }

  if (coveredPct < 50) {
    return {
      headline: `more than half of dense Bengaluru is beyond metro reach.`,
      sub: `at a ${radiusLabel} catchment, ${uncoveredPct}% of where people actually live falls outside the network's promise. geography outpaces ambition.`,
    }
  }

  // 50–69%
  if (catchmentRadius > 500) {
    return {
      headline: `the metro reaches ${coveredPct}% of where dense Bengaluru lives, at a price.`,
      sub: `stretching the catchment to ${radiusLabel} adds ~${extraKm}km of walking. in a city where auto-rickshaws charge ₹20/km, that's ₹${extraCost} before you board.`,
    }
  }

  return {
    headline: `the metro reaches ${coveredPct}% of where dense Bengaluru lives.`,
    sub: `a city within the city: ${uncoveredPct}% of dense population is more than ${radiusLabel} from any station. last-mile connectivity determines whether the network truly serves them.`,
  }
}

export default function CoverageHeadline({ stations, populationGrid, catchmentRadius, isActive }) {
  const stats = useMemo(() => {
    if (!stations?.length || !populationGrid?.length) return null
    const positions = stations.map(s => s.geometry.coordinates)
    let total = 0, uncovered = 0
    for (const cell of populationGrid) {
      if (cell.weight < 0.12) continue
      total += cell.weight
      const covered = positions.some(pos => haverDist(pos, cell.position) <= catchmentRadius)
      if (!covered) uncovered += cell.weight
    }
    const uncoveredPct = total > 0 ? Math.round((uncovered / total) * 100) : 0
    const coveredPct = 100 - uncoveredPct
    return { coveredPct, uncoveredPct }
  }, [stations, populationGrid, catchmentRadius])

  if (!isActive || !stats) return null

  const { coveredPct, uncoveredPct } = stats
  const { headline, sub } = buildCoverageNarrative(coveredPct, uncoveredPct, catchmentRadius)

  const radiusLabel = catchmentRadius >= 1000
    ? `${(catchmentRadius / 1000).toFixed(1)}km`
    : `${catchmentRadius}m`

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        fontFamily: IOS_FONT,
        textAlign: 'center',
        maxWidth: 'calc(100vw - 32px)',
        width: 480,
      }}
    >
      <div
        style={{
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: 'var(--panel-shadow-sm)',
          borderRadius: 18,
          padding: '14px 20px',
          textAlign: 'left',
        }}
      >
        {/* Main contextual headline */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          {headline}
        </div>

        {/* Supporting narrative line */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
          {sub}
        </div>

        {/* Dynamic catchment radius label — shows what the user has set */}
        <div style={{ fontSize: 10, color: 'var(--text-label)', marginTop: 6, letterSpacing: '0.04em' }}>
          catchment radius: {radiusLabel}
        </div>
      </div>
    </div>
  )
}
