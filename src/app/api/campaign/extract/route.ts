import { NextRequest, NextResponse } from 'next/server'
import { extractFromText } from '@/lib/campaign'

const SITE_MAP: [string, string][] = [
  ['revu.net', '레뷰'],
  ['mble.co.kr', '미블'],
  ['dinnerqueen', '디너의여왕'],
  ['reviewnote', '리뷰노트'],
  ['modublog', '모두의블로그'],
  ['reviewplace', '리뷰플레이스'],
  ['gangnam', '강남맛집'],
]

function detectSite(str: string): string {
  for (const [domain, label] of SITE_MAP) {
    if (str.toLowerCase().includes(domain)) return label
  }
  return ''
}

function extractUrlFromText(str: string): string {
  const m = str.match(/https?:\/\/[^\s\]>]+/)
  return m ? m[0] : ''
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, '\n')
    .trim()
}

// 사이트별 전용 파서
function parseSite(html: string, url: string, baseResult: ReturnType<typeof extractFromText>): ReturnType<typeof extractFromText> {
  const text = htmlToText(html)
  const enriched = extractFromText(text)

  // ── 리뷰플레이스 전용 ──────────────────────────────────
  if (url.includes('reviewplace')) {
    // 제목: h1 또는 title
    const h1 = html.match(/<h1[^>]*>([\s\S]+?)<\/h1>/i)
    if (h1) baseResult.name = htmlToText(h1[1]).trim()

    // 사이드바 날짜 테이블에서 추출
    // "리뷰 등록기간  05.30 ~ 06.14" 형식
    const reviewPeriod = text.match(/리뷰\s*등록기간\s+([\d.]+)\s*~\s*([\d.]+)/)
    if (reviewPeriod) {
      baseResult.visitStart = parseMMDD(reviewPeriod[1])
      baseResult.reviewDeadline = parseMMDD(reviewPeriod[2])
    }

    // 모집기간
    const recruitPeriod = text.match(/모집기간\s+([\d.]+)\s*~\s*([\d.]+)/)
    if (recruitPeriod && !baseResult.visitStart) {
      baseResult.visitStart = parseMMDD(recruitPeriod[1])
    }

    // 제공내역: "15만원 이내 ..."
    const provision = text.match(/제공\s*내역?\s*([\s\S]{0,100}?)(?:\n|키워드|캠페인)/i)
    if (provision) {
      const manwon = provision[1].match(/(\d+)만원/)
      if (manwon) baseResult.value = parseInt(manwon[1]) * 10000
    }

    // 방문주소
    const addrMatch = text.match(/방문\s*주소\s*(.+?)(?:\n|$)/)
    if (addrMatch) baseResult.location = addrMatch[1].trim()

    return { ...enriched, ...baseResult, site: '리뷰플레이스' }
  }

  // ── 레뷰 전용 ──────────────────────────────────────────
  if (url.includes('revu.net')) {
    const h1 = html.match(/<h1[^>]*>([\s\S]+?)<\/h1>/i)
    if (h1) baseResult.name = htmlToText(h1[1]).trim()
    return { ...enriched, ...baseResult, site: '레뷰' }
  }

  // ── 미블 전용 ──────────────────────────────────────────
  if (url.includes('mble.co.kr')) {
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (title) baseResult.name = title[1].replace(/\s*[-|]\s*미블.*$/, '').trim()
    return { ...enriched, ...baseResult, site: '미블' }
  }

  // 일반
  return { ...enriched, ...baseResult }
}

// MM.DD → YYYY-MM-DD
function parseMMDD(str: string): string {
  const m = str.trim().match(/^(\d{1,2})\.(\d{2})$/)
  if (!m) return ''
  const year = new Date().getFullYear()
  return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { url, text } = await req.json()

  // ── 순수 URL 모드 ─────────────────────────────────────
  if (url && /^https?:\/\/\S+$/.test(url.trim())) {
    const html = await fetchPage(url.trim())
    if (!html) return NextResponse.json({ error: '페이지에 접근할 수 없습니다. 로그인이 필요하거나 차단된 페이지일 수 있습니다.' }, { status: 400 })

    const base = { site: detectSite(url) } as ReturnType<typeof extractFromText>
    const result = parseSite(html, url, base)
    return NextResponse.json(result)
  }

  // ── 텍스트 모드 (카카오 메시지 등) ───────────────────
  const rawText = text || url  // URL 칸에 텍스트 붙여넣어도 처리
  if (!rawText) return NextResponse.json({})

  // 1) 텍스트에서 기본 정보 추출
  const result = extractFromText(rawText)
  result.site = result.site || detectSite(rawText)

  // 2) 텍스트 안에 URL이 있으면 페이지도 접속해서 보강
  const embeddedUrl = extractUrlFromText(rawText)
  if (embeddedUrl) {
    result.site = result.site || detectSite(embeddedUrl)
    const html = await fetchPage(embeddedUrl)
    if (html) {
      const pageResult = parseSite(html, embeddedUrl, { site: result.site })
      // 페이지에서 가져온 정보로 보강 (기존 추출값 우선)
      if (!result.name && pageResult.name) result.name = pageResult.name
      if (!result.reviewDeadline && pageResult.reviewDeadline) result.reviewDeadline = pageResult.reviewDeadline
      if (!result.visitStart && pageResult.visitStart) result.visitStart = pageResult.visitStart
      if (!result.visitEnd && pageResult.visitEnd) result.visitEnd = pageResult.visitEnd
      if (!result.location && pageResult.location) result.location = pageResult.location
      if (!result.value && pageResult.value) result.value = pageResult.value
    }
  }

  return NextResponse.json(result)
}
