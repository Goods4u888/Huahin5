'use client'

import { useEffect, useRef, useState } from 'react'

type Area = {
  area: string
  count: number
  lat?: number
  lng?: number
}

type Meta = {
  total: number
  areas: Area[]
  categories: string[]
}

type AqiStation = {
  type: 'aqi'
  id?: string | null
  name: string
  nameTh?: string | null
  lat: number
  lng: number
  aqi: number
  pm25: number
  pm25Value: number
  aqiParam?: string | null
  date?: string | null
  time?: string | null
}

type WeatherStation = {
  type: 'weather'
  id?: string
  name: string
  nameTh?: string | null
  lat: number
  lng: number
  temp?: number
  humidity?: number
  windSpeed?: number
  windDir?: number
  rainfall?: number
}

type ObservationResponse = {
  ok: boolean
  fetchedAt?: string
  bkkStations: AqiStation[]
  bkkWeather: WeatherStation[]
  totalStations?: number
  totalWeather?: number
}

export default function TwinPage() {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const cesiumViewer = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [observations, setObservations] = useState<ObservationResponse | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [showAqi, setShowAqi] = useState(true)
  const [showWeather, setShowWeather] = useState(true)
  const [clock, setClock] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const [leadsRes, obsRes] = await Promise.all([
        fetch('/api/leads', { cache: 'no-store' }),
        fetch('/api/observations', { cache: 'no-store' }),
      ])
      const leadsJson = await leadsRes.json()
      const obsJson = await obsRes.json()
      if (leadsJson.ok) setMeta(leadsJson)
      if (obsJson.ok) setObservations(obsJson)
      setLastUpdated(new Date().toLocaleString('th-TH'))
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (loading && !error) return
    setLoading(false)
  }, [meta, observations, error])

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('th-TH'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    const initCesium = async () => {
      if (!cesiumContainer.current) return
      await injectCesiumCDN()

      if (cancelled || !(window as any).Cesium) {
        setError('Cesium failed to load from CDN')
        setLoading(false)
        return
      }

      const Cesium = (window as any).Cesium
      Cesium.Ion.defaultAccessToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHv1ew'

      const viewer = new Cesium.Viewer(cesiumContainer.current!, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        infoBox: true,
        selectionIndicator: true,
      })

      cesiumViewer.current = viewer

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(100.5268, 13.7546, 60000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
      })

      try {
        const osmBuildings = await Cesium.createOsmBuildingsAsync()
        viewer.scene.primitives.add(osmBuildings)
      } catch (osmErr) {
        console.warn('OSM Buildings unavailable', osmErr)
      }

      renderAll(Cesium, viewer, meta, observations, showAqi, showWeather, selectedCategory)

      if (!cancelled) setLoading(false)
    }

    initCesium()

    return () => {
      cancelled = true
      if (cesiumViewer.current) {
        try { cesiumViewer.current.destroy() } catch {}
      }
    }
  }, [meta, observations])

  useEffect(() => {
    if (!cesiumViewer.current || !meta || !observations) return
    const Cesium = (window as any).Cesium
    if (!Cesium) return
    renderAll(Cesium, cesiumViewer.current, meta, observations, showAqi, showWeather, selectedCategory)
  }, [showAqi, showWeather, selectedCategory, meta, observations])

  const filteredAreas = meta?.areas?.filter((area) => {
    const matchesCategory = !selectedCategory || (meta?.categories?.includes(selectedCategory) ?? false)
    const matchesSearch = !search || area.area.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  }) ?? []

  const topCategories = meta?.categories ?? []
  const totalFiltered = filteredAreas.reduce((sum, area) => sum + area.count, 0)

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0b1220] text-slate-100">
      <div className="fixed inset-x-0 top-0 z-[1200] border-b border-sky-400/20 bg-[#0f172a]/90 px-4 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-md shadow-sky-500/30">
            DT
          </div>
          <div>
            <div className="cinematic-badge text-sky-300">Digital Twin</div>
            <div className="cinematic-title text-xl font-bold">Bangkok 3D Twin</div>
          </div>
          <div className="ml-auto hidden gap-3 md:flex">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาพื้นที่"
              className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 outline-none"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 outline-none"
            >
              <option value="">ทุกหมวดหมู่</option>
              {topCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={showAqi} onChange={(e) => setShowAqi(e.target.checked)} />
              AQI
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={showWeather} onChange={(e) => setShowWeather(e.target.checked)} />
              Weather
            </label>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              {panelOpen ? 'ปิดรายการ' : 'เปิดรายการ'}
            </button>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-60"
            >
              {refreshing ? 'กำลังอัปเดต…' : 'อัปเดต'}
            </button>
            <span className="text-xs text-slate-300">
              {totalFiltered}/{meta?.total ?? 0} รายการ
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">{clock}</div>
            {lastUpdated && <div className="text-[10px] text-slate-500">อัปเดต {lastUpdated}</div>}
          </div>
        </div>
      </div>

      <div ref={cesiumContainer} className="h-screen w-screen pt-14" />

      {(loading || error) && (
        <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-[#0b1220]/80 pt-14">
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm">
            {loading ? 'กำลังโหลดข้อมูล…' : `ข้อผิดพลาด: ${error}`}
          </div>
        </div>
      )}

      {panelOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[1200] max-h-[45vh] overflow-auto border-t border-white/10 bg-[#0f172a]/95 p-3 md:inset-x-auto md:right-4 md:top-14 md:w-[min(26rem,calc(100vw-2rem))] md:rounded-xl md:border">
          <div className="text-xs font-semibold text-slate-200">พื้นที่เรียงตามจำนวน leads</div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
            {filteredAreas.slice(0, 50).map((area) => (
              <div key={area.area} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-slate-200">{area.area}</span>
                <span className="text-slate-300">{area.count}</span>
              </div>
            ))}
            {filteredAreas.length === 0 && (
              <div className="text-slate-400">ไม่พบรายการ</div>
            )}
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-200">สถานี AQI/Weather ที่โหลด</div>
          <div className="mt-2 max-h-32 overflow-auto text-xs">
            {(observations?.bkkStations ?? []).slice(0, 20).map((s, idx) => (
              <div key={idx} className="border-b border-white/5 py-1">
                <span className="text-slate-100">{s.name}</span>
                <span className="text-slate-400"> AQI {s.aqi} · PM2.5 {s.pm25Value}</span>
              </div>
            ))}
            {(observations?.bkkWeather ?? []).length > 0 && (
              <div className="mt-2 text-slate-200">Weather stations</div>
            )}
            {(observations?.bkkWeather ?? []).slice(0, 10).map((s, idx) => (
              <div key={idx} className="border-b border-white/5 py-1">
                <span className="text-slate-100">{s.name}</span>
                <span className="text-slate-400"> {s.temp}°C · {s.humidity}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function renderAll(
  Cesium: any,
  viewer: any,
  meta: Meta | null,
  observations: ObservationResponse | null,
  showAqi: boolean,
  showWeather: boolean,
  selectedCategory: string,
) {
  viewer.entities.removeAll()

  const maxCount = Math.max(...(meta?.areas?.map(a => a.count) ?? [1]), 1)
  const areas = (meta?.areas ?? []).filter((area) => {
    if (!selectedCategory) return true
    return (meta?.categories?.includes(selectedCategory) ?? false)
  })

  for (const area of areas) {
    if (!Number.isFinite(area.lat) || !Number.isFinite(area.lng)) continue
    const normalized = area.count / maxCount
    const radius = 120 + normalized * 800

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(area.lng, area.lat),
      name: area.area,
      description: `<b>${area.area}</b><br/>${area.count} รายการ`,
      ellipse: {
        semiMajorAxis: radius,
        semiMinorAxis: radius * 0.85,
        height: 0,
        material: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.25),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.7),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: `${area.area}: ${area.count}`,
        font: '12px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 12),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.2e7, 0.4),
      },
    })
  }

  if (showAqi) {
    for (const s of observations?.bkkStations ?? []) {
      const color = aqiColor(s.aqi)
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lng, s.lat),
        name: `${s.name} (AQI)`,
        description: `<b>${s.name}</b><br/>AQI ${s.aqi}<br/>PM2.5 ${s.pm25Value}<br/>${s.aqiParam ?? ''}`,
        billboard: {
          image: createPinImage(color, 'A'),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.1, 1.2e7, 0.3),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
    }
  }

  if (showWeather) {
    for (const s of observations?.bkkWeather ?? []) {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(s.lng, s.lat),
        name: `${s.name} (Weather)`,
        description: `<b>${s.name}</b><br/>${s.temp ?? '--'}°C<br/>${s.humidity ?? '--'}% humidity<br/>${s.windSpeed ?? '--'} km/h`,
        billboard: {
          image: createPinImage('#22c55e', 'W'),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.1, 1.2e7, 0.3),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
    }
  }
}

function aqiColor(aqi: number): string {
  if (aqi < 0) return '#94a3b8'
  if (aqi <= 50) return '#22c55e'
  if (aqi <= 100) return '#eab308'
  if (aqi <= 150) return '#f97316'
  if (aqi <= 200) return '#ef4444'
  return '#7f1d1d'
}

function createPinImage(color: string, letter: string) {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.moveTo(size / 2, size - 6)
  ctx.bezierCurveTo(size / 2, size / 2, 6, size / 2, 6, 16)
  ctx.bezierCurveTo(6, 6, size - 6, 6, size - 6, 16)
  ctx.bezierCurveTo(size - 6, size / 2, size / 2, size / 2, size / 2, size - 6)
  ctx.closePath()

  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(size / 2, size - 14, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0b1220'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter, size / 2, size - 14)

  return canvas.toDataURL('image/png')
}

function injectCesiumCDN() {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).Cesium) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Widgets/widgets.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Cesium.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('failed to load Cesium CDN'))
    document.body.appendChild(script)
  })
}
