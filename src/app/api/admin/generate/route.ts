import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { password, expiry } = await req.json()

  if (password.trim() !== (process.env.ADMIN_PASSWORD ?? '').trim()) {
    return NextResponse.json({ error: '비밀번호 오류' }, { status: 401 })
  }

  // expiry: "YYYY-MM-DD" → "YYYYMMDD"
  const dateStr = (expiry ?? '').replace(/-/g, '')
  if (!/^\d{8}$/.test(dateStr)) {
    return NextResponse.json({ error: '날짜 형식 오류' }, { status: 400 })
  }

  const sig = crypto
    .createHmac('sha256', process.env.NK_MASTER_SECRET!)
    .update(`NK|${dateStr}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase()

  return NextResponse.json({ key: `NK-${dateStr}-${sig}` })
}
