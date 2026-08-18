import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const CSV_PATH = path.join(process.cwd(), '..', 'data', 'Bangkok_Business_Leads_By_Area.csv')

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export async function GET() {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      return NextResponse.json({ ok: false, error: 'CSV not found' }, { status: 500 })
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8')
    const lines = content.split(/\r?\n/).filter((line) => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ ok: true, leads: [], total: 0 })
    }

    const headers = parseCSVLine(lines[0])
    const leads: any[] = []
    const areas = new Set<string>()
    const categories = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < headers.length) continue

      const lead: any = {}
      headers.forEach((header, idx) => {
        lead[header.toLowerCase()] = values[idx] || ''
      })

      if (lead.name && lead.area) {
        areas.add(lead.area)
        if (lead.category) categories.add(lead.category)
        leads.push(lead)
      }
    }

    return NextResponse.json({ 
      ok: true, 
      leads, 
      total: leads.length,
      areas: Array.from(areas).sort(),
      categories: Array.from(categories).sort()
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
