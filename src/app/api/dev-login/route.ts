import { NextRequest, NextResponse } from 'next/server'

// ⚠️ 개발 전용: 카카오 로그인 없이 대시보드를 미리 보기 위한 우회 로그인.
// 운영(production) 빌드에서는 동작하지 않음(404).
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  const session = {
    id: 0,
    nickname: '미리보기',
    avatar: null,
    nk_valid: true, // 입장키 통과 처리 → 바로 대시보드
  }

  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set('session', Buffer.from(JSON.stringify(session)).toString('base64'), {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
