'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ActivatePage() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    const data = await res.json()

    if (data.ok) {
      router.push('/')
    } else {
      setError(data.error ?? '오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-6 w-96">
        <h1 className="text-xl font-bold text-gray-800">입장키 인증</h1>
        <p className="text-sm text-gray-500 text-center">
          관리자로부터 발급받은 NK 키를 입력하세요.
        </p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value.toUpperCase())}
            placeholder="NK-YYYYMMDD-XXXXXXXXXXXX"
            className="w-full border rounded-xl px-4 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition"
          >
            {loading ? '확인 중...' : '입장'}
          </button>
        </form>
        <a href="/api/auth/logout" className="text-xs text-gray-400 hover:text-gray-600">
          다른 계정으로 로그인
        </a>
      </div>
    </main>
  )
}
