'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadSearchadKeys, loadOpenKeys } from '@/lib/apiKeys'

interface Props {
  needSearchad?: boolean
  needBlog?: boolean
}

export default function KeyStatus({ needSearchad = false, needBlog = false }: Props) {
  const [mounted, setMounted] = useState(false)
  const [oaSet, setOaSet] = useState(false)
  const [saSet, setSaSet] = useState(false)
  const [blogSet, setBlogSet] = useState(false)

  useEffect(() => {
    const oa = loadOpenKeys()
    const sa = loadSearchadKeys()
    setOaSet(!!(oa.clientId && oa.clientSecret))
    setSaSet(!!(sa.accessLicense && sa.secretKey && sa.customerId))
    setBlogSet(!!oa.blog)
    setMounted(true)
  }, [])

  const missing: string[] = []
  if (!oaSet) missing.push('오픈API 키')
  if (needSearchad && !saSet) missing.push('검색광고 키')
  if (needBlog && !blogSet) missing.push('블로그 주소')

  const allSet = missing.length === 0

  // SSR/hydration 중엔 neutral 상태로 렌더 (flash 방지)
  if (!mounted) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="text-sm text-gray-400">API 키 확인 중…</span>
        <Link href="/settings" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
          키 관리 →
        </Link>
      </div>
    )
  }

  return (
    <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-2.5 ${allSet ? 'border-green-100 bg-green-50' : 'border-orange-100 bg-orange-50'}`}>
      <div className="flex items-center gap-2 text-sm">
        {allSet ? (
          <span className="font-medium text-green-700">✓ API 키 설정됨</span>
        ) : (
          <>
            <span className="font-medium text-orange-700">⚠ 미설정</span>
            <span className="text-xs text-orange-600">— {missing.join(', ')} 필요</span>
          </>
        )}
      </div>
      <Link
        href="/settings"
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
      >
        키 관리 →
      </Link>
    </div>
  )
}
