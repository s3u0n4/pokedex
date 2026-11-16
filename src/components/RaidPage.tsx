import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadRaids, raidOpenId, raidPlaces, type RaidPlace, starRange, starsOf } from '../api/raids';
import { RAID_REGIONS, RAID_VERSIONS } from '../lib/constants';
import { RAID_MAPS } from '../lib/raidMap';
import { nameOf } from '../lib/store';
import { art } from '../lib/utils';
import type { RaidData, RaidMon, RaidRegion, RaidVersion } from '../types';
import RaidMap, { type RaidMapDot } from './RaidMap';
import { Status } from './ui';

const STARS = [0, 1, 2, 3, 4, 5];

const denTotal = (p: RaidPlace) => p.dens.reduce((k, d) => k + d.nos.length, 0);

function RaidMonChip({ m, star, onOpen }: { m: RaidMon; star: number; onOpen: (id: number) => void }) {
  const stars = starsOf(m);
  const ha = m.ha && (star ? m.ha.includes(star) : true);
  return (
    <button className={`raid-mon${m.gmax ? ' gmax' : ''}`} onClick={() => onOpen(raidOpenId(m))}>
      <img src={art(m.p ?? m.n)} alt="" loading="lazy" decoding="async" />
      <span className="raid-name">{nameOf(m.n)}</span>
      {m.label && <span className="raid-form">{m.label}</span>}
      <span className="raid-tags">
        <span className="raid-star">{star ? `${m.s[star]}%` : starRange(stars)}</span>
        {m.gmax && <span className="raid-tag gmax">거다이맥스</span>}
        {ha && (
          <span className="raid-tag ha" title={`숨겨진 특성이 나올 수 있어요 (${starRange(m.ha!)})`}>숨특</span>
        )}
      </span>
    </button>
  );
}

function RaidRow({ kind, mons, star, onOpen }: { kind: 'common' | 'rare'; mons: RaidMon[]; star: number; onOpen: (id: number) => void }) {
  if (!mons.length) return null;
  return (
    <div className={`raid-row ${kind}`}>
      <div className="raid-kind">{kind === 'common' ? '일반 · 빨간 빛' : '레어 · 보라 빛'}</div>
      <div className="raid-mons">{mons.map((m, i) => <RaidMonChip key={i} m={m} star={star} onOpen={onOpen} />)}</div>
    </div>
  );
}

