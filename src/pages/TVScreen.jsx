import { useCallback, useEffect, useRef, useState } from 'react'
import { useLongDriveBoard } from '../hooks/useLeaderboard.js'
import { broadcast, AUDIO_URL, INTERVAL_MS } from '../broadcast.js'

const MARQUEE_LINES = [
  '프로골퍼를 이겨라!',
  '장거리 기록 1등에게 가민 프리미엄 골프 시계 100만원 상당 증정',
  '지금 바로 세움디자인하우징 체험존에서 도전하세요!',
  '스크린골프 · 영화관 · 노래방을 한 공간에서 즐기는 복합 레저형 체류형쉼터'
]

function maskName(name = '') {
  if (!name) return ''
  if (name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

function CornerOrnament({ pos }) {
  return <span className={`corner corner-${pos}`} aria-hidden />
}

export default function TVScreen() {
  const ld = useLongDriveBoard()
  const [marqueeIndex, setMarqueeIndex] = useState(0)
  const [now, setNow] = useState(new Date())

  // === 안내방송 상태 ===
  const [started, setStarted] = useState(false)
  const [announcing, setAnnouncing] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const audioRef = useRef(null)
  const isPlayingRef = useRef(false)
  const overlayTimerRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setMarqueeIndex((i) => (i + 1) % MARQUEE_LINES.length), 12000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // 오디오 엘리먼트 한 번만 생성
  useEffect(() => {
    let audio
    try {
      audio = new Audio(AUDIO_URL)
      audio.preload = 'auto'
      audio.volume = Math.max(0, Math.min(1, broadcast.getVolume() / 100))
    } catch (e) {
      setAudioError('오디오 초기화 실패')
      return
    }
    const onError = () => setAudioError('안내방송 mp3 파일을 찾을 수 없습니다 (public/audio/notice-golf.mp3)')
    const onEnded = () => { isPlayingRef.current = false }
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)
    audioRef.current = audio
    return () => {
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
      try { audio.pause() } catch {}
      audioRef.current = null
    }
  }, [])

  const playAnnouncement = useCallback(async () => {
    if (!broadcast.getEnabled()) return
    if (isPlayingRef.current) return
    const audio = audioRef.current
    if (!audio) return
    try {
      audio.volume = Math.max(0, Math.min(1, broadcast.getVolume() / 100))
      audio.currentTime = 0
      isPlayingRef.current = true
      setAnnouncing(true)
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
      overlayTimerRef.current = setTimeout(() => setAnnouncing(false), 10000)
      await audio.play()
      broadcast.setLastAt(Date.now())
      setAudioError(null)
    } catch (e) {
      isPlayingRef.current = false
      setAnnouncing(false)
      setAudioError('재생 실패: ' + (e?.message || e))
    }
  }, [])

  function handleStart() {
    const audio = audioRef.current
    if (!audio) {
      broadcast.setLastAt(Date.now())
      setStarted(true)
      return
    }
    // 사용자 제스처(클릭) 안에서 바로 재생 → 자동재생 정책 통과 + 즉시 소리 확인
    setStarted(true)
    playAnnouncement()
  }

  // 1분 간격 자동 송출 스케줄러
  useEffect(() => {
    if (!started) return
    const iv = setInterval(() => {
      if (!broadcast.getEnabled()) return
      if (isPlayingRef.current) return
      const last = broadcast.getLastAt() || 0
      if (last > 0 && Date.now() - last >= INTERVAL_MS) {
        playAnnouncement()
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [started, playAnnouncement])

  // 다른 페이지/탭/디바이스에서 오는 명령 수신
  useEffect(() => {
    const off1 = broadcast.on('playNow', () => {
      if (!started) {
        setAudioError('TV 화면에서 "방송 시작"을 먼저 눌러주세요')
        setTimeout(() => setAudioError(null), 6000)
        return
      }
      playAnnouncement()
    })
    const off2 = broadcast.on('volume', ({ value }) => {
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(1, (value ?? 100) / 100))
      }
    })
    return () => { off1(); off2() }
  }, [started, playAnnouncement])

  const isNewMale = ld.newRecordId && ld.male.top?.id === ld.newRecordId
  const isNewFemale = ld.newRecordId && ld.female.top?.id === ld.newRecordId

  function ChampionCard({ kind, label, accent, board, isNew }) {
    return (
      <section className={`leader-card hero champion-${accent} ${isNew ? 'flash' : ''}`}>
        <CornerOrnament pos="tl" />
        <CornerOrnament pos="tr" />
        <CornerOrnament pos="bl" />
        <CornerOrnament pos="br" />
        <div className="card-head">
          <div className="card-kind">
            <span className="dot" /> {kind}
          </div>
          <div className="card-prize-line">{label}</div>
        </div>
        {board.top ? (
          <>
            {isNew && <div className="new-record">★ NEW RECORD ★</div>}
            <div className="hero-rank">RANK #1</div>
            <div className="top-name">{maskName(board.top.name)}</div>
            <div className="top-value">
              <span className="num">{board.top.distance}</span>
              <span className="unit">m</span>
            </div>
            <div className="record-meta">CURRENT RECORD</div>
          </>
        ) : (
          <div className="empty">기록 대기 중 · 첫 도전자가 1등!</div>
        )}
        <ol className="rank-list">
          {board.top5.slice(1).map((r, i) => (
            <li key={r.id}>
              <span className="rank-num">{i + 2}</span>
              <span className="rank-name">{maskName(r.name)}</span>
              <span className="rank-val">{r.distance} <em>m</em></span>
            </li>
          ))}
          {board.top5.length < 2 && <li className="rank-empty">도전자를 기다리고 있어요</li>}
        </ol>
      </section>
    )
  }

  return (
    <div className="tv-root">
      <div className="bg-glow bg-glow-1" aria-hidden />
      <div className="bg-glow bg-glow-2" aria-hidden />

      <header className="tv-header">
        <div className="brand">
          <img src="/logo.png" alt="세움디자인하우징" className="brand-logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div className="brand-text">
            <div className="brand-title">세움디자인하우징</div>
            <div className="brand-sub">복합 레저형 체류형쉼터 · 체험존</div>
          </div>
        </div>
        <div className="event-title">
          <span className="event-badge">SCREEN GOLF EVENT</span>
          <span className="event-name">프로골퍼를 이겨라</span>
          <span className="event-sub">장거리 챔피언에게 가민 프리미엄 골프 시계 증정</span>
        </div>
        <div className="clock">
          <div className="clock-date">{now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>
          <div className="clock-time">{now.toLocaleTimeString('ko-KR', { hour12: false })}</div>
        </div>
      </header>

      <main className="tv-main tv-main--triple">
        <ChampionCard
          kind="MEN'S LONG DRIVE · 남자 챔피언"
          label="남자부 최장 비거리"
          accent="male"
          board={ld.male}
          isNew={isNewMale}
        />
        <ChampionCard
          kind="WOMEN'S LONG DRIVE · 여자 챔피언"
          label="여자부 최장 비거리"
          accent="female"
          board={ld.female}
          isNew={isNewFemale}
        />

        <aside className="prize-card">
          <CornerOrnament pos="tl" />
          <CornerOrnament pos="tr" />
          <CornerOrnament pos="bl" />
          <CornerOrnament pos="br" />
          <div className="prize-ribbon">GRAND PRIZE</div>
          <div className="prize-title">1등 상품</div>
          <div className="prize-name">가민 프리미엄<br/>골프 시계</div>
          <div className="prize-image">
            <div className="prize-shine" aria-hidden />
            <img src="/garmin-watch.svg" alt="가민 프리미엄 골프 시계" />
          </div>
          <div className="prize-value">
            <span className="prize-currency">₩</span>
            <span className="prize-amount">1,000,000</span>
            <span className="prize-suffix">상당</span>
          </div>
          <ul className="prize-features">
            <li>프로 수준의 코스 데이터</li>
            <li>풀컬러 GPS 골프 워치</li>
            <li>스윙·라운드 자동 분석</li>
          </ul>
          <div className="prize-cta">지금 도전하면 당신이 주인공!</div>
        </aside>
      </main>

      <footer className="tv-footer">
        <div className="marquee-line" key={marqueeIndex}>
          {MARQUEE_LINES[marqueeIndex]}
        </div>
        <div className="ticker">
          <div className="ticker-track">
            {MARQUEE_LINES.concat(MARQUEE_LINES).map((m, i) => (
              <span key={i} className="ticker-item">◆ {m}</span>
            ))}
          </div>
        </div>
        {ld.usingSample && (
          <div className="sample-warn">샘플 데이터 표시 중 · Supabase 환경변수를 설정하세요</div>
        )}
      </footer>

      {/* 안내방송 시작 모달 */}
      {!started && (
        <div className="start-modal" role="dialog" aria-modal="true">
          <div className="start-modal-card">
            <div className="start-modal-icon">🔊</div>
            <h2>안내방송 시작</h2>
            <p>박람회 현장 안내방송을 1분마다 자동으로 재생합니다.<br/>
            브라우저 정책상 처음 1회 클릭이 필요합니다.</p>
            <button className="start-btn" onClick={handleStart}>방송 시작</button>
            <p className="start-modal-hint">버튼을 누르면 첫 방송이 즉시 송출되고,<br/>이후 1분마다 자동으로 반복됩니다.</p>
          </div>
        </div>
      )}

      {/* 안내방송 송출 중 오버레이 (10초) */}
      {announcing && (
        <div className="announcement-overlay" role="status" aria-live="polite">
          <div className="announcement-card">
            <div className="announcement-icon">📢</div>
            <div className="announcement-title">세움디자인하우징 안내방송</div>
            <div className="announcement-sub">프로골퍼를 이겨라 · 이벤트 안내 송출 중</div>
            <div className="announcement-bars" aria-hidden>
              <span/><span/><span/><span/><span/><span/><span/>
            </div>
          </div>
        </div>
      )}

      {audioError && (
        <div className="audio-warn" role="alert">⚠ {audioError}</div>
      )}
    </div>
  )
}
