'use client'

import { useEffect, useState } from 'react'
import { IconActivity, IconPlus, IconTrash } from './icons'
import KeyStatus from './KeyStatus'
import { loadOpenKeys } from '@/lib/apiKeys'

type Rec = { date: string; rank: number }
type History = Record<string, Rec[]>

function loadKeywords(): string[] {
  try { return JSON.parse(localStorage.getItem('nbolg_rank_keywords') ?? '[]') } catch { return [] }
}
function loadHistory(): History {
  try { return JSON.parse(localStorage.getItem('nbolg_rank_history') ?? '{}') } catch { return {} }
}
const today = () => new Date().toISOString().slice(0, 10)

function Spark({ recs }: { recs: Rec[] }) {
  if (recs.length < 2) return <span className="text-[11px] text-gray-300">기록 누적 중</span>
  const ranks = recs.map(r => (r.rank > 0 ? r.rank : 35))
  const min = Math.min(...ranks), max = Math.max(...ranks)
  const W = 110, H = 28
  const x = (i: number) => (recs.length === 1 ? W / 2 : (i / (recs.length - 1)) * W)
  const y = (r: number) => max === min ? H / 2 : H - ((max - r) / (max - min)) * (H - 4) - 2
  const pts = ranks.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(' ')
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {ranks.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r)} r="2"
          fill={i === ranks.length - 1 ? '#2563eb' : '#93c5fd'} />
      ))}
    </svg>
  )
}

