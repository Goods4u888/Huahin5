import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const API = 'https://node.windy.com/webcams/v2.0/list'
const DETAIL = 'https://node.windy.com/webcams/v2.0/detail'
const UA = 'Mozilla/5.0 (compatible; HuaHinGIS/1.0)'

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`webcams HTTP ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    const [list, featured] = await Promise.allSettled([
      fetchJson(`${API}?nearby=12.571,99.959&limit=25&lang=en&imageSize=preview`),
      fetchJson(`${DETAIL}/1667307693`),
    ])

    const byId = new Map<number, any>()
    const push = (c: any) => {
      if (c?.id) byId.set(c.id, c)
    }

    if (list.status === 'fulfilled') {
      for (const c of Array.isArray(list.value?.cams) ? list.value.cams : []) push(c)
    }
    if (featured.status === 'fulfilled') push(featured.value)

    const cams = [...byId.values()]
      .map(c => {
        const loc = c.location ?? {}
        const lat = Number(loc.lat)
        const lon = Number(loc.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
        const id = c.id
        return {
          id,
          title: c.title ?? null,
          lat,
          lon,
          lastUpdate: c.lastUpdate ?? null,
          imageUrl: c.images?.current ?? null,
          pageUrl: c.pageUrl ?? null,
          windyUrl: `https://www.windy.com/-Webcams/webcams/${id}?${lat.toFixed(3)},${lon.toFixed(3)},5`,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => (b.lastUpdate ?? 0) - (a.lastUpdate ?? 0))

    return NextResponse.json({
      ok: true,
      source: 'windy-webcams',
      fetchedAt: new Date().toISOString(),
      total: cams.length,
      cams,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}