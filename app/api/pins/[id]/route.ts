import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { readPins, writePins } from '../lib'

export const runtime = 'nodejs'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pins = readPins()
    const next = pins.filter(p => p.id !== id)
    if (next.length === pins.length) {
      return NextResponse.json({ ok: false, error: 'pin not found' }, { status: 404 })
    }
    writePins(next)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const pins = readPins()
    const pin = pins.find(p => p.id === id)
    if (!pin) {
      return NextResponse.json({ ok: false, error: 'pin not found' }, { status: 404 })
    }
    if (typeof body?.important === 'boolean') pin.important = body.important
    if (typeof body?.name === 'string') pin.name = body.name.trim() || pin.name
    if (typeof body?.note === 'string') pin.note = body.note.trim()
    writePins(pins)
    return NextResponse.json({ ok: true, pin })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}