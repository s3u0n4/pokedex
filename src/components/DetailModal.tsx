import { useEffect, useRef, useState } from 'react';
import { getDetail } from '../api/detail';
import { store } from '../lib/store';
import { art, pad } from '../lib/utils';
import type { Detail } from '../types';
import DetailBody from './DetailBody';
import { LoadingRow, TypeBadges } from './ui';

/** 상세 화면 안에서 다른 포켓몬으로 이동 (regional이면 리전폼 섹션으로 스크롤) */
export type GoTo = (id: number | null | undefined, opts?: { regional?: boolean }) => void;

type LoadResult =
  | { id: number | null; status: 'loading' }
  | { id: number; status: 'ready'; d: Detail }
  | { id: number; status: 'error' };

interface DetailModalProps {
  id: number;
  prevId: number | null;
  nextId: number | null;
  onGo: GoTo;
  onClose: () => void;
  scrollRegionalsRef: { current: boolean };
}

export default function DetailModal({ id, prevId, nextId, onGo, onClose, scrollRegionalsRef }: DetailModalProps) {
  const p = store.list[id - 1];
  const [result, setResult] = useState<LoadResult>({ id: null, status: 'loading' });
  const [retry, setRetry] = useState(0);
  const [shinyId, setShinyId] = useState<number | null>(null); // 이로치는 그 포켓몬을 보는 동안만 유지
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const shiny = shinyId === id;
  const ready = result.id === id && result.status === 'ready' ? result : null;
  const failed = result.id === id && result.status === 'error';

  useEffect(() => {
    document.body.classList.add('noscroll');
    closeRef.current?.focus();
    return () => document.body.classList.remove('noscroll');
  }, []);

  useEffect(() => {
    let alive = true;
    if (sheetRef.current) sheetRef.current.scrollTop = 0;
    getDetail(id)
      .then((d) => { if (alive) setResult({ id, status: 'ready', d }); })
      .catch((err: unknown) => { console.error(err); if (alive) setResult({ id, status: 'error' }); });
    return () => { alive = false; };
  }, [id, retry]);

  // 리전폼 카드나 진화 칸의 리전폼을 눌러서 열었으면 리전폼 섹션으로 내려간다
  const loaded = Boolean(ready) || failed;
  useEffect(() => {
    if (!loaded) return;
    if (ready && scrollRegionalsRef.current) {
      document.getElementById('d-regionals')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    scrollRegionalsRef.current = false;
  }, [loaded, ready, scrollRegionalsRef]);

  return (
    <div className="modal">
      <div className="backdrop" onClick={onClose} />
      <article className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="d-name">
        <div className="ball-top sheet-top">
          <div className="sheet-nav">
            <div className="group">
              <button className="icon-btn" aria-label="이전 포켓몬" disabled={!prevId} onClick={() => onGo(prevId)}>‹</button>
              <button className="icon-btn" aria-label="다음 포켓몬" disabled={!nextId} onClick={() => onGo(nextId)}>›</button>
            </div>
            <span className="sheet-num">No.{pad(id)}</span>
            <button className="icon-btn" ref={closeRef} aria-label="닫기" onClick={onClose}>✕</button>
          </div>
          <div className="hero"><img src={art(id, shiny)} alt={p.ko || p.en} /></div>
          <button className="shiny-btn" aria-pressed={shiny} onClick={() => setShinyId(shiny ? null : id)}>✨ 이로치</button>
        </div>
        <div className="ball-band"><div className="ball-btn" aria-hidden="true" /></div>
        <div className="sheet-body">
          <div className="d-head">
            <h2 id="d-name">{p.ko || p.en}</h2>
            <div className="d-en">{p.en}</div>
            {p.genus && <div className="d-genus">{p.genus}</div>}
            <TypeBadges types={p.types} />
          </div>
          {ready && <DetailBody key={id} id={id} d={ready.d} onGo={onGo} />}
          {failed && (
            <div className="status">
              <p>정보를 불러오지 못했어요.</p>
              <button className="primary-btn" onClick={() => setRetry((n) => n + 1)}>다시 시도</button>
            </div>
          )}
          {!loaded && <LoadingRow>정보를 불러오는 중…</LoadingRow>}
        </div>
      </article>
    </div>
  );
}
