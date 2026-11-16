import {
  AUTO_EXCLUDE, EV_KO, ITEMS_CSV, LANG_KO, LEARN_METHODS, MACHINES_CSV, MACHINE_CACHE_KEY, MOVES_CSV, MOVE_CACHE_KEY,
  MOVE_NAMES_CSV, RECOVERY_MOVES, SETS_URL, SETUP_PHYSICAL, SETUP_SPECIAL, STATUS_MOVES, STORY_EXCLUDE, TM_THREE_DIGIT, TYPES,
  TYPE_BY_ID, TYPE_ITEM, USELESS_MOVES, VG_BY_ID, VG_FAMILIES, VG_PREFERRED,
} from '../lib/constants';
import { entryOf, store } from '../lib/store';
import {
  asList, getJSON, getText, natureText, normId, parseCSV, readCache, slugify, superEffectiveAgainst, writeCache,
} from '../lib/utils';
import type {
  AutoPick, AutoRecommendation, Detail, ItemSuggestion, MoveData, MoveLearn, MoveInfo, MoveRow, PokemonMove, SetDescription, SmogonFormats,
  SmogonSet,
} from '../types';
import { translate } from './names';

// 저장된 기술 데이터가 깨져 있으면(타입·위력이 비어 있는 등) 모든 추천이 비므로, 잘 아는 기술로 확인한다
function movesLookRight(data: Record<string, MoveData>) {
  const ok = (id: number, type: string, cls: number) => data[id]?.type === type && data[id].cls === cls && data[id].power > 0;
  return ok(33, 'normal', 2) && ok(53, 'fire', 3) && ok(17, 'flying', 2);
}

// 기술 정보 (한국어 이름·타입·위력 등)를 CSV 두 개로 한 번에 받는다
let moveDataPromise: Promise<Record<string, MoveData>> | null = null;
export function loadMoveData() {
  moveDataPromise ||= (async () => {
    const cached = readCache<Record<string, MoveData>>(MOVE_CACHE_KEY);
    if (cached && Object.keys(cached).length > 900 && movesLookRight(cached)) return cached;
    const [movesCsv, namesCsv] = await Promise.all([getText(MOVES_CSV), getText(MOVE_NAMES_CSV)]);
    const data: Record<string, MoveData> = {};
    for (const [id, slug, , typeId, power, pp, acc, , , cls] of parseCSV(movesCsv).slice(1)) {
      if (!id) continue;
      data[id] = {
        ko: '', slug, type: TYPE_BY_ID[Number(typeId) - 1] || null,
        power: Number(power) || 0, pp: Number(pp) || 0, acc: Number(acc) || 0, cls: Number(cls),
      };
    }
    for (const [id, lang, name] of parseCSV(namesCsv).slice(1)) {
      if (lang === LANG_KO && data[id]) data[id].ko = name;
    }
    writeCache(MOVE_CACHE_KEY, data, ['pokedex-moves-v1']);
    return data;
  })().then((data) => {
    store.moves = data;
    store.movesByNorm = Object.fromEntries(Object.values(data).map((m) => [normId(m.slug), m]));
    return data;
  }).catch((err: unknown) => { moveDataPromise = null; throw err; });
  return moveDataPromise;
}

// 게임별 기술머신 번호: { "scarlet-violet:5": "TM001", "sword-shield:14": "TR00", ... }
let machinePromise: Promise<Record<string, string>> | null = null;
export function loadMachines() {
  machinePromise ||= (async () => {
    const cached = readCache<Record<string, string>>(MACHINE_CACHE_KEY);
    if (cached && Object.keys(cached).length > 1000) return cached;
    const [machinesCsv, itemsCsv] = await Promise.all([getText(MACHINES_CSV), getText(ITEMS_CSV)]);
    const itemSlug: Record<string, string> = {};
    for (const [id, slug] of parseCSV(itemsCsv).slice(1)) itemSlug[id] = slug;
    const data: Record<string, string> = {};
    for (const [, vgId, itemId, moveId] of parseCSV(machinesCsv).slice(1)) {
      const vg = VG_BY_ID[Number(vgId) - 1];
      const m = /^(tm|hm|tr)(\d+)$/.exec(itemSlug[itemId] || '');
      if (!vg || !m) continue;
      data[`${vg}:${moveId}`] = m[1].toUpperCase() + (TM_THREE_DIGIT.has(vg) ? m[2].padStart(3, '0') : m[2]);
    }
    fillBDSP(data);
    writeCache(MACHINE_CACHE_KEY, data, ['pokedex-machines-v1']);
    return data;
  })().then((data) => (store.machines = data))
    .catch((err: unknown) => { machinePromise = null; throw err; });
  return machinePromise;
}

