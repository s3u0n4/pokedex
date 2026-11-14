import { memo } from 'react';
import { REGIONS, TYPES } from '../lib/constants';
import { art, pad } from '../lib/utils';
import type { ListEntry } from '../types';
import { cssVars, TypeBadge } from './ui';

interface CardProps {
  p: ListEntry;
  onOpen: (p: ListEntry) => void;
}

// 목록 카드: 원래 포켓몬 바로 뒤에 그 포켓몬의 리전폼이 온다 (base = 도감 번호)
const PokemonCard = memo(function PokemonCard({ p, onOpen }: CardProps) {
  const region = p.region && REGIONS[p.region];
  return (
    <button
      className={`card${region ? ' form-card' : ''}`}
      data-id={p.base}
      style={cssVars({ '--tc': TYPES[p.types[0]]?.[1] || '#999' })}
      onClick={() => onOpen(p)}
    >
      <span className="num">
        No.{pad(p.base)}
        {region && <span className="region-tag" style={cssVars({ '--rc': region[1] })}>{region[0]}</span>}
      </span>
      <span className="art"><img src={art(p.id)} alt="" loading="lazy" decoding="async" /></span>
      <span className="name">{p.ko || p.en}</span>
      <span className="en">{p.en}</span>
      <span className="types">{p.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
    </button>
  );
});

export default function PokemonGrid({ entries, onOpen }: { entries: ListEntry[]; onOpen: (p: ListEntry) => void }) {
  return (
    <div className="grid">
      {entries.map((p) => <PokemonCard key={p.id} p={p} onOpen={onOpen} />)}
    </div>
  );
}
