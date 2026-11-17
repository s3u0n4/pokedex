import { useEffect, useState } from 'react';
import { setsFor } from '../api/moves';
import { recommendNatures } from '../api/natures';
import { NATURES, NATURES_KO, NATURE_STATS } from '../lib/constants';
import { entryOf, nameOf } from '../lib/store';
import type { Detail, NatureSuggestion } from '../types';
import { LoadingRow } from './ui';

function NatureCard({ rank, nature }: { rank: number; nature: NatureSuggestion }) {
  const i = NATURES.indexOf(nature.name);
  const up = Math.floor(i / 5), down = i % 5;
  return (
    <li className="nature">
      <span className="nature-rank">{rank}</span>
      <div>
        <div className="nature-head">
          <b>{NATURES_KO[i] ?? nature.name}</b>
          {up === down
            ? <span className="nature-stat">보정 없음</span>
            : <span className="nature-stats"><span className="nature-stat up">{NATURE_STATS[up]}↑</span><span className="nature-stat down">{NATURE_STATS[down]}↓</span></span>}
        </div>
        <small>{nature.why}</small>
        {nature.sets > 0 && <small className="nature-src">Smogon 세트 {nature.sets}개에서 사용</small>}
      </div>
    </li>
  );
}

// Smogon 세트를 받은 뒤에 순위를 정한다 (받지 못하면 종족값으로만 고른다)
export default function Natures({ id, d }: { id: number; d: Detail }) {
  const [natures, setNatures] = useState<NatureSuggestion[] | null>(null);
  useEffect(() => {
    let alive = true;
    setsFor(id).then((sets) => { if (alive) setNatures(recommendNatures(d, sets)); });
    return () => { alive = false; };
  }, [id, d]);

  if (!natures) return <LoadingRow>불러오는 중…</LoadingRow>;
  const fromSets = natures.some((n) => n.sets > 0);
  // 성격은 진화해도 그대로라서, 진화 전 포켓몬이면 최종 진화도 같이 보라고 안내한다 (리전폼은 원래 종의 단계로 본다)
  const base = entryOf(id)?.base ?? id;
  const last = d.stages[d.stages.length - 1] ?? [];
  const finals = d.stages.some((ids) => ids.includes(base)) && !last.includes(base) ? last.map(nameOf) : [];
  return (
    <>
      <p className="rec-note">
        {fromSets
          ? 'Smogon 대전 세트에서 많이 쓰는 성격 순서예요. 모자라면 종족값으로 골라 채웠어요.'
          : '종족값으로 골랐어요. 높은 능력치를 올리고, 쓰지 않는 능력치를 낮추는 성격이 좋아요.'}
      </p>
      <ol className="natures">
        {natures.map((n, i) => <NatureCard key={n.name} rank={i + 1} nature={n} />)}
      </ol>
      {finals.length > 0 && (
        <p className="rec-note natures-evo">진화해도 성격은 바뀌지 않아요. {finals.join(' · ')}까지 키울 거라면 최종 진화의 추천 성격도 확인해 보세요.</p>
      )}
    </>
  );
}
