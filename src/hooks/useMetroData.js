import { useState, useEffect } from 'react'
import { enrichStations } from '../utils/dataTransforms'

const BASE = import.meta.env.BASE_URL

// Helper: fetch a URL and throw a descriptive error if the response is not ok
async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url} — HTTP ${response.status}`)
  }
  return response.json()
}

export function useMetroData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [partialLoad, setPartialLoad] = useState(true) // true until tier-2 data is also ready
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        // --- Tier 1: critical data — stations + lines make the map immediately usable ---
        const [stationsGeo, metroLines] = await Promise.all([
          fetchJson(`${BASE}data/stations.geojson`),
          fetchJson(`${BASE}data/metro_lines.json`),
        ])

        // Enrich stations with an empty hourly stub so the map can render right away
        const stationsPartial = enrichStations(stationsGeo, [])

        setData({
          stations: stationsPartial,
          stationsGeo,
          metroLines,
          // Safe empty defaults so components don't crash before tier-2 loads
          hourly: {},
          weekday: {},
          weekend: {},
          odFlows: [],
          populationGrid: [],
        })
        setLoading(false) // map is renderable; tier-2 still loading

        // --- Tier 2: deferred analytics data ---
        const [hourly, weekday, weekend, odFlows, populationGrid] = await Promise.all([
          fetchJson(`${BASE}data/ridership_hourly.json`),
          fetchJson(`${BASE}data/ridership_weekday.json`),
          fetchJson(`${BASE}data/ridership_weekend.json`),
          fetchJson(`${BASE}data/od_flows.json`),
          fetchJson(`${BASE}data/population_grid.json`),
        ])

        // Re-enrich stations now that we have the full hourly dataset
        const stations = enrichStations(stationsGeo, hourly)

        setData({ stations, stationsGeo, hourly, weekday, weekend, odFlows, populationGrid, metroLines })
        setPartialLoad(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    load()
  }, [])

  return { data, loading, partialLoad, error }
}
