"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { MapContainer, TileLayer, LayersControl, FeatureGroup, Popup, CircleMarker, Circle, Tooltip, Marker } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { TmdResponse, TmdStation, TmdWeather, Poi, PoiCategory, Pin, AirStation, Air4ThaiStation, Webcam } from "./types"
import ValuePanel from "./ValuePanel"

const CENTER: [number, number] = [12.5684, 99.9577]
const DEFAULT_ZOOM = 13

type ForecastData = {
  mode: "hourly" | "daily"
  location: { lat: number; lon: number } | null
  forecasts: {
    time: string | null
    tc?: number
    tc_min?: number
    tc_max?: number
    rh?: number
    ws10m?: number
    wd10m?: number
    rain?: number
    cond?: number
    condLabel?: string | null
  }[]
  fetchedAt?: string
}

function isNearHuaHin(lat: number, lng: number): boolean {
  return lat >= 12.3 && lat <= 12.9 && lng >= 99.6 && lng <= 100.2
}

function inHuaHinRegion(lat: number, lng: number): boolean {
  return lat >= 11 && lat <= 14 && lng >= 99 && lng <= 101
}

const CATEGORIES: { key: PoiCategory; label: string; icon: string; color: string }[] = [
  { key: "hospital", label: "โรงพยาบาล", icon: "🏥", color: "#e74c3c" },
  { key: "government", label: "ราชการ", icon: "🏛️", color: "#f5c842" },
  { key: "tourism", label: "ท่องเที่ยว", icon: "🏖️", color: "#00d4ff" },
  { key: "restaurant", label: "ร้านอาหาร", icon: "🍽️", color: "#ff7f1a" },
  { key: "bank", label: "ธนาคาร", icon: "🏦", color: "#4da6ff" },
  { key: "gasstation", label: "ปั๊มน้ำมัน", icon: "⛽", color: "#1fbfb8" },
  { key: "hotel", label: "โรงแรม", icon: "🏨", color: "#9b59b6" },
  { key: "police", label: "ตำรวจ", icon: "🚔", color: "#e74c3c" },
]

