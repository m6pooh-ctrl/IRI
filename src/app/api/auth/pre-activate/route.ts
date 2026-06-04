import { NextRequest, NextResponse } from 'next/server'
import { validateNKKey } from '@/lib/nk'

// NK키 사전 검증 — 카카오 로그인 전에 키 유효성 확인 후 임시 쿠키 발급
export async function POST(req: NextRequest) {
  const { key } = await req.json()
  const result = validateNKKey(key ?? '')

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  // 10분 유효 임시 쿠키 — 카카오 콜백에서 검증 후 세션에 nk_valid 반영
  res.cookies.set('nk_preauth', key.trim().toUpperCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  })
  return res
}
