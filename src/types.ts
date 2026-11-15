/* ---------- 앱에서 쓰는 데이터 ---------- */

export type Region = 'alola' | 'galar' | 'hisui' | 'paldea';
export type GimmickKind = 'mega' | 'gmax' | 'primal' | 'ultra' | 'eternamax';

/** 도감 1~1025번 */
export interface Species {
  id: number;
  ko: string;
  en: string;
  genus: string;
  types: string[];
}

/** 목록에 카드로 나오는 리전폼 (id는 PokeAPI의 10000번대 포켓몬 id) */
export interface RegionalForm {
  id: number;
  name: string;
  base: number;
  region: Region;
  ko: string;
  en: string;
  types: string[];
}

export interface PokedexIndex {
  list: Species[];
  forms: RegionalForm[];
}

/** 목록 카드 하나 (base = 도감 번호, 리전폼이면 region이 있다) */
export interface ListEntry {
  id: number;
  base: number;
  ko: string;
  en: string;
  types: string[];
  region?: Region;
}

/** 상세 화면 하나 (종이거나 리전폼). 리전폼이면 name·region이 있다 */
export interface DexEntry extends ListEntry {
  genus: string;
  name?: string;
}

export interface Stat {
  key: string;
  value: number;
}

export interface AbilityInfo {
  name: string;
  hidden: boolean;
  desc: string;
}

/** 진화 기믹 카드 */
export interface FormCardData {
  key: string;
  label: string;
  color: string;
  name: string;
  img: string | null;
  types: string[];
  stats: Stat[];
  ability: string;
  how: string;
}

export interface LearnEntry {
  vg: string;
  method: string;
  level: number;
}

export interface PokemonMove {
  id: number;
  slug: string;
  learn: LearnEntry[];
}

/** 암수 모습이 다른 포켓몬의 그림 (일반·이로치) */
export interface GenderArt {
  male: [string, string];
  female: [string, string];
}

/** 상세 화면에 필요한 정보 전부 (getDetail) */
export interface Detail {
  height: number;
  weight: number;
  genderRate: number;
  /** 암수 모습이 다를 때만 있다 */
  genderArt: GenderArt | null;
  flavor: string;
  stats: Stat[];
  abilities: AbilityInfo[];
  /** 진화 단계별 도감 번호 */
  stages: number[][];
  /** 도감 번호 → 그 포켓몬으로 진화하는 조건 */
  evoText: Record<number, string>;
  /** 리전폼 이름(raichu-alola) → 그 모습으로 진화하는 조건 */
  formEvoText: Record<string, string>;
  gimmicks: FormCardData[];
  moves: PokemonMove[];
}

export interface MoveData {
  ko: string;
  slug: string;
  type: string | null;
  power: number;
  pp: number;
  acc: number;
  /** 1 변화, 2 물리, 3 특수 */
  cls: number;
}

export interface MoveInfo {
  name: string;
  slug: string;
  type: string | null;
  power: number;
  acc: number;
  pp: number;
  cls: number;
}

export interface MoveRow extends MoveInfo {
  level: number;
  tm: string;
}

export interface AutoPick extends MoveInfo {
  type: string;
  score: number;
  /** 지금 게임에서 배우는 방법 */
  learn?: MoveLearn | null;
}

/** 한 게임에서 기술을 배우는 방법 (여러 개일 수 있다). level 0은 진화할 때 */
export interface MoveLearn {
  level: number | null;
  tm: string | null;
  egg: boolean;
  tutor: boolean;
}

/** 추천 도구 (slug는 PokeAPI 도구 이름) */
export interface ItemSuggestion {
  slug: string;
  why: string;
}

export interface AutoRecommendation {
  picked: AutoPick[];
  items: ItemSuggestion[];
  atk: number;
  spa: number;
  vg: string | null;
  mixed: boolean;
}

/* ---------- Smogon 세트 (data.pkmn.cc) ---------- */

type OneOrMany<T> = T | T[];

export interface SmogonSet {
  moves: OneOrMany<string>[];
  ability?: OneOrMany<string>;
  item?: OneOrMany<string>;
  nature?: OneOrMany<string>;
  evs?: OneOrMany<Record<string, number>>;
  teratypes?: OneOrMany<string>;
}

/** 룰(ou, ubers …) → 세트 이름 → 세트 */
export type SmogonFormats = Record<string, Record<string, SmogonSet>>;

export interface SetMove {
  name: string;
  type: string | null;
  /** null이면 이 게임에서 배울 수 없다, undefined면 모름 */
  learn?: MoveLearn | null;
}

export interface SetDescription {
  name: string;
  moves: SetMove[][];
  meta: [string, string][];
}

/* ---------- PokeAPI 응답 (쓰는 필드만) ---------- */

export interface NamedResource {
  name: string;
  url: string;
}

export interface LocalizedName {
  name: string;
  language: NamedResource;
}

export interface FlavorEntry {
  flavor_text: string;
  language: NamedResource;
}

export interface ApiNamed {
  names: LocalizedName[];
}

export interface ApiType {
  name: string;
  pokemon: { slot: number; pokemon: NamedResource }[];
}

export interface ApiPokemon {
  height: number;
  weight: number;
  stats: { base_stat: number; stat: NamedResource }[];
  types: { slot: number; type: NamedResource }[];
  abilities: { ability: NamedResource; is_hidden: boolean }[];
  moves: {
    move: NamedResource;
    version_group_details: { level_learned_at: number; version_group: NamedResource; move_learn_method: NamedResource }[];
  }[];
  forms: NamedResource[];
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null };
      home?: { front_default: string | null; front_shiny: string | null; front_female: string | null; front_shiny_female: string | null };
    };
  };
}

export interface ApiSpecies {
  name: string;
  gender_rate: number;
  flavor_text_entries: FlavorEntry[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedResource }[];
}

export interface ApiAbility {
  names: LocalizedName[];
  flavor_text_entries: FlavorEntry[];
}

export interface ApiForm {
  names: LocalizedName[];
  form_names: LocalizedName[];
}

export interface ApiItemCategory {
  items: NamedResource[];
}

type Res = NamedResource | null;

export interface ApiEvolutionDetail {
  is_default?: boolean;
  trigger?: Res;
  item?: Res;
  held_item?: Res;
  known_move?: Res;
  known_move_type?: Res;
  used_move?: Res;
  location?: Res;
  party_species?: Res;
  party_type?: Res;
  trade_species?: Res;
  region?: Res;
  required_pokemon_form?: Res;
  evolved_pokemon_form?: Res;
  gender?: number | null;
  min_level?: number | null;
  min_happiness?: number | null;
  min_affection?: number | null;
  min_beauty?: number | null;
  min_move_count?: number | null;
  min_steps?: number | null;
  min_damage_taken?: number | null;
  relative_physical_stats?: number | null;
  time_of_day?: string;
  needs_overworld_rain?: boolean;
  turn_upside_down?: boolean;
  near_special_rock?: boolean;
  needs_multiplayer?: boolean;
  allowed_natures?: unknown[] | null;
}

export interface ApiChainLink {
  species: NamedResource;
  evolution_details: ApiEvolutionDetail[];
  evolves_to: ApiChainLink[];
}

export interface ApiEvolutionChain {
  chain: ApiChainLink;
}
