import { Pokeball } from './ui';

export type View = 'dex' | 'raid';

const VIEWS: [View, string][] = [['dex', '전국도감'], ['raid', '소드·실드 맥스레이드']];
const SUBTITLE: Record<View, string> = {
  dex: '전국도감 1세대부터 9세대까지 1025마리',
  raid: '소드·실드 맥스레이드배틀 굴마다 나오는 포켓몬',
};

export default function Header({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <>
      <header className="ball-top">
        <div className="wrap header-inner">
          <Pokeball />
          <div>
            <h1>포켓몬 도감</h1>
            <p className="sub">{SUBTITLE[view]}</p>
          </div>
        </div>
        <nav className="wrap views" aria-label="카테고리">
          {VIEWS.map(([key, label]) => (
            <button key={key} className="view-tab" aria-current={view === key ? 'page' : undefined} onClick={() => onView(key)}>{label}</button>
          ))}
        </nav>
      </header>
      <div className="ball-band"><div className="ball-btn" aria-hidden="true" /></div>
      <div className="spacer" />
    </>
  );
}
