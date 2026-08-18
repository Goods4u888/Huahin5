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

type Meta = {
  total: number
  areas: string[]
  categories: string[]
}

export default function TwinPage() {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const cesiumViewer = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  const filtered = leads.filter((lead) => {
    const matchesArea = !selectedArea || lead.area === selectedArea
    const matchesCategory = !selectedCategory || lead.category === selectedCategory
    const matchesSearch = !search || 
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.address?.toLowerCase().includes(search.toLowerCase()) ||
      lead.area?.toLowerCase().includes(search.toLowerCase()) ||
      lead.category?.toLowerCase().includes(search.toLowerCase())
    return matchesArea && matchesCategory && matchesSearch
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/leads', { cache: 'no-store' })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error || 'leads api failed')
        if (!cancelled) {
          setMeta(json)
          setLeads(json.leads)
        }
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
        destination: Cesium.Cartesian3.fromDegrees(100.5, 13.75, 45000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
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

      if (!cancelled) setLoading(false)
    }

    initCesium()

    return () => {
      cancelled = true
      if (cesiumViewer.current) {
        try { cesiumViewer.current.destroy() } catch {}
      }
    }
  }, [])

  const areaCounts = new Map<string, number>()
  for (const lead of filtered) {
    areaCounts.set(lead.area, (areaCounts.get(lead.area) || 0) + 1)
  }
  const sortedAreas = Array.from(areaCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50)

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0b1220] text-slate-100">
      <div className="fixed inset-x-0 top-0 z-[1200] border-b border-sky-400/20 bg-[#0f172a]/90 px-4 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-md shadow-sky-500/30">
            DT
          </div>
          <div>
            <div className="cinematic-badge text-sky-300">Digital Twin</div>
            <div className="cinematic-title text-xl font-bold">Cesium 3D Twin</div>
          </div>
          <div className="ml-auto hidden gap-3 md:flex">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา"
              className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 outline-none"
            />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 outline-none"
            >
              <option value="">ทุกพื้นที่</option>
              {meta?.areas?.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 outline-none"
            >
              <option value="">ทุกหมวดหมู่</option>
              {meta?.categories?.map((cat) => (
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
              {filtered.length}/{meta?.total ?? 0} รายการ
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
            {sortedAreas.map(([area, count]) => (
              <div key={area} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-slate-200">{area}</span>
                <span className="text-slate-300">{count}</span>
              </div>
            ))}
            {sortedAreas.length === 0 && (
              <div className="text-slate-400">ไม่พบรายการ</div>
            )}
          </div>

          <div className="mt-3 text-xs font-semibold text-slate-200">รายการตัวอย่าง</div>
          <div className="mt-2 max-h-32 overflow-auto text-xs">
            {filtered.slice(0, 20).map((lead, idx) => (
              <div key={idx} className="border-b border-white/5 py-1">
                <span className="text-slate-100">{lead.name}</span>
                <span className="text-slate-400"> — {lead.area} · {lead.category}</span>
              </div>
            ))}
            {filtered.length > 20 && (
              <div className="text-slate-400">และอีก {filtered.length - 20} รายการ…</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
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