// PokeAPI에는 BDSP 기술머신 중 다이아몬드·펄에서 바뀐 칸만 있다.
// 나머지 칸은 다이아몬드·펄과 같고, 비전머신 01~08은 BDSP에서 TM93~TM100이 됐다.
function fillBDSP(data: Record<string, string>) {
  const BDSP = 'brilliant-diamond-shining-pearl';
  const used = new Set<string>();
  for (const [key, label] of Object.entries(data)) {
    if (!key.startsWith(`${BDSP}:`)) continue;
    if (label.startsWith('HM')) data[key] = `TM${92 + Number(label.slice(2))}`;
    used.add(data[key]);
  }
  for (const [key, label] of Object.entries(data)) {
    const [vg, moveId] = key.split(':');
    if (vg !== 'diamond-pearl') continue;
    const bdsp = label.startsWith('HM') ? `TM${92 + Number(label.slice(2))}` : label;
    if (!used.has(bdsp)) data[`${BDSP}:${moveId}`] ??= bdsp;
  }
}

function machineLabel(vg: string, moveId: number) {
  const family = VG_FAMILIES.find((f) => f.includes(vg)) || [vg];
  for (const v of [vg, ...family]) {
    const label = store.machines[`${v}:${moveId}`];
    if (label) return label;
  }
  return '';
}

export function moveInfo(m: PokemonMove): MoveInfo {
  const mv: Partial<MoveData> = store.moves[m.id] || {};
  return {
    name: mv.ko || m.slug.replace(/-/g, ' '), slug: m.slug, type: mv.type ?? null,
    power: mv.power || 0, acc: mv.acc || 0, pp: mv.pp || 0, cls: mv.cls || 0,
  };
}

export function versionGroups(d: Detail) {
  const counts: Record<string, number> = {};
  d.moves.forEach((m) => m.learn.forEach((l) => { counts[l.vg] = (counts[l.vg] || 0) + 1; }));
  return counts;
}

export function defaultVG(d: Detail): string | null {
  const counts = versionGroups(d);
  return VG_PREFERRED.find((v) => counts[v]) || Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || null;
}

// TM → HM → TR 순, 같은 종류 안에서는 번호 순. 번호를 모르는 기술은 맨 뒤로
const machineOrder = (tm: string) => (tm ? ['TM', 'HM', 'TR'].indexOf(tm.slice(0, 2)) * 1000 + Number(tm.slice(2)) : Infinity);

export function moveRows(d: Detail, vg: string | null, method: string): MoveRow[] {
  const rows: MoveRow[] = [];
  for (const m of d.moves) {
    for (const l of m.learn) {
      if (l.vg !== vg || l.method !== method) continue;
      rows.push({ ...moveInfo(m), level: l.level, tm: method === 'machine' ? machineLabel(vg, m.id) : '' });
    }
  }
  const byName = (a: MoveRow, b: MoveRow) => a.name.localeCompare(b.name, 'ko');
  if (method === 'level-up') return rows.sort((a, b) => a.level - b.level || byName(a, b));
  if (method === 'machine') return rows.sort((a, b) => machineOrder(a.tm) - machineOrder(b.tm) || byName(a, b));
  return rows.sort(byName);
}

// 한 게임에서 이 포켓몬이 기술을 배우는 방법 (못 배우면 null)
export function learnOf(d: Detail, vg: string | null, slug: string): MoveLearn | null {
  const pm = d.moves.find((x) => x.slug === slug);
  const ls = pm?.learn.filter((l) => l.vg === vg) ?? [];
  if (!pm || !vg || !ls.length) return null;
  const levels = ls.filter((l) => l.method === 'level-up').map((l) => l.level);
  return {
    level: levels.length ? Math.min(...levels) : null,
    tm: ls.some((l) => l.method === 'machine') ? machineLabel(vg, pm.id) || '번호 모름' : null,
    egg: ls.some((l) => l.method === 'egg'),
    tutor: ls.some((l) => l.method === 'tutor'),
  };
}

