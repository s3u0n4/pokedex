import type { CSSProperties, ReactNode } from 'react';
import { MOVE_CLASS, TYPES } from '../lib/constants';
import { defenseGroups } from '../lib/utils';

// 색을 CSS 변수(--tc 등)로 넘길 때 쓴다. React의 style 타입에는 사용자 정의 변수가 없어서 한 곳에서만 변환한다.
export const cssVars = (vars: Record<string, string | undefined>) => vars as CSSProperties;

export function Pokeball({ wobble = false }: { wobble?: boolean }) {
  return <div className={`pokeball${wobble ? ' wobble' : ''}`} aria-hidden="true" />;
}

export function LoadingRow({ children }: { children: ReactNode }) {
  return (
    <div className="loading-row">
      <Pokeball wobble />
      {children}
    </div>
  );
}

export function Status({ wobble = false, children }: { wobble?: boolean; children: ReactNode }) {
  return (
    <div className="status">
      <Pokeball wobble={wobble} />
      {children}
    </div>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section className="d-section" id={id}>
      <h3><Pokeball />{title}</h3>
      {children}
    </section>
  );
}

export function TypeBadge({ type, suffix = '' }: { type: string | null | undefined; suffix?: string }) {
  if (!type) return null;
  const [ko, color, fg] = TYPES[type] || [type, '#999'];
  return <span className={`type${fg ? ' light' : ''}`} style={cssVars({ '--tc': color, '--tf': fg })}>{ko}{suffix}</span>;
}

export function TypeBadges({ types }: { types: string[] }) {
  return <div className="types">{types.map((t) => <TypeBadge key={t} type={t} />)}</div>;
}

export function ClsBadge({ cls }: { cls: number }) {
  const c = MOVE_CLASS[cls];
  return c ? <span className="cls" style={cssVars({ '--cc': c[1] })}>{c[0]}</span> : null;
}

// 2배·4배 약점 타입 (4배는 "×4"를 붙인다)
export function WeaknessBadges({ types }: { types: string[] }) {
  const g = defenseGroups(types);
  if (!g[4].length && !g[2].length) return <span className="muted">없음</span>;
  return (
    <>
      {g[4].map((t) => <TypeBadge key={t} type={t} suffix=" ×4" />)}
      {g[2].map((t) => <TypeBadge key={t} type={t} />)}
    </>
  );
}
