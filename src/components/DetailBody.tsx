import { store } from '../lib/store';
import { art, genderText } from '../lib/utils';
import type { Detail } from '../types';
import type { GoTo } from './DetailModal';
import Evolution from './Evolution';
import FormCards from './FormCards';
import GenderForms from './GenderForms';
import Matchup from './Matchup';
import MoveList from './MoveList';
import Recommend from './Recommend';
import StatBars from './StatBars';
import { Section } from './ui';

// 상세 화면 본문. 포켓몬이 바뀌면 key로 새로 만들어서 기술 목록·추천의 선택 상태도 초기화된다.
export default function DetailBody({ id, d, shiny, onGo }: { id: number; d: Detail; shiny: boolean; onGo: GoTo }) {
  const p = store.list[id - 1];
  return (
    <>
      <p className="flavor">{d.flavor || '아직 도감 설명이 없어요.'}</p>
      <div className="info">
        <div><span>키</span><b>{d.height} m</b></div>
        <div><span>몸무게</span><b>{d.weight} kg</b></div>
        <div><span>성비</span><b>{genderText(d.genderRate)}</b></div>
      </div>

      {d.genderArt && (
        <Section title="암수 모습">
          <p className="rec-note">수컷과 암컷의 모습이 조금 달라요.</p>
          <GenderForms art={d.genderArt} shiny={shiny} name={p.ko || p.en} />
        </Section>
      )}

      <Section title="타입 상성"><Matchup types={p.types} /></Section>

      <Section title="특성">
        {d.abilities.map((a) => (
          <div className="ability" key={a.name}>
            <b>{a.name}</b>{a.hidden && <em>숨겨진 특성</em>}
            {a.desc && <p>{a.desc}</p>}
          </div>
        ))}
      </Section>

      <Section title="종족값"><StatBars stats={d.stats} /></Section>

      <Section title="진화"><Evolution d={d} current={id} onGo={onGo} /></Section>

      {d.regionals.length > 0 && (
        <Section id="d-regionals" title="리전폼">
          <p className="rec-note">다른 지방에서 환경에 맞게 모습과 타입이 달라진 포켓몬이에요.</p>
          <FormCards forms={d.regionals} baseStats={d.stats} fallbackImg={art(id)} />
        </Section>
      )}

      {d.gimmicks.length > 0 && (
        <Section title="진화 기믹">
          <p className="rec-note">메가진화는 X·Y부터 울트라썬·울트라문까지와 레전드 Z-A에서, 거다이맥스는 소드·실드에서 쓸 수 있어요.</p>
          <FormCards forms={d.gimmicks} baseStats={d.stats} fallbackImg={art(id)} />
        </Section>
      )}

      <Section title="추천 기술 배치"><Recommend id={id} d={d} /></Section>

      <Section title="기술 목록"><MoveList d={d} /></Section>
    </>
  );
}