/* ---------- 추천 기술 배치 ---------- */

/** 쇼다운식 포켓몬 ID(garchomp) → 룰 → 세트 */
type SetsBySpecies = Record<string, SmogonFormats>;

let setsPromise: Promise<SetsBySpecies> | null = null;
export function loadSets() {
  setsPromise ||= getJSON<SetsBySpecies>(SETS_URL)
    .then((raw) => Object.fromEntries(Object.entries(raw).map(([k, v]) => [normId(k), v])))
    .catch((err: unknown) => { setsPromise = null; throw err; });
  return setsPromise;
}

// Smogon 세트 하나를 화면에 쓸 한국어 데이터로 바꾼다 (d가 있으면 기술마다 배우는 방법도 붙인다)
export async function describeSet(name: string, s: SmogonSet, d?: Detail): Promise<SetDescription> {
  const vg = d ? defaultVG(d) : null;
  const [items, abilities] = await Promise.all([
    Promise.all(asList(s.item).map((n) => translate('item', n))),
    Promise.all(asList(s.ability).map((n) => translate('ability', n))),
  ]);
  const moves = s.moves.map((slot) => asList(slot).map((en) => {
    const mv = store.movesByNorm[normId(en)];
    return {
      name: mv?.ko || en,
      type: mv?.type && TYPES[mv.type] ? mv.type : null,
      learn: d && mv ? learnOf(d, vg, mv.slug) : undefined,
    };
  }));
  const evs = asList(s.evs)[0];
  const tera = asList(s.teratypes).map((t) => TYPES[t.toLowerCase()]?.[0] || (t === 'Stellar' ? '스텔라' : t));
  const meta: [string, string][] = [
    ['도구', items.join(' / ')],
    ['특성', abilities.join(' / ')],
    ['성격', asList(s.nature).map(natureText).join(' / ')],
    ['노력치', evs ? Object.entries(evs).map(([k, v]) => `${EV_KO[k] || k} ${v}`).join(' · ') : ''],
    ['테라스탈', tera.join(' / ')],
  ];
  return { name, moves, meta: meta.filter(([, v]) => v) };
}

/* ---------- 자동 추천 (대전용·스토리용) ---------- */

interface Profile {
  stat: Record<string, number>;
  atk: number;
  spa: number;
  best: number;
  /** 공격과 특공 차이가 작으면 물리·특수를 섞어 쓴다 */
  mixed: boolean;
  ownTypes: string[];
}

function profileOf(id: number, d: Detail): Profile {
  const stat = Object.fromEntries(d.stats.map((s) => [s.key, s.value]));
  const atk = stat.attack, spa = stat['special-attack'];
  const best = Math.max(atk, spa);
  return { stat, atk, spa, best, mixed: Math.min(atk, spa) / best >= 0.85, ownTypes: entryOf(id)?.types ?? [] };
}

// 공격 기술 하나의 점수 (위력·명중률·자속·공격/특공 비율). 쓸 수 없는 기술이면 0
// strict면 높은 쪽(공격/특공) 계열 기술만 본다
function scoreMove(mv: MoveInfo, p: Profile, maxPower: number, strict = true) {
  if (!mv.power || mv.cls === 1 || !mv.type || AUTO_EXCLUDE.has(mv.slug)) return 0;
  if (strict && !p.mixed && mv.cls !== (p.atk >= p.spa ? 2 : 3)) return 0;
  const ratio = (mv.cls === 2 ? p.atk : p.spa) / p.best;
  return Math.min(mv.power, maxPower) * (mv.acc || 100) / 100 * (p.ownTypes.includes(mv.type) ? 1.5 : 1) * ratio * ratio;
}

