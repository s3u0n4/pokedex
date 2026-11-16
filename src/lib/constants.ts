import type { GimmickKind, Region } from '../types';

export const TOTAL = 1025;
export const API = 'https://pokeapi.co/api/v2';
const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
export const NAMES_CSV = `${CSV_BASE}/pokemon_species_names.csv`;
export const MOVES_CSV = `${CSV_BASE}/moves.csv`;
export const MOVE_NAMES_CSV = `${CSV_BASE}/move_names.csv`;
export const MACHINES_CSV = `${CSV_BASE}/machines.csv`;
export const ITEMS_CSV = `${CSV_BASE}/items.csv`;
export const ART_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
// Smogon(포켓몬 대전 커뮤니티)이 정리한 9세대 대전용 추천 세트
export const SETS_URL = 'https://data.pkmn.cc/sets/gen9.json';

export const CACHE_KEY = 'pokedex-index-v3';
export const MOVE_CACHE_KEY = 'pokedex-moves-v2';
export const MACHINE_CACHE_KEY = 'pokedex-machines-v2';
export const LANG_KO = '3';
export const LANG_EN = '9';

export const GENS: [number, number][] = [[1, 151], [152, 251], [252, 386], [387, 493], [494, 649], [650, 721], [722, 809], [810, 905], [906, 1025]];

// 영문 키: [한국어 이름, 색, 글자색]
export const TYPES: Record<string, [ko: string, color: string, fg?: string]> = {
  normal:   ['노말', '#9fa19f'],
  fire:     ['불꽃', '#e62829'],
  water:    ['물', '#2980ef'],
  grass:    ['풀', '#3fa129'],
  electric: ['전기', '#fac000', '#3a2c00'],
  ice:      ['얼음', '#3dcef3', '#063848'],
  fighting: ['격투', '#ff8000'],
  poison:   ['독', '#9141cb'],
  ground:   ['땅', '#915121'],
  flying:   ['비행', '#81b9ef'],
  psychic:  ['에스퍼', '#ef4179'],
  bug:      ['벌레', '#91a119'],
  rock:     ['바위', '#afa981'],
  ghost:    ['고스트', '#704170'],
  dragon:   ['드래곤', '#5060e1'],
  dark:     ['악', '#624d4e'],
  steel:    ['강철', '#60a1b8'],
  fairy:    ['페어리', '#ef70ef'],
};

// 타입 상성표: 공격 타입 → { 방어 타입: 배율 } (1배는 생략)
export const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: .5, ghost: 0, steel: .5 },
  fire: { fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2 },
  water: { fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5 },
  electric: { water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5 },
  grass: { fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5 },
  ice: { fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5 },
  fighting: { normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5 },
  poison: { grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2 },
  flying: { electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5 },
  psychic: { fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5 },
  bug: { fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5 },
  rock: { fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: .5 },
  dragon: { dragon: 2, steel: .5, fairy: 0 },
  dark: { fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5 },
  steel: { fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2 },
  fairy: { fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5 },
};

export const STAT_KO: Record<string, string> = {
  hp: 'HP', attack: '공격', defense: '방어',
  'special-attack': '특수공격', 'special-defense': '특수방어', speed: '스피드',
};

export const TYPE_BY_ID = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'];
export const MOVE_CLASS: Record<number, [label: string, color: string]> = { 1: ['변화', '#8c8c96'], 2: ['물리', '#e8603c'], 3: ['특수', '#4a78e6'] };
export const LEARN_METHODS: [key: string, label: string][] = [['level-up', '레벨업'], ['machine', '기술머신'], ['egg', '알 기술'], ['tutor', '기술 가르침']];

