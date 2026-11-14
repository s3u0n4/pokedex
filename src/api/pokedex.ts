import {
  API, CACHE_KEY, LANG_EN, LANG_KO, NAMES_CSV, REGIONS, REGION_FORM_KO, TOTAL, TYPES,
} from '../lib/constants';
import { store } from '../lib/store';
import { getJSON, getText, idFromUrl, parseCSV, readCache, regionOf, slugify, writeCache } from '../lib/utils';
import type { ApiType, PokedexIndex, RegionalForm, Species } from '../types';

// 목록에 필요한 이름·분류·타입을 한 번에 모은다 (CSV 1회 + 타입 18회 요청)
// 타입 목록에는 리전폼(id 10000번대)도 들어 있어서 리전폼 카드도 여기서 만든다
async function fetchIndex(): Promise<PokedexIndex> {
  const [csv, typeData] = await Promise.all([
    getText(NAMES_CSV),
    Promise.all(Object.keys(TYPES).map((t) => getJSON<ApiType>(`${API}/type/${t}`))),
  ]);

  const list: Species[] = Array.from({ length: TOTAL }, (_, i) => ({ id: i + 1, ko: '', en: '', genus: '', types: [] }));
  for (const [id, lang, name, genus] of parseCSV(csv).slice(1)) {
    const p = list[Number(id) - 1];
    if (!p) continue;
    if (lang === LANG_KO) { p.ko = name; p.genus = genus; }
    else if (lang === LANG_EN) p.en = name;
  }
  const formTypes: Record<string, { id: number; types: string[] }> = {};
  for (const t of typeData) {
    for (const { slot, pokemon } of t.pokemon) {
      const pid = idFromUrl(pokemon.url);
      if (pid <= TOTAL) list[pid - 1].types[slot - 1] = t.name;
      else if (regionOf(pokemon.name)) (formTypes[pokemon.name] ||= { id: pid, types: [] }).types[slot - 1] = t.name;
    }
  }
  list.forEach((p) => { p.types = p.types.filter(Boolean); });

  // "raichu-alola" → 원래 포켓몬 "raichu"를 영어 이름으로 찾는다
  const idBySlug = Object.fromEntries(list.map((p) => [slugify(p.en), p.id]));
  const forms = Object.entries(formTypes).flatMap(([name, f]): RegionalForm[] => {
    const region = regionOf(name);
    if (!region) return [];
    const [baseSlug, rest = ''] = name.split(`-${region}`);
    const base = list[idBySlug[baseSlug] - 1];
    if (!base) return [];
    const extra = REGION_FORM_KO[rest.replace(/^-/, '')];
    return [{
      id: f.id,
      name,
      base: base.id,
      region,
      ko: `${REGIONS[region][0]} ${base.ko || base.en}${extra ? ` (${extra})` : ''}`,
      en: `${base.en} (${region[0].toUpperCase()}${region.slice(1)})`,
      types: f.types.filter(Boolean),
    }];
  }).sort((a, b) => a.base - b.base || a.id - b.id);

  const index = { list, forms };
  writeCache(CACHE_KEY, index, ['pokedex-index-v1', 'pokedex-index-v2']); // 예전 형식은 지운다
  return index;
}

export async function loadIndex(): Promise<PokedexIndex> {
  const cached = readCache<PokedexIndex>(CACHE_KEY);
  const index = cached?.list?.length === TOTAL && Array.isArray(cached.forms) ? cached : await fetchIndex();
  store.list = index.list;
  store.forms = index.forms;
  return index;
}
