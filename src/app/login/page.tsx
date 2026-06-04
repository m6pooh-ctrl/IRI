'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [key, setKey] = useState('')
  const [step, setStep] = useState<'key' | 'kakao'>('key')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleKeySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/pre-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.trim() }),
    })
    const data = await res.json()

    if (data.ok) {
      setStep('kakao')
    } else {
      setError(data.error ?? '유효하지 않은 키입니다.')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-6 w-96">
        {/* 로고 */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-xl">N</div>
          <h1 className="text-xl font-bold text-gray-800 mt-2">IRI n blog</h1>
        </div>

        {step === 'key' ? (
          <>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">입장키 확인</p>
              <p className="text-xs text-gray-400 mt-1">관리자로부터 발급받은 NK 키를 입력하세요.</p>
            </div>

            <form onSubmit={handleKeySubmit} className="w-full flex flex-col gap-3">
              <input
                type="text"
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase())}
                placeholder="NK-YYYYMMDD-XXXXXXXXXXXX"
                className="w-full border rounded-xl px-4 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-300 text-center"
                autoFocus
              />
              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !key.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition"
              >
                {loading ? '확인 중…' : '확인'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5">
                <span className="text-green-600 text-sm font-semibold">✓ 입장키 확인 완료</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">카카오로 로그인</p>
              <p className="text-xs text-gray-400 mt-1">카카오 계정으로 본인 인증을 완료하세요.</p>
            </div>

            <a
              href="/api/auth/kakao"
              className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#f0d800] text-gray-900 font-semibold py-3 rounded-xl transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.632 1.557 4.953 3.938 6.336L4.5 21l4.688-2.531A11.3 11.3 0 0 0 12 18.999c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
              </svg>
              카카오로 로그인
            </a>

            <button
              onClick={() => { setStep('key'); setKey(''); setError('') }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← 입장키 다시 입력
            </button>
          </>
        )}
      </div>
    </main>
  )
}
