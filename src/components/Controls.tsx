import type { RefObject } from 'react';
import { GENS, TYPES } from '../lib/constants';
import { cssVars } from './ui';

const GEN_LABELS = ['전체', ...GENS.map((_, i) => `${i + 1}세대`)];

interface ControlsProps {
  query: string;
  onQuery: (q: string) => void;
  /** 0이면 전체, 1~9는 세대 */
  gen: number;
  onGen: (gen: number) => void;
  type: string | null;
  onType: (type: string | null) => void;
  countText: string;
  showReset: boolean;
  onReset: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export default function Controls({ query, onQuery, gen, onGen, type, onType, countText, showReset, onReset, searchRef }: ControlsProps) {
  return (
    <div className="controls">
      <div className="wrap">
        <label className="search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="이름이나 번호로 검색 (예: 피카츄, pikachu, 25)"
            autoComplete="off"
            aria-label="포켓몬 검색"
          />
        </label>
        <div className="chips" role="group" aria-label="세대 선택">
          {GEN_LABELS.map((label, i) => (
            <button key={label} className="chip" aria-pressed={i === gen} onClick={() => onGen(i)}>{label}</button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="타입 선택">
          {Object.entries(TYPES).map(([key, [ko, color, fg]]) => (
            <button
              key={key}
              className="chip type-chip"
              style={cssVars({ '--tc': color, '--tf': fg })}
              aria-pressed={type === key}
              onClick={() => onType(type === key ? null : key)}
            >
              {ko}
            </button>
          ))}
        </div>
        <div className="meta">
          <span>{countText}</span>
          {showReset && <button className="link-btn" onClick={onReset}>필터 초기화</button>}
        </div>
      </div>
    </div>
  );
}
