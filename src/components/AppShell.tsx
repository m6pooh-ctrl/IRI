import Sidebar from './Sidebar'

// 공통 셸: 좌측 고정 사이드바 + 우측 콘텐츠 영역
// 내부 페이지는 children 으로 기존 내용을 그대로 넣으면 됨
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <Sidebar />
      <div className="lg:pl-[240px]">{children}</div>
    </div>
  )
}
