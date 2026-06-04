'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import KeyStatus from '@/components/KeyStatus'
import { loadSearchadKeys, loadOpenKeys } from '@/lib/apiKeys'
import { isInSuperList } from '@/lib/superList'

type KeywordRow = {
  keyword: string
  total: number
  compIdx: string
  blogDocs: number
  ratio: number | null
  iriScore: number
  oppGrade: string
  iriStar: boolean
  warnings: string[]
  enriched: boolean
}

const OPP_COLOR: Record<string, string> = {
  S: 'text-green-600 font-bold',
  A: 'text-blue-600 font-semibold',
  B: 'text-gray-700',
  C: 'text-orange-500',
  D: 'text-red-500',
}

export default function KeywordPage() {
  const [seed, setSeed] = useState('')
  const [rows, setRows] = useState<KeywordRow[]>([])
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [sortCol, setSortCol] = useState<string>('iriScore')
  const [sortAsc, setSortAsc] = useState(false)
  const [goldenOnly, setGoldenOnly] = useState(false)
  const [superOnly, setSuperOnly] = useState(false)
  const [superList, setSuperList] = useState<string[]>([])
  const [enrichError, setEnrichError] = useState('')
  const abortRef = useRef(false)

  useEffect(() => {
    fetch('/api/super-list').then(r => r.json()).then(d => setSuperList(d.keywords ?? [])).catch(() => {})
  }, [])

  function addLog(msg: string) {
    setLog(prev => [...prev.slice(-200), msg])
  }

  // BFS 자동완성
  async function runBFS(seedKw: string, maxCount = 50): Promise<string[]> {
    const visited = new Set<string>()
    const queue = [seedKw]
    const result: string[] = []
    abortRef.current = false

    while (queue.length > 0 && result.length < maxCount && !abortRef.current) {
      const kw = queue.shift()!
      if (visited.has(kw)) continue
      visited.add(kw)

      addLog(`[A] 자동완성: ${kw}`)
      try {
        const res = await fetch(`/api/keyword/autocomplete?q=${encodeURIComponent(kw)}`)
        const data = await res.json()
        const items: string[] = data.items ?? []
        for (const item of items) {
          if (!visited.has(item) && !queue.includes(item)) {
            queue.push(item)
            if (!result.includes(item)) {
              result.push(item)
              addLog(`  + ${item}`)
            }
          }
        }
      } catch {
        addLog(`  오류: ${kw} 자동완성 실패`)
      }
      await new Promise(r => setTimeout(r, 150))
    }
    return result
  }

  async function handleSearch() {
    if (!seed.trim()) return
    setRunning(true)
    setRows([])
    setLog([])
    addLog(`시드 키워드: ${seed}`)

    const keywords = await runBFS(seed.trim())
    addLog(`\n총 ${keywords.length}개 수집 완료`)

    const initial: KeywordRow[] = keywords.map(kw => ({
      keyword: kw, total: 0, compIdx: '-', blogDocs: -1,
      ratio: null, iriScore: 0, oppGrade: '-', iriStar: false,
      warnings: [], enriched: false,
    }))
    setRows(initial)
    setRunning(false)
  }

  async function handleEnrich() {
    if (!rows.length) return
    const apiKeys = loadSearchadKeys()
    const openKeys = loadOpenKeys()
    if (!apiKeys.accessLicense || !apiKeys.secretKey || !apiKeys.customerId) {
      setEnrichError('검색광고 API 키를 먼저 설정하고 저장하세요. (상단 API 키 설정 → 키 입력)')
      return
    }
    setEnriching(true)
    setEnrichError('')
    addLog('\n[검색광고 분석 시작]')

    const keywords = rows.map(r => r.keyword)
    const BATCH = 5
    let enrichedCount = 0
    let firstError = ''

    for (let i = 0; i < keywords.length; i += BATCH) {
      const batch = keywords.slice(i, i + BATCH)
      addLog(`보강 중... ${i + 1}~${Math.min(i + BATCH, keywords.length)}/${keywords.length}`)

      try {
        const res = await fetch('/api/keyword/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: batch, ...apiKeys,
            openClientId: openKeys.clientId,
            openClientSecret: openKeys.clientSecret,
          }),
        })
        const data = await res.json()
        if (data.error) {
          firstError = data.error
          addLog(`오류: ${data.error}`)
          if (/401|403|apikey|api-key|signature|invalid-apikey|customer|unauthorized/i.test(data.error)) break
          continue
        }

        const results: KeywordRow[] = data.results ?? []
        enrichedCount += results.length
        const enriched = Object.fromEntries(results.map(r => [r.keyword, r]))

        setRows(prev => prev.map(row => {
          const e = enriched[row.keyword]
          return e ? { ...row, ...e, enriched: true } : row
        }))
      } catch (e) {
        firstError = String(e)
        addLog(`배치 오류: ${e}`)
      }
      await new Promise(r => setTimeout(r, 300))
    }

    addLog(`분석 완료! (보강 ${enrichedCount}개)`)
    setEnriching(false)

    if (enrichedCount === 0 && firstError) {
      const invalid = /invalid|401|403|apikey|api-key|signature|customer/i.test(firstError)
      setEnrichError(invalid
        ? '검색광고 API 키가 올바르지 않습니다. Access License · Secret Key · Customer ID를 다시 확인해주세요. (searchad.naver.com ▸ 도구 ▸ API 사용 관리)'
        : `분석 오류: ${firstError}`)
    } else if (enrichedCount === 0) {
      setEnrichError('보강된 키워드가 없습니다. 키는 유효하지만 이 키워드들에 검색광고 데이터가 없을 수 있어요. (짧은 단일 키워드로 시도해보세요)')
    }
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortAsc(a => !a)
    } else {
      setSortCol(col)
      setSortAsc(false)
    }
  }

  const sortedRows = [...rows].sort((a, b) => {
    const enrichedFirst = (x: KeywordRow) => x.enriched ? 0 : 1
    if (enrichedFirst(a) !== enrichedFirst(b)) return enrichedFirst(a) - enrichedFirst(b)
    const vals: Record<string, number> = {
      iriScore: a.iriScore - b.iriScore,
      total: a.total - b.total,
      compIdx: ['낮음', '보통', '높음'].indexOf(a.compIdx) - ['낮음', '보통', '높음'].indexOf(b.compIdx),
      oppGrade: ['S', 'A', 'B', 'C', 'D', '-'].indexOf(a.oppGrade) - ['S', 'A', 'B', 'C', 'D', '-'].indexOf(b.oppGrade),
      ratio: (a.ratio ?? 9999) - (b.ratio ?? 9999),
      blogDocs: a.blogDocs - b.blogDocs,
    }
    const diff = vals[sortCol] ?? 0
    return sortAsc ? diff : -diff
  })

  const goldenCount = rows.filter(r => r.iriStar).length
  const superCount = rows.filter(r => isInSuperList(r.keyword, superList)).length
  const displayRows = sortedRows
    .filter(r => !goldenOnly || r.iriStar)
    .filter(r => !superOnly || isInSuperList(r.keyword, superList))

  function downloadCsv() {
    const header = ['키워드', '총검색량', '경쟁강도', '블로그문서', '비율', '기회등급', 'IRI점수', 'IRI추천', '위험신호']
    const rows2 = sortedRows.map(r => [
      r.keyword, r.total, r.compIdx, r.blogDocs >= 0 ? r.blogDocs : '',
      r.ratio != null ? r.ratio.toFixed(2) : '', r.oppGrade, r.iriScore,
      r.iriStar ? '★' : '', r.warnings.join('|'),
    ])
    const csv = [header, ...rows2].map(r => r.join('\t')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/tab-separated-values;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `키워드_${seed}_${new Date().toISOString().slice(0, 10)}.tsv`
    a.click()
  }

  const colBtn = (col: string, label: string) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  )

  return (
    <AppShell>
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 홈</Link>
          <h1 className="text-lg font-bold text-gray-800">키워드 확장 도구</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <KeyStatus needSearchad />

        <div className="flex gap-4">
          {/* 왼쪽: 검색 + 로그 */}
          <div className="w-64 shrink-0 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
              <label className="text-xs text-gray-500 font-medium">🌱 시드 키워드</label>
              <input
                type="text"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !running && handleSearch()}
                placeholder="예: 스위스 여행"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
              <button
                onClick={handleSearch}
                disabled={running || !seed.trim()}
                className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-200 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {running ? '수집 중...' : '키워드 수집'}
              </button>
              {rows.length > 0 && (
                <button
                  onClick={handleEnrich}
                  disabled={enriching}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 text-white py-2 rounded-lg text-sm font-medium transition"
                >
                  {enriching ? '분석 중...' : `검색량·경쟁도 분석 (${rows.length}개)`}
                </button>
              )}
              {rows.length > 0 && (
                <button
                  onClick={downloadCsv}
                  className="w-full border hover:bg-gray-50 text-gray-600 py-2 rounded-lg text-sm transition"
                >
                  TSV 저장
                </button>
              )}
            </div>

            {/* 진행 로그 */}
            <div className="bg-white rounded-xl shadow-sm p-3 flex flex-col gap-1 h-96 overflow-y-auto">
              <p className="text-xs font-medium text-gray-400 mb-1">진행 로그</p>
              {log.map((l, i) => (
                <p key={i} className="text-xs text-gray-500 font-mono">{l}</p>
              ))}
            </div>
          </div>

          {/* 오른쪽: 결과 테이블 */}
          <div className="flex-1 overflow-hidden">
            {/* 슈멤 키워드 발견 강조 박스 */}
            {superCount > 0 && rows.length > 0 && (
              <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold text-blue-800">
                    슈멤 키워드 {superCount}개 발견
                  </span>
                  <button
                    onClick={() => { setSuperOnly(v => !v); setGoldenOnly(false) }}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${superOnly ? 'bg-blue-600 text-white' : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'}`}
                  >
                    {superOnly ? '전체 보기' : '슈멤만 보기'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sortedRows.filter(r => isInSuperList(r.keyword, superList)).slice(0, 12).map(r => (
                    <span key={r.keyword} className="rounded-full bg-white border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {r.iriStar && '★ '}{r.keyword}
                    </span>
                  ))}
                  {superCount > 12 && <span className="text-xs text-blue-500 self-center">+{superCount - 12}개 더</span>}
                </div>
              </div>
            )}

            {enrichError && (
              <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{enrichError}</span>
              </div>
            )}
            {rows.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">
                시드 키워드를 입력하고 수집을 시작하세요.
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-auto">
                <div className="border-b">
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-xs text-gray-500">
                      총 {rows.length}개 · <span className="font-medium text-yellow-600">★ 황금 {goldenCount}개</span>
                      {superCount > 0 && <> · <span className="font-medium text-blue-600">슈멤 {superCount}개</span></>}
                    </span>
                    <button
                      onClick={() => { setGoldenOnly(v => !v); setSuperOnly(false) }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${goldenOnly ? 'bg-yellow-400 text-gray-900' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {goldenOnly ? '★ 황금만 보는 중' : '★ 황금만 보기'}
                    </button>
                  </div>
                  <p className="px-4 pb-2 text-[11px] text-gray-400">
                    ★ 황금키워드 = <b className="text-gray-500">IRI점수 60↑</b> · <b className="text-gray-500">경쟁강도 &apos;높음&apos; 제외</b> · <b className="text-gray-500">총검색량 1,000↑</b> 를 모두 만족 — 검색량은 많고 경쟁은 낮아 노리기 좋은 키워드
                  </p>
                </div>
                <table className="w-full text-sm font-mono">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">키워드</th>
                      {colBtn('compIdx', '경쟁강도')}
                      {colBtn('total', '총검색량')}
                      {colBtn('blogDocs', '블로그문서')}
                      {colBtn('ratio', '비율')}
                      {colBtn('oppGrade', '기회등급')}
                      {colBtn('iriScore', 'IRI점수')}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">위험신호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr
                        key={row.keyword}
                        className={`border-b hover:bg-gray-50 ${row.iriStar ? 'bg-yellow-50' : isInSuperList(row.keyword, superList) ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                          {row.iriStar && <span className="text-yellow-500 mr-1">★</span>}
                          {row.keyword}
                          {isInSuperList(row.keyword, superList) && (
                            <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">슈멤</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.enriched ? (
                            <span className={
                              row.compIdx === '낮음' ? 'text-green-600' :
                              row.compIdx === '높음' ? 'text-red-500' : 'text-gray-600'
                            }>
                              {row.compIdx}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {row.enriched ? row.total.toLocaleString() : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {row.enriched && row.blogDocs >= 0 ? row.blogDocs.toLocaleString() : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {row.ratio != null ? row.ratio.toFixed(2) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className={`px-3 py-2 text-xs font-medium ${OPP_COLOR[row.oppGrade] ?? 'text-gray-400'}`}>
                          {row.oppGrade}
                        </td>
                        <td className="px-3 py-2">
                          {row.enriched ? (
                            <div className="flex items-center gap-1">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-purple-500 h-1.5 rounded-full"
                                  style={{ width: `${row.iriScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-700">{row.iriScore}</span>
                            </div>
                          ) : <span className="text-gray-300 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-red-400">
                          {row.warnings.join(' ')}
                        </td>
                      </tr>
                    ))}
                    {displayRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-xs text-gray-400">
                          ★ 황금키워드가 없습니다. 먼저 [검색량·경쟁도 분석]을 실행하세요.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    </AppShell>
  )
}
