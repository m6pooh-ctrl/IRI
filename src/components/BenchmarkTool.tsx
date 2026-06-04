'use client'

import { useState } from 'react'
import { IconTrophy, IconSearch } from './icons'
import KeyStatus from './KeyStatus'
import { loadOpenKeys } from '@/lib/apiKeys'

type Post = { rank: number; title: string; blogger: string; bloggerlink: string; link: string; postdate: string }

function fmtDate(yyyymmdd: string) {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd || '-'
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`
}
function daysAgo(yyyymmdd: string): number {
  if (!/^\d{8}$/.test(yyyymmdd)) return 99999
  const d = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`)
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

export default function BenchmarkTool() {
  const [keyword, setKeyword] = useState('')
  const [count, setCount] = useState(10)
  const [posts, setPosts] = useState<Post[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function run() {
    const keys = loadOpenKeys()
    if (!keys.clientId || !keys.clientSecret) { setErr('오픈API 키를 먼저 설정하고 저장하세요. (위 API 키 설정 → 키 입력)'); return }
    if (!keyword.trim()) { setErr('키워드를 입력하세요.'); return }
    setErr(''); setBusy(true); setPosts([])
    try {
      const res = await fetch('/api/search/blogtop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, count, clientId: keys.clientId, clientSecret: keys.clientSecret }),
      })
      const data = await res.json()
      if (data.error) setErr(data.error); else setPosts(data.items ?? [])
    } catch (e) { setErr(String(e)) }
    setBusy(false)
  }

  // 인사이트
  const recent30 = posts.filter(p => daysAgo(p.postdate) <= 30).length
  const recentPct = posts.length ? Math.round((recent30 / posts.length) * 100) : 0
  const avgTitleLen = posts.length ? Math.round(posts.reduce((a, p) => a + p.title.length, 0) / posts.length) : 0
  const uniqueBloggers = new Set(posts.map(p => p.bloggerlink)).size

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[1000px] mx-auto">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white"><IconTrophy width={22} height={22} /></span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">경쟁글 벤치마크</h1>
          <p className="text-sm text-gray-400">키워드로 검색되는 <b>상위 노출 글</b>을 분석해, 내 글이 넘어야 할 기준을 잡습니다.</p>
        </div>
      </header>

      <KeyStatus />

      {/* 입력 */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5">
        <label className="text-sm font-bold text-gray-900">키워드</label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && run()}
            placeholder="예: 인터라켄 가볼만한곳" className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2.5 text-sm" />
          <select value={count} onChange={e => setCount(Number(e.target.value))} className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
            <option value={10}>상위 10개</option><option value={20}>상위 20개</option><option value={30}>상위 30개</option>
          </select>
          <button onClick={run} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
            <IconSearch width={16} height={16} /> {busy ? '분석 중…' : '상위글 분석'}
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      </div>

      {posts.length > 0 && (
        <>
          {/* 인사이트 카드 */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-400">최근 30일 발행</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{recentPct}%</p>
              <p className="text-[11px] text-gray-400">{recentPct >= 50 ? '최신성 중요 키워드' : '오래된 글도 상위'}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-400">평균 제목 길이</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{avgTitleLen}자</p>
              <p className="text-[11px] text-gray-400">비슷한 길이로 작성</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-400">서로 다른 블로거</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{uniqueBloggers}/{posts.length}</p>
              <p className="text-[11px] text-gray-400">{uniqueBloggers < posts.length ? '독식 블로거 존재' : '경쟁 분산'}</p>
            </div>
          </div>

          {/* 상위글 목록 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-gray-900">상위 노출 글 {posts.length}개</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                    <th className="py-2 pr-2 font-medium w-8">#</th>
                    <th className="py-2 pr-2 font-medium">제목</th>
                    <th className="py-2 pr-2 font-medium">블로거</th>
                    <th className="py-2 pr-2 font-medium">발행일</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(p => {
                    const d = daysAgo(p.postdate)
                    return (
                      <tr key={p.rank} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-2 text-gray-400">{p.rank}</td>
                        <td className="py-2.5 pr-2">
                          <a href={p.link} target="_blank" rel="noreferrer" className="text-gray-800 hover:text-blue-600 hover:underline">{p.title || '(제목 없음)'}</a>
                          <span className="ml-2 text-[11px] text-gray-300">{p.title.length}자</span>
                        </td>
                        <td className="py-2.5 pr-2 text-gray-500 truncate max-w-[120px]">{p.blogger || '-'}</td>
                        <td className="py-2.5 pr-2">
                          <span className={d <= 30 ? 'text-green-600' : 'text-gray-500'}>{fmtDate(p.postdate)}</span>
                        </td>
                        <td className="py-2.5 text-right">
                          <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">열기</a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              ※ 네이버 블로그 검색(정확도순) 기준. 상위 글들의 <b>제목 스타일·길이·최신성</b>을 참고해 내 글을 더 낫게 쓰세요.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
