"use client"
import { useEffect, useState } from "react"
import type { AirStation, WaterStation } from "./types"

function aqiColor(aqi: number): string {
  if (aqi < 0) return "#95a5a6"
  if (aqi <= 50) return "#00c853"
  if (aqi <= 100) return "#f5b301"
  if (aqi <= 150) return "#ff7f1a"
  if (aqi <= 200) return "#e74c3c"
  return "#8e44ad"
}

function aqiLabel(aqi: number): string {
  if (aqi < 0) return "N/A"
  if (aqi <= 50) return "ดีมาก"
  if (aqi <= 100) return "ปานกลาง"
  if (aqi <= 150) return "ไม่ดีต่อสุขภาพ"
  if (aqi <= 200) return "ไม่ดีมาก"
  return "อันตราย"
}

function situationLabel(s: number | null): { text: string; color: string } {
  if (!s) return { text: "—", color: "#95a5a6" }
  if (s === 1) return { text: "ปกติ", color: "#00c853" }
  if (s === 2) return { text: "เฝ้าระวัง", color: "#f5b301" }
  if (s === 3) return { text: "วิกฤต", color: "#e74c3c" }
  return { text: "ระดับ " + s, color: "#95a5a6" }
}

function fmtTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function ValuePanel() {
  const [air, setAir] = useState<AirStation[]>([])
  const [water, setWater] = useState<WaterStation[]>([])
  const [waterLoaded, setWaterLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/proxy/air", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.ok && Array.isArray(d.huaHin)) setAir(d.huaHin) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/proxy/thaiwater", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.ok && Array.isArray(d.huaHin)) setWater(d.huaHin)
      })
      .catch(() => {})
      .finally(() => setWaterLoaded(true))
  }, [])

  const aqi = air[0] ?? null
  const waterStations = water
    .slice()
    .sort((a, b) => (b.levelMsl ?? 0) - (a.levelMsl ?? 0))
    .slice(0, 5)
  const topWater = waterStations[0] ?? null

  return (
    <div className="rounded-xl cinematic-panel px-4 py-3">
      <div className="cinematic-badge text-sky-300">ข้อมูลเรียลไทม์</div>

      <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-200">คุณภาพอากาศ (Air4Thai)</span>
        </div>
        {aqi ? (
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: aqiColor(aqi.aqi) }}
            >
              {aqi.aqi < 0 ? "–" : aqi.aqi}
            </span>
            <div>
              <div className="text-sm font-semibold" style={{ color: aqiColor(aqi.aqi) }}>{aqiLabel(aqi.aqi)}</div>
              <div className="text-[10px] text-slate-400">
                {aqi.name} · {aqi.aqi < 0 ? "" : `AQI ${aqi.aqi}`}
                {aqi.aqiParam ? ` (${aqi.aqiParam})` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-400">ไม่มีข้อมูลสถานีใกล้หัวหิน</div>
        )}
        {aqi?.pm25Value != null && aqi.pm25Value >= 0 ? (
          <div className="mt-1 text-[10px] text-slate-400">PM2.5: {aqi.pm25Value} µg/m³ · อัปเดต {aqi.date} {aqi.time}</div>
        ) : null}
      </div>

      <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-200">ระดับน้ำ (ThaiWater)</span>
          {topWater ? (
            <span className="text-[10px]" style={{ color: situationLabel(topWater.situation).color }}>
              {situationLabel(topWater.situation).text}
            </span>
          ) : null}
        </div>
        {topWater ? (
          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-100">
                {topWater.levelMsl != null ? `${topWater.levelMsl.toFixed(2)}` : "—"}
              </span>
              <span className="text-[10px] text-slate-400">ม.รทก. (MSL)</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {topWater.nameTh || topWater.name || "(ไม่มีชื่อ)"}
              {topWater.datetime ? ` · ${fmtTime(topWater.datetime)}` : ""}
            </div>
          </div>
        ) : waterLoaded ? (
          <div className="mt-1 text-xs text-slate-400">ไม่มีข้อมูลระดับน้ำใกล้หัวหิน</div>
        ) : (
          <div className="mt-1 text-xs text-slate-400">กำลังโหลด…</div>
        )}
      </div>

      {waterStations.length > 1 ? (
        <div className="mt-2">
          <div className="text-[10px] text-slate-400">สถานีทั้งหมดในพื้นที่:</div>
          <ul className="mt-1 space-y-1">
            {waterStations.map(w => (
              <li key={w.id} className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="truncate pr-2">{w.nameTh || w.name || `สถานี ${w.id}`}</span>
                <span className="shrink-0 font-mono" style={{ color: situationLabel(w.situation).color }}>
                  {w.levelMsl != null ? `${w.levelMsl.toFixed(2)}` : "—"} ม.
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}