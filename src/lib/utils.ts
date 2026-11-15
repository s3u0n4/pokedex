import type { FlavorEntry, GimmickKind, Region } from '../types';
import {
  ART_BASE, FORMAT_KO, FORMAT_ORDER, NATURES, NATURES_KO, NATURE_STATS, TYPES, TYPE_CHART,
} from './constants';

export const art = (id: number, shiny = false) => `${ART_BASE}${shiny ? '/shiny' : ''}/${id}.png`;
export const pad = (id: number) => String(id).padStart(4, '0');
export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);
export const cleanText = (s: string) => s.replace(/[\n\f\r­]+/g, ' ').replace(/\s+/g, ' ').trim();
// 쇼다운식 ID: 영문 소문자와 숫자만 남긴다 ("Will-O-Wisp" → "willowisp")
export const normId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export const slugify = (s: string) => s.toLowerCase().replace(/['’.:%]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const asList = <T>(v: T | T[] | null | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

// 받침에 따라 "로/으로"를 붙인다 (ㄹ 받침은 "로")
export function withRo(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}(으)로`;
  const jong = code % 28;
  return word + (jong === 0 || jong === 8 ? '로' : '으로');
}

// 같은 언어 항목 중 가장 최근 것을 고르고, 한국어가 없으면 영어로 대신한다
export function latestText(entries: FlavorEntry[]) {
  const pick = (lang: string) => entries.filter((e) => e.language.name === lang).pop();
  const e = pick('ko') || pick('en');
  return e ? cleanText(e.flavor_text) : '';
}

export async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

export async function getText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// localStorage는 막혀 있거나 비어 있을 수 있어서 항상 실패해도 괜찮게 쓴다
export function readCache<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null; } catch { return null; }
}
export function writeCache(key: string, value: unknown, staleKeys: string[] = []) {
  try {
    staleKeys.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* 저장 못 해도 다음에 다시 받으면 된다 */ }
}

export function statColor(v: number) {
  if (v < 50) return '#f34444';
  if (v < 80) return '#ff8c1a';
  if (v < 100) return '#f5c518';
  if (v < 120) return '#9bd318';
  if (v < 150) return '#23c35e';
  return '#00bfb3';
}

// ["♂ 50%", "♀ 50%"] (화면에서 둘이 따로 줄바꿈되도록 나눠서 돌려준다)
export function genderText(rate: number) {
  if (rate < 0) return ['무성'];
  const female = rate * 12.5;
  return [`♂ ${100 - female}%`, `♀ ${female}%`];
}

export function natureText(name: string) {
  const i = NATURES.indexOf(name);
  if (i < 0) return name;
  const up = Math.floor(i / 5), down = i % 5;
  return up === down ? `${NATURES_KO[i]} (보정 없음)` : `${NATURES_KO[i]} (${NATURE_STATS[up]}↑ ${NATURE_STATS[down]}↓)`;
}

export function formatLabel(f: string) {
  if (FORMAT_KO[f]) return FORMAT_KO[f];
  if (f.startsWith('vgc')) return `VGC ${f.slice(3)}`;
  return f.toUpperCase();
}

export function sortFormats(formats: string[]) {
  const rank = (f: string) => {
    const i = FORMAT_ORDER.indexOf(f);
    return i >= 0 ? i : f.startsWith('vgc') ? FORMAT_ORDER.length : FORMAT_ORDER.length + 1;
  };
  return [...formats].sort((a, b) => rank(a) - rank(b));
}

/* ---------- 타입 상성 ---------- */

export const effectiveness = (atk: string, defTypes: string[]) =>
  defTypes.reduce((m, t) => m * (TYPE_CHART[atk][t] ?? 1), 1);

export interface DefenseGroups {
  4: string[];
  2: string[];
  0.5: string[];
  0.25: string[];
  0: string[];
}

export function defenseGroups(types: string[]): DefenseGroups {
  const groups: DefenseGroups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
  for (const atk of Object.keys(TYPES)) {
    const m = effectiveness(atk, types);
    if (m in groups) groups[m as keyof DefenseGroups].push(atk);
  }
  return groups;
}

export const superEffectiveAgainst = (atk: string) => Object.keys(TYPES).filter((d) => TYPE_CHART[atk][d] === 2);

/* ---------- 모습 이름 ---------- */

export function regionOf(name: string): Region | null {
  if (/-(totem|cap)(-|$)/.test(name)) return null; // 토템 포켓몬, 모자 쓴 피카츄는 리전폼이 아니다
  return (name.match(/-(alola|galar|hisui|paldea)(?:-|$)/)?.[1] as Region | undefined) ?? null;
}

export function gimmickKind(name: string): GimmickKind | null {
  if (/-mega(-|$)/.test(name)) return 'mega';
  if (name.endsWith('-gmax')) return 'gmax';
  if (name.endsWith('-primal')) return 'primal';
  if (name === 'necrozma-ultra') return 'ultra';
  if (name.endsWith('-eternamax')) return 'eternamax';
  return null;
}