// 발매 순서대로 (목록에서는 최신 게임이 위로 오게 뒤집어 쓴다)
export const VG_KO: Record<string, string> = {
  'red-green-japan': '레드·그린 (일본)', 'blue-japan': '블루 (일본)',
  'red-blue': '레드·블루', yellow: '피카츄', 'gold-silver': '골드·실버', crystal: '크리스탈',
  'ruby-sapphire': '루비·사파이어', emerald: '에메랄드', 'firered-leafgreen': '파이어레드·리프그린',
  colosseum: '콜로세움', xd: 'XD', 'diamond-pearl': '디아루가·펄기아', platinum: '기라티나',
  'heartgold-soulsilver': '하트골드·소울실버', 'black-white': '블랙·화이트', 'black-2-white-2': '블랙2·화이트2',
  'x-y': 'X·Y', 'omega-ruby-alpha-sapphire': '오메가루비·알파사파이어', 'sun-moon': '썬·문',
  'ultra-sun-ultra-moon': '울트라썬·울트라문', 'lets-go-pikachu-lets-go-eevee': '레츠고 피카츄·이브이',
  'sword-shield': '소드·실드', 'the-isle-of-armor': '갑옷의 외딴섬', 'the-crown-tundra': '왕관의 설원',
  'brilliant-diamond-shining-pearl': '브릴리언트다이아몬드·샤이닝펄', 'legends-arceus': '레전드 아르세우스',
  'scarlet-violet': '스칼렛·바이올렛', 'the-teal-mask': '벽록의 가면', 'the-indigo-disk': '남청의 원반',
  'legends-za': '레전드 Z-A', 'mega-dimension': '메가 디멘션', champions: '포켓몬 챔피언스',
};
export const VG_ORDER = Object.keys(VG_KO);
// PokeAPI의 version_group id 순서 (CSV는 이름 대신 id를 쓴다)
export const VG_BY_ID = ['red-blue', 'yellow', 'gold-silver', 'crystal', 'ruby-sapphire', 'emerald', 'firered-leafgreen',
  'diamond-pearl', 'platinum', 'heartgold-soulsilver', 'black-white', 'colosseum', 'xd', 'black-2-white-2', 'x-y',
  'omega-ruby-alpha-sapphire', 'sun-moon', 'ultra-sun-ultra-moon', 'lets-go-pikachu-lets-go-eevee', 'sword-shield',
  'the-isle-of-armor', 'the-crown-tundra', 'brilliant-diamond-shining-pearl', 'legends-arceus', 'scarlet-violet',
  'the-teal-mask', 'the-indigo-disk', 'red-green-japan', 'blue-japan', 'legends-za', 'mega-dimension', 'champions'];
// 본편과 DLC는 기술머신을 같이 쓴다 (DLC에서 추가된 기술머신은 DLC 쪽에 기록돼 있음)
export const VG_FAMILIES = [
  ['scarlet-violet', 'the-teal-mask', 'the-indigo-disk'],
  ['sword-shield', 'the-isle-of-armor', 'the-crown-tundra'],
];
// 기술머신 번호가 세 자리인 게임
export const TM_THREE_DIGIT = new Set(['scarlet-violet', 'the-teal-mask', 'the-indigo-disk', 'legends-za', 'mega-dimension']);
export const VG_PREFERRED = ['scarlet-violet', 'champions', 'sword-shield', 'brilliant-diamond-shining-pearl', 'ultra-sun-ultra-moon'];

export const NATURES = 'Hardy Lonely Brave Adamant Naughty Bold Docile Relaxed Impish Lax Timid Hasty Serious Jolly Naive Modest Mild Quiet Bashful Rash Calm Gentle Sassy Careful Quirky'.split(' ');
export const NATURES_KO = '노력 외로움 용감 고집 개구쟁이 대담 온순 무사태평 장난꾸러기 촐랑 겁쟁이 성급 성실 명랑 천진난만 조심 의젓 냉정 수줍음 덜렁 차분 얌전 건방 신중 변덕'.split(' ');
// 성격표의 행은 오르는 능력치, 열은 내려가는 능력치
export const NATURE_STATS = ['공격', '방어', '스피드', '특공', '특방'];
export const EV_KO: Record<string, string> = { hp: 'HP', atk: '공격', def: '방어', spa: '특공', spd: '특방', spe: '스피드' };
export const FORMAT_KO: Record<string, string> = {
  ou: 'OU', ubers: 'Ubers', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', zu: 'ZU', lc: 'LC (1단계)', nfe: 'NFE (미진화)',
  doublesou: '더블 OU', nationaldex: '내셔널도감', monotype: '모노타입', '1v1': '1대1', battlestadiumsingles: '배틀스타디움 싱글',
  ubersuu: 'Ubers UU', nationaldexmonotype: '내셔널도감 모노타입', nationaldexuu: '내셔널도감 UU',
  almostanyability: '특성 자유 (AAA)', godlygift: '갓리 기프트', inheritance: '인헤리턴스', balancedhackmons: '밸런스드 해크몬',
  nationaldexru: '내셔널도감 RU', nationaldexubers: '내셔널도감 Ubers', nationaldexdoubles: '내셔널도감 더블',
  stabmons: '자속 자유 (STABmons)', partnersincrime: '파트너스 인 크라임', cap: 'CAP (창작 포켓몬)', anythinggoes: '무제한 (AG)',
  mixandmega: '믹스 앤 메가',
};
export const FORMAT_ORDER = ['ou', 'ubers', 'uu', 'ru', 'nu', 'pu', 'zu', 'lc', 'nfe', 'battlestadiumsingles', 'doublesou'];
// 자동 추천에서 빼는 기술 (반동으로 쉬어야 하거나, 2턴이 걸리거나, 기절하는 등 실전에서 쓰기 어려운 기술)
export const AUTO_EXCLUDE = new Set(('hyper-beam giga-impact blast-burn frenzy-plant hydro-cannon rock-wrecker roar-of-time ' +
  'prismatic-laser eternabeam meteor-assault explosion self-destruct misty-explosion focus-punch dream-eater belch ' +
  'last-resort synchronoise future-sight doom-desire sky-attack solar-beam solar-blade razor-wind skull-bash bide ' +
  'fly dig dive bounce phantom-force shadow-force geomancy steel-beam mind-blown final-gambit natural-gift fling ' +
  'spit-up beat-up present snore sky-drop freeze-shock ice-burn dynamax-cannon behemoth-blade behemoth-bash ' +
  'tera-blast tera-starstorm').split(' '));
