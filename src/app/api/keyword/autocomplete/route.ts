import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ items: [] })

  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&q_enc=UTF-8&st=100&frm=nv&r_format=json&r_enc=UTF-8`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 },
    })
    const data = await res.json()
    // 자동완성 결과: data.items[0] 배열
    const items: string[] = (data?.items?.[0] ?? []).map((arr: string[]) => arr[0])
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
