'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FEATURE_LIST, FeatureKey, loadFeatures, saveFeatures, defaultFeatures } from '@/lib/features'

function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

type KeyRecord = {
  key: string
  expiry: string
  issuedAt: string
  memo: string
}

const STORAGE_KEY = 'nk_key_history'

function loadHistory(): KeyRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(records: KeyRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [expiry, setExpiry] = useState(() => addDays(30))
  const [memo, setMemo] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string>('')
  const [history, setHistory] = useState<KeyRecord[]>([])
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(defaultFeatures)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory()); setFeatures(loadFeatures())
  }, [])

  function toggleFeature(k: FeatureKey) {
    setFeatures(prev => {
      const next = { ...prev, [k]: !prev[k] }
      saveFeatures(next)
      return next
    })
  }

  async function handleUnlock(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) setUnlocked(true)
      else setError('비밀번호가 올바르지 않습니다.')
    } catch {
      setError('인증 중 오류가 발생했습니다.')
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setGeneratedKey('')

    const res = await fetch('/api/admin/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, expiry }),
    })
    const data = await res.json()

    if (data.key) {
      setGeneratedKey(data.key)
      const record: KeyRecord = {
        key: data.key,
        expiry,
        issuedAt: new Date().toISOString().slice(0, 10),
        memo,
      }
      const updated = [record, ...loadHistory()]
      saveHistory(updated)
      setHistory(updated)
      setMemo('')
    } else {
      setError(data.error ?? '오류 발생')
    }
    setLoading(false)
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(''), 2000)
  }

  function handleDelete(key: string) {
    const updated = history.filter(r => r.key !== key)
    saveHistory(updated)
    setHistory(updated)
  }

  function isExpired(expiry: string) {
    return new Date(expiry) < new Date()
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <form onSubmit={handleUnlock} className="max-w-sm mx-auto mt-16 bg-white rounded-2xl shadow-md p-8 flex flex-col gap-4">
          <h1 className="text-lg font-bold text-gray-800 text-center">관리자 인증</h1>
          <p className="text-xs text-gray-400 text-center -mt-2">관리자 비밀번호를 입력하세요.</p>
          <input
            type="password" value={password} autoFocus autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">{error}</p>}
          <button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition">확인</button>
          <Link href="/" className="text-xs text-gray-400 text-center hover:text-gray-600">← 홈으로</Link>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* 발급 폼 */}
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col gap-5">
          <h1 className="text-xl font-bold text-gray-800 text-center">관리자 — NK 키 발급</h1>

          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">만료일</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  min={addDays(0)}
                  className="border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">메모 (선택)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  className="border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="예: 홍길동"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition"
            >
              {loading ? '생성 중...' : 'NK 키 생성'}
            </button>
          </form>

          {generatedKey && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500 text-center">생성된 키</p>
              <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-200">
                <code className="flex-1 text-sm font-mono tracking-wider text-gray-800 select-all">
                  {generatedKey}
                </code>
                <button
                  onClick={() => handleCopy(generatedKey)}
                  className="text-xs bg-yellow-300 hover:bg-yellow-400 px-3 py-1 rounded-lg transition"
                >
                  {copied === generatedKey ? '복사됨!' : '복사'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 발급 내역 */}
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">발급 내역 ({history.length}건)</h2>
            <span className="text-xs text-gray-400">이 브라우저에 저장됨</span>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">발급 내역이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((r) => (
                <div
                  key={r.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                    isExpired(r.expiry) ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-gray-700 truncate">{r.key}</code>
                      {isExpired(r.expiry) && (
                        <span className="text-xs text-red-400 shrink-0">만료</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      만료: {r.expiry} · 발급: {r.issuedAt}
                      {r.memo && ` · ${r.memo}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(r.key)}
                    className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
                  >
                    {copied === r.key ? '복사됨!' : '복사'}
                  </button>
                  <button
                    onClick={() => handleDelete(r.key)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 기능 켜기 / 끄기 */}
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">기능 켜기 / 끄기</h2>
            <span className="text-xs text-gray-400">이 브라우저에 적용</span>
          </div>
          <p className="text-xs text-gray-400 -mt-2">끄면 사이드바 메뉴에서 숨겨집니다. (기기별 설정 · 전체 사용자 동기화는 추후 백엔드 연동 필요)</p>
          <div className="flex flex-col gap-2">
            {FEATURE_LIST.map(f => (
              <div key={f.key} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{f.label}</p>
                  <p className="text-xs text-gray-400">{f.desc}</p>
                </div>
                <button
                  onClick={() => toggleFeature(f.key)}
                  aria-pressed={features[f.key]}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${features[f.key] ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${features[f.key] ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
