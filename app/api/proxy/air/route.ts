import { NextResponse } from 'next/server'
import https from 'https'

export const runtime = 'nodejs'
export const maxDuration = 30

const SOURCE = 'https://air4thai.pcd.go.th/services/getNewAQI_JSON.php'

function nearHuaHin(lat: number, lng: number): boolean {
  return lat >= 12.3 && lat <= 12.9 && lng >= 99.6 && lng <= 100.2
}

function aqiNumber(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : -1
}

function fetchAir4Thai(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      SOURCE,
      {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HuaHinGIS/1.0)', Accept: 'application/json' },
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
        const lat = Number(s?.lat)
        const lng = Number(s?.long)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const aqi = s?.AQILast ?? {}
        return {
          stationID: s?.stationID ?? null,
          name: s?.nameEN ?? s?.nameTH ?? 'Unknown',
          nameTh: s?.nameTH ?? null,
          area: s?.areaEN ?? null,
          areaTh: s?.areaTH ?? null,
          lat,
          lng,
          date: aqi?.date ?? null,
          time: aqi?.time ?? null,
          aqi: aqiNumber(aqi?.AQI?.aqi),
          aqiParam: aqi?.AQI?.param ?? null,
          aqiColorId: aqi?.AQI?.color_id ?? null,
          pm25: aqiNumber(aqi?.PM25?.aqi),
          pm25Value: aqiNumber(aqi?.PM25?.value),
          pm10: aqiNumber(aqi?.PM10?.aqi),
          o3: aqiNumber(aqi?.O3?.aqi),
          co: aqiNumber(aqi?.CO?.aqi),
          no2: aqiNumber(aqi?.NO2?.aqi),
          so2: aqiNumber(aqi?.SO2?.aqi),
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    return NextResponse.json({
      ok: true,
      source: 'air4thai',
      fetchedAt: new Date().toISOString(),
      total: all.length,
      stations,
      huaHin: stations.filter(s => nearHuaHin(s.lat, s.lng)),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}