import { NextRequest, NextResponse } from 'next/server'

// 키워드 상위 노출 블로그 글(경쟁글) 조회 — 네이버 블로그 검색 오픈API (정확도순)
function strip(s: string): string {
  return (s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim()
}

type Item = { title?: string; link?: string; bloggername?: string; bloggerlink?: string; postdate?: string }

export async function POST(req: NextRequest) {
  const { keyword, clientId, clientSecret, count } = await req.json()
  if (!clientId || !clientSecret) return NextResponse.json({ error: '네이버 오픈API Client ID/Secret을 입력해주세요.' }, { status: 400 })
  if (!keyword?.trim()) return NextResponse.json({ error: '키워드를 입력하세요.' }, { status: 400 })

  const display = Math.min(Math.max(Number(count) || 10, 5), 30)
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword.trim())}&display=${display}&sort=sim`, {
      headers: { 'X-Naver-Client-Id': String(clientId).trim(), 'X-Naver-Client-Secret': String(clientSecret).trim() },
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: `API ${res.status}: ${t.slice(0, 100)}` }, { status: res.status })
    }
    const data = await res.json()
    const items = ((data.items ?? []) as Item[]).map((it, i) => ({
      rank: i + 1,
      title: strip(it.title ?? ''),
      blogger: it.bloggername ?? '',
      bloggerlink: it.bloggerlink ?? '',
      link: it.link ?? '',
      postdate: it.postdate ?? '', // YYYYMMDD
    }))
    return NextResponse.json({ total: data.total ?? 0, items })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
