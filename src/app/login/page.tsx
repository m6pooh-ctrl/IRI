'use client'

import { useState } from 'react'

type Tab = 'user' | 'admin'
type Step = 'input' | 'kakao'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('user')
  const [step, setStep] = useState<Step>('input')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchTab(t: Tab) {
    setTab(t); setStep('input'); setValue(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setLoading(true); setError('')

    const body = tab === 'admin'
      ? { type: 'admin', password: value }
      : { type: 'nk', key: value.toUpperCase() }

    const res = await fetch('/api/auth/pre-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (data.ok) {
      setStep('kakao')
    } else {
      setError(data.error ?? '오류가 발생했습니다.')
    }
    setLoading(false)
  }

  const isAdmin = tab === 'admin'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-6 w-96">
        {/* 로고 */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-xl">N</div>
          <h1 className="text-xl font-bold text-gray-800 mt-2">IRI n blog</h1>
        </div>

        {/* 탭 */}
        <div className="flex w-full gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => switchTab('user')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === 'user' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            일반 사용자
          </button>
          <button
            onClick={() => switchTab('admin')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === 'admin' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            관리자
          </button>
        </div>

        {step === 'input' ? (
          <>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                {isAdmin ? '관리자 비밀번호 입력' : '입장키 입력'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isAdmin
                  ? '관리자 비밀번호를 입력하세요.'
                  : '관리자로부터 발급받은 NK 키를 입력하세요.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
              <input
                type={isAdmin ? 'password' : 'text'}
                value={value}
                onChange={e => setValue(isAdmin ? e.target.value : e.target.value.toUpperCase())}
                placeholder={isAdmin ? '비밀번호' : 'NK-YYYYMMDD-XXXXXXXXXXXX'}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${isAdmin ? 'focus:ring-gray-300' : 'font-mono tracking-wider text-center focus:ring-blue-300'}`}
                autoFocus
              />
              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !value.trim()}
                className={`w-full font-semibold py-3 rounded-xl transition disabled:bg-gray-200 disabled:text-gray-400 text-white
                  ${isAdmin ? 'bg-gray-800 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? '확인 중…' : '확인'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className={`mb-3 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 ${isAdmin ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'}`}>
                <span className={`text-sm font-semibold ${isAdmin ? 'text-gray-700' : 'text-green-600'}`}>
                  ✓ {isAdmin ? '관리자 확인 완료' : '입장키 확인 완료'}
                </span>
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
              onClick={() => { setStep('input'); setValue(''); setError('') }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← 다시 입력
            </button>
          </>
        )}
      </div>
    </main>
  )
}
