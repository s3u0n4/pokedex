import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadIndex } from './api/pokedex';
import Controls from './components/Controls';
import DetailModal, { type GoTo } from './components/DetailModal';
import Header from './components/Header';
import PokemonGrid from './components/PokemonGrid';
import { Status } from './components/ui';
import { GENS, TOTAL } from './lib/constants';
import { entryOf } from './lib/store';
import type { ListEntry, PokedexIndex } from './types';

// 주소 끝의 #25 같은 해시가 상세 화면을 연다 (리전폼은 #10100 같은 PokeAPI id)
function hashId() {
  const id = Number(location.hash.slice(1));
  return Number.isInteger(id) && id >= 1 && entryOf(id) ? id : null;
}

export default function App() {
  const [index, setIndex] = useState<PokedexIndex | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [gen, setGen] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);

  const currentRef = useRef<number | null>(null);
  const pushedRef = useRef(false);          // 목록에서 열어서 방문 기록이 하나 쌓였는지 (닫을 때 뒤로 가기)
  const lastOpenedRef = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  currentRef.current = current;

  const load = useCallback(() => {
    setLoadError(false);
    loadIndex().then(setIndex).catch((err: unknown) => { console.error(err); setLoadError(true); });
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!index) return undefined;
    const sync = () => {
      const id = hashId();
      if (!id) pushedRef.current = false;
      setCurrent(id);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [index]);

  // 상세를 닫으면 마지막으로 본 포켓몬 카드로 포커스를 돌려준다
  useEffect(() => {
    if (current) { lastOpenedRef.current = current; return; }
    const last = lastOpenedRef.current;
    if (last) document.querySelector<HTMLElement>(`.card[data-id="${last}"]`)?.focus({ preventScroll: true });
  }, [current]);

  // 목록 카드: 원래 포켓몬 바로 뒤에 그 포켓몬의 리전폼이 온다 (base = 도감 번호)
  const entries = useMemo<ListEntry[]>(() => {
    if (!index) return [];
    const formsByBase: Record<number, ListEntry[]> = {};
    index.forms.forEach((f) => (formsByBase[f.base] ||= []).push(f));
    return index.list.flatMap((p) => [{ ...p, base: p.id }, ...(formsByBase[p.id] || [])]);
  }, [index]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^(#|no\.?)\s*/, '');
    const num = /^\d+$/.test(q) ? Number(q) : null;
    const [from, to] = gen ? GENS[gen - 1] : [1, TOTAL];
    return entries.filter((p) => {
      if (p.base < from || p.base > to) return false;
      if (type && !p.types.includes(type)) return false;
      if (!q) return true;
      return num !== null ? p.base === num : p.ko.includes(q) || p.en.toLowerCase().includes(q);
    });
  }, [entries, query, gen, type]);

  // 상세 화면의 이전/다음: 목록에 보이는 순서를 따르고, 목록에 없는 포켓몬이면 전체 목록 순
  const { prevId, nextId } = useMemo(() => {
    if (!current) return { prevId: null, nextId: null };
    const visible = filtered.map((p) => p.id);
    const order = visible.includes(current) ? visible : entries.map((p) => p.id);
    const i = order.indexOf(current);
    return { prevId: order[i - 1] ?? null, nextId: order[i + 1] ?? null };
  }, [current, filtered, entries]);

  const openFromList = useCallback((entry: ListEntry) => {
    pushedRef.current = true;
    location.hash = String(entry.id);
  }, []);

  // 상세 화면 안에서 이동할 때는 방문 기록을 쌓지 않는다
  const go = useCallback<GoTo>((id) => {
    if (!id || id === currentRef.current) return;
    history.replaceState(null, '', `#${id}`);
    setCurrent(id);
  }, []);

  const close = useCallback(() => {
    if (pushedRef.current) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      setCurrent(null);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (current) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') go(prevId);
        else if (e.key === 'ArrowRight') go(nextId);
      } else if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, prevId, nextId, close, go]);

  const resetFilters = () => { setQuery(''); setGen(0); setType(null); };

  return (
    <>
      <Header />
      <Controls
        query={query} onQuery={setQuery}
        gen={gen} onGen={setGen}
        type={type} onType={setType}
        countText={index ? `${filtered.length}마리` : ''}
        showReset={Boolean(query.trim() || gen || type)}
        onReset={resetFilters}
        searchRef={searchRef}
      />

      <main className="wrap">
        {index && <PokemonGrid entries={filtered} onOpen={openFromList} />}
        {index && !filtered.length && <Status><p>조건에 맞는 포켓몬이 없어요.</p></Status>}
        {!index && !loadError && <Status wobble><p>도감 데이터를 불러오는 중…</p></Status>}
        {loadError && (
          <Status>
            <p>데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
            <button className="primary-btn" onClick={load}>다시 시도</button>
          </Status>
        )}
      </main>

      <footer className="wrap">
        데이터 출처: <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokeAPI</a> · 포켓몬스터 © Nintendo / Creatures / GAME FREAK
      </footer>

      {index && current && (
        <DetailModal
          id={current}
          prevId={prevId}
          nextId={nextId}
          onGo={go}
          onClose={close}
        />
      )}
    </>
  );
}
