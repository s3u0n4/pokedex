import { Fragment } from 'react';
import { REGIONS } from '../lib/constants';
import { nameOf, store } from '../lib/store';
import { art } from '../lib/utils';
import type { Detail, RegionalForm } from '../types';
import type { GoTo } from './DetailModal';
import { cssVars } from './ui';

interface Mon {
  sid: number;
  form?: RegionalForm;
}

// 진화 칸: 단계마다 원래 모습 뒤에 리전폼을 같이 그린다 (달마 모드는 배틀 중 모습이라 뺀다)
export default function Evolution({ d, current, onGo }: { d: Detail; current: number; onGo: GoTo }) {
  if (d.stages.length < 2) return <p className="muted">진화하지 않는 포켓몬이에요.</p>;

  const stages: Mon[][] = d.stages.map((ids) => ids.flatMap((sid) => [
    { sid },
    ...store.forms.filter((f) => f.base === sid && !f.name.endsWith('-zen')).map((form) => ({ sid, form })),
  ]));

  return (
    <div className="evo">
      {stages.map((mons, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="evo-arrow" aria-hidden="true">›</span>}
          <div className={`evo-stage${mons.length > 2 ? ' many' : ''}`}>
            {mons.map(({ sid, form }) => {
              const text = form ? d.formEvoText[form.name] : d.evoText[sid];
              const classes = ['evo-mon', (form ? form.id : sid) === current && 'current', form && 'regional'].filter(Boolean).join(' ');
              return (
                <button
                  key={form ? form.name : sid}
                  className={classes}
                  style={form ? cssVars({ '--rc': REGIONS[form.region][1] }) : undefined}
                  onClick={() => onGo(form ? form.id : sid)}
                >
                  <img src={art(form ? form.id : sid)} alt="" loading="lazy" />
                  <span>{form ? form.ko : nameOf(sid)}</span>
                  {text && <small className="evo-cond">{text}</small>}
                </button>
              );
            })}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
