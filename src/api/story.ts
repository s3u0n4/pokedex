import {
  BATTLE_FORMS, DEX_CACHE_KEY, DEX_NUMBERS_CSV, REGIONAL_EVOS, STORY_CAUTION, STORY_GAMES, type StoryGame, ULTRA_BEASTS,
} from '../lib/constants';
import { store } from '../lib/store';
import { getText, parseCSV, readCache, writeCache } from '../lib/utils';
import type { DexTable, ListEntry, StatTable, StoryPick } from '../types';

const NEEDED = new Set(STORY_GAMES.flatMap((g) => g.dexes));

// 게임별 지방 도감에 있는 종 번호 (게임별 추천에서 고르는 도감만 남긴다)
let dexPromise: Promise<DexTable> | null = null;
export function loadDexes() {
  dexPromise ||= (async () => {
    const cached = readCache<DexTable>(DEX_CACHE_KEY);
    if (cached && [...NEEDED].every((id) => cached[id]?.length)) return cached;
    const table: DexTable = {};
    for (const [species, dex] of parseCSV(await getText(DEX_NUMBERS_CSV)).slice(1)) {
      if (NEEDED.has(Number(dex))) (table[Number(dex)] ||= []).push(Number(species));
    }
    writeCache(DEX_CACHE_KEY, table);
    return table;
  })().catch((err: unknown) => { dexPromise = null; throw err; });
  return dexPromise;
}

// 스토리에서는 빨리 쓰러뜨리는 게 중요해서 높은 쪽 공격 능력치(공격·특공)를 두 배로, 스피드를 그대로, 내구는 평균만 센다
// 특성 때문에 쓰기 어려운 포켓몬(STORY_CAUTION)은 점수를 낮춘다
function storyScore(base: number, [hp, atk, def, spa, spd, spe]: number[]) {
  return Math.round((Math.max(atk, spa) * 2 + spe + (hp + def + spd) / 3) * (STORY_CAUTION[base] ? 0.6 : 1));
}

export interface StoryOptions {
  /** 전설·환상·울트라비스트도 넣을지 */
  legends: boolean;
}

// 그 게임에 나오는 모습들 (원래 모습 + 그 게임 지방의 리전폼, hideBase는 원래 모습을 뺀다)
function gameEntries(game: StoryGame, inDex: Set<number>): ListEntry[] {
  const hidden = new Set(game.hideBase);
  const base = store.list.filter((p) => inDex.has(p.id) && !hidden.has(p.id)).map((p) => ({ ...p, base: p.id }));
  const forms = game.region ? store.forms.filter((f) => f.region === game.region && inDex.has(f.base) && !BATTLE_FORMS.has(f.name)) : [];
  return [...base, ...forms];
}

// 이 게임에서 더 진화하지 않는 모습인지: 이 게임 도감에 있는 종으로 진화하면 최종이 아니다
// (리전폼에서만 진화하는 종(REGIONAL_EVOS)은 그 리전폼의 진화로, 나머지는 원래 모습의 진화로 본다)
function finalInGame(e: ListEntry, table: StatTable, inDex: Set<number>, name?: string) {
  for (const id of inDex) {
    if (table[id]?.from === e.base && (!REGIONAL_EVOS[id] || REGIONAL_EVOS[id] === name)) return false;
  }
  return true;
}

// 첫 모습 → … → 이 포켓몬. 이 게임 도감에 없는 진화 전(예: 1세대의 피츄)은 뺀다
function lineOf(e: ListEntry, table: StatTable, inDex: Set<number>, game: StoryGame) {
  const line = [e.id];
  let child = e.base, from = table[e.id]?.from ?? 0;
  while (from && inDex.has(from)) {
    // 리전폼의 진화 전은 같은 지방 모습이 있으면 그 모습으로 (히스이 윈디 ← 히스이 가디, 가라르 파오리 → 창파나이트)
    const regional = (e.region || REGIONAL_EVOS[child]) && game.region
      ? store.forms.find((f) => f.base === from && f.region === game.region)
      : undefined;
    line.unshift(regional?.id ?? from);
    child = from;
    from = table[from]?.from ?? 0;
  }
  return line;
}

// 게임 하나의 타입별 추천: 타입마다 그 타입을 가진 최종 모습을 스토리 점수 순으로
export function storyPicks(game: StoryGame, dexes: DexTable, table: StatTable, { legends }: StoryOptions) {
  const inDex = new Set(game.dexes.flatMap((d) => dexes[d] ?? []));
  const names = Object.fromEntries(store.forms.map((f) => [f.id, f.name]));
  const picks: StoryPick[] = gameEntries(game, inDex).flatMap((entry) => {
    const row = table[entry.id];
    if (!row || (!legends && (row.legend || ULTRA_BEASTS.has(entry.base))) || !finalInGame(entry, table, inDex, names[entry.id])) return [];
    return [{
      entry, stats: row.s, total: row.s.reduce((a, b) => a + b, 0), score: storyScore(entry.base, row.s), line: lineOf(entry, table, inDex, game),
    }];
  });
  return picks.sort((a, b) => b.score - a.score || b.total - a.total || a.entry.base - b.entry.base);
}
