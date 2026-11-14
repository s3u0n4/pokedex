import { Fragment, useEffect, useState } from 'react';
import { autoRecommend, describeSet, loadSets } from '../api/moves';
import { SHOWDOWN_ID, TYPES, VG_KO } from '../lib/constants';
import { store } from '../lib/store';
import { formatLabel, normId, slugify, sortFormats } from '../lib/utils';
import type { Detail, SetDescription, SmogonFormats, SmogonSet } from '../types';
import { ClsBadge, cssVars, LoadingRow, TypeBadge } from './ui';

function SetCard({ name, moves, meta }: SetDescription) {
  return (
    <div className="set">
      <div className="set-name">{name}</div>
      <ol className="set-moves">
        {moves.map((alts, i) => (
          <li key={i}>
            {alts.map((m, j) => (
              <Fragment key={j}>
                {j > 0 && <i>또는</i>}
                <span className="set-move">
                  {m.type && <span className="tdot" style={cssVars({ '--tc': TYPES[m.type][1] })} title={TYPES[m.type][0]} />}
                  {m.name}
                </span>
              </Fragment>
            ))}
          </li>
        ))}
      </ol>
      <dl className="set-meta">
        {meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </div>
  );
}

// 도구·특성 이름을 한국어로 바꾸는 데 요청이 필요해서, 다 바뀐 뒤에 한꺼번에 보여준다
function SetList({ sets }: { sets: Record<string, SmogonSet> }) {
  const [cards, setCards] = useState<SetDescription[] | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(Object.entries(sets).map(([name, s]) => describeSet(name, s)))
      .then((c) => { if (alive) setCards(c); });
    return () => { alive = false; };
  }, [sets]);

  if (!cards) return <div className="sets"><LoadingRow>불러오는 중…</LoadingRow></div>;
  return <div className="sets">{cards.map((c) => <SetCard key={c.name} {...c} />)}</div>;
}

function AutoRecommend({ id, d }: { id: number; d: Detail }) {
  const { picked, atk, spa, vg, mixed } = autoRecommend(id, d);
  if (!picked.length) return <p className="muted">추천할 공격 기술이 없어요.</p>;
  const style = mixed ? `혼합형 (공격 ${atk} · 특공 ${spa})`
    : atk > spa ? `물리형 (공격 ${atk} > 특공 ${spa})` : `특수형 (특공 ${spa} > 공격 ${atk})`;
  return (
    <>
      <p className="rec-note">
        대전 데이터에 없는 포켓몬이라 종족값과 {(vg && VG_KO[vg]) || vg}에서 배우는 기술의 위력·명중률·자속 보정으로 자동으로 골랐어요. 참고용으로만 봐주세요.
      </p>
      <div className="sets">
        <div className="set">
          <div className="set-name">자동 추천 · {style}</div>
          <ol className="set-moves">
            {picked.map((m) => (
              <li key={m.slug}>
                <span className="set-move"><TypeBadge type={m.type} /> {m.name}</span>
                <span className="set-extra"><ClsBadge cls={m.cls} /> 위력 {m.power}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

export default function Recommend({ id, d }: { id: number; d: Detail }) {
  // undefined: 불러오는 중, null: 대전 데이터에 없음
  const [sets, setSets] = useState<SmogonFormats | null | undefined>(undefined);
  const [format, setFormat] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadSets()
      .then((all) => all[SHOWDOWN_ID[id] || normId(store.list[id - 1].en)] || null)
      .catch((err: unknown) => { console.error(err); return null; })
      .then((s) => {
        if (!alive) return;
        setSets(s);
        if (s) setFormat(sortFormats(Object.keys(s))[0]);
      });
    return () => { alive = false; };
  }, [id]);

  if (sets === undefined) return <LoadingRow>대전 데이터를 불러오는 중…</LoadingRow>;
  if (!sets) return <AutoRecommend id={id} d={d} />;

  const formats = sortFormats(Object.keys(sets));
  const slug = slugify(store.list[id - 1].en);
  return (
    <>
      <p className="rec-note">
        포켓몬 대전 커뮤니티 <a href={`https://www.smogon.com/dex/sv/pokemon/${slug}/`} target="_blank" rel="noopener noreferrer">Smogon</a>이
        정리한 9세대(스칼렛·바이올렛) 대전용 세트예요. 룰(티어)마다 추천이 달라요.
      </p>
      <div className="chips small">
        {formats.map((f) => (
          <button key={f} className="chip" aria-pressed={f === format} onClick={() => setFormat(f)}>{formatLabel(f)}</button>
        ))}
      </div>
      {format && <SetList key={format} sets={sets[format]} />}
    </>
  );
}
