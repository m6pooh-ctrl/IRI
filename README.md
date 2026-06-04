# IRI n blog — 블로그 체험단 통합 도구

네이버 키워드 분석 + 체험단 일정 관리 웹 서비스

- **배포 URL**: https://iri-iota.vercel.app
- **GitHub**: https://github.com/m6pooh-ctrl/IRI
- **스택**: Next.js 16 · TypeScript · Tailwind CSS · Vercel

---

## 주요 기능

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 홈 | `/` | 로그인 후 도구 선택 |
| 로그인 | `/login` | 카카오 OAuth 로그인 |
| 입장키 인증 | `/activate` | NK 라이선스 키 입력 |
| 키워드 도구 | `/keyword` | 자동완성 BFS + 검색광고 API + IRI 점수 |
| 체험단 관리 | `/campaign` | 선정 일정 관리 + 캘린더 + 통계 |
| 통계 | `/campaign/stats` | 월별 경제효과 · 카테고리별 분석 |
| 관리자 | `/admin` | NK 키 발급 + 발급 내역 |

---

## 로컬 개발 환경 세팅

### 1. 저장소 클론
```bash
git clone https://github.com/m6pooh-ctrl/IRI.git nbolg-web
cd nbolg-web
npm install
```

### 2. 환경변수 설정
`.env.local` 파일을 생성하고 아래 값 입력:

```env
# 카카오 OAuth
KAKAO_REST_API_KEY=1012643b40b4e0432e47eb23ee7fff68
KAKAO_CLIENT_SECRET=szauaFeUIeShlB1fnBf7maglI30fwmgZ
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback

# NK 라이선스 마스터 시크릿
NK_MASTER_SECRET=NK_MASTER_SUNU_2024

# 관리자 비밀번호 (/admin 접근용)
ADMIN_PASSWORD=<본인이 설정한 비밀번호>
```

> KAKAO_CLIENT_SECRET, ADMIN_PASSWORD 실제 값은 관리자에게 문의

### 3. 개발 서버 실행
```bash
npm run dev
# http://localhost:3000
```

---

## Vercel 환경변수 (프로덕션)

Vercel 대시보드 → IRI 프로젝트 → Settings → Build and Deployment → Environment Variables

| Key | Value |
|-----|-------|
| `KAKAO_REST_API_KEY` | (카카오 REST API 키) |
| `KAKAO_CLIENT_SECRET` | (카카오 클라이언트 시크릿) |
| `KAKAO_REDIRECT_URI` | `https://iri-iota.vercel.app/api/auth/kakao/callback` |
| `NK_MASTER_SECRET` | `NK_MASTER_SUNU_2024` |
| `ADMIN_PASSWORD` | (관리자 비밀번호) |

---

## 카카오 개발자센터 설정

앱 이름: **IRI n blog** (ID: 1475100)
- 카카오 로그인 → 활성화 ON
- 플랫폼 키 → REST API 키 → Redirect URI: `https://iri-iota.vercel.app/api/auth/kakao/callback`
- 동의항목: 닉네임·프로필사진 필수 동의

---

## NK 라이선스 키 구조

```
형식: NK-YYYYMMDD-XXXXXXXXXXXX
예시: NK-20261231-5DA30CC4FF8D

생성 로직:
  msg = f"NK|{YYYYMMDD}"
  sig = HMAC-SHA256(NK_MASTER_SECRET, msg).hexdigest()[:12].upper()
  key = f"NK-{YYYYMMDD}-{sig}"
```

발급: https://iri-iota.vercel.app/admin

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              홈 (로그인 + NK 인증 확인)
│   ├── login/page.tsx        카카오 로그인
│   ├── activate/page.tsx     NK 입장키 입력
│   ├── admin/page.tsx        관리자 — NK 키 발급
│   ├── keyword/page.tsx      키워드 확장 도구
│   ├── campaign/
│   │   ├── page.tsx          체험단 일정 관리
│   │   └── stats/page.tsx    통계
│   └── api/
│       ├── auth/kakao/       카카오 OAuth redirect
│       ├── auth/kakao/callback/  토큰 교환 + 세션
│       ├── auth/logout/      로그아웃
│       ├── auth/activate/    NK 키 검증
│       ├── admin/generate/   NK 키 생성 (관리자)
│       ├── keyword/autocomplete/ 네이버 자동완성 프록시
│       ├── keyword/enrich/   검색광고 API + IRI 계산
│       └── campaign/extract/ URL/텍스트 → 캠페인 정보 추출
└── lib/
    ├── session.ts            세션 쿠키 유틸
    ├── nk.ts                 NK 키 검증 로직
    ├── iri.ts                IRI 점수 계산 + 검색광고 API 인증
    └── campaign.ts           캠페인 타입 + 유틸 + 텍스트 추출
```