// 자기 타입 기술(자속)을 먼저 넣고, 나머지는 아직 약점을 못 찌르는 타입을 많이 찌르는 기술로 채운다
// (picked에 이미 고른 기술이 있으면 그 뒤를 채운다)
function pickFour(candidates: AutoPick[], ownTypes: string[], picked: AutoPick[] = []) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const used = new Set<string>(), covered = new Set<string>();
  const add = (mv: AutoPick) => {
    picked.push(mv);
    used.add(mv.type);
    superEffectiveAgainst(mv.type).forEach((t) => covered.add(t));
  };
  picked.splice(0).forEach(add);
  for (const t of ownTypes) {
    if (used.has(t)) continue;
    const mv = sorted.find((m) => m.type === t);
    if (mv) add(mv);
  }
  while (picked.length < 4) {
    let best: AutoPick | null = null, bestScore = 0;
    for (const mv of sorted) {
      if (used.has(mv.type)) continue;
      const fresh = superEffectiveAgainst(mv.type).filter((t) => !covered.has(t)).length;
      const score = mv.score * (1 + 0.25 * fresh);
      if (score > bestScore) { best = mv; bestScore = score; }
    }
    if (!best) break;
    add(best);
  }
  return picked.slice(0, 4);
}

// 배울 수 있는 기술(pool)에서 4개를 고른다. 높은 쪽 계열 공격 기술 → 다른 계열 공격 기술 →
// 변화 기술(능력 올리기 → 회복 → 상태이상 → 그 밖의 기술) 순으로 모자란 만큼 채운다
function pickMoves(pool: (MoveInfo & Pick<AutoPick, 'learn'>)[], p: Profile, score: (mv: MoveInfo, strict: boolean) => number) {
  const scored = (strict: boolean) => pool.flatMap((mv) => {
    const s = mv.type ? score(mv, strict) : 0;
    return s && mv.type ? [{ ...mv, type: mv.type, score: s }] : [];
  });
  const picked = pickFour(scored(true), p.ownTypes);
  if (picked.length < 4) pickFour(scored(false), p.ownTypes, picked);

  const setup = p.mixed ? [...SETUP_PHYSICAL, ...SETUP_SPECIAL] : p.atk >= p.spa ? SETUP_PHYSICAL : SETUP_SPECIAL;
  const lists = [setup, RECOVERY_MOVES, STATUS_MOVES];
  const support = pool
    .filter((mv) => mv.type && !USELESS_MOVES.has(mv.slug) && !picked.some((m) => m.slug === mv.slug))
    .map((mv) => {
      const g = lists.findIndex((l) => l.includes(mv.slug));
      return { mv, g, order: g < 0 ? Infinity : g * 100 + lists[g].indexOf(mv.slug) };
    })
    .sort((a, b) => a.order - b.order);
  // 같은 종류(능력 올리기 등)는 하나씩만 넣고, 그래도 모자라면 남은 기술로 채운다
  const groups = new Set<number>();
  for (const { mv, g } of support) {
    if (picked.length >= 4) break;
    if (g >= 0 && groups.has(g)) continue;
    groups.add(g);
    picked.push({ ...mv, type: mv.type!, score: 0 });
  }
  for (const { mv } of support) {
    if (picked.length >= 4) break;
    if (!picked.some((m) => m.slug === mv.slug)) picked.push({ ...mv, type: mv.type!, score: 0 });
  }
  return picked;
}

const bulkOf = (stat: Record<string, number>) => stat.hp + stat.defense + stat['special-defense'];

// 진화 단계의 마지막이 아니면 진화의휘석을 쓸 수 있다 (리전폼은 원래 종의 단계로 본다)
function canEvolve(id: number, d: Detail) {
  const base = entryOf(id)?.base ?? id;
  const i = d.stages.findIndex((ids) => ids.includes(base));
  return i >= 0 && i < d.stages.length - 1;
}

const typeItem = (mv: AutoPick | undefined): ItemSuggestion[] => (mv
  ? [{ slug: TYPE_ITEM[mv.type], why: `${TYPES[mv.type][0]} 타입 기술 위력 1.2배 (${mv.name}에 맞춰서)` }]
  : []);

