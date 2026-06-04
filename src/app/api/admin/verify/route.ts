import { NextRequest, NextResponse } from 'next/server'

// 관리자 페이지 진입용 비밀번호 검증
export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const ok = (password ?? '').trim() === (process.env.ADMIN_PASSWORD ?? '').trim()
  return NextResponse.json({ ok })
}