export default function RankTool() {
  const [keywords, setKeywords] = useState<string[]>([])
  const [history, setHistory] = useState<History>({})
  const [newKw, setNewKw] = useState('')
  const [busy, setBusy] = useState(false)
  const [progressKw, setProgressKw] = useState('')
  const [progressIdx, setProgressIdx] = useState(0)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    setKeywords(loadKeywords())
    setHistory(loadHistory())
  }, [])

  function addKeyword() {
    const k = newKw.trim()
    if (!k || keywords.includes(k)) { setNewKw(''); return }
    const next = [...keywords, k]
    setKeywords(next)
    localStorage.setItem('nbolg_rank_keywords', JSON.stringify(next))
    setNewKw('')
  }

  function removeKeyword(k: string) {
    const next = keywords.filter(x => x !== k)
    setKeywords(next)
    localStorage.setItem('nbolg_rank_keywords', JSON.stringify(next))
  }

  async function recordToday() {
    const keys = loadOpenKeys()
    if (!keys.blog) {
      setErr('내 블로그 주소(아이디)를 API 키 설정에서 먼저 저장하세요.')
      return
    }
    if (!keywords.length) { setErr('추적할 키워드를 추가하세요.'); return }

    setErr(''); setMsg(''); setBusy(true)
    const d = today()
    const next: History = { ...history }
    let found = 0, missing = 0, failed = 0

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i]
      setProgressKw(kw)
      setProgressIdx(i + 1)
      try {
        const r = await fetch('/api/search/realrank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: kw, blog: keys.blog }),
        })
        const data = await r.json()
        if (data.error) {
          failed++
        } else {
          const rank = typeof data.rank === 'number' ? data.rank : -1
          if (rank > 0) found++; else missing++
          const arr = (next[kw] ?? []).filter(x => x.date !== d)
          arr.push({ date: d, rank })
          next[kw] = arr.sort((a, b) => a.date.localeCompare(b.date))
        }
      } catch {
        failed++
      }
      if (i < keywords.length - 1) await new Promise(r => setTimeout(r, 600))
    }

    setHistory(next)
    localStorage.setItem('nbolg_rank_history', JSON.stringify(next))
    setProgressKw('')
    setBusy(false)

    const parts = [`노출 ${found}`, `30위 밖 ${missing}`]
    if (failed) parts.push(`실패 ${failed}`)
    setMsg(`${d} 기록 완료 — ${parts.join(' · ')}`)
  }

  const progressPct = keywords.length > 0 ? (progressIdx / keywords.length) * 100 : 0

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[1000px] mx-auto">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <IconActivity width={22} height={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">순위 추적</h1>
          <p className="text-sm text-gray-400">
            키워드별 <b>실제 네이버 블로그탭</b> 순위를 날짜별로 기록하고 추이를 추적합니다.
          </p>
        </div>
      </header>

      <KeyStatus needBlog />

      {/* 주의사항 */}
      <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-[11px] leading-relaxed text-amber-700">
        ⚠ 네이버 블로그탭 실제 화면 기준 · 로그아웃 상태(로그인 부스트 없음) · 첫 페이지 약 30위까지 확인 · 가끔 네이버 응답 지연으로 실패할 수 있습니다.
      </div>

      {/* 키워드 추가 + 기록 버튼 */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={newKw}
            onChange={e => setNewKw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="추적할 키워드 추가"
            disabled={busy}
            className="flex-1 min-w-[180px] rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
          />
          <button
            onClick={addKeyword}
            disabled={busy}
            className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <IconPlus width={15} height={15} /> 추가
          </button>
          <button
            onClick={recordToday}
            disabled={busy || !keywords.length}
            className="ml-auto rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300 transition"
          >
            {busy ? '확인 중…' : '오늘 순위 기록'}
          </button>
        </div>

        {/* 진행 프로그레스바 */}
        {busy && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-600 font-medium">
                "{progressKw}" 확인 중… ({progressIdx}/{keywords.length})
              </span>
              <span className="text-xs text-gray-400">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {err && <p className="mt-3 text-xs text-red-500">{err}</p>}
        {msg && !err && !busy && <p className="mt-3 text-xs text-green-600">✓ {msg}</p>}
      </div>

      {/* 추적 테이블 */}
      {keywords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-400 mb-1">추적할 키워드를 위에서 추가하세요.</p>
          <p className="text-xs text-gray-300">매일 [오늘 순위 기록]을 누르면 날짜별 추이가 쌓입니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-gray-900">추적 키워드 {keywords.length}개</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="py-2 pr-3 font-medium">키워드</th>
                  <th className="py-2 pr-3 font-medium">현재 순위</th>
                  <th className="py-2 pr-3 font-medium">변화</th>
                  <th className="py-2 pr-3 font-medium">추이</th>
                  <th className="py-2 pr-3 font-medium text-right">기록</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {keywords.map(kw => {
                  const recs = history[kw] ?? []
                  const last = recs[recs.length - 1]
                  const prev = recs[recs.length - 2]
                  const isChecking = busy && progressKw === kw

                  let delta: React.ReactNode = <span className="text-gray-300">—</span>
                  if (last && prev && last.rank > 0 && prev.rank > 0) {
                    const diff = prev.rank - last.rank
                    delta = diff === 0
                      ? <span className="text-gray-400">—</span>
                      : diff > 0
                      ? <span className="font-semibold text-emerald-600">▲ {diff}</span>
                      : <span className="font-semibold text-rose-500">▼ {Math.abs(diff)}</span>
                  }

                  return (
                    <tr
                      key={kw}
                      className={`border-b border-gray-50 last:border-0 transition-colors ${isChecking ? 'bg-blue-50' : ''}`}
                    >
                      <td className="py-3 pr-3 font-medium text-gray-800">{kw}</td>
                      <td className="py-3 pr-3">
                        {isChecking ? (
                          <span className="text-xs font-medium text-blue-500 animate-pulse">확인 중…</span>
                        ) : !last ? (
                          <span className="text-gray-300 text-xs">미기록</span>
                        ) : last.rank > 0 ? (
                          <span className="text-lg font-bold text-gray-900">{last.rank}위</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">30위 밖</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">{delta}</td>
                      <td className="py-3 pr-3"><Spark recs={recs} /></td>
                      <td className="py-3 pr-3 text-right text-xs text-gray-400">{recs.length}회</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => removeKeyword(kw)}
                          disabled={busy}
                          className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition"
                        >
                          <IconTrash width={15} height={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            ▲ 상승(숫자↓) / ▼ 하락 &nbsp;·&nbsp; 같은 날 재기록 시 덮어씁니다 &nbsp;·&nbsp; 30위 밖은 화면 첫 페이지에 없다는 의미
          </p>
        </div>
      )}
    </div>
  )
}
