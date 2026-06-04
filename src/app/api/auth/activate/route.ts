import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateNKKey } from '@/lib/nk'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { key } = await req.json()
  const result = validateNKKey(key ?? '')

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 })
  }

  const updatedSession = { ...user, nk_valid: true }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', Buffer.from(JSON.stringify(updatedSession)).toString('base64'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
