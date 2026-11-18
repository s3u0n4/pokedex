import { BATTLE_FORMS, GENS, REGIONAL_EVOS, SPECIES_CSV, STATS_CACHE_KEY, STATS_CSV, TOTAL } from '../lib/constants';
import { store } from '../lib/store';
import { getText, parseCSV, readCache, writeCache } from '../lib/utils';
import type { ListEntry, RankRow, StatTable } from '../types';

// 종족값(pokemon_stats.csv)과 전설·진화 정보(pokemon_species.csv)를 한 번에 받는다. 목록(store)을 받은 뒤에 부른다.
async function fetchStatTable(): Promise<StatTable> {
  const [statsCsv, speciesCsv] = await Promise.all([getText(STATS_CSV), getText(SPECIES_CSV)]);
  const stats: Record<number, number[]> = {};
  for (const [id, statId, value] of parseCSV(statsCsv).slice(1)) {
    const i = Number(statId) - 1;
    if (id && i >= 0 && i < 6) (stats[Number(id)] ||= [])[i] = Number(value);
  }

  // 진화하는 포켓몬이 있으면 최종 진화가 아니다. 리전폼에서만 진화하는 경우(REGIONAL_EVOS)는 원래 모습을 최종으로 본다
  const legend = new Set<number>(), parents = new Set<number>(), fromOf: Record<number, number> = {};
  for (const [id, , , from, , , , , , , , , , , , , isLegend, isMythical] of parseCSV(speciesCsv).slice(1)) {
    if (isLegend === '1' || isMythical === '1') legend.add(Number(id));
    if (from) fromOf[Number(id)] = Number(from);
    if (from && !REGIONAL_EVOS[Number(id)]) parents.add(Number(from));
  }
  const evolvingForms = new Set(Object.values(REGIONAL_EVOS));

  const table: StatTable = {};
  for (const p of store.list) {
    if (stats[p.id]?.length === 6) table[p.id] = { s: stats[p.id], legend: legend.has(p.id), final: !parents.has(p.id), from: fromOf[p.id] ?? 0 };
  }
  for (const f of store.forms) {
    if (stats[f.id]?.length !== 6) continue;
    table[f.id] = {
      s: stats[f.id], legend: legend.has(f.base), final: !parents.has(f.base) && !evolvingForms.has(f.name), from: fromOf[f.base] ?? 0,
    };
  }
  writeCache(STATS_CACHE_KEY, table, ['pokedex-stats-v1']);
  return table;
}

let tablePromise: Promise<StatTable> | null = null;
export function loadStatTable() {
  tablePromise ||= (async () => {
    const cached = readCache<StatTable>(STATS_CACHE_KEY);
    if (cached && Object.keys(cached).length >= TOTAL) return cached;
    return fetchStatTable();
  })().catch((err: unknown) => { tablePromise = null; throw err; });
  return tablePromise;
}

export interface RankFilter {
  /** 0이면 전체, 1~9는 세대 (리전폼은 원래 포켓몬 번호 기준) */
  gen: number;
  /** RANK_STATS의 stat (-1 합계) */
  stat: number;
  finalOnly: boolean;
  legends: boolean;
}

// 고른 기준이 높은 순. 같으면 합계가 높은 순, 그다음 도감 순
export function rankEntries(table: StatTable, { gen, stat, finalOnly, legends }: RankFilter): RankRow[] {
  const [from, to] = gen ? GENS[gen - 1] : [1, TOTAL];
  const entries: ListEntry[] = [...store.list.map((p) => ({ ...p, base: p.id })), ...store.forms.filter((f) => !BATTLE_FORMS.has(f.name))];
  const rows = entries.flatMap((entry): Omit<RankRow, 'rank'>[] => {
    const row = table[entry.id];
    if (!row || entry.base < from || entry.base > to) return [];
    if ((finalOnly && !row.final) || (!legends && row.legend)) return [];
    const total = row.s.reduce((a, b) => a + b, 0);
    return [{ entry, stats: row.s, total, value: stat < 0 ? total : row.s[stat] }];
  });
  rows.sort((a, b) => b.value - a.value || b.total - a.total || a.entry.base - b.entry.base || a.entry.id - b.entry.id);
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || rows[i - 1].value !== r.value) rank = i + 1;
    return { ...r, rank };
  });
}
