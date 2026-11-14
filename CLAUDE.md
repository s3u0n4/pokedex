# 포켓몬 도감

몬스터볼 테마의 전국도감(1~9세대, 1025마리) 웹페이지. 사용자와 대화하면서 기능을 하나씩 늘려 가는 중이다.
React + Vite + TypeScript(strict)로 되어 있다. 처음에는 `index.html` 한 파일이었고, 그 버전은 `legacy/index.html`에 보관돼 있다.

## 실행

- 개발 서버: `npm run dev` → http://localhost:5173 (주소 끝에 `#25`를 붙이면 피카츄 상세가 열린다)
- 타입 검사만: `npm run typecheck` (`tsc --noEmit`)
- 배포용 빌드: `npm run build` → 타입 검사 후 `dist/`, 확인은 `npm run preview`
- 서버(백엔드) 없음. 데이터는 전부 브라우저에서 PokeAPI 등으로 직접 받는다.

## 배포

- Vercel 프로젝트 `pokedex` (팀 `s3u0n4s-projects`), 주소: https://pokedex-five-chi-66.vercel.app
- GitHub: https://github.com/s3u0n4/pokedex (공개, 2026-11-14 비공개에서 전환)
- 수동 배포: `npx vercel deploy --prod --yes` (프로젝트 연결 정보는 `.vercel/`, git에는 안 올라감)
- git 제외 규칙은 사용자 요청으로 `.gitignore` 대신 `.git/info/exclude`(로컬 전용)에 있다: `node_modules`, `dist`, `.idea/`, `.DS_Store`, `.vercel`, `.env*`. 새로 클론하면 이 규칙이 없으니 먼저 다시 적을 것. `.env.local`에는 Vercel 토큰이 있다.
- 2026-11-14 이전에 있던 Vercel 프로젝트 `pokemon-dex`(옛 CRA 버전)는 사용자 승인 후 삭제했다. GitHub 저장소 `pokemon-dex`는 남겨 뒀다.

## 구조

```
index.html              Vite 진입점 (폰트, #root)
tsconfig.json           strict, moduleResolution bundler, jsx react-jsx
src/
  main.tsx              React 시작
  App.tsx               검색·필터 상태, 해시(#번호) 라우팅, 키보드, 이전/다음 순서
  types.ts              앱 데이터 타입(Species, Detail, FormCardData …)과 PokeAPI·Smogon 응답 타입
  styles.css            전체 스타일 (예전 index.html의 CSS 그대로)
  lib/
    constants.ts        TYPES, TYPE_CHART, GENS, VG_KO/VG_BY_ID, GIMMICKS, REGIONS, 성격·룰 이름 등 상수
    utils.ts            art, pad, parseCSV, getJSON<T>, 캐시 읽기/쓰기, withRo, 상성 계산, regionOf/gimmickKind 등
    store.ts            한 번 받으면 안 바뀌는 공용 데이터(list, forms, moves, machines)와 nameOf
  api/
    pokedex.ts          loadIndex: 목록(종 1025 + 리전폼 58)
    detail.ts           getDetail: 상세 화면 데이터 전부, evoCondition, 진화 기믹·리전폼 로딩
    moves.ts            기술 데이터, 기술머신 번호, moveRows, Smogon 세트(describeSet), autoRecommend
    names.ts            koName/itemKo/translate: 영어 리소스 → 한국어 이름
  components/
    Header, Controls, PokemonGrid      목록 화면
    DetailModal                        상세 틀 (헤더, 이로치, 이전/다음, 로딩/에러), GoTo 타입
    DetailBody                         상세 본문 섹션 순서
    Matchup, StatBars, Evolution, FormCards, GenderForms, Recommend, MoveList   상세 섹션
    ui.tsx                             cssVars, Pokeball, TypeBadge, ClsBadge, Section, LoadingRow, Status, WeaknessBadges
```

- 데이터 함수(`src/api`, `src/lib`)는 React를 쓰지 않는 순수 TS다. 임포트에 확장자를 붙이지 않는다 (bundler 해석).
- `store`는 React 상태가 아니다. `loadIndex`, `loadMoveData`, `loadMachines`가 채우고, 데이터 함수와 컴포넌트가 읽기만 한다.
- 상세 본문은 `<DetailBody key={id}>`로 그려서 포켓몬이 바뀌면 기술 목록·추천의 선택 상태가 초기화된다.

## 데이터 출처

