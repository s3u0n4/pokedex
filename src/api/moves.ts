import {
  AUTO_EXCLUDE, EV_KO, ITEMS_CSV, LANG_KO, LEARN_METHODS, MACHINES_CSV, MACHINE_CACHE_KEY, MOVES_CSV, MOVE_CACHE_KEY,
  MOVE_NAMES_CSV, SETS_URL, TM_THREE_DIGIT, TYPES, TYPE_BY_ID, VG_BY_ID, VG_FAMILIES, VG_PREFERRED,
} from '../lib/constants';
import { store } from '../lib/store';
import { asList, getJSON, getText, natureText, normId, parseCSV, readCache, writeCache } from '../lib/utils';
import type {
  AutoPick, AutoRecommendation, Detail, MoveData, MoveInfo, MoveRow, PokemonMove, SetDescription, SmogonFormats, SmogonSet,
} from '../types';
import { translate } from './names';

// 기술 정보 (한국어 이름·타입·위력 등)를 CSV 두 개로 한 번에 받는다
let moveDataPromise: Promise<Record<string, MoveData>> | null = null;
export function loadMoveData() {
  moveDataPromise ||= (async () => {
    const cached = readCache<Record<string, MoveData>>(MOVE_CACHE_KEY);
    if (cached && Object.keys(cached).length > 900) return cached;
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
    writeCache(MOVE_CACHE_KEY, data);
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
    writeCache(MACHINE_CACHE_KEY, data);
    return data;
  })().then((data) => (store.machines = data))
    .catch((err: unknown) => { machinePromise = null; throw err; });
  return machinePromise;
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

// Smogon 세트 하나를 화면에 쓸 한국어 데이터로 바꾼다
export async function describeSet(name: string, s: SmogonSet): Promise<SetDescription> {
  const [items, abilities] = await Promise.all([
    Promise.all(asList(s.item).map((n) => translate('item', n))),
    Promise.all(asList(s.ability).map((n) => translate('ability', n))),
  ]);
  const moves = s.moves.map((slot) => asList(slot).map((en) => {
    const mv = store.movesByNorm[normId(en)];
    return { name: mv?.ko || en, type: mv?.type && TYPES[mv.type] ? mv.type : null };
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

// 대전 데이터에 없는 포켓몬은 종족값과 배울 수 있는 기술로 공격 기술 4개를 고른다
export function autoRecommend(id: number, d: Detail): AutoRecommendation {
  const vg = defaultVG(d);
  const stat = Object.fromEntries(d.stats.map((s) => [s.key, s.value]));
  const atk = stat.attack, spa = stat['special-attack'];
  const best = Math.max(atk, spa);
  const ownTypes = store.list[id - 1].types;
  // 공격과 특공 차이가 크면 더 높은 쪽 분류의 기술만 쓴다
  const mixed = Math.min(atk, spa) / best >= 0.85;
  const mainCls = atk >= spa ? 2 : 3;

  const candidates = new Map<string, AutoPick>();
  for (const m of d.moves) {
    if (!m.learn.some((l) => l.vg === vg && LEARN_METHODS.some(([k]) => k === l.method))) continue;
    const mv = moveInfo(m);
    if (!mv.power || mv.cls === 1 || !mv.type || AUTO_EXCLUDE.has(mv.slug)) continue;
    if (!mixed && mv.cls !== mainCls) continue;
    const ratio = (mv.cls === 2 ? atk : spa) / best;
    const score = Math.min(mv.power, 150) * (mv.acc || 100) / 100 * (ownTypes.includes(mv.type) ? 1.5 : 1) * ratio * ratio;
    candidates.set(mv.slug, { ...mv, type: mv.type, score });
  }
  const sorted = [...candidates.values()].sort((a, b) => b.score - a.score);

  // 자기 타입 기술(자속)을 먼저 넣고, 나머지는 겹치지 않는 타입으로 채운다
  const picked: AutoPick[] = [], used = new Set<string>();
  for (const t of ownTypes) {
    const mv = sorted.find((m) => m.type === t);
    if (mv) { picked.push(mv); used.add(t); }
  }
  for (const mv of sorted) {
    if (picked.length >= 4) break;
    if (!used.has(mv.type)) { picked.push(mv); used.add(mv.type); }
  }
  return { picked: picked.slice(0, 4), atk, spa, vg, mixed };
}
