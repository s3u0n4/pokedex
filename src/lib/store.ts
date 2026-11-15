import type { DexEntry, MoveData, RegionalForm, Species } from '../types';
import { TOTAL } from './constants';

interface Store {
  /** 도감 1~1025번 */
  list: Species[];
  /** 리전폼 */
  forms: RegionalForm[];
  /** 기술 id → 기술 */
  moves: Record<string, MoveData>;
  /** 쇼다운식 기술 ID → 기술 */
  movesByNorm: Record<string, MoveData>;
  /** "게임:기술id" → "TM001" */
  machines: Record<string, string>;
}

// 한 번 받으면 바뀌지 않는 공용 데이터. 컴포넌트 상태가 아니라 데이터 함수들이 함께 읽는 저장소다.
export const store: Store = {
  list: [],
  forms: [],
  moves: {},
  movesByNorm: {},
  machines: {},
};

export const nameOf = (id: number) => store.list[id - 1]?.ko || store.list[id - 1]?.en || `#${id}`;

// 상세 화면 번호(도감 번호 또는 리전폼의 10000번대 id) → 이름·분류·타입
export function entryOf(id: number): DexEntry | undefined {
  if (id <= TOTAL) {
    const p = store.list[id - 1];
    return p && { ...p, base: p.id };
  }
  const f = store.forms.find((x) => x.id === id);
  return f && { ...f, genus: store.list[f.base - 1]?.genus ?? '' };
}

// 원래 모습과 그 리전폼들 (도감 번호 순서 그대로)
export const familyOf = (base: number) => [base, ...store.forms.filter((f) => f.base === base).map((f) => f.id)];

// Smogon·쇼다운식 이름: 리전폼은 PokeAPI 이름에서 "-breed", "-standard"를 뺀다
// (tauros-paldea-blaze-breed → Tauros-Paldea-Blaze, darmanitan-galar-standard → Darmanitan-Galar)
export const showdownName = (e: DexEntry) => (e.name ? e.name.replace(/-(breed|standard)$/, '') : e.en);
