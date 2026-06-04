'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  IconSearch, IconSettings,
  IconShield, IconLogout, IconUsers, IconImage, IconLayers, IconTrophy,
  IconTrend, IconActivity,
} from './icons'
import { loadFeatures, FeatureKey } from '@/lib/features'

type Me = { nickname: string; avatar: string | null; nk_valid: boolean }

const MAIN: { href: string; label: string; Icon: typeof IconSearch; exact?: boolean; feature?: FeatureKey; soon?: boolean }[] = [
  { href: '/keyword', label: '키워드 도구', Icon: IconSearch, feature: 'keyword' },
  { href: '/super', label: '슈멤키워드', Icon: IconLayers, feature: 'super', soon: true },
  { href: '/trend', label: '트렌드', Icon: IconTrend, feature: 'trend' },
  { href: '/rank', label: '순위 추적', Icon: IconActivity, feature: 'rank' },
  { href: '/benchmark', label: '경쟁글 벤치마크', Icon: IconTrophy, feature: 'benchmark' },
  { href: '/neighbor', label: '서로이웃 자동화', Icon: IconUsers, feature: 'neighbor', soon: true },
  { href: '/wash', label: '이미지 워싱', Icon: IconImage, feature: 'wash' },
]
const OTHER = [
  { href: '/settings', label: 'API 키 설정', Icon: IconSettings },
  { href: '/admin', label: '관리자', Icon: IconShield },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar() {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)
  const [flags, setFlags] = useState<Record<FeatureKey, boolean> | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMe(d.user)).catch(() => {})
  }, [])

  useEffect(() => {
    const sync = () => setFlags(loadFeatures())
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('features-changed', sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('features-changed', sync) }
  }, [])

  const visibleMain = MAIN.filter(m => !m.feature || !flags || flags[m.feature])

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[240px] flex-col bg-white border-r border-gray-100 px-4 py-5">
      {/* 로고 */}
      <Link href="/keyword" className="flex items-center gap-2.5 px-2 mb-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">N</span>
        <span className="text-[17px] font-bold text-gray-900 tracking-tight">IRI n blog</span>
      </Link>

      {/* MAIN MENU */}
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Main Menu</p>
      <nav className="flex flex-col gap-1">
        {visibleMain.map(({ href, label, Icon, exact, soon }) => {
          const active = isActive(pathname, href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Icon className={active ? 'text-white' : 'text-gray-400'} width={19} height={19} />
              <span className="flex-1">{label}</span>
              {soon && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  오픈예정
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* OTHER */}
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-7 mb-2">Other</p>
      <nav className="flex flex-col gap-1">
        {OTHER.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Icon className={active ? 'text-white' : 'text-gray-400'} width={19} height={19} />
              {label}
            </Link>
          )
        })}
        <a
          href="/api/auth/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <IconLogout className="text-gray-400" width={19} height={19} />
          로그아웃
        </a>
      </nav>

      {/* Pro 카드 */}
      <div className="mt-auto">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white">
          <span className="inline-block rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
            {me?.nk_valid ? '입장키 활성' : 'NK'}
          </span>
          <p className="mt-3 text-sm font-semibold leading-snug">입장키로 모든 도구가<br />활성화되어 있어요</p>
          <Link
            href="/activate"
            className="mt-3 block w-full rounded-xl bg-white py-2 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            키 관리
          </Link>
        </div>

        {/* 유저 프로필 */}
        <div className="mt-4 flex items-center gap-3 px-1">
          {me?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-500">
              {me?.nickname?.[0] ?? '·'}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{me?.nickname ?? '게스트'}</p>
            <p className="truncate text-xs text-gray-400">체험단 매니저</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
