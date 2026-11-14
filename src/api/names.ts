import { API } from '../lib/constants';
import { getJSON, slugify } from '../lib/utils';
import type { ApiNamed, NamedResource } from '../types';

// 도구·기술·특성·장소의 한국어 이름 (여러 포켓몬이 같은 도구를 쓰므로 URL 단위로 캐시)
const resourceNames = new Map<string, Promise<string | null>>();
export function koName(res: NamedResource | null | undefined): Promise<string | null> {
  if (!res) return Promise.resolve(null);
  let promise = resourceNames.get(res.url);
  if (!promise) {
    promise = getJSON<ApiNamed>(res.url)
      .then((r) => r.names.find((n) => n.language.name === 'ko')?.name || null)
      .catch(() => null);
    resourceNames.set(res.url, promise);
  }
  return promise;
}

export async function itemKo(slug: string, fallback?: string) {
  return (await koName({ url: `${API}/item/${slug}`, name: slug })) || fallback || slug.replace(/-/g, ' ');
}

// 도구·특성의 영어 이름을 PokeAPI에서 한국어로 바꾼다 (못 찾으면 영어 그대로)
export async function translate(kind: 'item' | 'ability', en: string) {
  return (await koName({ url: `${API}/${kind}/${slugify(en)}`, name: en })) || en;
}
