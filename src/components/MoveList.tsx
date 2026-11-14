import { useMemo, useState } from 'react';
import { defaultVG, moveRows, versionGroups } from '../api/moves';
import { LEARN_METHODS, VG_KO, VG_ORDER } from '../lib/constants';
import type { Detail } from '../types';
import { ClsBadge, TypeBadge } from './ui';

export default function MoveList({ d }: { d: Detail }) {
  const vgs = useMemo(
    () => Object.keys(versionGroups(d)).sort((a, b) => VG_ORDER.indexOf(b) - VG_ORDER.indexOf(a)),
    [d],
  );
  const [vg, setVg] = useState(() => defaultVG(d));
  const [method, setMethod] = useState('level-up');
  const methods = useMemo(
    () => LEARN_METHODS.map(([key, label]) => ({ key, label, rows: moveRows(d, vg, key) })).filter((m) => m.rows.length),
    [d, vg],
  );

  if (!vgs.length) return <p className="muted">기술 정보가 없어요.</p>;

  // 고른 게임에 지금 방식(예: 알 기술)이 없으면 첫 번째 방식을 보여준다
  const active = methods.find((m) => m.key === method) || methods[0];
  const isLevel = active?.key === 'level-up';
  const isMachine = active?.key === 'machine';

  return (
    <>
      <div className="move-tools">
        <select aria-label="게임 선택" value={vg ?? ''} onChange={(e) => setVg(e.target.value)}>
          {vgs.map((v) => <option key={v} value={v}>{VG_KO[v] || v}</option>)}
        </select>
        <div className="chips small">
          {methods.map((m) => (
            <button key={m.key} className="chip" aria-pressed={m.key === active?.key} onClick={() => setMethod(m.key)}>
              {m.label}<span className="n">{m.rows.length}</span>
            </button>
          ))}
        </div>
      </div>
      {active ? (
        <div className="table-wrap">
          <table className="moves">
            <thead>
              <tr>
                {isLevel && <th className="r">Lv.</th>}
                {isMachine && <th>번호</th>}
                <th>기술</th><th>타입</th><th>분류</th><th className="r">위력</th><th className="r">명중</th><th className="r">PP</th>
              </tr>
            </thead>
            <tbody>
              {active.rows.map((r, i) => (
                <tr key={`${r.slug}-${r.level}-${i}`}>
                  {isLevel && <td className="r">{r.level === 0 ? '진화' : r.level}</td>}
                  {isMachine && <td className="tm">{r.tm || '—'}</td>}
                  <td className="mname">{r.name}</td>
                  <td><TypeBadge type={r.type} /></td>
                  <td><ClsBadge cls={r.cls} /></td>
                  <td className="r">{r.power || '—'}</td>
                  <td className="r">{r.acc || '—'}</td>
                  <td className="r">{r.pp || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">이 게임에서 배우는 기술 정보가 없어요.</p>
      )}
    </>
  );
}
