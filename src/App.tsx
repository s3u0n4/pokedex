import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadIndex } from './api/pokedex';
import Controls from './components/Controls';
import DetailModal, { type GoTo } from './components/DetailModal';
import Header, { type View } from './components/Header';
import PokemonGrid from './components/PokemonGrid';
import RaidPage from './components/RaidPage';
import StatsPage from './components/StatsPage';
import { Status } from './components/ui';
import { GENS, TOTAL } from './lib/constants';
import { entryOf } from './lib/store';
import { entryMatcher } from './lib/utils';
import type { ListEntry, PokedexIndex } from './types';

// 주소 끝의 #25 같은 해시가 상세 화면을 연다 (리전폼은 #10100 같은 PokeAPI id).
// 레이드 화면은 #raid, 거기서 연 상세는 #raid/25 (능력치 순위도 #stats, #stats/25)
const PAGES: View[] = ['raid', 'stats'];

function parseHash(): { view: View; id: number | null } {
  const [head, tail] = location.hash.slice(1).split('/');
  const view: View = PAGES.find((v) => v === head) ?? 'dex';
  const raw = view === 'dex' ? head : tail;
  const id = Number(raw);
  return { view, id: raw && Number.isInteger(id) && id >= 1 && entryOf(id) ? id : null };
}

const hashFor = (view: View, id: number | null) => {
  if (view !== 'dex') return id ? `#${view}/${id}` : `#${view}`;
  return id ? `#${id}` : '';
};

export default function App() {
  const [index, setIndex] = useState<PokedexIndex | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [gen, setGen] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [view, setView] = useState<View>(() => parseHash().view);
  /** 능력치 순위 화면에서 보이는 순서 (상세 화면의 이전/다음에 쓴다) */
  const [rankOrder, setRankOrder] = useState<number[] | null>(null);

  const currentRef = useRef<number | null>(null);
  const viewRef = useRef<View>(view);
  const pushedRef = useRef(false);          // 목록에서 열어서 방문 기록이 하나 쌓였는지 (닫을 때 뒤로 가기)
  const lastOpenedRef = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  currentRef.current = current;
  viewRef.current = view;

  const load = useCallback(() => {
    setLoadError(false);
    loadIndex().then(setIndex).catch((err: unknown) => { console.error(err); setLoadError(true); });
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!index) return undefined;
    const sync = () => {
      const { view: v, id } = parseHash();
      if (!id) pushedRef.current = false;
      setView(v);
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
    const match = entryMatcher(query);
    const [from, to] = gen ? GENS[gen - 1] : [1, TOTAL];
    return entries.filter((p) => {
      if (p.base < from || p.base > to) return false;
      if (type && !p.types.includes(type)) return false;
      return !match || match(p);
    });
  }, [entries, query, gen, type]);

  // 상세 화면의 이전/다음: 목록(능력치 순위 화면에서는 순위)에 보이는 순서를 따르고, 거기 없는 포켓몬이면 전체 목록 순
  const { prevId, nextId } = useMemo(() => {
    if (!current) return { prevId: null, nextId: null };
    const visible = view === 'stats' && rankOrder ? rankOrder : filtered.map((p) => p.id);
    const order = visible.includes(current) ? visible : entries.map((p) => p.id);
    const i = order.indexOf(current);
    return { prevId: order[i - 1] ?? null, nextId: order[i + 1] ?? null };
  }, [current, filtered, entries, view, rankOrder]);

  const open = useCallback((id: number) => {
    pushedRef.current = true;
    location.hash = hashFor(viewRef.current, id);
  }, []);
  const openFromList = useCallback((entry: ListEntry) => open(entry.id), [open]);

  // 상세 화면 안에서 이동할 때는 방문 기록을 쌓지 않는다
  const go = useCallback<GoTo>((id) => {
    if (!id || id === currentRef.current) return;
    history.replaceState(null, '', hashFor(viewRef.current, id));
    setCurrent(id);
  }, []);

  const close = useCallback(() => {
    if (pushedRef.current) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search + hashFor(viewRef.current, null));
      setCurrent(null);
    }
  }, []);

  // 카테고리를 바꾸면 방문 기록이 하나 쌓인다 (뒤로 가기로 돌아올 수 있게)
  const changeView = (v: View) => {
    if (v === view) return;
    if (v !== 'dex') location.hash = v;
    else history.pushState(null, '', location.pathname + location.search);
    pushedRef.current = false;
    setView(v);
    setCurrent(null);
    window.scrollTo(0, 0);
  };

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

  // 도감 목록(종 이름·타입)을 받기 전에는 두 카테고리 모두 이 상태를 보여준다
  const indexStatus = !index && (loadError ? (
    <Status>
      <p>데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
      <button className="primary-btn" onClick={load}>다시 시도</button>
    </Status>
  ) : <Status wobble><p>도감 데이터를 불러오는 중…</p></Status>);

  return (
    <>
      <Header view={view} onView={changeView} />
      {view === 'dex' ? (
        <>
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
            {indexStatus}
          </main>
        </>
      ) : !index ? <main className="wrap">{indexStatus}</main>
        : view === 'raid' ? <RaidPage onOpen={open} searchRef={searchRef} />
          : <StatsPage onOpen={open} onOrder={setRankOrder} searchRef={searchRef} />}

      <footer className="wrap">
        데이터 출처: <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokeAPI</a>
        {view === 'raid' && <>, 맥스레이드 굴 <a href="https://www.serebii.net/swordshield/maxraidbattledens.shtml" target="_blank" rel="noopener noreferrer">Serebii</a></>}
        {' '}· 포켓몬스터 © Nintendo / Creatures / GAME FREAK
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
