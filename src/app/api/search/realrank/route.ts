import { NextRequest, NextResponse } from 'next/server'

// 네이버 블로그탭 실제 화면 순위 스크래핑
// 데스크톱(search.naver.com) 우선, 최대 4회 재시도 + UA 로테이션 → 모바일 폴백

function extractBlogId(input: string): string {
  const s = (input ?? '').trim()
  const m = s.match(/blog\.naver\.com\/([A-Za-z0-9_-]+)/i)
  if (m) return m[1].toLowerCase()
  return s.replace(/^@/, '').toLowerCase()
}

// 네이버 시스템 경로 (블로그 ID가 아닌 것들)
const SKIP = new Set([
  'postlist', 'postview', 'guestbook', 'prologue', 'section', 'widget',
  'blogview', 'categorylist', 'taglist', 'searchlist', 'bloggerlist',
  'connect', 'api', 'popup', 'login', 'media', 'my', 'memo',
  'search', 'map', 'album', 'video', 'music', 'tag', 'rss',
])

// 데스크톱 UA 로테이션 (봇 감지 회피)
const UA_DESKTOP = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
]
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

// HTML에서 블로그 ID 순서 추출
// 전략 1: 포스트 링크(BLOGID/POSTNO) → 실제 검색결과 아이템에서 나오는 패턴
// 전략 2: 일반 blog.naver.com 링크 (폴백)
function parseOrder(html: string): string[] {
  const order: string[] = []
  const seen = new Set<string>()

  // 전략 1: blog.naver.com/BLOGID/숫자5자리이상 → 실제 포스트 링크
  const postRe = /blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{5,})/gi
  let m: RegExpExecArray | null
  while ((m = postRe.exec(html)) !== null) {
    const id = m[1].toLowerCase()
    if (SKIP.has(id) || id.length < 3) continue
    if (!seen.has(id)) { seen.add(id); order.push(id) }
  }

  // 전략 2: 포스트 링크로 부족하면 일반 blog.naver.com 링크 추가
  if (order.length < 5) {
    const re = /blog\.naver\.com\/([A-Za-z0-9_-]+)/gi
    while ((m = re.exec(html)) !== null) {
      const id = m[1].toLowerCase()
      if (SKIP.has(id) || /^\d+$/.test(id) || id.length < 3) continue
      if (!seen.has(id)) { seen.add(id); order.push(id) }
    }
  }

  return order
}

async function fetchOrder(query: string, mobile: boolean, ua: string): Promise<string[]> {
  const url = mobile
    ? `https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&query=${encodeURIComponent(query)}`
    : `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': mobile ? 'https://m.search.naver.com/' : 'https://search.naver.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return parseOrder(await res.text())
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  const { keyword, blog } = await req.json()
  if (!keyword?.trim()) return NextResponse.json({ error: '키워드를 입력하세요.' }, { status: 400 })
  if (!blog) return NextResponse.json({ error: '내 블로그 주소(아이디)를 입력해주세요.' }, { status: 400 })

  const blogId = extractBlogId(blog)
  const kw = keyword.trim()

  try {
    let best: string[] = []
    let source = ''

    // 데스크톱 4회 시도 (UA 로테이션, 간격 증가)
    for (let i = 0; i < 4; i++) {
      const ua = UA_DESKTOP[i % UA_DESKTOP.length]
      const order = await fetchOrder(kw, false, ua)
      if (order.length > best.length) { best = order; source = 'desktop' }
      if (best.includes(blogId) || best.length >= 12) break
      if (i < 3) await new Promise(r => setTimeout(r, 600 + i * 300))
    }

    // 모바일 폴백 (2회)
    if (best.length < 6) {
      for (let i = 0; i < 2; i++) {
        const order = await fetchOrder(kw, true, UA_MOBILE)
        if (order.length > best.length) { best = order; source = 'mobile' }
        if (best.includes(blogId) || best.length >= 8) break
        if (i < 1) await new Promise(r => setTimeout(r, 800))
      }
    }

    if (best.length === 0) {
      return NextResponse.json({
        error: '검색 결과를 읽지 못했습니다. 네이버 응답이 지연되거나 일시 차단된 상태입니다. 잠시 후 재시도하세요.',
      })
    }

    const idx = best.indexOf(blogId)
    return NextResponse.json({ rank: idx >= 0 ? idx + 1 : -1, sample: best.length, source })
  } catch (e) {
    return NextResponse.json({ error: String(e) })
  }
}
