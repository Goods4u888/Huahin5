import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const BKK_BOUNDS = { minLat: 13.5, maxLat: 14.1, minLng: 100.2, maxLng: 100.9 }

function inBKK(lat: number, lng: number): boolean {
  return lat >= BKK_BOUNDS.minLat && lat <= BKK_BOUNDS.maxLat &&
         lng >= BKK_BOUNDS.minLng && lng <= BKK_BOUNDS.maxLng
}

function safeNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : -1
}

async function getJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    next: { revalidate: 120 },
    ...init,
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    const [airData, tmdData] = await Promise.all([
      getJSON('/api/proxy/air4thai').catch(() => ({ ok: false }) as any),
      getJSON('/api/proxy/tmd').catch(() => ({ ok: false }) as any),
    ])

    const stations: any[] = []
    const weather: any[] = []

    if (airData?.ok) {
      const all = Array.isArray(airData.stations) ? airData.stations : []
      const aqi = all
        .map((s: any) => {
          const lat = safeNum(s?.lat)
          const lng = safeNum(s?.long)
          if (lat < 0 || lng < 0) return null
          const aqiLast = s?.AQILast ?? {}
          return {
            type: 'aqi',
            id: s?.stationID ?? null,
            name: s?.nameEN ?? s?.nameTH ?? 'Unknown',
            nameTh: s?.nameTH ?? null,
            lat,
            lng,
            aqi: safeNum(aqiLast?.AQI?.aqi),
            pm25: safeNum(aqiLast?.PM25?.aqi),
            pm25Value: safeNum(aqiLast?.PM25?.value),
            aqiParam: aqiLast?.AQI?.param ?? null,
            date: aqiLast?.date ?? null,
            time: aqiLast?.time ?? null,
          }
        })
        .filter(Boolean)
      stations.push(...aqi)
    }

    if (tmdData?.ok) {
      const all = Array.isArray(tmdData.stations) ? tmdData.stations : []
      const weatherList = Array.isArray(tmdData.weather) ? tmdData.weather : []
      const wByName = new Map<string, any>()
      for (const w of weatherList) {
        const key = `${(w?.name ?? '').toLowerCase()}`.trim()
        if (key) wByName.set(key, w)
      }
      const merged = all
        .map((s: any) => {
          const lat = safeNum(s?.lat)
          const lng = safeNum(s?.lng)
          if (lat <= 0 || lng <= 0) return null
          const key = `${(s?.name ?? '').toLowerCase()}`.trim()
          const w = wByName.get(key)
          return {
            type: 'weather',
            id: s?.name ?? key,
            name: s?.name ?? 'Unknown',
            nameTh: s?.nameTh ?? null,
            lat,
            lng,
            temp: safeNum(w?.temp),
            humidity: safeNum(w?.humidity),
            windSpeed: safeNum(w?.windSpeed),
            windDir: safeNum(w?.windDir),
            rainfall: safeNum(w?.rainfall),
          }
        })
        .filter(Boolean)
      weather.push(...merged)
    }

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      bkkStations: stations.filter(s => inBKK(s.lat, s.lng)),
      bkkWeather: weather.filter(s => inBKK(s.lat, s.lng)),
      totalStations: stations.length,
      totalWeather: weather.length,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
