import { NextRequest, NextResponse } from 'next/server'
import { searchadHeaders, buildRecord } from '@/lib/iri'

// 오픈API(블로그 검색)로 블로그 문서수 조회 (선택) → 비율·기회등급 계산용
async function fetchBlogDocs(kw: string, id: string, secret: string): Promise<number> {
  try {
    const r = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(kw)}&display=1`, {
      headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
    })
    if (!r.ok) return -1
    const d = await r.json()
    return typeof d.total === 'number' ? d.total : -1
  } catch { return -1 }
}

export async function POST(req: NextRequest) {
  const { keywords, accessLicense, secretKey, customerId, openClientId, openClientSecret } = await req.json()

  if (!keywords?.length) return NextResponse.json({ results: [] })
  if (!accessLicense || !secretKey || !customerId) {
    return NextResponse.json({ error: 'API 키를 입력해주세요.' }, { status: 400 })
  }

  // 5개씩 배치
  const results: ReturnType<typeof buildRecord>[] = []
  const batches: string[][] = []
  for (let i = 0; i < keywords.length; i += 5) {
    batches.push(keywords.slice(i, i + 5))
  }

  for (const batch of batches) {
    try {
      const path = '/keywordstool'
      const headers = searchadHeaders(
        accessLicense.trim(), secretKey.trim(), customerId.trim(), 'GET', path,
      )
      // 검색광고 keywordstool은 키워드에 공백이 있으면 거부(11001) → 공백 제거 후 요청
      const hint = batch.map(k => k.replace(/\s+/g, '')).join(',')
      const qs = `hintKeywords=${encodeURIComponent(hint)}&showDetail=1`
      const res = await fetch(`https://api.searchad.naver.com${path}?${qs}`, { headers })

      if (!res.ok) {
        const txt = await res.text()
        // 인증 오류(401/403)는 즉시 중단 — 키 문제이므로 나머지 배치도 실패 확실
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json({ error: `API 오류 ${res.status}: ${txt}` }, { status: res.status })
        }
        // 그 외 오류(일시적 네트워크 등)는 이 배치만 건너뛰고 계속
        continue
      }

      const data = await res.json()
      const rawList: Record<string, unknown>[] = data.keywordList ?? []

      // 매칭: 공백 제거 + 소문자
      const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase()
      const rawMap = Object.fromEntries(rawList.map(r => [normalize(String(r.relKeyword)), r]))

      const useOpen = !!(openClientId && openClientSecret)
      const enrichedBatch = await Promise.all(batch.map(async kw => {
        const raw = rawMap[normalize(kw)]
        if (!raw) return null
        const blogDocs = useOpen
          ? await fetchBlogDocs(kw, String(openClientId).trim(), String(openClientSecret).trim())
          : -1
        // 결과 키워드는 화면 매칭을 위해 원래(공백 포함) 키워드로 유지
        return { ...buildRecord(raw, blogDocs), keyword: kw }
      }))
      for (const r of enrichedBatch) if (r) results.push(r)
    } catch {
      // 네트워크 오류 등 예외는 이 배치만 건너뛰고 계속 처리
      continue
    }
  }

  return NextResponse.json({ results })
}
