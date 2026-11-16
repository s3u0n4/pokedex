import { RAID_DATA_URL } from '../lib/constants';
import { entryOf, nameOf, store } from '../lib/store';
import { getJSON } from '../lib/utils';
import type { RaidData, RaidMon, RaidRegion, RaidVersion } from '../types';

// 굴 데이터(약 150KB)는 레이드 화면을 처음 열 때 한 번만 받는다
let raidPromise: Promise<RaidData> | null = null;
export function loadRaids() {
  raidPromise ||= getJSON<RaidData>(RAID_DATA_URL).catch((err: unknown) => { raidPromise = null; throw err; });
  return raidPromise;
}

export interface RaidFilter {
  version: RaidVersion;
  region: RaidRegion;
  query: string;
  /** 0이면 전체, 1~5는 그 별 단계에서 나오는 포켓몬만 */
  star: number;
  gmaxOnly: boolean;
}

/** 출현표가 같은 굴은 하나로 묶는다 (nos: 게임 속 굴 번호) */
export interface RaidDen {
  nos: number[];
  common: RaidMon[];
  rare: RaidMon[];
}

export interface RaidPlace {
  ko: string;
  en: string;
  dens: RaidDen[];
  /** 장소의 굴 수 (걸러지기 전) */
  total: number;
}

// 상세 화면으로 열 번호: 목록에 있는 리전폼(가라르 모습)이면 그 모습, 아니면 원래 포켓몬
export const raidOpenId = (m: RaidMon) => (m.p && store.forms.some((f) => f.id === m.p) ? m.p : m.n);

// ★1–3처럼 나오는 별 단계 범위
export function starRange(stars: number[]) {
  const min = Math.min(...stars), max = Math.max(...stars);
  return min === max ? `★${min}` : `★${min}–${max}`;
}

export const starsOf = (m: RaidMon) => Object.keys(m.s).map(Number);

function matcher(query: string) {
  const q = query.trim().toLowerCase().replace(/^(#|no\.?)\s*/, '');
  if (!q) return null;
  const num = /^\d+$/.test(q) ? Number(q) : null;
  return (m: RaidMon) => {
    if (num !== null) return m.n === num;
    const en = entryOf(m.n)?.en.toLowerCase() ?? '';
    return nameOf(m.n).includes(q) || en.includes(q) || Boolean(m.label?.includes(q));
  };
}

export function raidPlaces(data: RaidData, f: RaidFilter): RaidPlace[] {
  const match = matcher(f.query);
  const active = Boolean(match || f.star || f.gmaxOnly);
  const keepStar = (m: RaidMon) => (!f.star || m.s[f.star]) && (!f.gmaxOnly || m.gmax);
  const keep = (m: RaidMon) => keepStar(m) && (!match || match(m));
  const table = (no: number) => data.tables[no]?.[f.version] ?? [];

  // 장소 이름으로 찾으면 그 장소의 굴은 모두 보여준다
  const q = f.query.trim().toLowerCase();
  return data.locations.filter((l) => l.region === f.region).flatMap((l) => {
    const placeHit = Boolean(q) && (l.ko.includes(q) || l.en.toLowerCase().includes(q));
    const keepHere = placeHit ? keepStar : keep;
    const groups = new Map<string, RaidDen>();
    l.dens.forEach(({ no, t: [common, rare] }) => {
      const key = `${common}-${rare}`;
      const den = groups.get(key);
      if (den) den.nos.push(no);
      else groups.set(key, { nos: [no], common: table(common).filter(keepHere), rare: table(rare).filter(keepHere) });
    });
    const dens = [...groups.values()].filter((d) => !active || d.common.length || d.rare.length);
    return dens.length ? [{ ko: l.ko, en: l.en, dens, total: l.dens.length }] : [];
  });
}
