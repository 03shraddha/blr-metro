import { PathLayer } from '@deck.gl/layers'

// Line data is loaded from public/data/metro_lines.json (real OSM geometry)
export function buildMetroLinesLayer(metroLines, isAnyDataLayerActive) {
  if (!metroLines || metroLines.length === 0) return null

  return new PathLayer({
    id: 'metro-lines',
    data: metroLines,
    // Always visible as the structural backbone of the network
    opacity: isAnyDataLayerActive ? 0.80 : 1.0,
    transitions: { opacity: { duration: 400 } },
    getPath: d => d.path,
    getColor: d => [...d.color, 255],
    getWidth: 6,
    widthUnits: 'pixels',
    widthMinPixels: 3.5,
    widthMaxPixels: 10,
    capRounded: true,
    jointRounded: true,
    pickable: false,
  })
}
