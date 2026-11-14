import {
  API, FORM_KO, GIMMICKS, PRIMAL_ORB, REGIONS, REGION_FORM_KO, REGION_KO, TIME_KO, TOTAL, TYPES,
} from '../lib/constants';
import { nameOf, store } from '../lib/store';
import { art, getJSON, gimmickKind, idFromUrl, latestText, regionOf, withRo } from '../lib/utils';
import type {
  AbilityInfo, ApiAbility, ApiChainLink, ApiEvolutionChain, ApiEvolutionDetail, ApiForm, ApiItemCategory, ApiPokemon,
  ApiSpecies, Detail, FormCardData, GenderArt, GimmickKind, LocalizedName, NamedResource, Stat,
} from '../types';
import { loadMachines, loadMoveData } from './moves';
import { itemKo, koName } from './names';

/* ---------- 진화 조건 ---------- */

export async function evoCondition(m: ApiEvolutionDetail) {
  const [item, held, move, used, place] = await Promise.all(
    [m.item, m.held_item, m.known_move, m.used_move, m.location].map((res) => koName(res)));
  const fallback = (res: NamedResource, ko: string | null) => ko || res.name.replace(/-/g, ' ');
  const typeKo = (res: NamedResource) => TYPES[res.name]?.[0] || res.name;
  const usedMove = m.used_move ? fallback(m.used_move, used) : '기술';
  const count = m.min_move_count || 20;

  const parts: string[] = [];
  if (m.region) parts.push(`${REGION_KO[m.region.name] || m.region.name} 지방`);
  if (m.gender === 1) parts.push('암컷');
  if (m.gender === 2) parts.push('수컷');
  if (m.min_happiness) parts.push(`친밀도 ${m.min_happiness} 이상`);
  if (m.min_affection) parts.push(`애정 ${m.min_affection}단계 이상`);
  if (m.min_beauty) parts.push(`아름다움 ${m.min_beauty} 이상`);
  if (m.known_move) parts.push(`${fallback(m.known_move, move)} 배운 상태`);
  if (m.known_move_type) parts.push(`${typeKo(m.known_move_type)} 타입 기술 배운 상태`);
  if (m.party_species) parts.push(`파티에 ${nameOf(idFromUrl(m.party_species.url))}`);
  if (m.party_type) parts.push(`파티에 ${typeKo(m.party_type)} 타입`);
  if (m.relative_physical_stats != null) parts.push(['공격 < 방어', '공격 = 방어', '공격 > 방어'][m.relative_physical_stats + 1]);
  if (m.time_of_day) parts.push(TIME_KO[m.time_of_day] || m.time_of_day);
  if (m.needs_overworld_rain) parts.push('비 오는 날');
  if (m.turn_upside_down) parts.push('기기를 거꾸로 들고');
  if (m.near_special_rock) parts.push('특수한 바위 근처');
  else if (m.location && m.trigger?.name !== 'take-damage') parts.push(place ? `${place}에서` : '특정 장소에서');
  if (m.needs_multiplayer) parts.push('유니온 서클에서');
  if (m.allowed_natures?.length) parts.push('성격에 따라 모습이 달라짐');
  if (m.min_steps) parts.push(`${m.min_steps}걸음 걷기`);

  const actions: Record<string, string> = {
    'level-up': m.min_level ? `Lv.${m.min_level}` : '레벨업',
    'in-battle-level-up': m.min_level ? `배틀 중 Lv.${m.min_level}` : '배틀 중 레벨업',
    'use-item': m.item ? `${fallback(m.item, item)} 사용` : '도구 사용',
    trade: m.trade_species ? `${nameOf(idFromUrl(m.trade_species.url))}와(과) 통신교환` : '통신교환',
    shed: '진화할 때 빈 자리와 몬스터볼 필요',
    spin: '빙글빙글 돌기',
    'tower-of-darkness': '악의 탑 수련',
    'tower-of-waters': '물의 탑 수련',
    'three-critical-hits': '한 배틀에서 급소 3번',
    'take-damage': `데미지 ${m.min_damage_taken || 49} 이상 받은 채 바위 아치 지나가기`,
    'agile-style-move': `${usedMove} 속공으로 ${count}번 사용`,
    'strong-style-move': `${usedMove} 강공으로 ${count}번 사용`,
    'recoil-damage': `반동 데미지 ${m.min_damage_taken || 294} 누적`,
    'use-move': `${usedMove} ${count}번 사용`,
    'three-defeated-bisharp': `대장의징표를 지닌 ${nameOf(625)} 3마리 쓰러뜨리기`,
    'gimmighoul-coins': '코인 999개 모으기',
    'meltan-candies': `${nameOf(808)} 사탕 400개 (포켓몬 GO)`,
  };
  const heldText = m.held_item ? `${fallback(m.held_item, held)} 지니고 ` : '';
  parts.push(heldText + (actions[m.trigger?.name ?? ''] || '특수한 조건'));
  return parts.join(' · ');
}

