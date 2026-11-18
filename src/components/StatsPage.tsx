import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { loadStatTable, rankEntries } from '../api/ranking';
import { GENS, RANK_STATS, REGIONS, TYPES } from '../lib/constants';
import { art, entryMatcher, pad, statColor } from '../lib/utils';
import type { RankRow, StatTable } from '../types';
import { cssVars, Status, TypeBadge } from './ui';

const GEN_LABELS = ['전체', ...GENS.map((_, i) => `${i + 1}세대`)];
const STAT_SHORT = ['HP', '공격', '방어', '특공', '특방', '스피드'];
const PAGE = 30;

// 검색은 보이는 줄만 줄이고 순위 번호는 그대로 둔다. 타입 이름("드래곤")을 그대로 치면 그 타입만 남긴다
function searchRows(rows: RankRow[], query: string) {
  const type = Object.keys(TYPES).find((k) => TYPES[k][0] === query.trim());
  if (type) return rows.filter((r) => r.entry.types.includes(type));
  const match = entryMatcher(query);
  return match ? rows.filter((r) => match(r.entry)) : rows;
}

function RankItem({ r, stat, max, onOpen }: { r: RankRow; stat: number; max: number; onOpen: (id: number) => void }) {
  const region = r.entry.region && REGIONS[r.entry.region];
  // 합계는 6으로 나눠 능력치 하나와 같은 기준으로 색을 고른다
  const color = statColor(stat < 0 ? r.value / 6 : r.value);
  return (
    <li>
      <button className={`rank-row${r.rank <= 3 ? ` top${r.rank}` : ''}`} onClick={() => onOpen(r.entry.id)}>
        <span className="rank-no">{r.rank}</span>
        <img src={art(r.entry.id)} alt="" loading="lazy" decoding="async" />
        <span className="rank-main">
          <span className="rank-name">
            <b>{r.entry.ko || r.entry.en}</b>
            <small>No.{pad(r.entry.base)}</small>
            {region && <span className="region-tag" style={cssVars({ '--rc': region[1] })}>{region[0]}</span>}
          </span>
          <span className="types">{r.entry.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
          <span className="rank-stats">
            {r.stats.map((v, i) => <span key={i} className={i === stat ? 'on' : undefined}>{STAT_SHORT[i]} {v}</span>)}
            <span className={stat < 0 ? 'on' : undefined}>합계 {r.total}</span>
          </span>
        </span>
        <span className="rank-value">
          <b>{r.value}</b>
          <span className="bar"><i style={cssVars({ '--w': `${(r.value / max) * 100}%`, '--c': color })} /></span>
        </span>
      </button>
    </li>
  );
}

interface StatsPageProps {
  onOpen: (id: number) => void;
  /** 상세 화면의 이전/다음을 순위 순서로 하도록 지금 보이는 순서를 알린다 */
  onOrder: (ids: number[] | null) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export default function StatsPage({ onOpen, onOrder, searchRef }: StatsPageProps) {
  const [table, setTable] = useState<StatTable | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [gen, setGen] = useState(0);
  const [stat, setStat] = useState(-1);
  const [finalOnly, setFinalOnly] = useState(true);
  const [legends, setLegends] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    let alive = true;
    setLoadError(false);
    loadStatTable()
      .then((t) => { if (alive) setTable(t); })
      .catch((err: unknown) => { console.error(err); if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(() => (table ? rankEntries(table, { gen, stat, finalOnly, legends }) : []), [table, gen, stat, finalOnly, legends]);
  const found = useMemo(() => searchRows(rows, query), [rows, query]);
  // 검색 결과가 없을 때, 최종 진화만·전설 필터 때문에 빠진 포켓몬이 있으면 알려 준다
  const hidden = useMemo(() => (table && query.trim() && !found.length
    ? searchRows(rankEntries(table, { gen, stat, finalOnly: false, legends: true }), query)
    : []), [table, query, found, gen, stat]);
  const order = useMemo(() => found.map((r) => r.entry.id), [found]);
  useEffect(() => { onOrder(order); }, [order, onOrder]);
  useEffect(() => () => onOrder(null), [onOrder]);

  // 조건을 바꾸면 다시 위에서 30개만 보여준다
  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setLimit(PAGE); };
  const statLabel = RANK_STATS.find(([k]) => k === stat)![1];

  return (
    <>
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
              onChange={(e) => change(setQuery)(e.target.value)}
              placeholder="이름·번호·타입으로 순위 찾기 (예: 한카리아스, 445, 드래곤)"
              autoComplete="off"
              aria-label="순위에서 포켓몬 검색"
            />
          </label>
          <div className="chips" role="group" aria-label="세대 선택">
            {GEN_LABELS.map((label, i) => (
              <button key={label} className="chip" aria-pressed={i === gen} onClick={() => change(setGen)(i)}>{label}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="능력치 선택">
            {RANK_STATS.map(([key, label]) => (
              <button key={key} className="chip" aria-pressed={key === stat} onClick={() => change(setStat)(key)}>{label}</button>
            ))}
            <span className="chip-gap" />
            <button className="chip" aria-pressed={finalOnly} onClick={() => change(setFinalOnly)(!finalOnly)}>최종 진화만</button>
            <button className="chip" aria-pressed={legends} onClick={() => change(setLegends)(!legends)}>전설·환상 포함</button>
          </div>
          <div className="meta">
            <span>{table ? `${GEN_LABELS[gen]} ${statLabel} 순위 · ${query.trim() ? `${rows.length}마리 중 ${found.length}마리` : `${rows.length}마리`}` : ''}</span>
            {query.trim() && <button className="link-btn" onClick={() => change(setQuery)('')}>검색 지우기</button>}
          </div>
        </div>
      </div>

      <main className="wrap ranking">
        <p className="rec-note">
          종족값(포켓몬마다 정해진 기본 능력치)이 높은 순서예요. 같은 값이면 같은 순위이고, 합계가 높은 포켓몬을 먼저 보여줘요.
          리전폼은 원래 포켓몬의 세대로 셈하고, 메가진화 같은 배틀 중 모습은 넣지 않았어요.
        </p>
        {table && (
          <>
            <ol className="rank-list">
              {found.slice(0, limit).map((r) => <RankItem key={r.entry.id} r={r} stat={stat} max={rows[0].value} onOpen={onOpen} />)}
            </ol>
            {!found.length && (hidden.length ? (
              <Status>
                <p>
                  {finalOnly && !legends ? '최종 진화가 아니거나 전설·환상이라서' : finalOnly ? '최종 진화가 아니라서' : '전설·환상이라서'} 순위에서 빠져 있어요:{' '}
                  {hidden.slice(0, 3).map((r) => r.entry.ko || r.entry.en).join(', ')}{hidden.length > 3 && ` 외 ${hidden.length - 3}마리`}
                </p>
                <button className="primary-btn" onClick={() => { setFinalOnly(false); setLegends(true); }}>필터 끄고 보기</button>
              </Status>
            ) : <Status><p>{rows.length && query.trim() ? '검색어에 맞는 포켓몬이 없어요.' : '조건에 맞는 포켓몬이 없어요.'}</p></Status>)}
            {found.length > limit && (
              <button className="primary-btn rank-more" onClick={() => setLimit(limit + PAGE)}>
                더 보기 (남은 {found.length - limit}마리)
              </button>
            )}
          </>
        )}
        {!table && !loadError && <Status wobble><p>능력치 데이터를 불러오는 중…</p></Status>}
        {loadError && (
          <Status>
            <p>데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
            <button className="primary-btn" onClick={load}>다시 시도</button>
          </Status>
        )}
      </main>
    </>
  );
}
