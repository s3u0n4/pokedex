import { NATURES } from '../lib/constants';
import { asList } from '../lib/utils';
import type { Detail, NatureSuggestion, SmogonFormats } from '../types';

// NATURES는 (오르는 능력치 × 5 + 내려가는 능력치) 순서다
const NATURE_KEYS = ['attack', 'defense', 'speed', 'special-attack', 'special-defense'];
const UP_TEXT: Record<string, (v: number) => string> = {
  attack: (v) => `공격(${v})을 더 올려서 물리 기술이 세져요`,
  'special-attack': (v) => `특공(${v})을 더 올려서 특수 기술이 세져요`,
  speed: (v) => `스피드(${v})를 올려서 먼저 공격하기 좋아요`,
  defense: (v) => `방어(${v})를 올려서 물리 공격을 잘 버텨요`,
  'special-defense': (v) => `특방(${v})을 올려서 특수 공격을 잘 버텨요`,
};
const DOWN_KO: Record<string, string> = {
  attack: '공격을', 'special-attack': '특공을', speed: '스피드를', defense: '방어를', 'special-defense': '특방을',
};

const natureOf = (up: string, down: string) => NATURES[NATURE_KEYS.indexOf(up) * 5 + NATURE_KEYS.indexOf(down)];

interface StatPlan {
  stat: Record<string, number>;
  /** 쓰지 않는 공격 능력치 (공격·특공을 둘 다 쓰면 null) */
  unused: string | null;
  /** 낮춰도 손해가 가장 적은 능력치 */
  down: string;
}

// 공격과 특공 차이가 작으면 둘 다 쓰는 것으로 보고, 그때는 더 약한 방어 쪽을 낮춘다 (autoRecommend의 혼합형 기준과 같다)
// 둘 다 낮으면(단단지 등) 공격을 낮춘다 (혼란 때 자기 공격 피해도 줄어든다)
function planOf(d: Detail): StatPlan {
  const stat = Object.fromEntries(d.stats.map((s) => [s.key, s.value]));
  const atk = stat.attack, spa = stat['special-attack'];
  const mixed = Math.max(atk, spa) >= 60 && Math.min(atk, spa) / Math.max(atk, spa) >= 0.85;
  const unused = mixed ? null : atk > spa ? 'special-attack' : 'attack';
  const down = unused ?? (stat.defense <= stat['special-defense'] ? 'defense' : 'special-defense');
  return { stat, unused, down };
}

function whyOf(name: string, { stat, unused }: StatPlan) {
  const i = NATURES.indexOf(name);
  const up = NATURE_KEYS[Math.floor(i / 5)], down = NATURE_KEYS[i % 5];
  if (i < 0 || up === down) return '능력치 보정이 없는 성격이에요';
  const downText = down === unused
    ? `쓰지 않는 ${DOWN_KO[down]} 낮춰서 손해가 없어요`
    : unused === null && (down === 'defense' || down === 'special-defense')
      ? `공격·특공을 둘 다 써서 대신 ${DOWN_KO[down]} 낮춰요`
      : `대신 ${DOWN_KO[down]} 낮춰요`;
  return `${UP_TEXT[up](stat[up])}. ${downText}`;
}

// 종족값으로 고르는 성격: 낮출 능력치는 하나로 정하고, 올릴 능력치는 종족값이 높은 순서 (주력 공격은 조금 더 쳐준다)
function autoNatures(plan: StatPlan) {
  const attacks = ['attack', 'special-attack'].filter((k) => k !== plan.unused);
  return NATURE_KEYS
    .filter((k) => k !== plan.down && k !== plan.unused)
    .map((k) => ({ k, score: plan.stat[k] + (attacks.includes(k) ? 10 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map(({ k }) => natureOf(k, plan.down));
}

// Smogon 세트에서 많이 쓰는 성격을 먼저(모든 룰을 합쳐서 센다), 모자라면 종족값으로 고른 성격으로 채워 3개를 돌려준다
export function recommendNatures(d: Detail, sets: SmogonFormats | null): NatureSuggestion[] {
  const plan = planOf(d);
  const counts = new Map<string, number>();
  for (const format of Object.values(sets ?? {})) {
    for (const set of Object.values(format)) {
      for (const n of new Set(asList(set.nature))) if (NATURES.includes(n)) counts.set(n, (counts.get(n) || 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const n of autoNatures(plan)) if (!counts.has(n)) ranked.push([n, 0]);
  return ranked.slice(0, 3).map(([name, n]) => ({ name, sets: n, why: whyOf(name, plan) }));
}
