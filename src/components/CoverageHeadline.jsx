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
    return {
      uncoveredPct: total > 0 ? Math.round((uncovered / total) * 100) : 0,
      gapCells: populationGrid.filter(cell =>
        cell.weight >= 0.12 &&
        !positions.some(pos => haverDist(pos, cell.position) <= catchmentRadius)
      ).length,
    }
  }, [stations, populationGrid, catchmentRadius])

  if (!isActive || !stats) return null

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
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
        <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', letterSpacing: '-0.02em' }}>
          {stats.uncoveredPct}%
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 6px' }}>
          of dense population lives outside
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {catchmentRadius}m metro access
        </span>
      </div>
    </div>
  )
}
