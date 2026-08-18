import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST() {
  const payload = {
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'oracle-monitor-diagnostics',
    result: {
      oracledb: false,
      error: 'No Oracle client configured in Vercel serverless runtime'
    }
  }

  return NextResponse.json(payload)
}
