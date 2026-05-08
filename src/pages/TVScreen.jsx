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
        </div>
        <div className="clock">{now.toLocaleString('ko-KR', { hour12: false })}</div>
      </header>

      <main className="tv-main tv-main--single">
        <section className={`leader-card hero ${isNew ? 'flash' : ''}`}>
          <div className="card-head">
            <div className="card-kind">LONG DRIVE · 장거리 챔피언</div>
            <div className="card-prize">1등 상품 · 가민 프리미엄 골프 시계 (100만원 상당)</div>
          </div>
          {ld.top ? (
            <>
              {isNew && <div className="new-record">★ NEW RECORD ★</div>}
              <div className="top-name">{maskName(ld.top.name)}</div>
              <div className="top-value">
                <span className="num">{ld.top.distance}</span>
                <span className="unit">m</span>
              </div>
            </>
          ) : (
            <div className="empty">기록 대기 중 · 첫 도전자가 1등!</div>
          )}
          <ol className="rank-list">
            {ld.top5.slice(1).map((r, i) => (
              <li key={r.id}>
                <span className="rank-num">{i + 2}</span>
                <span className="rank-name">{maskName(r.name)}</span>
                <span className="rank-val">{r.distance} m</span>
              </li>
            ))}
          </ol>
        </section>
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
