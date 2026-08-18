import { NextResponse } from 'next/server'
import https from 'https'

export const runtime = 'nodejs'
export const maxDuration = 30

const SOURCE = 'https://air4thai.pcd.go.th/services/getNewAQI_JSON.php'

const REGION = { minLat: 11, maxLat: 14, minLng: 99, maxLng: 101 }

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : -1
}

function fetchAir4Thai(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      SOURCE,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HuaHinGIS/1.0)',
          Accept: 'application/json',
        },
        rejectUnauthorized: false,
        timeout: 20000,
      },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => resolve(data))
      },
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}

export async function GET() {
  try {
    const text = await fetchAir4Thai()
    const raw = JSON.parse(text)
    const all: any[] = Array.isArray(raw?.stations) ? raw.stations : []

    const stations = all
      .map((s: any) => {
        const lat = num(s?.lat)
        const lng = num(s?.long)
        if (lat < 0 || lng < 0) return null
        const aqiLast = s?.AQILast ?? {}
        const date = aqiLast?.date ?? null
        const time = aqiLast?.time ?? null
        return {
          station_id: s?.stationID ?? null,
          nameTH: s?.nameTH ?? null,
          nameEN: s?.nameEN ?? null,
          lat,
          lng,
          pm25: num(aqiLast?.PM25?.value),
          pm10: num(aqiLast?.PM10?.value),
          aqi: num(aqiLast?.AQI?.aqi),
          aqiParam: aqiLast?.AQI?.param ?? null,
          date,
          time,
          timestamp: date && time ? `${date} ${time}` : date ?? time,
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    const huaHin = stations.filter(
      s => s.lat >= REGION.minLat && s.lat <= REGION.maxLat && s.lng >= REGION.minLng && s.lng <= REGION.maxLng,
    )

    return NextResponse.json({
      ok: true,
      source: 'air4thai',
      fetchedAt: new Date().toISOString(),
      total: stations.length,
      stations,
      huaHin,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, source: 'air4thai', error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
