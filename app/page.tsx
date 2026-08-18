"use client"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { TmdResponse } from "./types"
import SourceStatus from "./SourceStatus"

const MapView = dynamic(() => import("./MapView"), { ssr: false })

export default function Home() {
  const [status, setStatus] = useState<string>("กำลังเริ่มระบบ…")
  const [error, setError] = useState<string | null>(null)
  const [tmdData, setTmdData] = useState<TmdResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setStatus("กำลังเชื่อมต่อ API…")
        const healthRes = await fetch(`/api/health`, { cache: "no-store" })
        if (!healthRes.ok) throw new Error(`health=${healthRes.status}`)

        setStatus("กำลังโหลดข้อมูล TMD…")
        const tmdRes = await fetch(`/api/proxy/tmd`, { cache: "no-store" })
        if (!tmdRes.ok) throw new Error(`tmd=${tmdRes.status}`)
        const json = (await tmdRes.json()) as TmdResponse
        if (!cancelled) {
          setTmdData(json)
          setStatus("ระบบออนไลน์")
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unknown error")
          setStatus("SYSTEM OFFLINE")
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const isOnline = !error
  const stationCount = tmdData?.stationCount ?? 0
  const weatherCount = tmdData?.weatherCount ?? 0

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0f172a] pt-14 text-slate-100">
      <div className="vignette" />
      <div className="scanline" />

      <MapView tmdData={tmdData} />

      <div className="absolute inset-x-2 bottom-[4.5vh] z-50 md:inset-x-auto md:bottom-[8vh] md:left-6 md:w-[min(30rem,calc(100vw-3rem))]">
        <div className="cinematic-panel rounded-xl px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="cinematic-badge text-sky-300">สถานะ</div>
            <span className={`text-sm ${isOnline ? "text-emerald-400" : "text-red-400"}`}>{status}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
            <span>สถานี TMD: {stationCount}</span>
            <span>สภาพอากาศ TMD: {weatherCount}</span>
            <span>POIs: 22</span>
          </div>
          {error ? <div className="mt-2 text-xs text-red-400">ข้อผิดพลาด: {error}</div> : null}
          <div className="mt-2 border-t border-white/10 pt-2">
            <SourceStatus />
          </div>
        </div>
      </div>
    </div>
  )
}
