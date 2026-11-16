import { Fragment, useEffect, useMemo, useState } from 'react';
import { autoRecommend, defaultVG, describeSet, loadSets, popularItems, storyRecommend } from '../api/moves';
import { itemKo } from '../api/names';
import { ITEM_ART, SHOWDOWN_ID, TYPES, VG_KO } from '../lib/constants';
import { entryOf, showdownName } from '../lib/store';
import { formatLabel, normId, slugify, sortFormats } from '../lib/utils';
import type {
  AutoPick, AutoRecommendation, Detail, ItemSuggestion, SetDescription, MoveLearn, SmogonFormats, SmogonSet,
} from '../types';
import { ClsBadge, cssVars, LoadingRow, TypeBadge } from './ui';

// 대안 기술("A 또는 B")이 있으면 한 줄에 하나씩 쌓는다
function SetCard({ name, moves, meta }: SetDescription) {
  return (
    <div className="set">
      <div className="set-name">{name}</div>
      <ol className="set-moves">
        {moves.map((alts, i) => (
          <li key={i} className={alts.length > 1 ? 'alts' : undefined}>
            {alts.map((m, j) => (
              <Fragment key={j}>
                {j > 0 && <i>또는</i>}
                <span className="set-move">
                  {m.type && <span className="tdot" style={cssVars({ '--tc': TYPES[m.type][1] })} title={TYPES[m.type][0]} />}
                  {m.name}
                </span>
                {m.learn !== undefined && <LearnTags learn={m.learn} />}
              </Fragment>
            ))}
          </li>
        ))}
      </ol>
      <LearnPlan moves={moves.flat()} />
      <dl className="set-meta">
        {meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </div>
  );
}

// 도구·특성 이름을 한국어로 바꾸는 데 요청이 필요해서, 다 바뀐 뒤에 한꺼번에 보여준다
function SetList({ sets, d }: { sets: Record<string, SmogonSet>; d: Detail }) {
  const [cards, setCards] = useState<SetDescription[] | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(Object.entries(sets).map(([name, s]) => describeSet(name, s, d)))
      .then((c) => { if (alive) setCards(c); });
    return () => { alive = false; };
  }, [sets, d]);

  if (!cards) return <div className="sets"><LoadingRow>불러오는 중…</LoadingRow></div>;
  return <div className="sets">{cards.map((c) => <SetCard key={c.name} {...c} />)}</div>;
}

