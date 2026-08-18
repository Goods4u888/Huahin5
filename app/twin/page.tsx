'use client'

import { useEffect, useRef, useState } from 'react'

type Pin = {
  id: string
  name: string
  lat: number
  lng: number
  important?: boolean
  note?: string
}

export default function TwinPage() {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const cesiumViewer = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!cesiumContainer.current) return

      if (typeof window === 'undefined') return

      // Load Cesium from CDN
      await injectCesiumCDN()

      if (cancelled || !window.Cesium) {
        setError('Cesium failed to load from CDN')
        setLoading(false)
        return
      }

      const Cesium = window.Cesium
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
        destination: Cesium.Cartesian3.fromDegrees(99.95, 12.57, 18000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
      })

      try {
        const res = await fetch('/api/pins', { cache: 'no-store' })
        if (!res.ok) throw new Error(`pins=${res.status}`)
        const json = await res.json()
        const pins: Pin[] = Array.isArray((json as any).pins) ? (json as any).pins : []

        viewer.entities.removeAll()
        for (const p of pins) {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
            billboard: {
              image: createPinImage(p.important ? '#ef4444' : '#38bdf8'),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.2, 1.2e7, 0.3),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            label: {
              text: String(p.name ?? ''),
              font: '12px sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 2,
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, 16),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.2e7, 0.4),
            },
          })
        }
      } catch (err: any) {
        console.error('twin pins load error', err)
        setError(err?.message ?? 'unknown')
      }

      if (!cancelled) setLoading(false)
    }

    load()

    return () => {
      cancelled = true
      if (cesiumViewer.current) {
        try { cesiumViewer.current.destroy() } catch {}
      }
    }
  }, [])

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0b1220] text-slate-100">
      <div className="fixed inset-x-0 top-0 z-[1200] flex h-14 items-center gap-3 border-b border-sky-400/20 bg-[#0f172a]/90 px-4 backdrop-blur-xl">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-md shadow-sky-500/30">
          DT
        </div>
        <div>
          <div className="cinematic-badge text-sky-300">Digital Twin</div>
          <div className="cinematic-title text-xl font-bold">Cesium 3D Twin</div>
        </div>
        <div className="ml-auto text-xs text-slate-400">
          ควบคุมด้วยเมาส์ — คลิกป้ายเพื่อเปิดรายละเอียด
        </div>
      </div>

      <div
        ref={cesiumContainer}
        className="h-screen w-screen pt-14"
      />

      {(loading || error) && (
        <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-[#0b1220]/80 pt-14">
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm">
            {loading ? 'กำลังโหลด Cesium…' : `ข้อผิดพลาด: ${error}`}
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

function createPinImage(color: string) {
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
  ctx.arc(size / 2, size - 14, 5, 0, Math.PI * 2)
  ctx.fill()

  return canvas.toDataURL('image/png')
}
