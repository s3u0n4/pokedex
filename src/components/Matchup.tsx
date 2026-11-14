import { defenseGroups, superEffectiveAgainst } from '../lib/utils';
import { TypeBadge } from './ui';

function Row({ label, cls = '', types }: { label: string; cls?: string; types: string[] }) {
  if (!types.length) return null;
  return (
    <div className="mu-row">
      <span className={`mu-label ${cls}`}>{label}</span>
      <div className="types">{types.map((t) => <TypeBadge key={t} type={t} />)}</div>
    </div>
  );
}

export default function Matchup({ types }: { types: string[] }) {
  const g = defenseGroups(types);
  return (
    <>
      <div className="matchup">
        <div className="mu-box">
          <h4>받는 피해</h4>
          <Row label="4배" cls="weak" types={g[4]} />
          <Row label="2배" cls="weak" types={g[2]} />
          <Row label="½배" cls="resist" types={g[0.5]} />
          <Row label="¼배" cls="resist" types={g[0.25]} />
          <Row label="무효" cls="immune" types={g[0]} />
        </div>
        <div className="mu-box">
          <h4>자속 기술로 잘 때리는 타입</h4>
          {types.map((t) => {
            const good = superEffectiveAgainst(t);
            return (
              <div className="mu-row" key={t}>
                <span className="mu-label"><TypeBadge type={t} /></span>
                <div className="types">
                  {good.length
                    ? good.map((d) => <TypeBadge key={d} type={d} />)
                    : <span className="muted">효과가 굉장한 타입이 없어요</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="rec-note">특성(예: 부유)이나 테라스탈에 따른 변화는 반영하지 않았어요.</p>
    </>
  );
}
