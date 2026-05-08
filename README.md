# 세움 체험존 · 프로골퍼를 이겨라 실시간 이벤트 순위판

박람회 현장 대형 TV 송출용 실시간 **스크린골프 장거리** 이벤트 순위판 + 휴대폰용 관리자 입력 페이지.

- **TV 송출 화면** (`/`) : 장거리 1위, 상품 안내, 안내 멘트 자동 전환, NEW RECORD 효과
- **관리자 화면** (`/admin`) : 비밀번호 입력 후 장거리 기록 등록 / TOP5 확인 / 초기화
- **데이터** : Supabase Postgres + Realtime
- **배포** : Netlify (정적)

## 1. 빠른 실행

```bash
npm install
cp .env.example .env
# .env 파일에 Supabase URL / anon key / 관리자 비밀번호를 입력
npm run dev
```

브라우저에서:
- TV 송출 화면: http://localhost:5173/
- 관리자 화면: http://localhost:5173/admin

`.env`가 비어있어도 화면은 **샘플 데이터**로 동작합니다 (TV 화면 하단에 안내 표시).

## 2. Supabase 설정

1. https://supabase.com 에서 프로젝트 생성
2. **SQL Editor** 에서 `supabase/schema.sql` 의 내용을 그대로 실행 (테이블 + RLS + Realtime 설정 한 번에 적용)
3. **Project Settings → API** 에서 다음 값 복사
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
4. `.env` 파일에 입력

테이블:
- `long_drive_records (id, name, phone_tail, distance, created_at)`

> ⚠️ 본 SQL은 박람회 현장 임시 운영을 위해 anon 키로 읽기/쓰기를 모두 허용합니다.
> 장기 운영 시에는 RLS 정책을 좁히거나 관리자 입력에 Supabase Auth 를 적용하세요.

## 3. 빌드 & Netlify 배포

```bash
npm run build       # dist/ 생성
npm run preview     # 빌드 결과 미리보기
```

### Netlify 설정
- 저장소를 Netlify에 연결
- 자동으로 `netlify.toml` 인식 (Build command: `npm run build`, Publish: `dist`)
- **Site settings → Environment variables** 에서 환경변수 입력:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ADMIN_PASSWORD` (관리자 페이지 비밀번호)
- SPA 라우팅을 위해 `netlify.toml` 에 redirect 가 포함되어 있습니다.

## 4. 환경변수

| 키 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_ADMIN_PASSWORD` | `/admin` 진입 비밀번호 (기본값 `seum1234`) |

`.env.example` 참고.

## 5. 화면 사용

### TV 송출 화면 (`/`)
- 검정 + 골드 컬러 / 멀리서도 보이도록 1위 거리 숫자를 매우 크게
- 하단 안내 멘트 12초마다 자동 전환 + 마퀴 흐름
- 새 기록이 1위를 갱신하면 **★ NEW RECORD ★** 라벨 + 5초간 카드 플래시
- 크롬/엣지 등에서 `F11` 또는 키오스크 모드로 전체화면 권장

### 관리자 화면 (`/admin`)
- 모바일 친화 레이아웃
- 비밀번호 입력 후 진입
- 장거리: 이름 / 연락처 뒷자리 / 거리(m)
- 저장하면 Supabase Realtime 으로 TV 화면에 즉시 반영
- 초기화 버튼 (확인 다이얼로그)

## 6. 로고 교체

`public/logo.png` 파일을 교체하면 TV 화면 좌상단 로고가 바뀝니다 (없으면 자동으로 숨김).
임시 SVG (`public/logo.svg`) 가 들어있으니 참고용으로 사용하세요.

## 7. 디렉터리 구조

```
.
├── index.html
├── netlify.toml
├── package.json
├── vite.config.js
├── .env.example
├── public/
│   └── logo.svg            # logo.png 로 교체 권장
├── supabase/
│   └── schema.sql
└── src/
    ├── main.jsx
    ├── styles.css
    ├── supabase.js
    ├── hooks/
    │   └── useLeaderboard.js
    └── pages/
        ├── TVScreen.jsx
        └── Admin.jsx
```

## 8. 이벤트 정보

- **이벤트명** : 프로골퍼를 이겨라 (스크린골프 장거리)
- **장거리 1등 상품** : 가민 프리미엄 골프 시계 (100만원 상당)
- **장소** : 세움디자인하우징 복합 레저형 체류형쉼터 체험존
