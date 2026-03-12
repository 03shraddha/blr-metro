import { useEffect, useRef, useMemo, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { findMaxRidership } from '../utils/dataTransforms'
import { buildVolumeLayers } from '../layers/volumeLayer'
import { buildEntryExitLayer } from '../layers/entryExitLayer'
import { buildOdFlowLayer } from '../layers/odFlowLayer'
import { buildWeekdayWeekendLayer } from '../layers/weekdayWeekendLayer'
import { buildCoverageGapLayers } from '../layers/coverageGapLayer'
import { buildMetroLinesLayer } from '../layers/metroLinesLayer'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

export default function MapContainer({
  data,
  activeLayer,
  hour,
  weekdayWeekendMode,
  playing,
  onHover,
  onStationClick,
  onZoomChange,
}) {
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const overlayRef      = useRef(null)
  // flowOffset drives directional arc animation when playing
  const flowOffsetRef   = useRef(0)
  const animFrameRef    = useRef(null)

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [77.5946, 12.9716],
      zoom: 11.2,
      pitch: 0,
      attributionControl: true,
    })

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] })
    map.addControl(overlay)

    // Propagate zoom changes for progressive disclosure
    if (onZoomChange) {
      map.on('zoom', () => onZoomChange(map.getZoom()))
    }

    mapRef.current   = map
    overlayRef.current = overlay

    return () => {
      overlay.finalize()
      map.remove()
      mapRef.current   = null
      overlayRef.current = null
    }
  }, [onZoomChange])

  // Directional arc animation — runs rAF loop when playing, stops when paused
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(animFrameRef.current)
      return
    }
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      // Advances ~1 unit per second — integer changes trigger arc color flip
      flowOffsetRef.current = (flowOffsetRef.current + dt * 1.2) % 10
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [playing])

  const maxRidership = useMemo(
    () => (data ? findMaxRidership(data.stations) : 1),
    [data]
  )

  // Rebuild layers on every relevant state change
  useEffect(() => {
    if (!overlayRef.current || !data) return

    const { stations, weekday, weekend, odFlows, populationGrid, metroLines } = data
    const isDataActive = true // a data layer is always shown

    const metroLinesLayer = buildMetroLinesLayer(metroLines, isDataActive)

    const volumeLayers    = buildVolumeLayers(stations, hour, activeLayer === 'volume', maxRidership)
    const entryExitLayer  = buildEntryExitLayer(stations, hour, activeLayer === 'entryExit')
    const odLayers        = buildOdFlowLayer(stations, odFlows, activeLayer === 'odFlow', flowOffsetRef.current)
    const wdwLayer        = buildWeekdayWeekendLayer(stations, weekday, weekend, weekdayWeekendMode, activeLayer === 'weekdayWeekend')
    const coverageLayers  = buildCoverageGapLayers(stations, populationGrid, activeLayer === 'coverageGap')

    const allLayers = [
      metroLinesLayer,
      ...volumeLayers,
      entryExitLayer,
      ...odLayers,
      wdwLayer,
      ...coverageLayers,
    ].filter(Boolean)

    const withCallbacks = allLayers.map(layer =>
      layer.clone({
        onHover: info => onHover(info),
        onClick: info => { if (info.object) onStationClick(info.object) },
      })
    )

    overlayRef.current.setProps({ layers: withCallbacks })
  }, [data, activeLayer, hour, weekdayWeekendMode, maxRidership, onHover, onStationClick])

  return <div ref={mapContainerRef} className="absolute inset-0" />
}
