import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// 클라이언트 사이드바/대시보드가 세션 유저(닉네임·아바타)를 조회하는 엔드포인트
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ user: null }, { status: 200 })
  return NextResponse.json({
    user: {
      nickname: user.nickname,
      avatar: user.avatar,
      nk_valid: user.nk_valid ?? false,
      is_admin: user.is_admin ?? false,
    },
  })
}
