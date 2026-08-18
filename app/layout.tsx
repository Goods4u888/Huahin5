import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Huahin3 — เมืองหัวหิน GIS',
  description: 'ระบบแผนที่ภัยพิบัติเมืองหัวหิน แบบเรียลไทม์ — อุตุนิยมวิทยา น้ำท่วม คุณภาพอากาศ พยากรณ์อากาศ และกล้องวงจรปิด',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="antialiased">
        <header className="fixed inset-x-0 top-0 z-[1200] flex h-14 items-center gap-3 border-b border-sky-400/20 bg-[#0f172a]/90 px-4 backdrop-blur-xl">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-md shadow-sky-500/30">
            หัวหิน
          </div>
          <div>
            <div className="cinematic-badge text-sky-300">Hua Hin GIS</div>
            <div className="cinematic-title text-xl font-bold">เมืองหัวหิน GIS</div>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}