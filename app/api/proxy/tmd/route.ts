import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const stationUrl = 'https://data.tmd.go.th/api/Station/v1/?uid=demo&ukey=demokey'
    const weatherUrl = 'https://data.tmd.go.th/api/WeatherToday/V2/?uid=api&ukey=api12345'

    const [stationRes, weatherRes] = await Promise.all([
      fetch(stationUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChiangRaiGIS/1.0)', Accept: 'application/xml, text/xml, */*' },
        next: { revalidate: 60 },
      }).catch(() => null),
      fetch(weatherUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChiangRaiGIS/1.0)', Accept: 'application/xml, text/xml, */*' },
        next: { revalidate: 60 },
      }).catch(() => null),
    ])

    const stationText = stationRes && stationRes.ok ? await stationRes.text() : ''
    const weatherText = weatherRes && weatherRes.ok ? await weatherRes.text() : ''

    // Parse XML to extract stations
    const stations: Array<{name: string; nameTh: string; lat: number; lng: number; province: string}> = []
    const stationRegex = /<Station>([\s\S]*?)<\/Station>/g
    let match
    while ((match = stationRegex.exec(stationText)) !== null) {
      const block = match[1]
      const nameTh = (block.match(/<StationNameThai>([\s\S]*?)<\/StationNameThai>/) || [])[1] || ''
      const nameEn = (block.match(/<StationNameEnglish>([\s\S]*?)<\/StationNameEnglish>/) || [])[1] || ''
      const province = (block.match(/<Province>([\s\S]*?)<\/Province>/) || [])[1] || ''
      const lat = parseFloat((block.match(/<Latitude[^>]*>([\s\S]*?)<\/Latitude>/) || [])[1] || '0')
      const lng = parseFloat((block.match(/<Longitude[^>]*>([\s\S]*?)<\/Longitude>/) || [])[1] || '0')
      if (lat && lng) {
        stations.push({ name: nameEn.trim(), nameTh: decodeXmlEntities(nameTh), lat, lng, province: decodeXmlEntities(province) })
      }
    }

    // Parse weather
    const weather: Array<{name: string; nameTh: string; lat: number; lng: number; temp: number; humidity: number; windSpeed: number; windDir: number; rainfall: number}> = []
    const wStationRegex = /<Station>([\s\S]*?)<\/Station>/g
    let wMatch
    while ((wMatch = wStationRegex.exec(weatherText)) !== null) {
      const block = wMatch[1]
      const nameTh = (block.match(/<StationNameThai>([\s\S]*?)<\/StationNameThai>/) || [])[1] || ''
      const nameEn = (block.match(/<StationNameEnglish>([\s\S]*?)<\/StationNameEnglish>/) || [])[1] || ''
      const lat = parseFloat((block.match(/<Latitude[^>]*>([\s\S]*?)<\/Latitude>/) || [])[1] || '0')
      const lng = parseFloat((block.match(/<Longitude[^>]*>([\s\S]*?)<\/Longitude>/) || [])[1] || '0')
      const temp = parseFloat((block.match(/<Temperature[^>]*>([\s\S]*?)<\/Temperature>/) || [])[1] || '0')
      const humidity = parseFloat((block.match(/<RelativeHumidity[^>]*>([\s\S]*?)<\/RelativeHumidity>/) || [])[1] || '0')
      const windSpeed = parseFloat((block.match(/<WindSpeed[^>]*>([\s\S]*?)<\/WindSpeed>/) || [])[1] || '0')
      const windDir = parseFloat((block.match(/<WindDirection[^>]*>([\s\S]*?)<\/WindDirection>/) || [])[1] || '0')
      const rainfall = parseFloat((block.match(/<Rainfall[^>]*>([\s\S]*?)<\/Rainfall>/) || [])[1] || '0')
      if (lat && lng) {
        weather.push({ name: nameEn.trim(), nameTh: decodeXmlEntities(nameTh), lat, lng, temp, humidity, windSpeed, windDir, rainfall })
      }
    }

    return NextResponse.json({
      ok: true,
      source: 'tmd',
      stationCount: stations.length,
      weatherCount: weather.length,
      stations,
      weather,
    })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      source: 'tmd',
      error: err?.message ?? 'unknown',
    }, { status: 500 })
  }
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}
