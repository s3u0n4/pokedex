import type { KeyboardEvent } from 'react';
import type { RaidMapDef } from '../lib/raidMap';

// 긴 이름은 첫 띄어쓰기에서 두 줄로 나눈다 (거인의 거울 연못 → 거인의 / 거울 연못)
function labelLines(name: string) {
  const i = name.indexOf(' ');
  return name.length > 7 && i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name];
}

// Enter·스페이스로도 누를 수 있게
const pressable = (label: string, pressed: boolean, onPress: () => void) => ({
  role: 'button',
  tabIndex: 0,
  'aria-label': label,
  'aria-pressed': pressed,
  onClick: onPress,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); }
  },
});

/** 지도에 찍을 굴 하나 */
export interface RaidMapDot {
  no: number;
  en: string;
  x: number;
  y: number;
}

interface RaidMapProps {
  map: RaidMapDef;
  /** 영어 장소 이름 → 한국어 이름 */
  names: Record<string, string>;
  /** 필터·검색 중일 때 장소마다 조건에 맞는 굴 수 (아니면 null) */
  counts: Record<string, number> | null;
  selected: string | null;
  onSelect: (en: string | null) => void;
  dots: RaidMapDot[];
  /** 목록에서 가리키고 있는 굴 번호들 (지도에서 강조) */
  focus: number[];
  onDen: (dot: RaidMapDot) => void;
}

export default function RaidMap({ map, names, counts, selected, onSelect, dots, focus, onDen }: RaidMapProps) {
  const f = map.font;
  const sel = map.cells.find((c) => c.en === selected);
  return (
    <svg className="raid-map" viewBox={map.viewBox} role="group" aria-label={`${map.name} 지도`}>
      {map.cells.map(({ en, terrain, polys }) => {
        const name = names[en] ?? en;
        const count = counts ? counts[en] ?? 0 : null;
        const cls = ['map-cell', terrain, en === selected && 'selected', count === 0 && 'dim'].filter(Boolean).join(' ');
        const press = pressable(
          count === null ? name : `${name}, 조건에 맞는 굴 ${count}개`,
          en === selected,
          () => onSelect(en === selected ? null : en),
        );
        return (
          <g key={en} className={cls} {...press}>
            {polys.map((p) => <polygon key={p} points={p} />)}
          </g>
        );
      })}

      {map.insets?.map(({ rect: [x, y, w, h], text }) => (
        <g key={text} className="map-inset">
          <rect x={x} y={y} width={w} height={h} rx={f * 0.5} strokeWidth={f * 0.08} strokeDasharray={`${f * 0.3} ${f * 0.2}`} />
          <text x={x + w - f * 0.3} y={y + h - f * 0.35} textAnchor="end" fontSize={f * 0.6}>{text} →</text>
        </g>
      ))}
      <path className="map-borders" d={map.borders} strokeWidth={f * 0.22} />
      {sel && <path className="map-selected-edge" d={sel.edge} strokeWidth={f * 0.36} />}

      {dots.map((d) => {
        const mine = d.en === selected;
        const on = focus.includes(d.no);
        return (
          <g
            key={d.no}
            className={`map-den${mine ? ' mine' : ''}${on ? ' focus' : ''}`}
            {...pressable(`${names[d.en] ?? d.en} 굴 ${d.no}`, on, () => onDen(d))}
            tabIndex={mine ? 0 : -1}
          >
            {/* 누르기 쉽게 보이지 않는 큰 원을 깐다 */}
            <circle className="hit" cx={d.x} cy={d.y} r={f * 0.6} />
            {on && <circle className="ring" cx={d.x} cy={d.y} r={f * 0.55} strokeWidth={f * 0.14} />}
            <circle className="dot" cx={d.x} cy={d.y} r={f * (mine || on ? 0.26 : 0.18)} />
            {(mine || on) && (
              <text x={d.x} y={d.y - f * 0.45} textAnchor="middle" fontSize={f * 0.72}>{d.no}</text>
            )}
          </g>
        );
      })}

      {map.cells.map(({ en, label: [x, y], anchor }) => {
        const count = counts ? counts[en] ?? 0 : null;
        const lines = labelLines(names[en] ?? en);
        const cls = ['map-label', en === selected && 'selected', count === 0 && 'dim'].filter(Boolean).join(' ');
        return (
          <g key={`label-${en}`} className={cls}>
            {anchor && <line x1={x} y1={y} x2={anchor[0]} y2={anchor[1]} strokeWidth={f * 0.1} />}
            <text x={x} y={y - (lines.length - 1) * f * 0.55} textAnchor="middle" fontSize={f}>
              {lines.map((l, i) => <tspan key={l} x={x} dy={i ? f * 1.1 : 0}>{l}</tspan>)}
            </text>
            {count !== null && count > 0 && (
              <g className="map-count" transform={`translate(${x}, ${y + lines.length * f * 0.55 + f * 0.9})`}>
                <circle r={f * 0.72} />
                <text textAnchor="middle" dy={f * 0.3} fontSize={f * 0.82}>{count}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
