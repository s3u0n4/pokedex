import type { MoveData, RegionalForm, Species } from '../types';

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
