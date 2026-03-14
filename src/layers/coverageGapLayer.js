import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { populationColorRange } from '../utils/colorScales'

// Haversine distance in metres
function haverDist([lng1, lat1], [lng2, lat2]) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Hardcoded key annotations for Bengaluru
const ANNOTATIONS = [
  { position: [77.748, 12.974], text: 'Whitefield: dense IT hub\nfar from nearest station', align: 'left' },
  { position: [77.579, 12.900], text: 'South Bengaluru gap:\nhigh density, sparse coverage', align: 'left' },
  { position: [77.576, 12.977], text: 'CBD: overserved cluster', align: 'right' },
  { position: [77.675, 12.847], text: 'Electronic City:\nno metro coverage', align: 'left' },
]

export function buildCoverageGapLayers(stations, populationGrid, isActive, catchmentRadius = 500) {
  const stationPositions = stations.map(s => s.geometry.coordinates)

  // Split grid cells into covered vs gap
  const DENSITY_THRESHOLD = 0.12  // ignore very sparse cells
  const gapCells = []
  const coveredCells = []

  for (const cell of populationGrid) {
    if (cell.weight < DENSITY_THRESHOLD) continue
    const covered = stationPositions.some(pos => haverDist(pos, cell.position) <= catchmentRadius)
    if (covered) coveredCells.push(cell)
    else gapCells.push(cell)
  }

  // Gap heatmap — smooth red gradient over uncovered high-density areas
  // HeatmapLayer blends cells naturally so no "dot carpet" effect
  const gapLayer = new HeatmapLayer({
    id: 'coverage-gap-heatmap',
    data: gapCells,
    opacity: isActive ? 0.72 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition: d => d.position,
    getWeight: d => d.weight,
    radiusPixels: 45,
    intensity: 1.4,
    threshold: 0.04,
    colorRange: [
      [254, 235, 200, 0],
      [253, 174, 107, 180],
      [240,  59,  32, 210],
      [165,  15,  21, 240],
    ],
    updateTriggers: { getWeight: [catchmentRadius] },
  })

  // Station catchment rings — prominent green outlines
  const catchmentLayer = new ScatterplotLayer({
    id: 'coverage-catchment',
    data: stations,
    opacity: isActive ? 0.85 : 0,
    transitions: { opacity: { duration: 600 }, getRadius: { duration: 400 } },
    getPosition: d => d.geometry.coordinates,
    getRadius: catchmentRadius,
    updateTriggers: { getRadius: [catchmentRadius] },
    getFillColor: [0, 200, 100, 18],
    getLineColor: [0, 220, 110, 200],
    stroked: true,
    filled: true,
    radiusUnits: 'meters',
    lineWidthMinPixels: 1.5,
    pickable: false,
  })

  // Annotation callouts — key insight labels on the map
  const annotationLayer = new TextLayer({
    id: 'coverage-annotations',
    data: ANNOTATIONS,
    opacity: isActive ? 1 : 0,
    transitions: { opacity: { duration: 600 } },
    getPosition: d => d.position,
    getText: d => d.text,
    getSize: 12,
    getColor: [255, 255, 255, 220],
    getTextAnchor: d => d.align === 'right' ? 'end' : 'start',
    getAlignmentBaseline: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
    fontWeight: 600,
    outlineWidth: 3,
    outlineColor: [0, 0, 0, 200],
    sizeUnits: 'pixels',
    pickable: false,
    parameters: { depthTest: false },
    lineHeight: 1.4,
  })

  return [gapLayer, catchmentLayer, annotationLayer]
}
