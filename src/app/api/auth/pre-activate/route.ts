import { NextRequest, NextResponse } from 'next/server'
import { validateNKKey } from '@/lib/nk'

// 카카오 로그인 전 사전 인증 — NK키(일반) 또는 관리자 비번(관리자) 검증
export async function POST(req: NextRequest) {
  const { type, key, password } = await req.json()

  if (type === 'admin') {
    const adminPw = process.env.ADMIN_PASSWORD
    if (!adminPw || password !== adminPw) {
      return NextResponse.json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, { status: 400 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set('admin_preauth', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10,
      path: '/',
    })
    return res
  }

  // 일반 사용자 — NK 입장키 검증
  const result = validateNKKey(key ?? '')
  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('nk_preauth', key.trim().toUpperCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  })
  return res
}
