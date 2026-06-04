import { NextRequest, NextResponse } from 'next/server'

// 네이버 데이터랩 검색어트렌드 — 다중 키워드 지원 (최대 5개 동시 비교)
function ymd(d: Date) { return d.toISOString().slice(0, 10) }

export async function POST(req: NextRequest) {
  const { keyword, keywords, clientId, clientSecret } = await req.json()
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: '네이버 오픈API Client ID/Secret을 입력해주세요.' }, { status: 400 })
  }

  // 단일(keyword) / 다중(keywords) 모두 지원
  const kwList: string[] = Array.isArray(keywords)
    ? keywords.map((k: string) => String(k).trim()).filter(Boolean).slice(0, 5)
    : keyword?.trim() ? [keyword.trim()] : []

  if (!kwList.length) return NextResponse.json({ error: '키워드를 입력하세요.' }, { status: 400 })

  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 12)

  const body = {
    startDate: ymd(start),
    endDate: ymd(end),
    timeUnit: 'month',
    keywordGroups: kwList.map(k => ({ groupName: k, keywords: [k] })),
  }

  try {
    const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': String(clientId).trim(),
        'X-Naver-Client-Secret': String(clientSecret).trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const t = await res.text()
      const msg = (res.status === 401 || res.status === 403)
        ? '오픈API 키 오류이거나 앱에 "데이터랩(검색어트렌드)" API가 등록되지 않았습니다. developers.naver.com 앱 설정에서 데이터랩 API를 추가하세요.'
        : `데이터랩 오류 ${res.status}`
      return NextResponse.json({ error: msg, detail: t.slice(0, 120) }, { status: res.status })
    }

    const data = await res.json()
    const results = ((data?.results ?? []) as { title: string; data: { period: string; ratio: number }[] }[])
      .map((r, i) => ({
        keyword: kwList[i] ?? r.title,
        points: r.data ?? [],
      }))

    // 단일 키워드 호환성: points도 같이 반환
    return NextResponse.json({ results, points: results[0]?.points ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