| 데이터 | 출처 | 비고 |
|---|---|---|
| 한국어·영어 이름, 분류 | PokeAPI GitHub CSV `pokemon_species_names.csv` | 1회 요청 (언어 id: 한국어 3, 영어 9) |
| 타입 (리전폼 포함) | `pokeapi.co/api/v2/type/{18종}` | id 10000번대가 리전폼 |
| 상세 (능력치, 특성, 도감 설명, 진화) | `pokemon/{id}`, `pokemon-species/{id}`, `evolution-chain`, `ability` | 상세를 열 때 받음 |
| 기술 이름·타입·위력 | CSV `moves.csv`, `move_names.csv` | |
| 기술머신 번호 | CSV `machines.csv` + `items.csv` | 아이템 이름(tm24, tr41)에서 번호를 뽑음 |
| 메가스톤 | `item-category/mega-stones` | 이름 앞부분이 가장 길게 겹치는 돌을 매칭 |
| 추천 기술 배치 | Smogon `data.pkmn.cc/sets/gen9.json` (약 1.1MB) | 없는 포켓몬은 `autoRecommend`로 자동 계산 |
| 일러스트 | `PokeAPI/sprites` official-artwork (`{id}.png`, `shiny/{id}.png`) | |
| 암수 모습 | `pokemon/{id}`의 `sprites.other.home.front_female`, 또는 `-female` 모습(냐오닉스 등) | 공식 일러스트에 암컷 그림이 없어서 둘 다 HOME 그림으로 맞춘다 |

PokeAPI GraphQL(beta)은 401로 막혀 있어서 쓰지 않는다.

## localStorage 캐시

`readCache`/`writeCache`(utils.js)로만 접근한다. 실패해도 새로 받으면 되게 되어 있다. 형식을 바꾸면 키 버전을 올리고 예전 키를 지운다.

- `pokedex-index-v3`: `{ list: 종 1025개, forms: 리전폼 58개 }`
- `pokedex-moves-v1`: 기술 데이터
- `pokedex-machines-v1`: `"게임:기술id" → "TM001"`
- Smogon 세트는 커서 메모리에만 둔다.

## 화면 구성 (상세 모달 순서, DetailBody.jsx)

1. 헤더: 번호, 일러스트(이로치 전환), 이름·분류·타입 (DetailModal)
2. 도감 설명, 키·몸무게·성비
2-1. 암수 모습: 수컷·암컷 그림 나란히 (모습이 다를 때만, 이로치 버튼을 따른다)
3. 타입 상성: 받는 피해(4배~무효) / 자속 기술로 잘 때리는 타입
4. 특성
5. 종족값
6. 진화: 단계별로 원래 모습과 리전폼, 각 모습 아래에 진화 조건
7. 리전폼 카드 (있을 때만, `id="d-regionals"`)
8. 진화 기믹 카드: 메가진화, 거다이맥스, 원시회귀, 울트라버스트, 무한다이맥스 (있을 때만)
9. 추천 기술 배치: Smogon 룰별 세트 또는 자동 추천
10. 기술 목록: 게임 선택, 레벨업 / 기술머신(번호) / 알 기술 / 기술 가르침

목록에서는 리전폼도 원래 포켓몬 카드 바로 뒤에 카드로 나온다. 리전폼 카드나 진화 칸의 리전폼을 누르면 원래 포켓몬 상세가 열리고 리전폼 섹션으로 스크롤된다 (`scrollRegionalsRef`).

## 디자인 규칙

- 몬스터볼 테마: 빨간 헤더(`--red`), 검은 띠(`--band`)와 가운데 흰 버튼, 카드의 몬스터볼 워터마크.
- 배경은 흰색(`--bg: #ffffff`). 다크 모드는 사용자 요청으로 제거했다. 다시 넣지 말 것.
- 색은 `:root`의 CSS 변수로만 쓴다. 타입 색은 `TYPES`, 기믹 색은 `GIMMICKS`, 지방 색은 `REGIONS`. 컴포넌트에서는 `style={cssVars({ '--tc': color })}`처럼 CSS 변수로 넘긴다 (React의 style 타입에 사용자 정의 변수가 없어서 `cssVars`를 거친다).
- 타입 뱃지는 줄바꿈하지 않는다 (`.type { white-space: nowrap }`).
- 폰트: 제목 Jua, 본문 Noto Sans KR (Google Fonts, index.html).
- 모바일: 상세 모달은 아래에서 올라오는 시트, 기믹 카드는 세로 배치.

## 코드 규칙

