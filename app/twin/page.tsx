'use client'

import { useEffect, useRef, useState } from 'react'

type Lead = {
  name: string
  address?: string
  phone?: string
  category: string
  area: string
  source?: string
}

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
  leads: Lead[]
}

export default function TwinPage() {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const cesiumViewer = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/leads', { cache: 'no-store' })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error || 'leads api failed')
        if (!cancelled) setMeta(json)
      } catch (err: any) {
        console.error('leads load error', err)
        if (!cancelled) setError(err?.message ?? 'unknown')
      }
    }

    load()

    return () => {
      cancelled = true
      if (cesiumViewer.current) {
        try { cesiumViewer.current.destroy() } catch {}
      }
    }
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
        destination: Cesium.Cartesian3.fromDegrees(100.5168, 13.7546, 50000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-50),
          roll: 0,
        },
      })

      // Load Cesium OSM Buildings for a city-like twin feel
      try {
        const osmBuildings = await Cesium.createOsmBuildingsAsync()
        viewer.scene.primitives.add(osmBuildings)
      } catch (osmErr) {
        console.warn('OSM Buildings unavailable', osmErr)
      }

      renderAreas(Cesium, viewer, meta?.areas ?? [])
      if (!cancelled) setLoading(false)
    }

    initCesium()

    return () => {
      cancelled = true
      if (cesiumViewer.current) {
        try { cesiumViewer.current.destroy() } catch {}
      }
    }
  }, [meta])

  const filteredAreas = meta?.areas?.filter((area) => {
    const matchesCategory = !selectedCategory || (meta.leads || []).some(
      lead => lead.area === area.area && lead.category === selectedCategory
    )
    const matchesSearch = !search || 
      area.area.toLowerCase().includes(search.toLowerCase())
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
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              {panelOpen ? 'ปิดรายการ' : 'เปิดรายการ'}
            </button>
            <span className="text-xs text-slate-300">
              {totalFiltered}/{meta?.total ?? 0} รายการ
            </span>
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
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-1">
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
        </div>
      )}
    </div>
  )
}

function renderAreas(Cesium: any, viewer: any, areas: Area[]) {
  viewer.entities.removeAll()

  const maxCount = Math.max(...areas.map(a => a.count), 1)

  for (const area of areas) {
    if (!Number.isFinite(area.lat) || !Number.isFinite(area.lng)) continue

    const normalized = area.count / maxCount
    const radius = 180 + normalized * 1200

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(area.lng, area.lat),
      name: area.area,
      description: `<b>${area.area}</b><br/>${area.count} รายการ`,
      ellipse: {
        semiMajorAxis: radius,
        semiMinorAxis: radius * 0.85,
        height: 0,
        material: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.35),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.8),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: `${area.area}: ${area.count}`,
        font: '13px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 12),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.2e7, 0.4),
      },
    })
  }
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
