import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY!.trim(),
    redirect_uri: process.env.KAKAO_REDIRECT_URI!.trim(),
    response_type: 'code',
  })
  return NextResponse.redirect(
    `https://kauth.kakao.com/oauth/authorize?${params}`
  )
}
