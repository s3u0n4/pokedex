import { Pokeball } from './ui';

export default function Header() {
  return (
    <>
      <header className="ball-top">
        <div className="wrap header-inner">
          <Pokeball />
          <div>
            <h1>포켓몬 도감</h1>
            <p className="sub">전국도감 1세대부터 9세대까지 1025마리</p>
          </div>
        </div>
      </header>
      <div className="ball-band"><div className="ball-btn" aria-hidden="true" /></div>
      <div className="spacer" />
    </>
  );
}