const POIS: Poi[] = [
  { name: "Hua Hin Police Station", nameTh: "สถานีตำรวจภูธรหัวหิน", lat: 12.5705, lng: 99.9582, category: "police", desc: "032 511 027 · เปิด 24 ชั่วโมง" },
  { name: "Bangkok Hospital Hua Hin", nameTh: "โรงพยาบาลกรุงเทพหัวหิน", lat: 12.5558, lng: 99.9682, category: "hospital", desc: "032 616 800 · 888 ถ. เพชรเกษม · เปิด 24 ชั่วโมง" },
  { name: "Market Village Hua Hin", nameTh: "มาร์เก็ตวิลเลจ หัวหิน", lat: 12.5605, lng: 99.9605, category: "tourism", desc: "032 618 888 · 234/1 ถ. เพชรเกษม · ปิด 21:00" },
  { name: "Air Space Hua Hin", nameTh: "แอร์ สเปซ หัวหิน", lat: 12.5585, lng: 99.9655, category: "tourism", desc: "Entertainment complex · dining · nightlife" },
  { name: "Hua Hin Hospital", nameTh: "โรงพยาบาลหัวหิน", lat: 12.5742, lng: 99.9536, category: "hospital", desc: "Public hospital ·  emergency services" },
  { name: "San Paolo Hospital", nameTh: "โรงพยาบาลเซนต์ปอล", lat: 12.5634, lng: 99.9498, category: "hospital", desc: "Private hospital" },
  { name: "Hua Hin District Office", nameTh: "ที่ว่าการอำเภอหัวหิน", lat: 12.5705, lng: 99.9577, category: "government", desc: "Local government office" },
  { name: "Hua Hin Beach", nameTh: "หาดหัวหิน", lat: 12.5666, lng: 99.9577, category: "tourism", desc: "Main beach · tourist area" },
  { name: "Hua Hin Railway Station", nameTh: "สถานีรถไฟหัวหิน", lat: 12.5722, lng: 99.9536, category: "tourism", desc: "Historic railway station" },
  { name: "Cicada Market", nameTh: "ตลาดจิ้งหรีด", lat: 12.5528, lng: 99.9676, category: "tourism", desc: "Weekend market · art · food" },
  { name: "Hua Hin Night Market", nameTh: "ตลาดนัดหัวหิน", lat: 12.5712, lng: 99.9556, category: "tourism", desc: "Night market · local food" },
  { name: "Khao Takiab", nameTh: "เขาตะเกียบ", lat: 12.5415, lng: 99.9728, category: "tourism", desc: "Temple viewpoint · monkey mountain" },
  { name: "Vana Nava Water Jungle", nameTh: "วานา นาวา วอเตอร์ จังเกิล", lat: 12.5450, lng: 99.9700, category: "tourism", desc: "Water park" },
  { name: "Mrigadayavan Palace", nameTh: "พระราชวังมฤคทายวน", lat: 12.6440, lng: 99.9598, category: "tourism", desc: "Historic palace · museum" },
  { name: "Hua Hin Hills Vineyard", nameTh: "ไร่องุ่นหัวหินฮิลส์", lat: 12.5130, lng: 99.9000, category: "tourism", desc: "Vineyard · wine tasting" },
  { name: "Chao Lay Seafood", nameTh: "เจ้าเลยซีฟู้ด", lat: 12.5660, lng: 99.9610, category: "restaurant", desc: "Seafood restaurant" },
  { name: "Kasikorn Bank Hua Hin", nameTh: "ธนาคารกสิกรไทยสาขาหัวหิน", lat: 12.5705, lng: 99.9580, category: "bank", desc: "Bank · ATM" },
  { name: "Bangkok Bank Hua Hin", nameTh: "ธนาคารกรุงเทพสาขาหัวหิน", lat: 12.5710, lng: 99.9570, category: "bank", desc: "Bank · ATM" },
  { name: "PTT Hua Hin", nameTh: "ปตท.หัวหิน", lat: 12.5730, lng: 99.9520, category: "gasstation", desc: "Gas station · convenience store" },
  { name: "Shell Hua Hin", nameTh: "เชลล์หัวหิน", lat: 12.5680, lng: 99.9600, category: "gasstation", desc: "Gas station · café" },
  { name: "Centara Grand Beach Resort", nameTh: "เซ็นทารา แกรนด์ Beach Resort", lat: 12.5670, lng: 99.9550, category: "hotel", desc: "Resort · beachfront · dining" },
  { name: "Hilton Hua Hin", nameTh: "ฮิลตันหัวหิน", lat: 12.5680, lng: 99.9570, category: "hotel", desc: "Hotel · spa · meeting rooms" },
  { name: "Hyatt Regency Hua Hin", nameTh: "โฮยัต รีเจนซี่ หัวหิน", lat: 12.5450, lng: 99.9680, category: "hotel", desc: "Resort · golf · family" },
  { name: "Marriott Hua Hin", nameTh: "มาร์ริออต หัวหิน", lat: 12.5550, lng: 99.9700, category: "hotel", desc: "Hotel · beach club · dining" },
]

function makeIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div><div style="width:2px;height:6px;background:${color};"></div></div>`,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
  })
}

function pinIcon(important: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:22px;height:22px;border-radius:50%;background:${important ? "#e74c3c" : "#7c4dff"};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;">${important ? "★" : "📍"}</div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function cctvIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:26px;height:26px;border-radius:50%;background:#2c3e50;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:13px;">🎥</div><div style="width:2px;height:6px;background:#2c3e50;"></div></div>`,
    iconSize: [26, 32],
    iconAnchor: [13, 32],
  })
}

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
  if (aqi <= 50) return "Good"
  if (aqi <= 100) return "Moderate"
  if (aqi <= 150) return "Unhealthy"
  if (aqi <= 200) return "Very Unhealthy"
  return "Hazardous"
}