interface RaidPageProps {
  onOpen: (id: number) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export default function RaidPage({ onOpen, searchRef }: RaidPageProps) {
  const [data, setData] = useState<RaidData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [version, setVersion] = useState<RaidVersion>('sword');
  const [region, setRegion] = useState<RaidRegion>('galar');
  const [query, setQuery] = useState('');
  const [star, setStar] = useState(0);
  const [gmaxOnly, setGmaxOnly] = useState(false);
  /** 지도에서 고른 장소 (영어 이름) */
  const [selected, setSelected] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  /** 지도에서 강조할 굴 번호 (목록의 굴 카드를 가리키거나 지도에서 굴을 눌렀을 때) */
  const [focus, setFocus] = useState<number[]>([]);
  /** 지도에서 누른 굴 번호: 목록이 그려지면 그 굴 카드로 스크롤한다 */
  const [scrollDen, setScrollDen] = useState<number | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setLoadError(false);
    loadRaids()
      .then((d) => { if (alive) setData(d); })
      .catch((err: unknown) => { console.error(err); if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);
  useEffect(load, [load]);

  const places = useMemo(
    () => (data ? raidPlaces(data, { version, region, query, star, gmaxOnly }) : []),
    [data, version, region, query, star, gmaxOnly],
  );
  const active = Boolean(query.trim() || star || gmaxOnly);
  const denCount = places.reduce((n, p) => n + denTotal(p), 0);
  const names = useMemo(() => Object.fromEntries((data?.locations ?? []).map((l) => [l.en, l.ko])), [data]);
  const counts = useMemo(() => (active ? Object.fromEntries(places.map((p) => [p.en, denTotal(p)])) : null), [active, places]);
  const shown = selected ? places.filter((p) => p.en === selected) : places;
  const dots = useMemo<RaidMapDot[]>(() => (data?.locations ?? [])
    .filter((l) => l.region === region)
    .flatMap((l) => l.dens.flatMap((d) => (d.x !== undefined && d.y !== undefined ? [{ no: d.no, en: l.en, x: d.x, y: d.y }] : []))), [data, region]);

  useEffect(() => {
    if (scrollDen === null) return;
    listRef.current?.querySelector(`[data-dens~="${scrollDen}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollDen(null);
  }, [scrollDen, shown]);

  const changeRegion = (r: RaidRegion) => { setRegion(r); setSelected(null); setFocus([]); };
  // 한 줄 화면(지도 아래에 목록)에서는 장소를 고르면 목록으로 내려가고, 고른 걸 풀면 지도로 올라간다
  const select = (en: string | null) => {
    setSelected(en);
    setFocus([]);
    if (!window.matchMedia('(max-width: 899px)').matches) return;
    const target = en ? listRef.current : mapRef.current;
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // 지도에서 굴을 누르면 그 장소를 고르고 그 굴 카드로 간다
  const pickDen = (d: RaidMapDot) => {
    setSelected(d.en);
    setFocus([d.no]);
    setScrollDen(d.no);
  };
  // 목록의 굴 카드에서 "지도에서 보기": 지도를 보여주고 그 굴을 강조
  const showOnMap = (nos: number[]) => {
    setFocus(nos);
    if (window.matchMedia('(max-width: 899px)').matches) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="controls">
        <div className="wrap">
          <label className="search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="포켓몬이나 장소로 굴 찾기 (예: 리자몽, 6, 초원)"
              autoComplete="off"
              aria-label="레이드 포켓몬 검색"
            />
          </label>
          <div className="chips" role="group" aria-label="버전 선택">
            {RAID_VERSIONS.map(([key, label]) => (
              <button key={key} className={`chip ver-chip ${key}`} aria-pressed={version === key} onClick={() => setVersion(key)}>{label}</button>
            ))}
            <span className="chip-gap" />
            {RAID_REGIONS.map(([key, label]) => (
              <button key={key} className="chip" aria-pressed={region === key} onClick={() => changeRegion(key)}>{label}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="별 단계 선택">
            {STARS.map((s) => (
              <button key={s} className="chip" aria-pressed={star === s} onClick={() => setStar(s)}>{s ? `★${s}` : '모든 별'}</button>
            ))}
            <span className="chip-gap" />
            <button className="chip" aria-pressed={gmaxOnly} onClick={() => setGmaxOnly(!gmaxOnly)}>거다이맥스만</button>
          </div>
          <div className="meta">
            <span>{data ? `${places.length}곳 · 굴 ${denCount}개` : ''}</span>
            {active && (
              <button className="link-btn" onClick={() => { setQuery(''); setStar(0); setGmaxOnly(false); }}>필터 초기화</button>
            )}
          </div>
        </div>
      </div>

      <main className="wrap raid">
        <p className="rec-note raid-note">
          굴에서는 평소에 빨간 빛(일반) 목록에서, 아주 가끔 보라 빛(레어) 목록에서 포켓몬이 나와요.
          별(★)이 많을수록 강하고, 별 단계를 고르면 그 단계에서 나올 확률을 보여줘요.
          기간 한정 와일드에리어 이벤트는 반영하지 않았어요.
        </p>

        {data && (
          <div className="raid-layout">
            <div className="raid-map-col" ref={mapRef}>
              <RaidMap
                map={RAID_MAPS[region]} names={names} counts={counts} selected={selected} onSelect={select}
                dots={dots} focus={focus} onDen={pickDen}
              />
              <p className="raid-map-note">
                장소를 누르면 그곳의 굴과 포켓몬을 보여줘요.
                {' 점은 굴 하나하나의 실제 위치예요.'}
                {region === 'tct' && ' 점선 상자 안은 실제로는 더 동쪽에 있는 곳이에요.'}
              </p>
            </div>
            <div className="raid-list" ref={listRef}>
              {selected && (
                <div className="raid-selected">
                  <b>{names[selected] ?? selected}</b>
                  <button className="link-btn" onClick={() => select(null)}>모든 장소 보기</button>
                </div>
              )}
              {shown.map((p) => (
                // 필터나 고른 장소가 바뀌면 key가 바뀌어서 펼침 상태가 다시 정해진다 (검색 중이거나 고른 장소는 펼친다)
                <details key={`${version}-${region}-${p.en}-${active}-${selected}`} className="raid-place" open={active || Boolean(selected) || undefined}>
                  <summary>
                    <span className="raid-place-name">{p.ko}</span>
                    <span className="raid-place-en">{p.en}</span>
                    <span className="raid-place-count">굴 {active ? `${denTotal(p)} / ` : ''}{p.total}개</span>
                  </summary>
                  <div className="raid-dens">
                    {p.dens.map((d) => (
                      <div
                        className={`raid-den${d.nos.some((n) => focus.includes(n)) ? ' focus' : ''}`}
                        key={d.nos.join(',')}
                        data-dens={d.nos.join(' ')}
                        onMouseEnter={() => setFocus(d.nos)}
                      >
                        <div className="raid-den-name">
                          <span>
                            {d.nos.length > 1 ? `굴 ${d.nos.length}개` : '굴'} <b>{d.nos.map((n) => `${n}번`).join(' · ')}</b>
                            {d.nos.length > 1 && <small> (출현 포켓몬이 같아요)</small>}
                          </span>
                          <button className="link-btn" onClick={() => showOnMap(d.nos)}>지도에서 보기</button>
                        </div>
                        <RaidRow kind="common" mons={d.common} star={star} onOpen={onOpen} />
                        <RaidRow kind="rare" mons={d.rare} star={star} onOpen={onOpen} />
                      </div>
                    ))}
                  </div>
                </details>
              ))}
              {!shown.length && <Status><p>{selected ? '이 장소에는 조건에 맞는 굴이 없어요.' : '조건에 맞는 굴이 없어요.'}</p></Status>}
            </div>
          </div>
        )}
        {!data && !loadError && <Status wobble><p>레이드 데이터를 불러오는 중…</p></Status>}
        {loadError && (
          <Status>
            <p>데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>
            <button className="primary-btn" onClick={load}>다시 시도</button>
          </Status>
        )}
      </main>
    </>
  );
}
