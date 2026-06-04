export type CampaignStatus = '선정됨' | '방문예약' | '방문완료' | '리뷰완료' | '완료'
export type CampaignCategory = '뷰티' | '건강/헬스' | '맛집/식품' | '생활/리빙' | '기타'

export type Campaign = {
  id: string
  name: string
  site: string
  category: CampaignCategory
  status: CampaignStatus
  visitStart: string
  visitEnd: string
  visitTime: string       // 방문 시간 예: "오후 5시"
  reviewDeadline: string  // 리뷰 마감일 (가장 중요)
  location: string
  value: number           // 제품/서비스 가치 (₩)
  myExpense: number       // 내가 쓴 돈 (주차 등)
  cashIncome: number      // 현금 수입
  note: string
  createdAt: string
}

const KEY = 'nbolg_campaigns_v2'

export function loadCampaigns(): Campaign[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch { return [] }
}

export function saveCampaigns(list: Campaign[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

// ── 날짜 유틸 ─────────────────────────────────────────────

function padN(n: string) { return n.padStart(2, '0') }

export function today() { return new Date().toISOString().slice(0, 10) }

export function daysLeft(deadline: string): number {
  if (!deadline) return 9999
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

export function daysLeftLabel(deadline: string): string {
  const d = daysLeft(deadline)
  if (d < 0) return `D+${Math.abs(d)}`
  if (d === 0) return 'D-day'
  return `D-${d}`
}

function parseKoreanDate(text: string): string {
  const t = text.trim()
  // 2026.06.30 / 2026-06-30
  let m = t.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (m) return `${m[1]}-${padN(m[2])}-${padN(m[3])}`
  // 2026년 6월 30일
  m = t.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (m) return `${m[1]}-${padN(m[2])}-${padN(m[3])}`
  // MM.DD (리뷰플레이스 등) — 올해 기준
  m = t.match(/^(\d{1,2})\.(\d{2})$/)
  if (m) return `${new Date().getFullYear()}-${padN(m[1])}-${padN(m[2])}`
  // 6/30
  m = t.match(/(\d{1,2})\/(\d{1,2})/)
  if (m) return `${new Date().getFullYear()}-${padN(m[1])}-${padN(m[2])}`
  return ''
}

// ── 텍스트 추출 ───────────────────────────────────────────

export function extractFromText(text: string): Partial<Campaign> {
  const result: Partial<Campaign> = {}

  // 카카오 알림 형식: < 캠페인명 > (리뷰플레이스 등)
  const angleMatch = text.match(/<\s*(.{4,60}?)\s*>/)
  if (angleMatch) {
    result.name = angleMatch[1].trim()
  } else {
    const namePatterns = [
      /(?:캠페인|제품|서비스|업체)\s*[:：]\s*(.+)/,
      /신청하신\s+(.{4,50}?)\s+캠페인/,
      /\[(.{2,30})\]/,
      /^(.{4,40})\s*(?:체험단|리뷰|모집)/m,
    ]
    for (const p of namePatterns) {
      const m = text.match(p)
      if (m) { result.name = m[1].trim(); break }
    }
  }

  const visitPatterns = [
    /방문\s*(?:가능\s*)?기간\s*[:：]?\s*(.+?)(?:\n|$)/,
    /이용\s*기간\s*[:：]?\s*(.+?)(?:\n|$)/,
    /모집기간\s*[:：]?\s*(.+?)(?:\n|$)/,
  ]
  for (const p of visitPatterns) {
    const m = text.match(p)
    if (m) {
      const parts = m[1].split(/[~\-–]/).map(s => s.trim())
      if (parts[0]) result.visitStart = parseKoreanDate(parts[0])
      if (parts[1]) result.visitEnd = parseKoreanDate(parts[1])
      else result.visitEnd = result.visitStart
      break
    }
  }

  const deadlinePatterns = [
    /(?:리뷰|후기)\s*(?:등록|작성)?\s*(?:기간|마감)\s*[:：]?\s*(?:\S+\s*~\s*)?(\S+?)(?:\s|$)/,
    /리뷰\s*등록기간\s*[:：]?\s*\S+\s*~\s*(\S+?)(?:\s|$)/,  // 리뷰플레이스: 05.30 ~ 06.14
    /(?:리뷰|후기)\s*(?:등록|작성)?\s*마감\s*[:：]?\s*(.+?)(?:\n|$)/,
    /마감\s*(?:일|일자)?\s*[:：]?\s*(.+?)(?:\n|$)/,
    /등록\s*기한\s*[:：]?\s*(.+?)(?:\n|$)/,
  ]
  for (const p of deadlinePatterns) {
    const m = text.match(p)
    if (m) {
      const d = parseKoreanDate(m[1].trim())
      if (d) { result.reviewDeadline = d; break }
    }
  }

  const locationPatterns = [
    /(?:방문\s*)?주소\s*[:：]\s*(.+?)(?:\n|$)/,
    /(?:장소|위치|업체)\s*[:：]\s*(.+?)(?:\n|$)/,
  ]
  for (const p of locationPatterns) {
    const m = text.match(p)
    if (m) { result.location = m[1].trim(); break }
  }

  // 금액: 15만원 이내, 150,000원, ₩150,000
  const valuePatterns: [RegExp, (m: RegExpMatchArray) => number][] = [
    [/(\d+)만원\s*이내/, m => parseInt(m[1]) * 10000],
    [/(\d+)만원/, m => parseInt(m[1]) * 10000],
    [/(?:제품|서비스|상품|제공)\s*(?:가격|가치|금액|내역)?[^:：\n]{0,10}[:：]?\s*([0-9,]+)\s*원/, m => parseInt(m[1].replace(/,/g, ''))],
    [/₩([0-9,]+)/, m => parseInt(m[1].replace(/,/g, ''))],
  ]
  for (const [p, parse] of valuePatterns) {
    const m = text.match(p)
    if (m) { result.value = parse(m); break }
  }

  // 사이트/카테고리
  const siteMap: [string, string][] = [
    ['revu', '레뷰'], ['mble', '미블'], ['gangnam', '강남맛집'],
    ['dinnerqueen', '디너의여왕'], ['reviewnote', '리뷰노트'],
    ['modublog', '모두의블로그'], ['reviewplace', '리뷰플레이스'],
  ]
  for (const [key, label] of siteMap) {
    if (text.toLowerCase().includes(key)) { result.site = label; break }
  }

  return result
}

// ── .ics 생성 ─────────────────────────────────────────────

function icsDate(d: string) { return d.replace(/-/g, '') }

export function generateICS(campaigns: Campaign[]): string {
  const events = campaigns.filter(c => c.reviewDeadline).map(c => {
    const dt = icsDate(c.reviewDeadline)
    const lines = [
      'BEGIN:VEVENT',
      `UID:${c.id}@nbolg`,
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${dt}`,
      `SUMMARY:⏰ 리뷰마감 - ${c.name}`,
      c.location ? `LOCATION:${c.location}` : '',
      c.note ? `DESCRIPTION:${c.note}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')

    if (c.visitStart) {
      const vt = icsDate(c.visitStart)
      lines.concat(['\r\nBEGIN:VEVENT', `UID:visit-${c.id}@nbolg`, `DTSTART;VALUE=DATE:${vt}`,
        `DTEND;VALUE=DATE:${vt}`, `SUMMARY:📅 방문 - ${c.name}`, 'END:VEVENT'].join('\r\n'))
    }
    return lines
  }).join('\r\n')

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IRI n blog//KR', 'CALSCALE:GREGORIAN', events, 'END:VCALENDAR'].join('\r\n')
}

export const STATUS_COLOR: Record<CampaignStatus, string> = {
  '선정됨': 'bg-pink-100 text-pink-700',
  '방문예약': 'bg-cyan-100 text-cyan-700',
  '방문완료': 'bg-green-100 text-green-700',
  '리뷰완료': 'bg-purple-100 text-purple-700',
  '완료': 'bg-gray-100 text-gray-500',
}

export const STATUS_DOT: Record<CampaignStatus, string> = {
  '선정됨': 'bg-pink-400',
  '방문예약': 'bg-cyan-400',
  '방문완료': 'bg-green-500',
  '리뷰완료': 'bg-purple-400',
  '완료': 'bg-gray-300',
}

export const CATEGORIES: CampaignCategory[] = ['뷰티', '건강/헬스', '맛집/식품', '생활/리빙', '기타']
export const SITES = ['레뷰', '미블', '강남맛집', '디너의여왕', '리뷰노트', '모두의블로그', '리뷰플레이스', '기타']
export const STATUSES: CampaignStatus[] = ['선정됨', '방문예약', '방문완료', '리뷰완료', '완료']

export function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
