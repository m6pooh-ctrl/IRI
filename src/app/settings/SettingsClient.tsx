'use client'

import { IconSettings } from '@/components/icons'
import ApiKeyPanel from '@/components/ApiKeyPanel'

export default function SettingsClient() {
  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[860px] mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-800 text-white">
          <IconSettings width={22} height={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API 키 설정</h1>
          <p className="text-sm text-gray-400">
            여기서 저장한 키는 <b>모든 도구(키워드·순위·트렌드·벤치마크)</b>에 즉시 적용됩니다.
          </p>
        </div>
      </header>

      {/* 안내 카드 */}
      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">두 가지 키가 필요합니다</p>
        <ul className="space-y-1 text-[13px] text-blue-700">
          <li>· <b>검색광고 API</b> — 키워드 도구의 검색량·경쟁도 분석용 (searchad.naver.com)</li>
          <li>· <b>네이버 오픈API</b> — 순위/노출·경쟁글 벤치마크·트렌드용 (developers.naver.com)</li>
        </ul>
        <p className="mt-2 text-[12px] text-blue-600">
          💡 키는 브라우저 localStorage에만 저장되며 서버로 전송되지 않습니다.
        </p>
      </div>

      {/* 키 입력 패널 — 처음부터 열린 상태 */}
      <ApiKeyPanel showSearchad showBlog defaultOpen />
    </div>
  )
}
