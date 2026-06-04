// 슈멤 키워드 목록은 서버 JSON(/api/super-list)에서 관리됩니다.
// 클라이언트에서는 isInSuperList만 사용.

export function isInSuperList(keyword: string, list: string[]): boolean {
  const lk = keyword.toLowerCase().trim()
  return list.some(k => k.toLowerCase().trim() === lk)
}
