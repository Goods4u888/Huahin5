import { promises as fs } from 'fs'
import path from 'path'
import type { Pin } from '../../types'

const DATA_DIR = path.join(process.cwd(), 'data')
const PINS_FILE = path.join(DATA_DIR, 'pins.json')

export function readPins(): Pin[] {
  try {
    const text = require('fs').readFileSync(PINS_FILE, 'utf-8')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function writePins(pins: Pin[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(PINS_FILE, JSON.stringify(pins, null, 2), 'utf-8')
}