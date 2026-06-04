'use client'

import { useEffect, useState } from 'react'
import { IconLayers, IconSearch } from './icons'

export default function SuperKeyword() {
  const [list, setList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/super-list')
      .then(r => r.json())
      .then(d => setList(d.keywords ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const query = search.trim().toLowerCase()
  const matches = query ? list.filter(k => k.toLowerCase().includes(query)) : []
  const exactMatch = list.some(k => k.toLowerCase().trim() === query)

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[900px] mx-auto">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <IconLayers width={22} height={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">슈멤 키워드</h1>
          <p className="text-sm text-gray-400">
            관리자가 등록한 키워드 목록 — 키워드 도구에서 일치하면 <span className="font-semibold text-blue-600">슈멤</span> 뱃지로 표시됩니다.
          </p>
        </div>
        {!loading && (
          <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
            {list.length}개
          </span>
        )}
      </header>

      {/* 검색 */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5">
        <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
          <IconSearch width={15} height={15} className="text-gray-400" />
          이 키워드가 슈멤 목록에 있나요?
        </label>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="키워드 입력 → 즉시 확인"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />

        {query && (
          <div className="mt-3">
            {matches.length === 0 ? (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                ✗ 목록에 없음
              </span>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  {exactMatch
                    ? <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">✓ 정확히 일치</span>
                    : <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">유사 {matches.length}개</span>
                  }
                </div>
                {matches.map(k => {
                  const idx = k.toLowerCase().indexOf(query)
                  return (
                    <div key={k} className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-gray-800">
                      {k.slice(0, idx)}
                      <mark className="bg-yellow-200 text-gray-900 rounded px-0.5">{k.slice(idx, idx + query.length)}</mark>
                      {k.slice(idx + query.length)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 전체 목록 */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-gray-900">
          {query ? `"${search}" 포함 ${matches.length}개` : `전체 목록 ${list.length}개`}
        </h2>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">불러오는 중…</p>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            아직 등록된 키워드가 없습니다. 관리자에게 문의하세요.
          </p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
            {(query ? matches : list).map((kw, i) => {
              const queryIdx = query ? kw.toLowerCase().indexOf(query) : -1
              return (
                <div key={kw} className="flex items-center gap-2 py-2">
                  <span className="w-6 text-right text-xs text-gray-300">{i + 1}</span>
                  <span className="text-sm text-gray-800">
                    {queryIdx >= 0 ? (
                      <>
                        {kw.slice(0, queryIdx)}
                        <mark className="bg-yellow-200 text-gray-900 rounded px-0.5">{kw.slice(queryIdx, queryIdx + query.length)}</mark>
                        {kw.slice(queryIdx + query.length)}
                      </>
                    ) : kw}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {list.length > 0 && !query && (
          <p className="mt-3 text-[11px] text-gray-400">
            💡 키워드 도구에서 BFS 결과 중 이 목록에 있는 키워드에 <span className="font-semibold text-blue-600">슈멤</span> 뱃지가 표시됩니다.
          </p>
        )}
      </div>
    </div>
  )
}
