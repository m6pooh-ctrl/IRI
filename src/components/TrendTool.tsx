'use client'

import { useState } from 'react'
import { IconTrend, IconSearch } from './icons'
import KeyStatus from './KeyStatus'
import { loadOpenKeys } from '@/lib/apiKeys'

type Point = { period: string; ratio: number }
type Result = { keyword: string; points: Point[] }

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#dc2626']

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const rv = parseInt(h.slice(0, 2), 16)
  const gv = parseInt(h.slice(2, 4), 16)
  const bv = parseInt(h.slice(4, 6), 16)
  return `rgba(${rv},${gv},${bv},${alpha})`
}

const monthLabel = (period: string) => {
  const m = period.match(/\d{4}-(\d{2})/)
  return m ? `${Number(m[1])}월` : period
}

// ── 멀티라인 SVG 차트 ──────────────────────────────────────
function MultiLineChart({ results }: { results: Result[] }) {
  if (!results.length || !results[0]?.points.length) return null
  const nPts = results[0].points.length
  const W = 700, H = 180
  const PAD = { t: 10, r: 12, b: 28, l: 30 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b
  const cx = (i: number) => PAD.l + (nPts <= 1 ? cW / 2 : (i / (nPts - 1)) * cW)
  const cy = (v: number) => PAD.t + cH - (v / 100) * cH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {/* 그리드 */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={PAD.l} y1={cy(v)} x2={W - PAD.r} y2={cy(v)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={PAD.l - 4} y={cy(v) + 3} textAnchor="end" fontSize="9" fill="#d1d5db">{v}</text>
        </g>
      ))}

      {/* 키워드별 라인 + 피크 점 */}
      {results.map((r, ri) => {
        const color = COLORS[ri % COLORS.length]
        const pts = r.points.map((p, i) => `${cx(i).toFixed(1)},${cy(p.ratio).toFixed(1)}`).join(' ')
        const maxR = Math.max(...r.points.map(p => p.ratio), 0.1)
        const peakIdx = r.points.findIndex(p => p.ratio === maxR)
        return (
          <g key={ri}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2"
              strokeLinejoin="round" strokeLinecap="round" />
            {r.points.map((_, i) =>
              i === peakIdx
                ? <circle key={i} cx={cx(i)} cy={cy(r.points[i].ratio)} r="4.5"
                    fill={color} stroke="white" strokeWidth="2" />
                : null
            )}
          </g>
        )
      })}

      {/* X축 월 레이블 */}
      {results[0].points.map((p, i) => (
        <text key={i} x={cx(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
          {monthLabel(p.period)}
        </text>
      ))}
    </svg>
  )
}

// ── 시즌 달력 ──────────────────────────────────────────────
function SeasonCalendar({ results }: { results: Result[] }) {
  if (!results.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr>
            <th className="text-left text-[11px] font-medium text-gray-400 pb-2 pr-3 w-28">키워드</th>
            {results[0].points.map((p, i) => (
              <th key={i} className="text-center text-[11px] font-medium text-gray-400 pb-2 min-w-[36px]">
                {monthLabel(p.period)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, ri) => {
            const color = COLORS[ri % COLORS.length]
            const maxR = Math.max(...r.points.map(p => p.ratio), 0.1)
            const peakIdx = r.points.findIndex(p => p.ratio === maxR)
            return (
              <tr key={ri} className="border-t border-gray-50">
                <td className="pr-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[90px]">{r.keyword}</span>
                  </div>
                </td>
                {r.points.map((p, i) => {
                  const isPeak = i === peakIdx
                  const intensity = maxR > 0 ? p.ratio / maxR : 0
                  const bg = isPeak
                    ? color
                    : hexToRgba(color, Math.max(0.06, intensity * 0.4))
                  return (
                    <td key={i} className="py-1 text-center">
                      <div
                        className="mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: bg, color: isPeak ? 'white' : '#9ca3af' }}
                        title={`${monthLabel(p.period)}: ${p.ratio}`}
                      >
                        {isPeak ? '▲' : p.ratio >= 30 ? Math.round(p.ratio) : ''}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function TrendTool() {
  const [kwInput, setKwInput] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function run() {
    const keys = loadOpenKeys()
    if (!keys.clientId || !keys.clientSecret) {
      setErr('오픈API 키를 먼저 설정하고 저장하세요. (상단 API 키 설정 → 키 관리)')
      return
    }
    const kwList = kwInput.split(/[\n,]+/).map(k => k.trim()).filter(Boolean).slice(0, 5)
    if (!kwList.length) { setErr('키워드를 입력하세요.'); return }
    setErr(''); setBusy(true); setResults([])
    try {
      const res = await fetch('/api/keyword/trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kwList, clientId: keys.clientId, clientSecret: keys.clientSecret }),
      })
      const data = await res.json()
      if (data.error) setErr(data.error)
      else setResults(data.results ?? [])
    } catch (e) { setErr(String(e)) }
    setBusy(false)
  }

  // 피크월 & 추천 발행 시점 계산
  const peakInfo = results.map((r, ri) => {
    const maxR = Math.max(...r.points.map(p => p.ratio), 0.1)
    const peakPoint = r.points.find(p => p.ratio === maxR)
    const peakM = Number(peakPoint?.period?.match(/\d{4}-(\d{2})/)?.[1] ?? 0)
    // 피크 1~2개월 전 발행 권장
    const w1 = ((peakM - 2 - 1 + 12) % 12) + 1
    const w2 = ((peakM - 1 - 1 + 12) % 12) + 1
    return { keyword: r.keyword, peakM, w1, w2, color: COLORS[ri % COLORS.length] }
  })

  const kwCount = kwInput.split(/[\n,]+/).filter(k => k.trim()).length

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[1000px] mx-auto">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <IconTrend width={22} height={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">트렌드</h1>
          <p className="text-sm text-gray-400">
            키워드의 <b>월별 검색 추이</b>를 비교하고 시즌을 파악합니다.
            <span className="ml-1 text-blue-500 font-medium">최대 5개 동시 비교</span>
          </p>
        </div>
      </header>

      <KeyStatus />

      {/* 입력 카드 */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5">
        <label className="text-sm font-bold text-gray-900">
          키워드{' '}
          <span className="font-normal text-gray-400">— 한 줄에 하나 입력 (최대 5개)</span>
        </label>
        <textarea
          value={kwInput}
          onChange={e => setKwInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) run() }}
          rows={4}
          placeholder={'스위스 여행\n인터라켄\n융프라우\n\n(여러 개 입력하면 한 차트에 겹쳐 비교됩니다)'}
          className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <div className="mt-3 flex items-center gap-3">
          <span className={`text-xs ${kwCount > 5 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {Math.min(kwCount, 5)}/5개
            {kwCount > 5 && ' (5개 초과분 무시됨)'}
          </span>
          <button
            onClick={run}
            disabled={busy || !kwInput.trim()}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            <IconSearch width={16} height={16} />
            {busy ? '조회 중…' : '추이 비교'}
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      </div>

      {results.length > 0 && (
        <>
          {/* 멀티라인 차트 카드 */}
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5">
            {/* 범례 */}
            <div className="mb-4 flex flex-wrap gap-2">
              {results.map((r, ri) => {
                const info = peakInfo[ri]
                return (
                  <div key={ri} className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[ri % COLORS.length] }} />
                    <span className="text-xs font-semibold text-gray-700">{r.keyword}</span>
                    <span className="text-[11px] text-gray-400">피크 {info.peakM}월</span>
                  </div>
                )
              })}
            </div>
            <MultiLineChart results={results} />
            <p className="mt-2 text-[11px] text-gray-400">
              ● 채워진 점 = 피크월 &nbsp;·&nbsp; Y축은 기간 내 상대값(최고=100) &nbsp;·&nbsp; 절대 검색량이 아닙니다
            </p>
          </div>

          {/* 시즌 달력 카드 */}
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-gray-900">시즌 달력</h2>
            <SeasonCalendar results={results} />
            <p className="mt-3 text-[11px] text-gray-400">
              ▲ 피크월 &nbsp;·&nbsp; 숫자 = 해당 월 상대 검색량 &nbsp;·&nbsp; 색 진할수록 검색량 많음
            </p>
          </div>

          {/* 발행 추천 시점 카드 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-gray-900">📅 추천 발행 시점</h2>
            <div className="space-y-2">
              {peakInfo.map((info, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
                  <span className="text-sm font-semibold text-gray-800 min-w-[120px]">{info.keyword}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">피크</span>
                    <span className="font-bold text-gray-800">{info.peakM}월</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 rounded-lg px-2.5 py-0.5">
                      {info.w1 === info.w2 ? `${info.w1}월` : `${info.w1}~${info.w2}월`} 발행 권장
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              ※ 피크 <b>1~2개월 전</b> 발행 시 검색 유입에 유리합니다. 글 작성·최적화 기간을 감안하세요.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
