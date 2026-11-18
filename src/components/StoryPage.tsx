import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStatTable } from '../api/ranking';
import { loadDexes, storyPicks } from '../api/story';
import { REGIONS, STORY_CAUTION, STORY_GAMES, TYPES } from '../lib/constants';
import { entryOf } from '../lib/store';
import { art } from '../lib/utils';
import type { DexTable, StatTable, StoryPick } from '../types';
import { cssVars, Status, TypeBadge } from './ui';

/** 모든 타입을 볼 때 타입마다 보여줄 수 */
const TOP = 5;
const PAGE = 20;

function StoryCard({ rank, p, onOpen }: { rank: number; p: StoryPick; onOpen: (id: number) => void }) {
  const [hp, atk, def, spa, spd, spe] = p.stats;
  const region = p.entry.region && REGIONS[p.entry.region];
  const caution = STORY_CAUTION[p.entry.base];
  return (
    <li>
      <button className="story-card" onClick={() => onOpen(p.entry.id)}>
        <span className="story-rank">{rank}</span>
        <img src={art(p.entry.id)} alt="" loading="lazy" decoding="async" />
        <span className="story-main">
          <span className="rank-name">
            <b>{p.entry.ko || p.entry.en}</b>
            {region && <span className="region-tag" style={cssVars({ '--rc': region[1] })}>{region[0]}</span>}
          </span>
          <span className="types">{p.entry.types.map((t) => <TypeBadge key={t} type={t} />)}</span>
          {p.line.length > 1 && (
            <span className="story-line">키우기: {p.line.map((id) => entryOf(id)?.ko ?? `#${id}`).join(' → ')}</span>
          )}
          <span className="rank-stats">
            <span className="on">{atk >= spa ? `공격 ${atk}` : `특공 ${spa}`}</span>
            <span className="on">스피드 {spe}</span>
            <span>HP {hp} · 방어 {def} · 특방 {spd}</span>
            <span>합계 {p.total}</span>
          </span>
          {caution && <span className="story-caution">{caution}</span>}
        </span>
      </button>
    </li>
  );
}

interface StoryPageProps {
  onOpen: (id: number) => void;
  /** 상세 화면의 이전/다음을 화면에 보이는 순서로 하도록 알린다 */
  onOrder: (ids: number[] | null) => void;
}

export default function StoryPage({ onOpen, onOrder }: StoryPageProps) {
  const [data, setData] = useState<{ table: StatTable; dexes: DexTable } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [gameKey, setGameKey] = useState('sv');
  const [type, setType] = useState<string | null>(null);
  const [legends, setLegends] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const load = useCallback(() => {
    let alive = true;
    setLoadError(false);
    Promise.all([loadStatTable(), loadDexes()])
      .then(([table, dexes]) => { if (alive) setData({ table, dexes }); })
      .catch((err: unknown) => { console.error(err); if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);
  useEffect(load, [load]);

  const game = STORY_GAMES.find((g) => g.key === gameKey)!;
  const picks = useMemo(() => (data ? storyPicks(game, data.dexes, data.table, { legends }) : []), [data, game, legends]);
  // 타입 순서(TYPES)대로, 타입마다 점수 순. 타입을 하나 고르면 그 타입만 더 많이
  const groups = useMemo(() => Object.keys(TYPES)
    .filter((t) => !type || t === type)
    .map((t) => {
      const all = picks.filter((p) => p.entry.types.includes(t));
      return { type: t, all, shown: all.slice(0, type ? limit : TOP) };
    })
    .filter((g) => g.all.length), [picks, type, limit]);

  const order = useMemo(() => groups.flatMap((g) => g.shown.map((p) => p.entry.id)), [groups]);
  useEffect(() => { onOrder(order); }, [order, onOrder]);
  useEffect(() => () => onOrder(null), [onOrder]);

  const pickType = (t: string | null) => { setType(t); setLimit(PAGE); window.scrollTo(0, 0); };

  return (
    <>
      <div className="controls">
        <div className="wrap">
          <div className="chips" role="group" aria-label="게임 선택">
            {STORY_GAMES.map((g) => (
              <button key={g.key} className="chip" aria-pressed={g.key === gameKey} onClick={() => { setGameKey(g.key); setLimit(PAGE); }}>{g.ko}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="타입 선택">
            <button className="chip" aria-pressed={!type} onClick={() => pickType(null)}>모든 타입</button>
            {Object.entries(TYPES).map(([key, [ko, color, fg]]) => (
              <button
                key={key}
                className="chip type-chip"
                style={cssVars({ '--tc': color, '--tf': fg })}
                aria-pressed={type === key}
                onClick={() => pickType(type === key ? null : key)}
              >
                {ko}
              </button>
            ))}
          </div>
          <div className="meta">
            <span>{data ? `${game.ko} · 최종 모습 ${picks.length}마리` : ''}</span>
            <button className="chip small-toggle" aria-pressed={legends} onClick={() => setLegends(!legends)}>전설·환상·울트라비스트 포함</button>
          </div>
        </div>
      </div>

      <main className="wrap story">
        <p className="rec-note">
          {game.ko}의 지방 도감에 나오는 포켓몬 중, 그 게임에서 더 진화하지 않는 모습을 타입별로 골랐어요.
          스토리에서는 빨리 쓰러뜨리는 게 중요해서 공격·특공 중 높은 쪽과 스피드를 더 쳐줬어요.
          진화 전 모습부터 잡아서 키우면 돼요. 타입은 최신 세대 기준이에요.
        </p>
        {data && (
          <div className={type ? 'story-one' : 'story-types'}>
            {groups.map((g) => (
              <section key={g.type} className="story-type" style={cssVars({ '--tc': TYPES[g.type][1] })}>
                <h3>
                  <TypeBadge type={g.type} />
                  <small>{type || g.all.length <= TOP ? `${g.all.length}마리` : `${g.all.length}마리 중 상위 ${TOP}`}</small>
                </h3>
                <ol className="story-list">
                  {g.shown.map((p, i) => <StoryCard key={p.entry.id} rank={i + 1} p={p} onOpen={onOpen} />)}
                </ol>
                {!type && g.all.length > TOP && (
                  <button className="link-btn story-more" onClick={() => pickType(g.type)}>{TYPES[g.type][0]} 타입 더 보기</button>
                )}
                {type && g.all.length > limit && (
                  <button className="primary-btn rank-more" onClick={() => setLimit(limit + PAGE)}>더 보기 (남은 {g.all.length - limit}마리)</button>
                )}
              </section>
            ))}
            {!groups.length && <Status><p>이 게임에는 이 타입 포켓몬이 없어요.</p></Status>}
          </div>
        )}
        {!data && !loadError && <Status wobble><p>게임별 도감을 불러오는 중…</p></Status>}
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
