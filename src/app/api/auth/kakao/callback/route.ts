import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url))
  }

  // 코드 → 액세스 토큰 교환
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY!.trim(),
      client_secret: process.env.KAKAO_CLIENT_SECRET!.trim(),
      redirect_uri: process.env.KAKAO_REDIRECT_URI!.trim(),
      code,
    }),
  })
  const token = await tokenRes.json()

  if (!token.access_token) {
    const code = encodeURIComponent(token.error_code ?? token.error ?? 'token_fail')
    return NextResponse.redirect(new URL(`/login?error=${code}`, req.url))
  }

  // 사용자 정보 조회
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  const user = await userRes.json()

  const session = {
    id: user.id,
    nickname: user.kakao_account?.profile?.nickname ?? '사용자',
    avatar: user.kakao_account?.profile?.profile_image_url ?? null,
  }

  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set('session', Buffer.from(JSON.stringify(session)).toString('base64'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: '/',
  })
  return res
}
