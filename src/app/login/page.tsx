export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-6 w-80">
        <h1 className="text-2xl font-bold text-gray-800">IRI n blog</h1>
        <p className="text-sm text-gray-500 text-center">
          카카오 계정으로 로그인하면<br />도구를 사용할 수 있습니다.
        </p>
        {error && (
          <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg w-full text-center">
            오류: {error}
          </p>
        )}
        <a
          href="/api/auth/kakao"
          className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#f0d800] text-gray-900 font-semibold py-3 rounded-xl transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.632 1.557 4.953 3.938 6.336L4.5 21l4.688-2.531A11.3 11.3 0 0 0 12 18.999c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
          </svg>
          카카오로 로그인
        </a>
      </div>
    </main>
  )
}
