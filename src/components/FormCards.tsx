import { STAT_KO } from '../lib/constants';
import type { FormCardData, Stat } from '../types';
import { Bar } from './StatBars';
import { cssVars, TypeBadges, WeaknessBadges } from './ui';

function Diff({ value }: { value: number }) {
  if (!value) return <em />;
  return <em className={value > 0 ? 'up' : 'down'}>{value > 0 ? '+' : ''}{value}</em>;
}

interface FormCardsProps {
  forms: FormCardData[];
  baseStats: Stat[];
  fallbackImg: string;
}

// 리전폼·진화 기믹 카드 (능력치는 원래 모습과 비교해서 보여준다)
export default function FormCards({ forms, baseStats, fallbackImg }: FormCardsProps) {
  const baseTotal = baseStats.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="gimmicks">
      {forms.map((g) => {
        const same = g.stats.every((s, i) => s.value === baseStats[i]?.value);
        const total = g.stats.reduce((sum, s) => sum + s.value, 0);
        return (
          <div className="gimmick" key={g.key} style={cssVars({ '--gc': g.color })}>
            <div className="g-art"><img src={g.img || fallbackImg} alt="" loading="lazy" /></div>
            <div>
              <span className="g-label">{g.label}</span>
              <div className="g-name">{g.name}</div>
              <TypeBadges types={g.types} />
              {g.how && <p className="g-how">{g.how}</p>}
              {g.ability && <div className="g-row"><span>특성</span><b>{g.ability}</b></div>}
              <div className="g-row g-weak"><span>약점</span><span className="types"><WeaknessBadges types={g.types} /></span></div>
              {same ? (
                <p className="g-note">능력치는 원래 모습과 같아요.</p>
              ) : (
                <div className="g-stats">
                  {g.stats.map((s, i) => (
                    <div className="g-stat" key={s.key}>
                      <span>{STAT_KO[s.key] || s.key}</span><b>{s.value}</b>
                      <Bar value={s.value} />
                      <Diff value={s.value - (baseStats[i]?.value || 0)} />
                    </div>
                  ))}
                  <div className="g-stat total"><span>합계</span><b>{total}</b><span /><Diff value={total - baseTotal} /></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
