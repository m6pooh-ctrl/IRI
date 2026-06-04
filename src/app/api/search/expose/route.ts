import { NextRequest, NextResponse } from 'next/server'

// 네이버 블로그 검색 오픈API로 "내 블로그가 키워드 검색결과에 노출되는지" 확인 (공식 API, 안전버전)
// 정확도순(sim) + 최신순(date) 둘 다 뒤져 누락을 줄임. 단, 통합검색 화면 순위와는 다를 수 있음.

function extractBlogId(input: string): string {
  const s = (input ?? '').trim()
  const m = s.match(/blog\.naver\.com\/([A-Za-z0-9_-]+)/i)
  if (m) return m[1].toLowerCase()
  return s.replace(/^@/, '').toLowerCase()
}

type Item = { bloggerlink?: string; link?: string }
type SortResult = { rank: number; postUrl: string; total: number; scanned: number; err?: string }

async function searchSort(
  kw: string, sort: 'sim' | 'date', pages: number,
  headers: Record<string, string>, target: string, blogId: string,
): Promise<SortResult> {
  let total = 0, scanned = 0
  for (let p = 0; p < pages; p++) {
    const start = 1 + p * 100
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(kw)}&display=100&start=${start}&sort=${sort}`
    const res = await fetch(url, { headers })
    if (!res.ok) return { rank: -1, postUrl: '', total, scanned, err: `API ${res.status}: ${(await res.text()).slice(0, 80)}` }
    const data = await res.json()
    total = data.total ?? total
    const items: Item[] = data.items ?? []
    for (let i = 0; i < items.length; i++) {
      scanned++
      const bl = (items[i].bloggerlink ?? '').toLowerCase()
      const lk = (items[i].link ?? '').toLowerCase()
      if (bl.includes(target) || lk.includes(target) || bl.endsWith('/' + blogId)) {
        return { rank: start + i, postUrl: items[i].link ?? '', total, scanned }
      }
    }
    if (items.length < 100) break
    await new Promise(r => setTimeout(r, 100))
  }
  return { rank: -1, postUrl: '', total, scanned }
}

export async function POST(req: NextRequest) {
  const { keywords, blog, clientId, clientSecret, depth } = await req.json()

  if (!clientId || !clientSecret) return NextResponse.json({ error: '네이버 오픈API Client ID/Secret을 입력해주세요.' }, { status: 400 })
  if (!blog) return NextResponse.json({ error: '내 블로그 주소(또는 아이디)를 입력해주세요.' }, { status: 400 })
  if (!Array.isArray(keywords) || keywords.length === 0) return NextResponse.json({ results: [] })

  const blogId = extractBlogId(blog)
  const target = `blog.naver.com/${blogId}`
  const pages = Math.min(Math.max(Number(depth) || 1, 1), 3)
  const headers = {
    'X-Naver-Client-Id': String(clientId).trim(),
    'X-Naver-Client-Secret': String(clientSecret).trim(),
  }

  const results: Array<Record<string, unknown>> = []

  for (const kwRaw of keywords.slice(0, 30)) {
    const kw = String(kwRaw).trim()
    if (!kw) continue
    try {
      // 1) 정확도순
      const sim = await searchSort(kw, 'sim', pages, headers, target, blogId)
      if (sim.err) { results.push({ keyword: kw, error: sim.err }); await new Promise(r => setTimeout(r, 120)); continue }

      if (sim.rank > 0) {
        results.push({ keyword: kw, rank: sim.rank, total: sim.total, scanned: sim.scanned, postUrl: sim.postUrl, foundBy: 'sim' })
      } else {
        // 2) 정확도순에서 없으면 최신순으로 한 번 더 (최근 글이 sim에서 밀린 경우 보완)
        const date = await searchSort(kw, 'date', pages, headers, target, blogId)
        if (date.err) { results.push({ keyword: kw, error: date.err }) }
        else if (date.rank > 0) results.push({ keyword: kw, rank: date.rank, total: date.total || sim.total, scanned: sim.scanned + date.scanned, postUrl: date.postUrl, foundBy: 'date' })
        else results.push({ keyword: kw, rank: -1, total: sim.total, scanned: sim.scanned + date.scanned, postUrl: '' })
      }
    } catch (e) {
      results.push({ keyword: kw, error: String(e) })
    }
    await new Promise(r => setTimeout(r, 120))
  }

  return NextResponse.json({ results, blogId })
}
