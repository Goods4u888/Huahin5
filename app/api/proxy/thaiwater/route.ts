import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const SOURCE = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load'

function nearHuaHin(lat: number, lng: number): boolean {
  return lat >= 12.3 && lat <= 12.9 && lng >= 99.6 && lng <= 100.2
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  try {
    const res = await fetch(SOURCE, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HuaHinGIS/1.0)', Accept: 'application/json' },
      next: { revalidate: 300 },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `thaiwater HTTP ${res.status}` }, { status: res.status })
    }

    const raw = await res.json()
    const rows: any[] = raw?.waterlevel_data?.data ?? []

    const stations = rows
      .map((r: any) => {
        const st = r?.station ?? {}
        const lat = safeNum(st?.tele_station_lat)
        const lng = safeNum(st?.tele_station_long)
        if (lat === null || lng === null) return null
        const nameObj = st?.tele_station_name ?? {}
        const name = nameObj?.en || nameObj?.th || ''
        const nameTh = nameObj?.th || name
        return {
          id: r?.id,
          name,
          nameTh,
          lat,
          lng,
          datetime: r?.waterlevel_datetime ?? null,
          levelM: safeNum(r?.waterlevel_m),
          levelMsl: safeNum(r?.waterlevel_msl),
          flowRate: safeNum(r?.flow_rate),
          storagePercent: safeNum(r?.storage_percent),
          situation: r?.situation_level ?? null,
          warningLevelM: safeNum(st?.warning_level_m),
          criticalLevelM: safeNum(st?.critical_level_m),
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    return NextResponse.json({
      ok: true,
      source: 'thaiwater',
      fetchedAt: new Date().toISOString(),
      total: rows.length,
      stations,
      huaHin: stations.filter(s => nearHuaHin(s.lat, s.lng)),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}