/* ---------- 진화 기믹 ---------- */

let megaStonesPromise: Promise<NamedResource[]> | null = null;
function loadMegaStones() {
  megaStonesPromise ||= getJSON<ApiItemCategory>(`${API}/item-category/mega-stones`)
    .then((c) => c.items)
    .catch((err: unknown) => { megaStonesPromise = null; console.error(err); return []; });
  return megaStonesPromise;
}

// 메가스톤 이름은 포켓몬 이름에서 조금씩 변형돼서("blastoise" → "blastoisinite") 앞부분이 가장 길게 겹치는 돌을 고른다
async function megaStone(formName: string) {
  const stones = await loadMegaStones();
  const base = formName.replace(/-mega.*$/, '').replace(/-/g, '');
  const suffix = formName.match(/-mega-([xyz])$/)?.[1];
  let best: NamedResource | null = null, bestLen = 3;
  for (const s of stones) {
    const [, stemRaw, stoneSuffix] = s.name.match(/^(.*?)(?:-([xyz]))?$/) ?? [];
    if (stoneSuffix !== suffix) continue;
    const stem = stemRaw.replace(/-/g, '');
    let n = 0;
    while (n < stem.length && stem[n] === base[n]) n++;
    if (n > bestLen) { best = s; bestLen = n; }
  }
  return best;
}

async function gimmickCondition(kind: GimmickKind, name: string) {
  if (kind === 'mega') {
    if (name === 'rayquaza-mega') return `${store.movesByNorm.dragonascent?.ko || '화룡점정'} 배운 상태로 배틀 중 메가진화`;
    const stone = await megaStone(name);
    return `${stone ? await itemKo(stone.name) : '메가스톤'} 지니고 배틀 중 메가진화`;
  }
  if (kind === 'gmax') return '거다이맥스 개체가 배틀 중 다이맥스하면 변신 (소드·실드)';
  if (kind === 'primal') return `${await itemKo(PRIMAL_ORB[name.replace('-primal', '')])} 지니고 배틀에 나오면 자동으로 변신`;
  if (kind === 'ultra') return `황혼의 갈기·새벽의 날개 모습에서 ${await itemKo('ultranecrozium-z', '울트라네크로Z')} 지니고 배틀 중 변신`;
  return '게임 속 특별한 전투에서만 볼 수 있는 모습';
}

const officialArt = (fp: ApiPokemon) => fp.sprites.other?.['official-artwork']?.front_default || fp.sprites.front_default;
const statsOf = (fp: ApiPokemon): Stat[] => fp.stats.map((s) => ({ key: s.stat.name, value: s.base_stat }));
const koOf = (names: LocalizedName[] | undefined) => names?.find((n) => n.language.name === 'ko')?.name;

async function loadGimmick(ref: NamedResource, kind: GimmickKind, baseKo: string, speciesName: string): Promise<FormCardData> {
  const fp = await getJSON<ApiPokemon>(ref.url);
  const firstAbility = fp.abilities[0]?.ability;
  const [form, ability, how] = await Promise.all([
    getJSON<ApiForm>(fp.forms[0].url).catch(() => null),
    firstAbility ? koName(firstAbility).then((k) => k || firstAbility.name) : '',
    gimmickCondition(kind, ref.name),
  ]);
  const suffix = ref.name.match(/-mega-([xyz])$/)?.[1]?.toUpperCase() || '';
  const fallbackName: Record<GimmickKind, string> = {
    mega: `메가${baseKo}${suffix}`, gmax: `거다이맥스 ${baseKo}`, primal: `원시${baseKo}`,
    ultra: `울트라${baseKo}`, eternamax: `무한다이맥스 ${baseKo}`,
  };
  // "원시회귀의 모습"처럼 모습 이름만 있는 경우가 있어서, 포켓몬 이름이 들어간 것만 쓴다
  const formPart = ref.name.slice(speciesName.length + 1).split('-')[0];
  const name = ([koOf(form?.names), koOf(form?.form_names)].find((n) => n?.includes(baseKo)) || fallbackName[kind])
    + (FORM_KO[formPart] ? ` (${FORM_KO[formPart]})` : '');
  return {
    key: ref.name,
    label: GIMMICKS[kind].label,
    color: GIMMICKS[kind].color,
    name,
    img: officialArt(fp),
    types: fp.types.map((t) => t.type.name),
    stats: statsOf(fp),
    ability,
    how,
  };
}

