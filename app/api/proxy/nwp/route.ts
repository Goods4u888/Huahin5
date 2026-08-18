import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const NWP_TOKEN = process.env.TMD_NWP_TOKEN || ''

const BASE = 'https://data.tmd.go.th/nwpapi/v1/forecast/location'

const FIELDS_HOURLY = 'tc,rh,ws10m,wd10m,rain,cond'
const FIELDS_DAILY = 'tc_min,tc_max,rh,rain,ws10m,wd10m,cond'

const CONDITION_LABELS: Record<number, string> = {
  1: 'Clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  4: 'Overcast',
  5: 'Light rain',
  6: 'Moderate rain',
  7: 'Heavy rain',
  8: 'Thunderstorm',
  9: 'Very cold',
  10: 'Cold',
  11: 'Cool',
  12: 'Very hot',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const mode = searchParams.get('mode') === 'daily' ? 'daily' : 'hourly'
  const duration = searchParams.get('duration') || (mode === 'daily' ? '5' : '6')

  if (!NWP_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Missing TMD_NWP_TOKEN environment variable' }, { status: 500 })
  }
  if (!lat || !lon) {
    return NextResponse.json({ ok: false, error: 'lat and lon query params are required' }, { status: 400 })
  }

  try {
    const fields = mode === 'daily' ? FIELDS_DAILY : FIELDS_HOURLY
    const url = `${BASE}/${mode}/at?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&fields=${fields}&duration=${encodeURIComponent(duration)}`

    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${NWP_TOKEN}`,
      },
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ ok: false, status: res.status, error: text.slice(0, 500) }, { status: res.status })
    }

    const raw = await res.json()
    const cast = raw?.WeatherForecasts?.[0]
    const forecasts = (cast?.forecasts ?? []).map((f: any) => {
      const d = f?.data ?? {}
      return {
        time: f?.time ?? null,
        tc: d.tc,
        rh: d.rh,
        ws10m: d.ws10m,
        wd10m: d.wd10m,
        rain: d.rain,
        cond: d.cond,
        condLabel: CONDITION_LABELS[Number(d.cond)] ?? null,
        tc_min: d.tc_min,
        tc_max: d.tc_max,
      }
    })

    return NextResponse.json({
      ok: true,
      mode,
      location: cast?.location ?? null,
      forecasts,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}