// 대전 데이터에 없는 포켓몬은 종족값과 배울 수 있는 기술로 공격 기술 4개와 도구를 고른다
export function autoRecommend(id: number, d: Detail): AutoRecommendation {
  const vg = defaultVG(d);
  const p = profileOf(id, d);
  const pool = d.moves
    .filter((m) => m.learn.some((l) => l.vg === vg && LEARN_METHODS.some(([k]) => k === l.method)))
    .map(moveInfo);
  const picked = pickMoves(pool, p, (mv, strict) => scoreMove(mv, p, 150, strict))
    .map((mv) => ({ ...mv, learn: learnOf(d, vg, mv.slug) }));

  const items: ItemSuggestion[] = [];
  if (canEvolve(id, d)) items.push({ slug: 'eviolite', why: '진화 전 포켓몬의 방어·특방 1.5배' });
  if (bulkOf(p.stat) >= 270 || p.best < 80) {
    items.push(
      { slug: 'assault-vest', why: '특방 1.5배. 공격 기술만 쓰는 이 배치와 잘 맞아요' },
      { slug: 'leftovers', why: '매 턴 HP를 1/16씩 회복해요' },
    );
  } else if (p.stat.speed >= 95) {
    items.push(
      { slug: 'life-orb', why: '기술 위력 1.3배, 대신 쓸 때마다 HP 1/10 감소' },
      { slug: 'focus-sash', why: 'HP가 가득일 때 한 방에 쓰러지지 않고 HP 1로 버텨요' },
    );
  } else {
    items.push(
      { slug: 'choice-scarf', why: '스피드 1.5배, 대신 처음 고른 기술만 계속 써야 해요' },
      p.atk >= p.spa
        ? { slug: 'choice-band', why: '공격 1.5배, 대신 처음 고른 기술만 계속 써야 해요' }
        : { slug: 'choice-specs', why: '특공 1.5배, 대신 처음 고른 기술만 계속 써야 해요' },
    );
  }
  return { picked, items: items.slice(0, 3), atk: p.atk, spa: p.spa, vg, mixed: p.mixed };
}

// 스토리용: 지금 게임에서 레벨업·기술머신으로 배우는 기술 중 명중률이 높고 PP가 넉넉한 기술을 고른다
// (알 기술·기술 가르침은 스토리 중에 얻기 어려워서 뺀다)
export function storyRecommend(id: number, d: Detail): AutoRecommendation {
  const vg = defaultVG(d);
  const p = profileOf(id, d);
  // 레벨업은 가장 먼저 배우는 레벨을, 기술머신은 번호를 같이 남긴다 (레벨업 목록이 레벨 순이라 처음 나온 것이 가장 낮다)
  // 알 기술·기술 가르침은 스토리에서 쓰지 않으므로 레벨업·기술머신만 남긴다
  const pool = new Map<string, MoveInfo & { learn: MoveLearn }>();
  for (const method of ['level-up', 'machine']) {
    for (const r of moveRows(d, vg, method)) {
      const mv = pool.get(r.slug) ?? { ...moveInfo(d.moves.find((m) => m.slug === r.slug)!), learn: { level: null, tm: null, egg: false, tutor: false } };
      if (method === 'level-up') mv.learn.level ??= r.level;
      else mv.learn.tm = r.tm || '번호 모름';
      pool.set(r.slug, mv);
    }
  }
  const picked = pickMoves([...pool.values()], p, (mv, strict) => (STORY_EXCLUDE.has(mv.slug) || (mv.acc && mv.acc < 90)
    ? 0
    : scoreMove(mv, p, 120, strict) * (mv.pp >= 10 ? 1 : 0.85)));
  const attacks = picked.filter((m) => m.score > 0);

  const items: ItemSuggestion[] = typeItem(attacks.find((m) => p.ownTypes.includes(m.type)) ?? attacks[0]);
  items.push(bulkOf(p.stat) >= 240
    ? { slug: 'leftovers', why: '매 턴 HP를 조금씩 회복해서 회복약을 아낄 수 있어요' }
    : { slug: 'shell-bell', why: '준 데미지의 1/8만큼 HP를 회복해요' });
  items.push({ slug: 'lucky-egg', why: '얻는 경험치 1.5배. 레벨을 빨리 올릴 때 좋아요' });
  return { picked, items, atk: p.atk, spa: p.spa, vg, mixed: p.mixed };
}

// Smogon 세트에서 많이 쓰는 도구 (모든 룰의 세트를 합쳐서 센다)
export function popularItems(formats: SmogonFormats): ItemSuggestion[] {
  const counts = new Map<string, number>();
  for (const sets of Object.values(formats)) {
    for (const set of Object.values(sets)) {
      for (const en of new Set(asList(set.item))) counts.set(en, (counts.get(en) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([en, n]) => ({ slug: slugify(en), why: `Smogon 세트 ${n}개에서 사용` }));
}