/* ---------- 리전폼 ---------- */

async function loadRegional(ref: NamedResource, baseKo: string): Promise<FormCardData | null> {
  const region = regionOf(ref.name);
  if (!region) return null;
  const [regionKo, color] = REGIONS[region];
  const fp = await getJSON<ApiPokemon>(ref.url);
  const abilities = await Promise.all(fp.abilities.map(async (a) => {
    const name = (await koName(a.ability)) || a.ability.name;
    return a.is_hidden ? `${name}(숨겨진 특성)` : name;
  }));
  const extra = ref.name.split(`-${region}`)[1].replace(/^-/, '');
  return {
    key: ref.name,
    label: `${regionKo}의 모습`,
    color,
    name: `${regionKo} ${baseKo}${REGION_FORM_KO[extra] ? ` (${REGION_FORM_KO[extra]})` : ''}`,
    img: officialArt(fp),
    types: fp.types.map((t) => t.type.name),
    stats: statsOf(fp),
    ability: abilities.join(' / '),
    how: '',
  };
}

/* ---------- 암수 모습 ---------- */

// 냐오닉스·에브리즈 등은 암컷이 따로 된 포켓몬이라 공식 일러스트가 있고,
// 나머지는 공식 일러스트에 암컷 그림이 없어서 둘 다 HOME 그림으로 맞춘다
function genderArtOf(pk: ApiPokemon, id: number, varieties: NamedResource[]): GenderArt | null {
  const femaleRef = varieties.find((v) => v.name.endsWith('-female'));
  if (femaleRef) {
    const fid = idFromUrl(femaleRef.url);
    return { male: [art(id), art(id, true)], female: [art(fid), art(fid, true)] };
  }
  const home = pk.sprites.other?.home;
  if (!home?.front_female || !home.front_default) return null;
  return {
    male: [home.front_default, home.front_shiny || home.front_default],
    female: [home.front_female, home.front_shiny_female || home.front_female],
  };
}

/* ---------- 상세 정보 ---------- */

interface EvoMethod {
  m: ApiEvolutionDetail;
  /** 리전폼에서만 진화하는 경우 그 모습 이름 (예: meowth-galar → 나이킹) */
  from?: string | null;
  parent?: number;
}

interface RegionalEvo {
  m: ApiEvolutionDetail;
  sid: number;
  parent: number;
  from: string | null;
  to: string | null;
}

const details = new Map<number, Promise<Detail>>();

