import { useEffect, useState } from 'react'
import { useLongDriveBoard } from '../hooks/useLeaderboard.js'

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

  useEffect(() => {
    const t = setInterval(() => setMarqueeIndex((i) => (i + 1) % MARQUEE_LINES.length), 12000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isNew = ld.newRecordId && ld.top?.id === ld.newRecordId

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

      <main className="tv-main tv-main--split">
        <section className={`leader-card hero ${isNew ? 'flash' : ''}`}>
          <CornerOrnament pos="tl" />
          <CornerOrnament pos="tr" />
          <CornerOrnament pos="bl" />
          <CornerOrnament pos="br" />
          <div className="card-head">
            <div className="card-kind">
              <span className="dot" /> LONG DRIVE · 장거리 챔피언
            </div>
            <div className="card-prize-line">최장 비거리에 도전하세요</div>
          </div>
          {ld.top ? (
            <>
              {isNew && <div className="new-record">★ NEW RECORD ★</div>}
              <div className="hero-rank">RANK #1</div>
              <div className="top-name">{maskName(ld.top.name)}</div>
              <div className="top-value">
                <span className="num">{ld.top.distance}</span>
                <span className="unit">m</span>
              </div>
              <div className="record-meta">CURRENT RECORD</div>
            </>
          ) : (
            <div className="empty">기록 대기 중 · 첫 도전자가 1등!</div>
          )}
          <ol className="rank-list">
            {ld.top5.slice(1).map((r, i) => (
              <li key={r.id}>
                <span className="rank-num">{i + 2}</span>
                <span className="rank-name">{maskName(r.name)}</span>
                <span className="rank-val">{r.distance} <em>m</em></span>
              </li>
            ))}
            {ld.top5.length < 2 && <li className="rank-empty">도전자를 기다리고 있어요</li>}
          </ol>
        </section>

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
    </div>
  )
}
