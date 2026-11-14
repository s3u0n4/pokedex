import { STAT_KO } from '../lib/constants';
import { statColor } from '../lib/utils';
import type { Stat } from '../types';
import { cssVars } from './ui';

export function Bar({ value }: { value: number }) {
  return (
    <div className="bar">
      <i style={cssVars({ '--w': `${Math.min(100, value / 255 * 100)}%`, '--c': statColor(value) })} />
    </div>
  );
}

export default function StatBars({ stats }: { stats: Stat[] }) {
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  return (
    <>
      {stats.map((s) => (
        <div className="stat" key={s.key}>
          <span>{STAT_KO[s.key] || s.key}</span><b>{s.value}</b>
          <Bar value={s.value} />
        </div>
      ))}
      <div className="stat total"><span>합계</span><b>{total}</b><span /></div>
    </>
  );
}
