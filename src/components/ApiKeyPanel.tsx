'use client'

import { useEffect, useState } from 'react'
import {
  loadSearchadKeys, saveSearchadKeys,
  loadOpenKeys, saveOpenKeys,
} from '@/lib/apiKeys'
import type { SearchadKeys, OpenKeys } from '@/lib/apiKeys'

type TestState = { status: 'idle' | 'testing' | 'ok' | 'fail'; msg: string }

interface Props {
  showSearchad?: boolean  // 검색광고 키 섹션 표시 (키워드 도구용)
  showBlog?: boolean      // 블로그 주소 필드 표시 (순위 도구용)
  trendMode?: boolean     // 오픈API 연결 테스트를 데이터랩 엔드포인트로 (트렌드용)
  defaultOpen?: boolean   // 처음부터 입력폼 펼친 상태로 (설정 페이지용)
}

export default function ApiKeyPanel({ showSearchad = false, showBlog = false, trendMode = false, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [showHelp, setShowHelp] = useState(false)

  const [saKeys, setSaKeys] = useState<SearchadKeys>({ accessLicense: '', secretKey: '', customerId: '' })
  const [saTest, setSaTest] = useState<TestState>({ status: 'idle', msg: '' })

  const [oaKeys, setOaKeys] = useState<OpenKeys>({ clientId: '', clientSecret: '', blog: '' })
  const [oaTest, setOaTest] = useState<TestState>({ status: 'idle', msg: '' })

  useEffect(() => {
    if (showSearchad) setSaKeys(loadSearchadKeys())
    setOaKeys(loadOpenKeys())
  }, [showSearchad])

  async function testSearchad() {
    if (!saKeys.accessLicense || !saKeys.secretKey || !saKeys.customerId) {
      setSaTest({ status: 'fail', msg: '세 칸을 모두 입력해주세요.' })
      return
    }
    setSaTest({ status: 'testing', msg: '' })
    try {
      const res = await fetch('/api/keyword/enrich', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: ['여행'], ...saKeys }),
      })
      const data = await res.json()
      if (data.error) {
        const invalid = /invalid|401|403|apikey|api-key|signature|customer/i.test(data.error)
        setSaTest({ status: 'fail', msg: invalid ? '키가 올바르지 않습니다. 값을 다시 확인하세요.' : `오류: ${String(data.error).slice(0, 60)}` })
      } else {
        setSaTest({ status: 'ok', msg: '연결 성공! 키가 정상입니다.' })
      }
    } catch {
      setSaTest({ status: 'fail', msg: '네트워크 오류' })
    }
  }

  async function testOpenApi() {
    if (!oaKeys.clientId || !oaKeys.clientSecret) {
      setOaTest({ status: 'fail', msg: 'Client ID/Secret을 입력하세요.' })
      return
    }
    setOaTest({ status: 'testing', msg: '' })
    try {
      let ok = false
      let msg = ''
      if (trendMode) {
        const res = await fetch('/api/keyword/trend', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: '여행', clientId: oaKeys.clientId, clientSecret: oaKeys.clientSecret }),
        })
        const data = await res.json()
        if (data.error) {
          msg = data.error.includes('데이터랩') ? '앱에 데이터랩 API가 없습니다. API 설정에서 추가 후 재시도.' : '키가 올바르지 않습니다.'
        } else {
          ok = true; msg = '연결 성공! 데이터랩 사용 가능'
        }
      } else {
        const res = await fetch('/api/search/expose', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: ['여행'], blog: oaKeys.blog || 'naver', clientId: oaKeys.clientId, clientSecret: oaKeys.clientSecret, depth: 1 }),
        })
        const data = await res.json()
        if (data.error) {
          msg = /401|403|authenticat|invalid|unauthorized/i.test(String(data.error)) ? '키가 올바르지 않습니다. (앱에 "검색" API 등록 확인)' : String(data.error).slice(0, 60)
        } else {
          const first = (data.results ?? [])[0]
          if (first?.error && /401|403|authenticat|invalid|unauthorized/i.test(String(first.error))) {
            msg = '키가 올바르지 않습니다. (앱에 "검색" API 등록 확인)'
          } else {
            ok = true; msg = '연결 성공!'
          }
        }
      }
      setOaTest({ status: ok ? 'ok' : 'fail', msg })
    } catch {
      setOaTest({ status: 'fail', msg: '네트워크 오류' })
    }
  }

  function saveSa() {
    saveSearchadKeys(saKeys)
    setSaTest({ status: 'ok', msg: '저장됨' })
  }

  function saveOa() {
    saveOpenKeys(oaKeys)
    setOaTest({ status: 'ok', msg: '저장됨' })
  }

  const saSet = showSearchad && !!(saKeys.accessLicense && saKeys.secretKey && saKeys.customerId)
  const oaSet = !!(oaKeys.clientId && oaKeys.clientSecret)

  return (
    <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">API 키 설정</h2>
          {oaSet && (!showSearchad || saSet)
            ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">✓ 설정됨</span>
            : <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-500">미설정</span>
          }
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHelp(s => !s)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            📷 키 발급 방법
          </button>
          <button
            onClick={() => setOpen(s => !s)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            {open ? '접기' : '키 입력'}
          </button>
        </div>
      </div>

      {/* 접힌 상태 요약 */}
      {!open && (
        <p className="mt-1.5 text-xs text-gray-400">
          {showSearchad && (saSet ? '검색광고 설정됨' : '검색광고 미설정')}
          {showSearchad && ' · '}
          {oaSet
            ? `오픈API 설정됨${showBlog ? ` · 블로그: ${oaKeys.blog || '미입력'}` : ''}`
            : '오픈API 미설정'}
        </p>
      )}

      {/* 키 발급 도움말 */}
      {showHelp && (
        <div className="mt-3 space-y-3">
          {showSearchad && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="mb-1 text-xs font-semibold text-amber-800">① 검색광고 API 키 발급 (searchad.naver.com)</p>
              <p className="mb-2 text-[11px] leading-relaxed text-gray-600">
                <a href="https://searchad.naver.com" target="_blank" rel="noreferrer" className="font-semibold text-amber-700 underline">searchad.naver.com</a>
                {' '}로그인 → 좌측 메뉴 <b>도구 ▶ SA API 사용 관리</b> → 빨간 박스에서 복사
                <br />
                · <b>Access License</b> = 엑세스라이선스 &nbsp; · <b>Secret Key</b> = 비밀키 &nbsp; · <b>Customer ID</b> = CUSTOMER_ID 숫자
                <br />
                ⚠ developers.naver.com 오픈API 키와 <b>다릅니다.</b>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/help/searchad-keys.png" alt="검색광고 API 키 위치" className="w-full max-w-3xl rounded border border-amber-200" />
            </div>
          )}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="mb-1 text-xs font-semibold text-blue-800">
              {showSearchad ? '② ' : ''}네이버 오픈API 키 발급 (developers.naver.com)
            </p>
            <p className="mb-2 text-[11px] leading-relaxed text-gray-600">
              <a href="https://developers.naver.com/apps/#/register" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline">developers.naver.com</a>
              {' '}로그인 → <b>애플리케이션 등록</b> → <b>API 설정</b>에서{' '}
              {trendMode
                ? <><b>&quot;데이터랩(검색어트렌드)&quot;</b> 추가 (순위·벤치마크용으로 <b>&quot;검색&quot;</b>도 함께 추가 권장)</>
                : <><b>&quot;검색&quot;</b> 추가 (트렌드 기능은 <b>&quot;데이터랩(검색어트렌드)&quot;</b>도 추가)</>
              }
              {' '}→ <b>개요</b> 탭 빨간 박스에서 <b>Client ID / Client Secret</b> 복사
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/help/openapi-keys.png" alt="네이버 오픈API 키 위치" className="w-full max-w-2xl rounded border border-blue-200" />
          </div>
        </div>
      )}

      {/* 키 입력 폼 */}
      {open && (
        <div className="mt-4 space-y-5">
          {/* ── 검색광고 섹션 ── */}
          {showSearchad && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                검색광고 API <span className="font-normal text-gray-400">· 키워드 검색량·경쟁도 필수 · searchad.naver.com</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  { k: 'accessLicense', label: 'Access License', desc: '엑세스라이선스' },
                  { k: 'secretKey', label: 'Secret Key', desc: '비밀키' },
                  { k: 'customerId', label: 'Customer ID', desc: '광고계정 숫자 ID' },
                ] as const).map(({ k, label, desc }) => (
                  <div key={k} className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-500">
                      {label} <span className="font-normal text-gray-400">· {desc}</span>
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder={label}
                      value={saKeys[k]}
                      onChange={e => { setSaKeys(p => ({ ...p, [k]: e.target.value })); setSaTest({ status: 'idle', msg: '' }) }}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={saveSa} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
                  저장
                </button>
                <button onClick={testSearchad} disabled={saTest.status === 'testing'} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                  {saTest.status === 'testing' ? '테스트 중…' : '🔌 연결 테스트'}
                </button>
                {saTest.status === 'ok' && <span className="text-sm font-medium text-green-600">✓ {saTest.msg}</span>}
                {saTest.status === 'fail' && <span className="text-sm font-medium text-red-600">✗ {saTest.msg}</span>}
              </div>
            </div>
          )}

          {showSearchad && <hr className="border-gray-100" />}

          {/* ── 오픈API 섹션 ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">
              네이버 오픈API{' '}
              <span className="font-normal text-gray-400">
                {trendMode
                  ? '· 트렌드(데이터랩) · developers.naver.com'
                  : '· 순위/노출·벤치마크·트렌드 공통 · developers.naver.com'}
              </span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="password" autoComplete="off" placeholder="Client ID"
                value={oaKeys.clientId}
                onChange={e => { setOaKeys(p => ({ ...p, clientId: e.target.value })); setOaTest({ status: 'idle', msg: '' }) }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="password" autoComplete="off" placeholder="Client Secret"
                value={oaKeys.clientSecret}
                onChange={e => { setOaKeys(p => ({ ...p, clientSecret: e.target.value })); setOaTest({ status: 'idle', msg: '' }) }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            {showBlog && (
              <input
                placeholder="내 블로그 주소 또는 아이디 (예: blog.naver.com/myid)"
                value={oaKeys.blog}
                onChange={e => setOaKeys(p => ({ ...p, blog: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            )}
            {trendMode && (
              <p className="text-[11px] text-blue-600">
                💡 트렌드는 앱에 <b>데이터랩(검색어트렌드)</b>이 등록돼야 합니다. 순위·벤치마크는 <b>검색</b>도 함께 추가하세요.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={saveOa} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                저장
              </button>
              <button onClick={testOpenApi} disabled={oaTest.status === 'testing'} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {oaTest.status === 'testing' ? '테스트 중…' : '🔌 연결 테스트'}
              </button>
              {oaTest.status === 'ok' && <span className="text-sm font-medium text-green-600">✓ {oaTest.msg}</span>}
              {oaTest.status === 'fail' && <span className="text-sm font-medium text-red-600">✗ {oaTest.msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
