export type TmdStation = {
  name: string
  nameTh: string
  lat: number
  lng: number
  province: string
}

export type TmdWeather = {
  name: string
  nameTh: string
  lat: number
  lng: number
  temp: number
  humidity: number
  windSpeed: number
  windDir: number
  rainfall: number
}

export type TmdResponse = {
  ok: boolean
  source: string
  stationCount: number
  weatherCount: number
  stations: TmdStation[]
  weather: TmdWeather[]
}

export type PoiCategory = "hospital" | "government" | "tourism" | "restaurant" | "bank" | "gasstation" | "hotel" | "police"

export type Poi = {
  name: string
  nameTh?: string
  lat: number
  lng: number
  category: PoiCategory
  desc?: string
}

export type Pin = {
  id: string
  name: string
  lat: number
  lng: number
  important: boolean
  note?: string
  createdAt: string
}

export type AirStation = {
  stationID: string | null
  name: string
  nameTh: string | null
  area: string | null
  lat: number
  lng: number
  date: string | null
  time: string | null
  aqi: number
  aqiParam: string | null
  aqiColorId: string | null
  pm25: number
  pm25Value: number
  pm10: number
  o3: number
  co: number
  no2: number
  so2: number
}

export type Air4ThaiStation = {
  station_id: string | null
  nameTH: string | null
  nameEN: string | null
  lat: number
  lng: number
  pm25: number
  pm10: number
  aqi: number
  aqiParam: string | null
  date: string | null
  time: string | null
  timestamp: string | null
}

export type WaterStation = {
  id: number
  name: string
  nameTh: string
  lat: number
  lng: number
  datetime: string | null
  levelM: number | null
  levelMsl: number | null
  flowRate: number | null
  storagePercent: number | null
  situation: number | null
  warningLevelM: number | null
  criticalLevelM: number | null
}

export type Webcam = {
  id: number
  title: string | null
  lat: number
  lon: number
  lastUpdate: number | null
  imageUrl: string | null
  pageUrl: string | null
  windyUrl: string
}
