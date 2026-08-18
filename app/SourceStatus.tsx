"use client"
import { useEffect, useState } from "react"

type FeedState =
  | { key: string; label: string; state: "load" | "ok" | "fail"; detail?: string }
  | undefined

const FEEDS: { key: string; label: string; url: string }[] = [
  { key: "tmd", label: "อุตุนิยมวิทยา TMD", url: "/api/proxy/tmd" },
  { key: "thaiwater", label: "น้ำท่วม ThaiWater", url: "/api/proxy/thaiwater" },
  { key: "air", label: "คุณภาพอากาศ Air4Thai", url: "/api/proxy/air" },
  { key: "nwp", label: "พยากรณ์ NWP", url: "/api/proxy/nwp?lat=12.5684&lon=99.9577&mode=hourly&duration=1" },
]

async function probe(url: string, timeoutMs = 15000): Promise<{ ok: boolean; detail?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal })
    const json = await res.json().catch(() => null)
    const ok = !!json?.ok
    return { ok, detail: ok ? undefined : (json?.error ?? `HTTP ${res.status}`) }
  } catch (err: any) {
    return { ok: false, detail: err?.name === "AbortError" ? "timeout" : err?.message }
  } finally {
    clearTimeout(timer)
  }
}

export default function SourceStatus() {
  const [feeds, setFeeds] = useState<Record<string, FeedState>>({})

  useEffect(() => {
    let cancelled = false
    const initialState: Record<string, FeedState> = {}
    for (const f of FEEDS) initialState[f.key] = { key: f.key, label: f.label, state: "load" }
    setFeeds(initialState)

    for (const f of FEEDS) {
      probe(f.url).then(({ ok, detail }) => {
        if (cancelled) return
        setFeeds(prev => ({
          ...prev,
          [f.key]: {
            key: f.key,
            label: f.label,
            state: ok ? "ok" : "fail",
            detail: ok ? "live" : detail,
          },
        }))
      })
    }

    return () => { cancelled = true }
  }, [])

  const all = FEEDS.map(f =>
    feeds[f.key] ?? { key: f.key, label: f.label, state: "load" as const }
  )

  return (
    <div>
      <div className="cinematic-badge text-sky-300">แหล่งข้อมูล</div>
      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {all.map(f => (
          <div key={f.key} className="flex items-center gap-2 text-xs text-slate-200">
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                f.state === "ok" ? "bg-emerald-500 live-indicator" : f.state === "fail" ? "bg-red-500" : "bg-gray-400 animate-pulse"
              }`}
            />
            <span className="truncate">{f.label}</span>
            <span className={`ml-auto text-[10px] ${f.state === "ok" ? "text-emerald-400" : f.state === "fail" ? "text-red-400" : "text-slate-400"}`}>
              {f.state === "ok" ? "● ออนไลน์" : f.state === "fail" ? (f.detail ?? "ล้มเหลว") : "กำลังตรวจ…"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}