async function fetchDetail(id: number): Promise<Detail> {
  const [pk, sp] = await Promise.all([
    getJSON<ApiPokemon>(`${API}/pokemon/${id}`),
    getJSON<ApiSpecies>(`${API}/pokemon-species/${id}`),
    loadMoveData(),
    loadMachines().catch((err: unknown) => console.error(err)), // 번호 없이도 목록은 보여줄 수 있다
  ]);
  const varieties = sp.varieties.map((v) => v.pokemon);
  const [abilities, chain, gimmicks, regionals] = await Promise.all([
    Promise.all(pk.abilities.map(async (a): Promise<AbilityInfo> => {
      const ab = await getJSON<ApiAbility>(a.ability.url);
      return { name: koOf(ab.names) || a.ability.name, hidden: a.is_hidden, desc: latestText(ab.flavor_text_entries) };
    })),
    sp.evolution_chain ? getJSON<ApiEvolutionChain>(sp.evolution_chain.url) : null,
    Promise.all(varieties.flatMap((ref) => {
      const kind = gimmickKind(ref.name);
      return kind ? [loadGimmick(ref, kind, nameOf(id), sp.name)] : [];
    })),
    Promise.all(varieties.filter((ref) => !gimmickKind(ref.name)).map((ref) => loadRegional(ref, nameOf(id))))
      .then((list) => list.filter((r): r is FormCardData => r !== null)),
  ]);

  // 게임마다 진화 방법이 다를 수 있어서, 기본(is_default) 방법이나 가장 최근 방법 하나만 보여준다.
  // 리전폼이 관련된 진화(피카츄 → 알로라 라이츄, 가라르 나옹 → 나이킹 등)는 일반 진화와 나눠서 모은다.
  const stages: number[][] = [], methods: Record<number, EvoMethod> = {}, regionalEvo: RegionalEvo[] = [];
  const pick = (list: ApiEvolutionDetail[]) => list.find((x) => x.is_default) || list[list.length - 1];
  const regionalName = (f: NamedResource | null | undefined) => (f && regionOf(f.name) ? f.name : null);
  const walk = (node: ApiChainLink, depth: number, parent: number) => {
    const sid = idFromUrl(node.species.url);
    (stages[depth] ||= []).push(sid);
    const ds = node.evolution_details;
    const normal = ds.filter((x) => !x.region && !regionalName(x.required_pokemon_form) && !regionalName(x.evolved_pokemon_form));
    const regionOnly = ds.filter((x) => regionalName(x.required_pokemon_form) && !regionalName(x.evolved_pokemon_form));
    if (normal.length) methods[sid] = { m: pick(normal) };
    else if (regionOnly.length) methods[sid] = { m: pick(regionOnly), from: regionalName(pick(regionOnly).required_pokemon_form), parent };
    else if (ds.length) methods[sid] = { m: pick(ds) };

    // 결과 모습(리전폼이 아니면 종)별로 하나씩
    const groups: Record<string, ApiEvolutionDetail[]> = {};
    for (const x of ds) {
      const from = regionalName(x.required_pokemon_form), to = regionalName(x.evolved_pokemon_form);
      if (from || to) (groups[to || `species:${sid}`] ||= []).push(x);
    }
    for (const list of Object.values(groups)) {
      const m = pick(list);
      regionalEvo.push({ m, sid, parent, from: regionalName(m.required_pokemon_form), to: regionalName(m.evolved_pokemon_form) });
    }
    node.evolves_to.forEach((n) => walk(n, depth + 1, sid));
  };
  if (chain) walk(chain.chain, 0, 0);

  const formKo = (name: string, sid: number) => `${REGIONS[regionOf(name) ?? 'alola'][0]} ${nameOf(sid)}`;
  const evoText: Record<number, string> = {};
  await Promise.all(Object.entries(methods).map(async ([sid, { m, from, parent = 0 }]) => {
    const cond = await evoCondition(m);
    evoText[Number(sid)] = from ? `${formKo(from, parent)}에서 · ${cond}` : cond;
  }));

  // 리전폼 카드에 붙일 진화 설명 (모습 이름 → 문장들), 진화 칸에 붙일 리전폼 진화 조건 (모습 이름 → 조건)
  const fromLines: Record<string, string[]> = {}, toLines: Record<string, string[]> = {}, formEvoText: Record<string, string> = {};
  await Promise.all(regionalEvo.map(async ({ m, sid, parent, from, to }) => {
    const cond = await evoCondition(m);
    if (to) {
      (fromLines[to] ||= []).push(`${from ? formKo(from, parent) : nameOf(parent)}에서 진화 · ${cond}`);
      formEvoText[to] = from ? `${formKo(from, parent)}에서 · ${cond}` : cond;
    }
    if (from) (toLines[from] ||= []).push(`${withRo(to ? formKo(to, sid) : nameOf(sid))} 진화 · ${cond}`);
  }));
  regionals.forEach((r) => { r.how = [...(fromLines[r.key] || []), ...(toLines[r.key] || [])].join('\n'); });

  return {
    height: pk.height / 10,
    weight: pk.weight / 10,
    genderRate: sp.gender_rate,
    genderArt: genderArtOf(pk, id, varieties),
    flavor: latestText(sp.flavor_text_entries),
    stats: statsOf(pk),
    abilities,
    stages: stages.map((ids) => ids.filter((sid) => sid <= TOTAL)).filter((ids) => ids.length),
    evoText,
    formEvoText,
    gimmicks,
    regionals,
    moves: pk.moves.map((m) => ({
      id: idFromUrl(m.move.url),
      slug: m.move.name,
      learn: m.version_group_details.map((v) => ({ vg: v.version_group.name, method: v.move_learn_method.name, level: v.level_learned_at })),
    })),
  };
}

// 포켓몬 하나의 상세 화면에 필요한 정보를 모두 모은다 (한 번 받으면 다시 받지 않는다)
export function getDetail(id: number): Promise<Detail> {
  let promise = details.get(id);
  if (!promise) {
    promise = fetchDetail(id);
    details.set(id, promise);
    promise.catch(() => details.delete(id));
  }
  return promise;
}
