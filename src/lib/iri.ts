import crypto from 'crypto'

// ── 검색광고 API 인증 ─────────────────────────────────────

export function searchadHeaders(
  accessLicense: string,
  secretKey: string,
  customerId: string,
  method: string,
  path: string,
) {
  const ts = Date.now()
  const message = `${ts}.${method}.${path}`
  const sig = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64')
  return {
    'X-Timestamp': String(ts),
    'X-API-KEY': accessLicense,
    'X-Customer': String(customerId),
    'X-Signature': sig,
    'Content-Type': 'application/json; charset=UTF-8',
  }
}

// ── 수치 파싱 ─────────────────────────────────────────────

function parseNum(val: unknown): number {
  if (val == null) return 0
  if (typeof val === 'number') return Math.round(val)
  const s = String(val).trim()
  if (s.startsWith('<')) return 5
  return parseInt(s) || 0
}

// ── IRI 점수 계산 ─────────────────────────────────────────

function demandScore(total: number): number {
  if (total <= 0) return 0
  return Math.min(100, (Math.log10(Math.max(total, 1)) / 5) * 100)
}

function contentScore(blogDocs: number): number {
  if (blogDocs < 0) return 50
  if (blogDocs === 0) return 100
  return Math.min(100, Math.max(0, 100 - (Math.log10(Math.max(blogDocs, 1)) / 6) * 100))
}

function opportunityScore(ratio: number | null): number {
  if (ratio == null) return 50
  const r = Math.max(ratio, 0.1)
  return Math.max(0, Math.min(100, 100 - 50 * Math.log10(r)))
}

function iriScore(demand: number, opportunity: number, content: number): number {
  return demand * 0.35 + opportunity * 0.45 + content * 0.20
}

function gradeFromScore(score: number): string {
  if (score >= 65) return 'A'
  if (score >= 45) return 'B'
  if (score >= 25) return 'C'
  return 'D'
}

export type KeywordRecord = {
  keyword: string
  total: number
  pc: number
  mobile: number
  compIdx: string
  blogDocs: number
  ratio: number | null
  iriScore: number
  grade: string
  iriStar: boolean
  oppGrade: string
  warnings: string[]
}

export function buildRecord(raw: Record<string, unknown>, blogDocs = -1): KeywordRecord {
  const keyword = String(raw.relKeyword ?? '')
  const pc = parseNum(raw.monthlyPcQcCnt)
  const mobile = parseNum(raw.monthlyMobileQcCnt)
  const total = pc + mobile
  const compIdx = String(raw.compIdx ?? '보통')

  const ratio = blogDocs > 0 && total > 0 ? blogDocs / total : null

  const d = demandScore(total)
  const op = opportunityScore(ratio)
  const ct = contentScore(blogDocs)
  const score = iriScore(d, op, ct)
  const grade = gradeFromScore(score)
  const iriStar = score >= 60 && compIdx !== '높음' && total >= 1000

  // 기회등급 (비율 기준)
  let oppGrade = '-'
  if (ratio != null) {
    if (ratio < 2) oppGrade = 'S'
    else if (ratio < 5) oppGrade = 'A'
    else if (ratio < 10) oppGrade = 'B'
    else if (ratio < 30) oppGrade = 'C'
    else oppGrade = 'D'
  }

  const warnings: string[] = []
  if (total < 100) warnings.push('검색량부족')
  if (compIdx === '높음') warnings.push('고경쟁')
  if (blogDocs > 500000) warnings.push('블로그포화')
  if (ratio != null && ratio >= 50) warnings.push('문서과포화')

  return {
    keyword, total, pc, mobile, compIdx, blogDocs, ratio,
    iriScore: Math.round(score), grade, iriStar, oppGrade, warnings,
  }
}