function airIcon(aqi: number) {
  const color = aqiColor(aqi)
  const value = aqi < 0 ? "–" : String(aqi)
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:34px;height:34px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;">${value}</div><div style="margin-top:1px;font-size:8px;line-height:1;text-align:center;color:${color};font-weight:700;">AQI</div></div>`,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
  })
}

function aqiCircleColor(aqi: number): string {
  if (aqi < 0) return "#94a3b8"
  if (aqi <= 50) return "#22c55e"
  if (aqi <= 100) return "#eab308"
  if (aqi <= 200) return "#f97316"
  return "#ef4444"
}

function aqiCircleLabel(aqi: number): string {
  if (aqi < 0) return "ไม่มีข้อมูล"
  if (aqi <= 50) return "ดีมาก"
  if (aqi <= 100) return "ปานกลาง"
  if (aqi <= 200) return "ไม่ดีต่อสุขภาพ"
  return "อันตราย"
}

function weatherColor(temp: number): string {
  if (temp >= 35) return "#e74c3c"
  if (temp >= 30) return "#ff7f1a"
  if (temp >= 25) return "#f5c842"
  return "#00d4ff"
}

function condColor(cond: number): string {
  if (cond >= 8) return "#8e44ad"
  if (cond >= 5) return "#2980b9"
  if (cond >= 1 && cond <= 4) return "#27ae60"
  return "#95a5a6"
}

function formatTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  })
}

