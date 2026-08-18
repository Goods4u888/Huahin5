import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { readPins, writePins } from './lib'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const pins = readPins()
    return NextResponse.json({ ok: true, pins })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const lat = Number(body?.lat)
    const lng = Number(body?.lng)
    const note = String(body?.note ?? '').trim()

    if (!name) {
      return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 })
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: false, error: 'lat/lng must be numbers' }, { status: 400 })
    }

    const pin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      lat,
      lng,
      important: !!body?.important,
      note,
      createdAt: new Date().toISOString(),
    }

    const pins = readPins()
    pins.push(pin)
    writePins(pins)
    return NextResponse.json({ ok: true, pin }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}