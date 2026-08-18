import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const CSV_PATH = path.join(process.cwd(), '..', 'data', 'Bangkok_Business_Leads_By_Area.csv')
const CENTROIDS_PATH = path.join(process.cwd(), '..', 'data', 'area_centroids.json')

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
    const areas = new Map<string, { count: number; lat?: number; lng?: number }>()
    const categories = new Set<string>()
    const leads: any[] = []

    if (fs.existsSync(CSV_PATH)) {
      const content = fs.readFileSync(CSV_PATH, 'utf-8')
      const lines = content.split(/\r?\n/).filter((line) => line.trim())
      
      if (lines.length >= 2) {
        const headers = parseCSVLine(lines[0])
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i])
          if (values.length < headers.length) continue

          const lead: any = {}
          headers.forEach((header, idx) => {
            lead[header.toLowerCase()] = values[idx] || ''
          })

          if (lead.name && lead.area) {
            leads.push(lead)
            const current = areas.get(lead.area) || { count: 0 }
            current.count += 1
            areas.set(lead.area, current)
            if (lead.category) categories.add(lead.category)
          }
        }
      }
    }

    // Merge centroids if available
    if (fs.existsSync(CENTROIDS_PATH)) {
      try {
        const centroidData = JSON.parse(fs.readFileSync(CENTROIDS_PATH, 'utf-8'))
        for (const item of centroidData) {
          const areaName = item.area
          if (areas.has(areaName)) {
            areas.get(areaName)!.lat = item.lat
            areas.get(areaName)!.lng = item.lng
          }
        }
      } catch (err) {
        console.error('centroid merge error', err)
      }
    }

    const areaList = Array.from(areas.entries())
      .map(([name, data]) => ({ area: name, ...data }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ 
      ok: true, 
      leads, 
      total: leads.length,
      areas: areaList,
      categories: Array.from(categories).sort()
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