export default function MapView({ tmdData }: { tmdData?: TmdResponse | null }) {
  const [activeCats, setActiveCats] = useState<Set<PoiCategory>>(new Set(["tourism", "hospital"]))
  const [searchTag, setSearchTag] = useState("")
  const [pins, setPins] = useState<Pin[]>([])
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [forecastMode, setForecastMode] = useState<"hourly" | "daily">("hourly")
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [air, setAir] = useState<AirStation[]>([])
  const [aqiStations, setAqiStations] = useState<Air4ThaiStation[]>([])
  const [webcams, setWebcams] = useState<Webcam[]>([])
  const [showCctv, setShowCctv] = useState(true)
  const [now, setNow] = useState<string>(new Date().toISOString())

  useEffect(() => {
    const tick = () => setNow(new Date().toISOString())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch("/api/pins", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.ok && Array.isArray(d.pins)) setPins(d.pins) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/proxy/air", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.ok && Array.isArray(d.huaHin)) setAir(d.huaHin) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/proxy/air4thai", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.ok) {
          const list: Air4ThaiStation[] = Array.isArray(d.huaHin) ? d.huaHin : Array.isArray(d.stations) ? d.stations : []
          setAqiStations(list.filter(s => inHuaHinRegion(s.lat, s.lng)))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/proxy/webcams", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.ok && Array.isArray(d.cams)) setWebcams(d.cams) })
      .catch(() => {})
  }, [])

  const tmdStations = useMemo<TmdStation[]>(() => {
    if (!tmdData?.stations) return []
    return (tmdData.stations as TmdStation[]).filter(s => isNearHuaHin(s.lat, s.lng))
  }, [tmdData])

  const tmdWeatherStations = useMemo<TmdWeather[]>(() => {
    if (!tmdData?.weather) return []
    return (tmdData.weather as TmdWeather[]).filter(w => isNearHuaHin(w.lat, w.lng))
  }, [tmdData])

  const filteredPois = useMemo(() => {
    let list = POIS.filter(p => activeCats.has(p.category))
    if (searchTag.trim()) {
      const q = searchTag.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.nameTh ?? "").includes(searchTag) ||
        p.category.includes(q)
      )
    }
    return list
  }, [activeCats, searchTag])

  const toggleCat = (cat: PoiCategory) => {
    const next = new Set(activeCats)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setActiveCats(next)
  }

  const loadForecast = useCallback(async (lat: number, lng: number, mode: "hourly" | "daily") => {
    setForecastLoading(true)
    setForecastError(null)
    setForecast(null)
    try {
      const res = await fetch(`/api/proxy/nwp?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&mode=${mode}`, { cache: "no-store" })
      const json = await res.json()
      if (!json?.ok) {
        setForecastError(json?.error || `HTTP ${res.status}`)
      } else {
        setForecast({ mode, location: json.location, forecasts: json.forecasts ?? [], fetchedAt: json.fetchedAt })
      }
    } catch (err: any) {
      setForecastError(err?.message ?? "failed")
    } finally {
      setForecastLoading(false)
    }
  }, [])

  const selectPin = useCallback((pin: Pin) => {
    setSelectedPin(pin)
    loadForecast(pin.lat, pin.lng, "hourly")
  }, [loadForecast])

  const deletePin = async (id: string) => {
    const res = await fetch(`/api/pins/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (json?.ok) {
      setPins(prev => prev.filter(p => p.id !== id))
      if (selectedPin?.id === id) setSelectedPin(null)
    }
  }

  const toggleImportant = async (pin: Pin) => {
    const res = await fetch(`/api/pins/${pin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ important: !pin.important }),
    })
    const json = await res.json()
    if (json?.ok) {
      setPins(prev => prev.map(p => (p.id === pin.id ? { ...p, important: !p.important } : p)))
      if (selectedPin?.id === pin.id) setSelectedPin({ ...pin, important: !pin.important })
    }
  }

  const rightStackContent = (
    <div className="flex w-full flex-col gap-3 pr-1">
      <div className="rounded-xl cinematic-panel px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="cinematic-badge text-sky-300">พิกัด</div>
          <div className="text-[10px] text-slate-400">{new Date(now).toLocaleString("th-TH")}</div>
        </div>
        <div className="mt-1 font-mono text-sm text-slate-100">12.5684°N, 99.9577°E</div>
      </div>

      <ValuePanel />

      <div className="rounded-xl cinematic-panel px-4 py-3">
        <div className="cinematic-badge text-sky-300">สถานที่สำคัญ</div>
        {pins.filter(p => p.important).length === 0 ? (
          <div className="mt-2 text-xs text-slate-400">ยังไม่มีสถานที่สำคัญ</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {pins.filter(p => p.important).map(pin => (
              <li key={pin.id} className="flex items-center gap-2 text-xs">
                <span className="text-xs">★</span>
                <button onClick={() => selectPin(pin)} className="flex-1 text-left text-slate-200 hover:text-sky-300">
                  {pin.name}
                </button>
                <button onClick={() => toggleImportant(pin)} className="text-slate-400 hover:text-slate-200" title="ยกเลิกเครื่องหมาย">☆</button>
                <button onClick={() => deletePin(pin.id)} className="text-red-400 hover:text-red-300">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(forecast || forecastLoading || forecastError) ? (
        <div className="rounded-xl cinematic-panel px-4 py-3">
          <div className="cinematic-badge text-sky-300">
            พยากรณ์ {selectedPin ? `— ${selectedPin.name}` : ""}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                const pos = selectedPin ? { lat: selectedPin.lat, lng: selectedPin.lng } : null
                if (pos) loadForecast(pos.lat, pos.lng, "hourly")
              }}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${forecastMode === "hourly" ? "bg-sky-500 text-white" : "bg-white/5 text-slate-300"}`}
            >
              รายชั่วโมง
            </button>
            <button
              onClick={() => {
                const pos = selectedPin ? { lat: selectedPin.lat, lng: selectedPin.lng } : null
                if (pos) loadForecast(pos.lat, pos.lng, "daily")
              }}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${forecastMode === "daily" ? "bg-sky-500 text-white" : "bg-white/5 text-slate-300"}`}
            >
              5 วัน
            </button>
          </div>
          {forecastLoading ? <div className="mt-3 text-xs text-slate-400">กำลังโหลดพยากรณ์…</div> : null}
          {forecastError ? <div className="mt-3 text-xs text-red-400">ข้อผิดพลาดพยากรณ์: {forecastError}</div> : null}
          {forecast && !forecastLoading ? (
            <ul className="mt-3 space-y-2">
              {forecast.forecasts.map((f, i) => (
                <li key={i} className="rounded-lg bg-white/5 px-2 py-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{formatTime(f.time)}</span>
                    {f.condLabel ? (
                      <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ backgroundColor: condColor(f.cond ?? 0) }}>
                        {f.condLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                    {forecast.mode === "daily" && f.tc_min != null && f.tc_max != null ? (
                      <span><b className="text-slate-200">{f.tc_max}°</b> / {f.tc_min}°C</span>
                    ) : f.tc != null ? (
                      <span><b className="text-slate-200">{f.tc}°C</b></span>
                    ) : null}
                    {f.rh != null ? <span>💧 {f.rh}%</span> : null}
                    {f.rain != null ? <span>🌧 {f.rain} mm</span> : null}
                    {f.ws10m != null ? <span>💨 {f.ws10m} m/s {f.wd10m != null ? `${f.wd10m}°` : ""}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl cinematic-panel px-4 py-3">
          <div className="cinematic-badge text-sky-300">พยากรณ์ NWP</div>
          <div className="mt-2 text-xs text-slate-400">เลือกสถานที่สำคัญเพื่อดูพยากรณ์อากาศ</div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex w-full flex-col md:h-full">
      {/* Search / category bar — in-flow on mobile, floating on desktop */}
      <div className="shrink-0 px-3 py-3 md:absolute md:inset-x-6 md:top-6 md:z-[1000] md:w-[min(20rem,calc(100vw-3rem))]">
        <div className="cinematic-panel rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="ค้นหา: ชื่อสถานที่, ประเภท…"
              value={searchTag}
              onChange={e => setSearchTag(e.target.value)}
              className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-400 outline-none focus:border-sky-400/60"
            />
            {searchTag ? <button onClick={() => setSearchTag("")} className="text-slate-400 text-sm">✕</button> : null}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => toggleCat(c.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeCats.has(c.key) ? "text-white border" : "text-slate-300 border border-white/10"
                }`}
                style={activeCats.has(c.key) ? { backgroundColor: c.color + "44", borderColor: c.color } : {}}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[56vh] w-full shrink-0 md:flex-1 md:h-auto md:min-h-0">
        <MapContainer center={CENTER} zoom={DEFAULT_ZOOM} minZoom={10} maxZoom={18} scrollWheelZoom style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <LayersControl position="bottomright">
            <LayersControl.BaseLayer checked name="แผนที่สว่าง">
              <TileLayer attribution="© CARTO © OSM" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="OSM">
              <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="ดาวเทียม">
              <TileLayer attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay checked name="ศูนย์กลางหัวหิน">
              <FeatureGroup>
                <CircleMarker center={CENTER} radius={8} pathOptions={{ color: "#00d4ff" }}>
                  <Tooltip>หัวหิน</Tooltip>
                </CircleMarker>
              </FeatureGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="สถานที่ (POIs)">
              <FeatureGroup>
                {filteredPois.map((p) => {
                  const cat = CATEGORIES.find(c => c.key === p.category)
                  const icon = makeIcon(cat?.icon ?? "📍", cat?.color ?? "#00d4ff")
                  return (
                    <Marker key={p.name} position={[p.lat, p.lng]} icon={icon}>
                      <Tooltip>{p.nameTh || p.name}</Tooltip>
                      <Popup>
                        <div style={{ minWidth: 180, fontSize: 12, color: "#333" }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nameTh || p.name}</div>
                          {p.name ? <div style={{ color: "#666" }}>{p.name}</div> : null}
                          <div style={{ marginTop: 4 }}>ประเภท: {CATEGORIES.find(c => c.key === p.category)?.label || p.category}</div>
                          {p.desc ? <div style={{ marginTop: 4, color: "#555" }}>{p.desc}</div> : null}
                          <div style={{ marginTop: 4, color: "#999", fontSize: 10 }}>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </FeatureGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="สถานีอากาศ TMD">
              <FeatureGroup>
                {tmdWeatherStations.map((w) => (
                  <CircleMarker key={`${w.name}-${w.lat}-${w.lng}`} center={[w.lat, w.lng]} radius={10} pathOptions={{ color: weatherColor(w.temp), fillColor: weatherColor(w.temp), fillOpacity: 0.5 }}>
                    <Tooltip>{w.nameTh || w.name}</Tooltip>
                    <Popup>
                      <div style={{ minWidth: 180, fontSize: 12, color: "#333" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{w.nameTh || w.name}</div>
                        <div style={{ marginTop: 4 }}>อุณหภูมิ: {w.temp} °C</div>
                        <div>ความชื้น: {w.humidity} %</div>
                        <div>ลม: {w.windSpeed} km/h ({w.windDir}°)</div>
                        <div>ปริมาณฝน: {w.rainfall} mm</div>
                        <div style={{ marginTop: 4, color: "#999", fontSize: 10 }}>{w.lat.toFixed(4)}, {w.lng.toFixed(4)}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </FeatureGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="จุดของฉัน">
              <FeatureGroup>
                {pins.map((pin) => (
                  <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon(pin.important)} eventHandlers={{ click: () => selectPin(pin) }}>
                    <Tooltip>{pin.name}{pin.important ? " ★" : ""}</Tooltip>
                  </Marker>
                ))}
              </FeatureGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="คุณภาพอากาศ (Air4Thai)">
              <FeatureGroup>
                {air.map((a) => (
                  <Marker key={a.stationID ?? `${a.lat}-${a.lng}`} position={[a.lat, a.lng]} icon={airIcon(a.aqi)}>
                    <Tooltip>{a.name} — AQI {a.aqi < 0 ? "N/A" : a.aqi} ({aqiLabel(a.aqi)})</Tooltip>
                    <Popup>
                      <div style={{ minWidth: 180, fontSize: 12, color: "#333" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                        <div style={{ marginTop: 4 }}>AQI: {a.aqi < 0 ? "N/A" : a.aqi} ({aqiLabel(a.aqi)})</div>
                        {a.pm25Value != null && a.pm25Value >= 0 ? <div>PM2.5: {a.pm25Value} µg/m³</div> : null}
                        {a.pm10 != null && a.pm10 >= 0 ? <div>PM10: {a.pm10} µg/m³</div> : null}
                        <div style={{ marginTop: 4, color: "#999", fontSize: 10 }}>{[a.date, a.time].filter(Boolean).join(" ") || ""}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </FeatureGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="Air4Thai AQI Stations">
              <FeatureGroup>
                {aqiStations.map((a) => (
                  <CircleMarker
                    key={a.station_id ?? `${a.lat}-${a.lng}`}
                    center={[a.lat, a.lng]}
                    radius={8}
                    pathOptions={{ color: "#fff", weight: 1.5, fillColor: aqiCircleColor(a.aqi), fillOpacity: 0.85 }}
                  >
                    <Tooltip>{a.nameTH || a.nameEN || a.station_id || "สถานี"} — AQI {a.aqi < 0 ? "N/A" : a.aqi}</Tooltip>
                    <Popup>
                      <div style={{ minWidth: 200, fontSize: 12, color: "#333", fontFamily: "'Noto Sans Thai','Inter',sans-serif" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{a.nameTH || a.nameEN || `สถานี ${a.station_id ?? ""}`}</div>
                        {a.nameEN && a.nameEN !== a.nameTH ? <div style={{ color: "#666" }}>{a.nameEN}</div> : null}
                        <div style={{ marginTop: 6 }}>
                          <b style={{ color: aqiCircleColor(a.aqi) }}>AQI {a.aqi < 0 ? "N/A" : a.aqi}</b>
                          <span style={{ color: "#666" }}> ({aqiCircleLabel(a.aqi)})</span>
                          {a.aqiParam ? <span style={{ color: "#999" }}> — จาก {a.aqiParam}</span> : null}
                        </div>
                        <div style={{ marginTop: 4 }}>PM2.5: {a.pm25 < 0 ? "n/a" : `${a.pm25} µg/m³`}</div>
                        <div>PM10: {a.pm10 < 0 ? "n/a" : `${a.pm10} µg/m³`}</div>
                        {a.timestamp ? <div style={{ marginTop: 4, color: "#999", fontSize: 10 }}>อัปเดต {a.timestamp}</div> : null}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </FeatureGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay name="โซนน้ำท่วม">
              <FeatureGroup>
                <Circle center={[12.5666, 99.9577]} radius={4000} pathOptions={{ color: "#f5c842", fillColor: "#f5c842", fillOpacity: 0.1 }}>
                  <Tooltip>Hua Hin Coastal — Watch</Tooltip>
                </Circle>
                <Circle center={[12.5415, 99.9728]} radius={3000} pathOptions={{ color: "#f5c842", fillColor: "#f5c842", fillOpacity: 0.1 }}>
                  <Tooltip>Khao Takiab — Watch</Tooltip>
                </Circle>
              </FeatureGroup>
            </LayersControl.Overlay>

            <LayersControl.Overlay checked name="กล้องวงจรปิด (Webcams)">
              <FeatureGroup>
                {webcams.map((w) => (
                  <Marker key={w.id} position={[w.lat, w.lon]} icon={cctvIcon()}>
                    <Tooltip>{w.title || w.id}</Tooltip>
                  </Marker>
                ))}
              </FeatureGroup>
            </LayersControl.Overlay>
          </LayersControl>
        </MapContainer>
      </div>

      {/* Right stack: coordinates, live values, important places, NWP forecast — below map on mobile */}
      <div className="relative z-[1050] w-full px-3 pb-40 md:absolute md:right-4 md:top-[8vh] md:w-[min(22rem,calc(100vw-2rem))] md:max-h-[84vh] md:overflow-y-auto md:px-0 md:pb-0">
        {rightStackContent}
      </div>

      {/* CCTV toggle + iframe — below map on mobile, floating bottom-right on desktop */}
      <div className="relative z-[1100] w-full px-3 pb-4 md:absolute md:bottom-[9vh] md:right-4 md:w-auto md:px-0 md:pb-0">
        <button
          onClick={() => setShowCctv(v => !v)}
          className="w-full rounded-xl cinematic-panel px-4 py-3 text-sm font-semibold text-slate-100 shadow-lg transition-colors hover:text-sky-300 md:w-auto md:rounded-full md:px-4 md:py-2 md:text-xs"
        >
          {showCctv ? "✕ ซ่อนกล้องจราจร" : "📹 กล้องจราจร CCTV"}
        </button>
        {showCctv ? (
          <div className="cinematic-panel mt-2 w-full overflow-hidden rounded-xl shadow-2xl md:mt-2 md:w-[min(24rem,calc(100vw-2rem))]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="cinematic-badge text-sky-300">กล้องจราจรหัวหิน (สด)</div>
              <a
                href="https://traffic.itac-huahincity.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium text-sky-400 hover:underline"
              >
                เปิดในแท็บใหม่ ↗
              </a>
            </div>
            <iframe
              src="https://traffic.itac-huahincity.com/"
              title="กล้องจราจรเทศบาลหัวหิน"
              loading="lazy"
              allow="fullscreen; encrypted-media"
              className="block h-[34vh] w-full border-0 md:h-[42vh]"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
