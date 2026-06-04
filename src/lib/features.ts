// 기능 on/off 플래그 (브라우저 localStorage 기반 — 기기별)
// 전체 사용자 동기화는 백엔드(Supabase/KV) 필요 → 추후 옵션

export type FeatureKey = 'keyword' | 'super' | 'trend' | 'rank' | 'benchmark' | 'neighbor' | 'wash'

export const FEATURE_LIST: { key: FeatureKey; label: string; desc: string }[] = [
  { key: 'keyword', label: '키워드 도구', desc: '키워드 확장 + IRI 점수' },
  { key: 'super', label: '슈멤키워드', desc: '슈멤 키워드 목록 검색' },
  { key: 'trend', label: '트렌드', desc: '월별 검색 추이·시즌 (최대 5개 비교)' },
  { key: 'rank', label: '순위 추적', desc: '실제 블로그탭 순위 날짜별 추적' },
  { key: 'benchmark', label: '경쟁글 벤치마크', desc: '상위노출 글 분석' },
  { key: 'neighbor', label: '서로이웃 자동화', desc: '데스크톱 도구 안내' },
  { key: 'wash', label: '이미지 워싱', desc: 'EXIF 제거 + 랜덤 변형' },
]

const KEY = 'nbolg_features'

export function defaultFeatures(): Record<FeatureKey, boolean> {
  return Object.fromEntries(FEATURE_LIST.map(f => [f.key, true])) as Record<FeatureKey, boolean>
}

export function loadFeatures(): Record<FeatureKey, boolean> {
  const all = defaultFeatures()
  if (typeof window === 'undefined') return all
  try { return { ...all, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } }
  catch { return all }
}

export function saveFeatures(f: Record<FeatureKey, boolean>) {
  localStorage.setItem(KEY, JSON.stringify(f))
  // 같은 탭에서도 사이드바가 즉시 반영되도록 이벤트 발생
  window.dispatchEvent(new Event('features-changed'))
}
