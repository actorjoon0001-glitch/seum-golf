# 세움 체험존 · 프로골퍼를 이겨라 실시간 이벤트 순위판

박람회 현장 대형 TV 송출용 실시간 **스크린골프 장거리** 이벤트 순위판 + 휴대폰용 관리자 입력 페이지 + 30분마다 자동 안내방송.

- **TV 송출 화면** (`/`) : 장거리 1위, 가민 시계 경품 패널, 안내 멘트 자동 전환, NEW RECORD 효과, **30분마다 안내방송 자동 재생**
- **관리자 화면** (`/admin`) : 비밀번호 입력 후 장거리 기록 등록 / TOP5 확인 / 초기화 / **안내방송 제어**
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

## 3. 안내방송 (Audio)

1. **mp3 파일 준비**: `public/audio/notice-golf.mp3`
   - 멘트는 `public/audio/README.md` 참고
   - TTS 서비스(네이버 클로바, ElevenLabs 등)로 변환해 저장
   - 파일이 없어도 앱은 정상 동작 (작은 경고만 표시)

2. **TV 화면 운영**
   - TV에서 `/` 페이지 접속
   - 화면 중앙의 **"방송 시작"** 버튼을 1회 클릭 (브라우저 자동재생 정책 우회)
   - 이후 30분마다 자동으로 안내방송 재생 + 화면에 "📢 세움디자인하우징 안내방송" 오버레이 10초 표시

3. **관리자 화면에서 제어**
   - **자동 재생 ON/OFF**
   - **다음 안내방송까지 남은 시간** 표시 (예: `18분 23초 남음`)
   - **지금 방송하기** : TV에 즉시 송출 (30분 타이머도 리셋)
   - **테스트 재생** : 관리자 기기에서만 들어보기
   - **볼륨 조절** : 0~100% (TV 오디오에 반영)

> 관리자 ↔ TV 동기화는 **Supabase Realtime**(다른 기기·네트워크) + **BroadcastChannel**(같은 브라우저) 양쪽으로 동작합니다. Supabase 미설정 시에는 같은 브라우저 내에서만 동기화됩니다.

## 4. 빌드 & Netlify 배포

```bash
npm run build       # dist/ 생성
npm run preview     # 빌드 결과 미리보기
```

### Netlify 설정
- 저장소를 Netlify에 연결 → 자동으로 `netlify.toml` 인식
- **Site settings → Environment variables** 에서 환경변수 입력:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ADMIN_PASSWORD` (관리자 페이지 비밀번호)
- SPA 라우팅을 위해 `netlify.toml` 에 redirect 가 포함되어 있습니다.

## 5. 환경변수

| 키 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_ADMIN_PASSWORD` | `/admin` 진입 비밀번호 (기본값 `seum1234`) |

`.env.example` 참고.

## 6. 디렉터리 구조

```
.
├── index.html
├── netlify.toml
├── package.json
├── vite.config.js
├── .env.example
├── public/
│   ├── logo.svg            # logo.png 로 교체 권장
│   ├── garmin-watch.svg    # 경품 일러스트
│   └── audio/
│       └── notice-golf.mp3 # ← 직접 넣어주세요
├── supabase/
│   └── schema.sql
└── src/
    ├── main.jsx
    ├── styles.css
    ├── supabase.js
    ├── broadcast.js        # 안내방송 모듈
    ├── hooks/
    │   └── useLeaderboard.js
    └── pages/
        ├── TVScreen.jsx    # /  (TV 송출 + 방송 시작 + 오버레이)
        └── Admin.jsx       # /admin
```

## 7. 운영 방식 요약

1. TV에 `/` 접속 → **방송 시작** 1회 클릭
2. 30분마다 자동으로 안내방송 송출 (10초간 오버레이 표시)
3. 관리자가 휴대폰으로 `/admin` 접속 → 비밀번호 입력
4. 기록 입력 / 1위 확인 / 초기화 / 즉시 방송 / 볼륨 조절

## 8. 이벤트 정보

- **이벤트명** : 프로골퍼를 이겨라 (스크린골프 장거리)
- **장거리 1등 상품** : 가민 프리미엄 골프 시계 (100만원 상당)
- **장소** : 세움디자인하우징 복합 레저형 체류형쉼터 체험존
