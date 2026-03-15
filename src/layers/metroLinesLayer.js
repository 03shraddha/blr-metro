import { PathLayer, TextLayer } from '@deck.gl/layers'

// Place directional arrow markers every ~spacingDeg degrees along each line path
function computeArrows(metroLines, spacingDeg = 0.03) {
  const markers = []
  for (const line of metroLines) {
    const path = line.path
    if (path.length < 2) continue
    let cumDist = 0
    let nextAt = spacingDeg * 0.4  // start slightly into the first segment
    for (let i = 1; i < path.length; i++) {
      const [x0, y0] = path[i - 1]
      const [x1, y1] = path[i]
      const dx = x1 - x0, dy = y1 - y0
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len === 0) continue
      // TextLayer getAngle: 0 = right, positive = counterclockwise
      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      const segEnd = cumDist + len
      while (nextAt < segEnd) {
        const t = (nextAt - cumDist) / len
        markers.push({ position: [x0 + dx * t, y0 + dy * t], angle, color: line.color })
        nextAt += spacingDeg
      }
      cumDist = segEnd
    }
  }
  return markers
}

// Line data is loaded from public/data/metro_lines.json (real OSM geometry)
// lineStats: optional object like { purple: 0.85, green: 0.6, yellow: 0.25 }
// with normalized ridership per line (0–1). When provided, line width encodes
// relative passenger volume so busier lines are visually heavier.
export function buildMetroLinesLayer(metroLines, isAnyDataLayerActive, isMobile = false, lineStats = null) {
  if (!metroLines || metroLines.length === 0) return null

  // On mobile, bump up minimum line width so metro lines stay legible on high-DPI screens
  const mobileScale = isMobile ? 1.5 : 1

  // Width accessor: per-line when lineStats available, fixed otherwise
  const getWidth = lineStats
    ? d => {
        const stat = lineStats[d.id] ?? 0.5
        return (isMobile ? 2 : 3) + stat * (isMobile ? 3 : 5)
      }
    : 4

  const arrowData = computeArrows(metroLines, 0.03)
  const arrowLayer = new TextLayer({
    id: 'metro-arrows',
    data: arrowData,
    getText: () => '›',
    getPosition: d => d.position,
    getAngle: d => d.angle,
    getColor: d => [...d.color, 210],
    getSize: isMobile ? 14 : 16,
    fontWeight: 'bold',
    billboard: false,
    pickable: false,
  })

  const pathLayer = new PathLayer({
    id: 'metro-lines',
    data: metroLines,
    // Always visible as the structural backbone of the network
    opacity: isAnyDataLayerActive ? 0.80 : 1.0,
    transitions: { opacity: { duration: 400 } },
    getPath: d => d.path,
    getColor: d => [...d.color, 255],
    getWidth,
    widthUnits: 'pixels',
    widthMinPixels: lineStats
      ? (isMobile ? 1.5 : 2)
      : 2.5 * mobileScale,
    widthMaxPixels: lineStats
      ? (isMobile ? 8 : 10)
      : 7 * mobileScale,
    capRounded: true,
    jointRounded: true,
    pickable: false,
    updateTriggers: { getWidth: [lineStats, isMobile] },
  })

  return [pathLayer, arrowLayer]
}