// 도구 그림 (PokeAPI/sprites)
export const ITEM_ART = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';
// 그 타입 기술의 위력을 1.2배로 올리는 도구
export const TYPE_ITEM: Record<string, string> = {
  normal: 'silk-scarf', fire: 'charcoal', water: 'mystic-water', electric: 'magnet', grass: 'miracle-seed',
  ice: 'never-melt-ice', fighting: 'black-belt', poison: 'poison-barb', ground: 'soft-sand', flying: 'sharp-beak',
  psychic: 'twisted-spoon', bug: 'silver-powder', rock: 'hard-stone', ghost: 'spell-tag', dragon: 'dragon-fang',
  dark: 'black-glasses', steel: 'metal-coat', fairy: 'fairy-feather',
};
// 스토리 추천에서 더 빼는 기술 (쓰고 나면 특공이 크게 떨어져서 연달아 싸우기 불편하다)
export const STORY_EXCLUDE = new Set(['overheat', 'leaf-storm', 'draco-meteor', 'psycho-boost', 'fleur-cannon']);
// 공격 기술이 4개가 안 되는 포켓몬을 채우는 변화 기술 (앞에 있을수록 먼저 고른다)
export const SETUP_PHYSICAL = ['swords-dance', 'dragon-dance', 'shell-smash', 'bulk-up', 'coil', 'shift-gear', 'hone-claws', 'howl', 'curse', 'work-up', 'growth', 'harden', 'defense-curl', 'withdraw'];
export const SETUP_SPECIAL = ['quiver-dance', 'nasty-plot', 'tail-glow', 'shell-smash', 'calm-mind', 'work-up', 'growth', 'cosmic-power', 'iron-defense', 'amnesia', 'harden', 'defense-curl', 'withdraw'];
export const RECOVERY_MOVES = ['recover', 'roost', 'slack-off', 'soft-boiled', 'milk-drink', 'shore-up', 'synthesis', 'moonlight', 'morning-sun', 'strength-sap', 'wish', 'leech-seed', 'ingrain', 'aqua-ring', 'rest'];
export const STATUS_MOVES = ['spore', 'thunder-wave', 'will-o-wisp', 'toxic', 'glare', 'sleep-powder', 'yawn', 'hypnosis', 'stun-spore', 'poison-powder', 'confuse-ray', 'string-shot', 'sand-attack', 'growl', 'tail-whip', 'leer'];
// 그 밖의 기술로 채울 때도 고르지 않는 기술 (아무 효과가 없다)
export const USELESS_MOVES = new Set(['splash', 'celebrate', 'hold-hands', 'happy-hour']);
export const SHOWDOWN_ID: Record<number, string> = { 29: 'nidoranf', 32: 'nidoranm' };

// 배틀 중 특수 변신 (PokeAPI에서는 포켓몬의 다른 모습(variety)으로 들어 있다)
export const GIMMICKS: Record<GimmickKind, { label: string; color: string }> = {
  mega: { label: '메가진화', color: '#7b4fd6' },
  gmax: { label: '거다이맥스', color: '#e0245e' },
  primal: { label: '원시회귀', color: '#e8590c' },
  ultra: { label: '울트라버스트', color: '#d49a00' },
  eternamax: { label: '무한다이맥스', color: '#7a1f63' },
};
export const PRIMAL_ORB: Record<string, string> = { kyogre: 'blue-orb', groudon: 'red-orb' };
// 같은 포켓몬의 메가진화가 모습별로 나뉜 경우 (예: meowstic-female-mega)
export const FORM_KO: Record<string, string> = {
  male: '수컷', female: '암컷', curly: '젖힌 모습', droopy: '늘어진 모습', stretchy: '뻗은 모습', original: '500년 전의 색',
  amped: '하이한 모습', low: '로우한 모습', single: '일격의 태세', rapid: '연격의 태세',
};

export const REGIONS: Record<Region, [ko: string, color: string]> = { alola: ['알로라', '#f08c00'], galar: ['가라르', '#1c7ed6'], hisui: ['히스이', '#5c940d'], paldea: ['팔데아', '#c2255c'] };
export const REGION_FORM_KO: Record<string, string> = { zen: '달마 모드', 'combat-breed': '컴뱃종', 'blaze-breed': '블레이즈종', 'aqua-breed': '워터종' };

export const TIME_KO: Record<string, string> = { day: '낮', night: '밤', dusk: '황혼', 'full-moon': '보름달' };
export const REGION_KO: Record<string, string> = {
  kanto: '관동', johto: '성도', hoenn: '호연', sinnoh: '신오', unova: '하나',
  kalos: '칼로스', alola: '알로라', galar: '가라르', hisui: '히스이', paldea: '팔데아',
};
