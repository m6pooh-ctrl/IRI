import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/AppShell'
import { IconUsers, IconWarn, IconFolder, IconClock, IconDownload } from '@/components/icons'

const STEPS = [
  { n: 1, t: 'Chrome 시작', d: '프로그램의 [① Chrome 시작] 클릭 → 자동으로 열린 Chrome에서 직접 네이버 로그인을 완료합니다.' },
  { n: 2, t: '설정 입력', d: '검색 키워드 · 스크롤 횟수 · 신청 간격 · 신청 메시지를 입력하고 저장합니다.' },
  { n: 3, t: '서로이웃 시작', d: '[② 서로이웃 시작] 클릭 → 키워드로 블로그를 수집해 "서로이웃" 신청만 자동 발송합니다.' },
  { n: 4, t: '중지', d: '[■ 중지]는 현재 작업이 끝난 뒤 안전하게 멈춥니다.' },
]

const SETTINGS = [
  { k: '검색 키워드', v: '서로이웃 신청할 블로거를 찾는 검색어. 입력한 키워드로 최신순 수집.' },
  { k: '스크롤 횟수', v: '검색 결과 스크롤 횟수. 예상 인원 약 N×20~30명 (예: 14회 → 약 280~420명).' },
  { k: '신청 간격', v: '신청 사이 대기(초). 실제 ±3초 랜덤 적용.' },
  { k: '신청 메시지', v: '서로이웃 신청 시 보낼 메시지 (최대 400자).' },
]

const SKIP = [
  '상대 이웃 수가 5,000명 초과로 더 이상 추가 불가',
  '상대가 서로이웃 신청을 닫아둔 경우',
  '이미 이웃이거나 거절·차단된 경우',
]

export default async function NeighborPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (!user.nk_valid) redirect('/activate')

  return (
    <AppShell>
      <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[1100px] mx-auto">
        {/* 헤더 */}
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <IconUsers width={22} height={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">서로이웃 자동화</h1>
            <p className="text-sm text-gray-400">키워드로 블로거를 찾아 서로이웃 신청을 자동으로 보냅니다.</p>
          </div>
        </header>

        {/* 데스크톱 도구 안내 배너 */}
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <IconWarn width={18} height={18} />
            <span className="font-semibold">이 기능은 데스크톱 전용 도구입니다</span>
          </div>
          <p className="text-sm leading-relaxed text-amber-800/90">
            서로이웃 자동화는 내 PC의 Chrome을 직접 띄워 <b>내가 로그인한 네이버 세션</b>으로 동작합니다.
            웹 브라우저(서버)에서는 사용자의 크롬을 제어할 수 없어 이 화면에서 바로 실행되지 않으며,
            아래의 데스크톱 프로그램으로 실행합니다. 웹에서는 <b>사용법·설정·주의사항</b>을 안내합니다.
          </p>
        </div>

        {/* 다운로드 */}
        <section className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <IconDownload width={18} height={18} className="text-blue-600" /> 프로그램 다운로드
              </h2>
              <p className="mt-1 text-sm text-gray-600">실행 파일 묶음(ZIP)을 받아 압축을 풀고 OS에 맞는 파일을 더블클릭하세요.</p>
            </div>
            <a
              href="/neighbor-tool.zip"
              download="서로이웃자동화_IRI.zip"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
            >
              <IconDownload width={17} height={17} /> 실행파일 다운로드
            </a>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
            ZIP에는 사용자용 파일만 포함됩니다(관리자 키 발급 도구 제외, 라이선스 키는 해시만 포함).
            Python 3.9+ 가 필요하며, 첫 실행 시 selenium 등 패키지가 자동 설치됩니다.
          </p>
        </section>

        {/* 실행 위치 */}
        <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
            <IconFolder width={18} height={18} className="text-gray-400" /> 실행 방법
          </h2>
          <p className="mb-3 text-sm text-gray-600">다운로드한 ZIP의 압축을 푼 폴더에서 OS에 맞는 실행 파일을 더블클릭하세요. (첫 실행 시 필요한 패키지 자동 설치)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-semibold text-gray-700">Windows</p>
              <p className="text-gray-500">서로이웃자동화_IRI_Windows.bat 더블클릭</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-semibold text-gray-700">Mac</p>
              <p className="text-gray-500">서로이웃자동화_IRI_Mac.command 더블클릭</p>
            </div>
          </div>
        </section>

        {/* 사용 순서 */}
        <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-gray-900">사용 순서</h2>
          <ol className="space-y-3">
            {STEPS.map(s => (
              <li key={s.n} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{s.n}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.t}</p>
                  <p className="text-sm text-gray-500">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* 설정 항목 */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-base font-bold text-gray-900">설정 항목</h2>
            <dl className="space-y-3">
              {SETTINGS.map(s => (
                <div key={s.k}>
                  <dt className="text-sm font-semibold text-gray-800">{s.k}</dt>
                  <dd className="text-sm text-gray-500">{s.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 자동 스킵 + 주의 */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-gray-900">자동으로 건너뛰는 경우</h2>
            <ul className="mb-5 space-y-2">
              {SKIP.map(s => (
                <li key={s} className="flex items-start gap-2 text-sm text-gray-600">
                  <IconClock width={16} height={16} className="mt-0.5 shrink-0 text-gray-300" />{s}
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                <IconWarn width={16} height={16} /> 주의사항
              </p>
              <ul className="space-y-1 text-xs leading-relaxed text-red-700/90">
                <li>· 네이버 약관상 자동화 도구 사용은 <b>계정 정지 위험</b>이 있습니다.</li>
                <li>· 신청 간격은 <b>10초 이상</b> 유지를 권장합니다.</li>
                <li>· 하루 신청은 <b>50명 이하</b>로 유지하세요.</li>
                <li>· 오직 &quot;서로이웃&quot; 신청만 보내며, 일반 이웃은 신청하지 않습니다.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