- 사용자에게 보이는 글은 모두 한국어. 영어 데이터는 PokeAPI에서 한국어 이름을 찾아 바꾸고, 없으면 영어 그대로 둔다.
- 주석은 한국어로, "왜"가 필요한 곳에만 짧게 단다.
- 화면은 JSX로 그린다 (`dangerouslySetInnerHTML` 쓰지 않기). React가 글자를 알아서 이스케이프한다.
- 타입: `any`를 쓰지 않는다. 새 API 필드를 쓰면 `types.ts`의 응답 타입에 그 필드만 추가한다. API 응답은 `getJSON<ApiXxx>(url)`로 받는다. `catch`의 에러는 `unknown`으로 둔다.
- 비동기로 받은 결과를 상태에 넣을 때는 `let alive = true` 패턴으로 다른 포켓몬으로 넘어간 뒤 늦게 온 응답을 버린다.
- 조사: "로/으로"는 `withRo()`를 쓴다.
- 진화 방법이 여러 개면 `is_default` 또는 가장 최근 방법 하나만 보여준다. 일반 진화와 리전폼 진화(`region`, `required_pokemon_form`, `evolved_pokemon_form`)는 나눠서 처리한다.

## 검증 방법

브라우저 화면은 직접 볼 수 없으므로 빌드와 서버 렌더링으로 확인한다.

1. `npm run build`로 타입·문법·임포트 오류 확인 (타입 검사가 먼저 돈다).
2. Vite의 `createServer` + `ssrLoadModule`로 모듈을 불러와 `getDetail(id)` 결과를 `react-dom/server`의 `renderToString(<DetailBody …/>)`로 그리고, 글자만 뽑아서 내용을 본다. (useEffect는 서버 렌더링에서 돌지 않으므로 추천 세트는 `describeSet`/`autoRecommend`를 직접 호출해 확인)
3. 테스트 스크립트는 프로젝트 폴더가 아니라 임시(scratchpad) 폴더에 둔다.
4. 끝나면 개발 서버를 띄우고 `open http://localhost:5173`으로 사용자 브라우저에 연다.

자주 쓰는 확인용 포켓몬: 25 피카츄(리전 진화, 거다이맥스), 52 나옹(알로라·가라르), 133 이브이(분기 진화 8개), 6 리자몽(메가 X·Y, 거다이맥스), 382 가이오가(원시회귀), 800 네크로즈마(울트라버스트), 678 냐오닉스(성별 메가), 128 켄타로스(팔데아 3종), 710 호바귀(타입 상성 줄바꿈).

## 알려진 한계

- 9세대 일부는 한국어 도감 설명이 없어 영어로 나온다.
- 레전드 Z-A의 새 메가진화 일부는 PokeAPI에 특성 정보가 없다.
- 거다이맥스 전용 기술(G-Max 기술)은 데이터가 없어 표시하지 않는다.
- Smogon 세트 이름("TankChomp" 등)과 일부 옛 기술(잠재파워)은 영어 그대로다.
- 대도각참 조건의 "대장의징표"는 API가 아닌 직접 쓴 번역이다.
- 타입 상성은 특성(부유 등)·테라스탈을 반영하지 않는다.
- 세대 필터는 원래 포켓몬 번호 기준이다 (알로라 라이츄는 1세대).
- PokeAPI에서 916 퍼퓨돈의 성비가 수컷 100%로 잘못 나온다 (암수 모습 섹션은 정상).

## 작업 기록

| 순서 | 내용 |
|---|---|
| 1 | 목록·검색·세대/타입 필터·상세 모달, 몬스터볼 테마 |
| 2 | 진화 조건 표시 (특수 진화 방식 포함) |
| 3 | 기술 목록, 추천 기술 배치 (Smogon + 자동 추천) |
| 4 | 기술머신 번호 (게임별 TM/HM/TR) |
| 5 | 배경을 흰색으로, 다크 모드 제거 |
| 6 | 진화 기믹 (메가진화, 거다이맥스, 원시회귀, 울트라버스트, 무한다이맥스) |
| 7 | 리전폼 섹션, 타입 상성 (약점 / 잘 때리는 타입) |
| 8 | 목록에 리전폼 카드, 타입 상성 구분선 |
| 9 | 리전폼 진화 조건, 일반/리전 진화 분리 (페르시온 조건 버그 수정) |
| 10 | 진화 칸에 리전폼 표시, 기믹·리전폼 카드 크기 키움 |
| 11 | 타입 상성 칸 폭 넓힘, 타입 뱃지 줄바꿈 방지 |
| 12 | React + Vite로 마이그레이션 (기능·디자인 동일, 예전 파일은 legacy/index.html) |
| 13 | TypeScript(strict)로 마이그레이션, `types.ts`에 데이터·API 타입 정리 |
| 14 | 암수 모습 섹션 (성별에 따라 모습이 다른 포켓몬) |

새 작업을 하면 위 표에 한 줄 추가하고, 구조·규칙·한계가 바뀌면 해당 절도 고친다.