// 추천 도구: 한국어 이름을 받아 온 뒤 보여준다 (그 전에는 영어 이름)
function ItemList({ items }: { items: ItemSuggestion[] }) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(items.map((it) => itemKo(it.slug)))
      .then((ko) => { if (alive) setNames(Object.fromEntries(items.map((it, i) => [it.slug, ko[i]]))); });
    return () => { alive = false; };
  }, [items]);

  if (!items.length) return null;
  return (
    <>
      <h4 className="rec-sub">잘 맞는 도구</h4>
      <ul className="items">
        {items.map((it) => (
          <li className="item" key={it.slug}>
            <img src={`${ITEM_ART}/${it.slug}.png`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
            <div>
              <b>{names[it.slug] || it.slug.replace(/-/g, ' ')}</b>
              <small>{it.why}</small>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const levelText = (level: number) => (level === 0 ? '진화할 때' : `Lv.${level}`);

function LearnTags({ learn }: { learn: MoveLearn | null }) {
  if (!learn) return <span className="learn"><span className="how none">이 게임에서는 못 배워요</span></span>;
  return (
    <span className="learn">
      {learn.level !== null && <span className="how level">레벨업 {levelText(learn.level)}</span>}
      {learn.tm && <span className="how tm">기술머신 {learn.tm}</span>}
      {learn.egg && <span className="how egg">알 기술</span>}
      {learn.tutor && <span className="how tutor">기술 가르침</span>}
    </span>
  );
}

// 기술마다 가장 쉬운 방법 하나로 묶어서 정리한다: 레벨업(레벨 순) → 기술머신 → 알 기술 → 기술 가르침
function LearnPlan({ moves }: { moves: { name: string; learn?: MoveLearn | null }[] }) {
  const known = [...new Map(moves.flatMap((m) => (m.learn ? [[m.name, m.learn] as const] : []))).entries()];
  const byLevel = known.filter(([, l]) => l.level !== null).sort((a, b) => a[1].level! - b[1].level!);
  const byTm = known.filter(([, l]) => l.level === null && l.tm);
  const byEgg = known.filter(([, l]) => l.level === null && !l.tm && l.egg);
  const byTutor = known.filter(([, l]) => l.level === null && !l.tm && !l.egg && l.tutor);
  // 항목 하나("TM090 압정뿌리기")는 끊기지 않게 묶고, 항목 사이에서만 줄을 바꾼다
  const rows: [label: string, items: string[], seq: boolean][] = [
    ['레벨업', byLevel.map(([n, l]) => `${levelText(l.level!)} ${n}`), true],
    ['기술머신', byTm.map(([n, l]) => `${l.tm} ${n}`), false],
    ['알 기술', byEgg.map(([n]) => n), false],
    ['기술 가르침', byTutor.map(([n]) => n), false],
  ];
  if (!known.length) return null;
  return (
    <dl className="set-meta learn-plan">
      {rows.filter(([, items]) => items.length).map(([label, items, seq]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={seq ? 'seq' : undefined}>{items.map((it) => <span key={it}>{it}</span>)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PickCard({ title, picked }: { title: string; picked: AutoPick[] }) {
  return (
    <div className="sets">
      <div className="set">
        <div className="set-name">{title}</div>
        <ol className="set-moves">
          {picked.map((m) => (
            <li key={m.slug}>
              <span className="set-move"><TypeBadge type={m.type} /> {m.name}</span>
              <span className="set-extra"><ClsBadge cls={m.cls} />{m.power > 0 && ` 위력 ${m.power}`}</span>
              {m.learn !== undefined && <LearnTags learn={m.learn} />}
            </li>
          ))}
        </ol>
        <LearnPlan moves={picked} />
      </div>
      {picked.some((m) => !m.score) && <p className="rec-note">쓸 만한 공격 기술이 4개가 안 돼서 변화 기술 같은 다른 기술로 채웠어요.</p>}
    </div>
  );
}

function styleText({ atk, spa, mixed }: AutoRecommendation) {
  if (mixed) return `혼합형 (공격 ${atk} · 특공 ${spa})`;
  return atk > spa ? `물리형 (공격 ${atk} > 특공 ${spa})` : `특수형 (특공 ${spa} > 공격 ${atk})`;
}

function StoryRecommend({ id, d }: { id: number; d: Detail }) {
  const rec = useMemo(() => storyRecommend(id, d), [id, d]);
  const game = (rec.vg && VG_KO[rec.vg]) || rec.vg;
  if (!rec.picked.length) return <p className="muted">추천할 공격 기술이 없어요.</p>;
  return (
    <>
      <p className="rec-note">
        {game}에서 레벨업이나 기술머신으로 배우는 기술 중 명중률이 90 이상이고 위력·자속·타입 범위가 좋은 기술로 골랐어요.
        기술마다 몇 레벨에 배우는지, 어떤 기술머신이 필요한지 같이 적었어요.
      </p>
      <PickCard title={`스토리용 · ${styleText(rec)}`} picked={rec.picked} />
      <ItemList items={rec.items} />
    </>
  );
}

function AutoRecommend({ id, d }: { id: number; d: Detail }) {
  const rec = useMemo(() => autoRecommend(id, d), [id, d]);
  if (!rec.picked.length) return <p className="muted">추천할 공격 기술이 없어요.</p>;
  return (
    <>
      <p className="rec-note">
        대전 데이터에 없는 포켓몬이라 종족값과 {(rec.vg && VG_KO[rec.vg]) || rec.vg}에서 배우는 기술의 위력·명중률·자속 보정으로 자동으로 골랐어요.
        기술마다 배우는 방법도 같이 적었어요. 참고용으로만 봐주세요.
      </p>
      <PickCard title={`자동 추천 · ${styleText(rec)}`} picked={rec.picked} />
      <ItemList items={rec.items} />
    </>
  );
}

function BattleRecommend({ id, d }: { id: number; d: Detail }) {
  // undefined: 불러오는 중, null: 대전 데이터에 없음
  const [sets, setSets] = useState<SmogonFormats | null | undefined>(undefined);
  const [format, setFormat] = useState<string | null>(null);
  const popular = useMemo(() => (sets ? popularItems(sets) : []), [sets]);

  useEffect(() => {
    let alive = true;
    const entry = entryOf(id);
    loadSets()
      .then((all) => (entry && all[SHOWDOWN_ID[id] || normId(showdownName(entry))]) || null)
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
  const entry = entryOf(id);
  const slug = entry ? slugify(showdownName(entry)) : '';
  return (
    <>
      <p className="rec-note">
        포켓몬 대전 커뮤니티 <a href={`https://www.smogon.com/dex/sv/pokemon/${slug}/`} target="_blank" rel="noopener noreferrer">Smogon</a>이
        정리한 9세대(스칼렛·바이올렛) 대전용 세트예요. 룰(티어)마다 추천이 달라요.
        기술마다 {(defaultVG(d) && VG_KO[defaultVG(d)!]) || '이 게임'}에서 배우는 방법을 같이 적었어요.
      </p>
      <div className="chips small rec-formats">
        {formats.map((f) => (
          <button key={f} className="chip" aria-pressed={f === format} onClick={() => setFormat(f)}>{formatLabel(f)}</button>
        ))}
      </div>
      {format && <SetList key={format} sets={sets[format]} d={d} />}
      <ItemList items={popular} />
    </>
  );
}

type Mode = 'story' | 'battle';
const MODES: [Mode, string][] = [['story', '스토리용'], ['battle', '대전용']];

export default function Recommend({ id, d }: { id: number; d: Detail }) {
  const [mode, setMode] = useState<Mode>('story');
  return (
    <>
      <div className="rec-modes" role="tablist">
        {MODES.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={mode === key} className="rec-mode" onClick={() => setMode(key)}>{label}</button>
        ))}
      </div>
      {mode === 'story' ? <StoryRecommend id={id} d={d} /> : <BattleRecommend id={id} d={d} />}
    </>
  );
}
