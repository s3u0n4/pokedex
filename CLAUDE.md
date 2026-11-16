# 포켓몬 도감

몬스터볼 테마의 전국도감(1~9세대, 1025마리) 웹페이지. 사용자와 대화하면서 기능을 하나씩 늘려 가는 중이다.
React + Vite + TypeScript(strict)로 되어 있다. 처음에는 `index.html` 한 파일이었고, 그 버전은 `legacy/index.html`에 보관돼 있다.

## 실행

- 개발 서버: `npm run dev` → http://localhost:5173 (주소 끝에 `#25`를 붙이면 피카츄, `#10100`이면 알로라 라이츄 상세가 열린다. `#raid`는 소드·실드 맥스레이드 화면, `#raid/25`는 그 화면에서 연 상세)
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
  App.tsx               카테고리(전국도감/레이드), 검색·필터 상태, 해시(#번호, #raid, #raid/번호) 라우팅, 키보드, 이전/다음 순서
  types.ts              앱 데이터 타입(Species, Detail, FormCardData …)과 PokeAPI·Smogon 응답 타입
  styles.css            전체 스타일 (예전 index.html의 CSS 그대로)
  lib/
    constants.ts        TYPES, TYPE_CHART, GENS, VG_KO/VG_BY_ID, GIMMICKS, REGIONS, 성격·룰 이름 등 상수
    utils.ts            art, pad, parseCSV, getJSON<T>, 캐시 읽기/쓰기, withRo, 상성 계산, regionOf/gimmickKind 등
    raidMap.ts          RAID_MAPS: 지역별 레이드 지도 영역(SVG 다각형·이름 위치·지형)
    store.ts            한 번 받으면 안 바뀌는 공용 데이터(list, forms, moves, machines)와 nameOf, entryOf(번호 → 종/리전폼), familyOf, showdownName
  api/
    pokedex.ts          loadIndex: 목록(종 1025 + 리전폼 58)
    detail.ts           getDetail: 상세 화면 데이터 전부(종·리전폼 모두), evoCondition, 진화 기믹·암수 모습 로딩
    moves.ts            기술 데이터, 기술머신 번호, moveRows, Smogon 세트(describeSet, popularItems), autoRecommend(대전), storyRecommend(스토리), 추천 도구
    names.ts            koName/itemKo/translate: 영어 리소스 → 한국어 이름
    raids.ts            소드·실드 맥스레이드: loadRaids, raidPlaces(버전·지역·검색·별·거다이맥스로 거르고 같은 출현표 굴은 묶음)
  components/
    Header                             헤더와 카테고리 전환 (View 타입)
    Controls, PokemonGrid              목록 화면
    RaidPage, RaidMap                  소드·실드 맥스레이드 화면 (지역 지도, 장소별 접기, 굴마다 일반/레어 출현표)
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
| 도구 그림 | `PokeAPI/sprites` `sprites/items/{slug}.png` | 추천 도구 |
| 일러스트 | `PokeAPI/sprites` official-artwork (`{id}.png`, `shiny/{id}.png`) | |
| 암수 모습 | `pokemon/{id}`의 `sprites.other.home.front_female`, 또는 `-female` 모습(냐오닉스 등) | 공식 일러스트에 암컷 그림이 없어서 둘 다 HOME 그림으로 맞춘다 |

| 소드·실드 맥스레이드 굴 | Serebii `swordshield/maxraidbattledens.shtml`과 굴 상세 197개를 2026-11-16에 한 번 정리한 `public/data/swsh-raids.json` | 레이드 화면을 열 때만 받는다. 모습 이름은 PokeAPI `pokemon_form_names.csv` 한국어, 없으면 영어 |
| 소드·실드 장소 한국어 이름 | PKHeX `PKHeX.Core/Resources/text/locations/gen8/text_swsh_00000_{en,ko}.txt` (게임 속 장소 텍스트, 같은 줄끼리 짝) | `swsh-raids.json`의 `ko`. PokeAPI에는 한국어 장소 이름이 없다 |
| 굴 번호·위치 | RaidFinder(github.com/Admiral-Fish/RaidFinder, GPL-3.0) `Core/Loader/DenLoader.cpp`의 `denInfo` | 게임 속 굴 순서(번호), 장소, 일반·레어 표 번호, 지도 좌표. 표 번호 짝이 Serebii 데이터와 44곳 모두 일치. 왕관설원 좌표는 0이라 아래 pkTeraRaid 것을 쓴다 |
| 왕관설원 굴 좌표 | pkTeraRaid(github.com/Insektaure/pkTeraRaid, GPL-2.0) `include/swsh/den_locations.h` | 와일드에리어·갑옷섬 좌표가 RaidFinder와 190개 모두 같아서 같은 기준으로 봤다. 얼어붙은 바다·세갈래 들판(굴 53~68)은 실제로는 훨씬 동쪽이라 x−560, y−380 옮겨 저장했다 |
| 레이드 지도 | 직접 그린 SVG (`src/lib/raidMap.ts`) | 세 지역 모두 굴 좌표로 생성 (RaidFinder·pkTeraRaid 지도 그림은 쓰지 않는다) |

PokeAPI GraphQL(beta)은 401로 막혀 있어서 쓰지 않는다.

`swsh-raids.json` 형식: `locations`(지역 galar/ioa/tct, `ko`·`en` 장소 이름, `dens`: 굴마다 `no` 게임 속 굴 번호, `t` [일반표, 레어표] 번호, `x`·`y` 지도 좌표)와 `tables`(표 번호 → sword/shield → 포켓몬 목록). 포켓몬은 `n` 도감 번호, `p` 다른 모습의 PokeAPI id, `label` 모습 이름, `gmax`, `ha` 숨겨진 특성이 나오는 별 단계, `s` 별 단계 → 확률(%). Serebii 표에서 같은 포켓몬이 여러 칸이면 별 단계별 확률을 더해 한 줄로 합쳤다 (별 단계마다 합이 100%). 게임 데이터라 바뀔 일이 없어서 만든 스크립트는 저장소에 두지 않았다.

## localStorage 캐시

`readCache`/`writeCache`(utils.js)로만 접근한다. 실패해도 새로 받으면 되게 되어 있다. 형식을 바꾸면 키 버전을 올리고 예전 키를 지운다.

- `pokedex-index-v3`: `{ list: 종 1025개, forms: 리전폼 58개 }`
- `pokedex-moves-v2`: 기술 데이터 (쓰기 전에 몸통박치기·화염방사·날개치기로 내용을 확인하고, 깨져 있으면 새로 받는다)
- `pokedex-machines-v2`: `"게임:기술id" → "TM001"` (BDSP 빈칸은 다이아몬드·펄 번호로 채움)
- Smogon 세트는 커서 메모리에만 둔다.

## 화면 구성 (상세 모달 순서, DetailBody.jsx)

1. 헤더: 번호, 일러스트(이로치 전환), 이름·분류·타입 (DetailModal)
2. 도감 설명, 키·몸무게·성비
2-1. 암수 모습: 수컷·암컷 그림 나란히 (모습이 다를 때만, 이로치 버튼을 따른다)
3. 타입 상성: 받는 피해(4배~무효) / 자속 기술로 잘 때리는 타입
4. 특성
5. 종족값
6. 진화: 단계별로 원래 모습과 리전폼, 각 모습 아래에 진화 조건
7. 리전폼 / 다른 모습: 원래 모습과 리전폼 사이를 오가는 버튼 (있을 때만)
8. 진화 기믹 카드: 메가진화, 거다이맥스, 원시회귀, 울트라버스트, 무한다이맥스 (있을 때만)
9. 추천 기술 배치: 스토리용 / 대전용 탭, 각각 잘 맞는 도구
   - 스토리용: 최신 게임에서 레벨업·기술머신으로 배우는 기술 중 명중 90 이상, 반동으로 특공이 떨어지는 기술(`STORY_EXCLUDE`) 제외. 기술마다 레벨업 레벨(가장 낮은 것, 0은 진화할 때)과 기술머신 번호를 둘 다 표시하고, 카드 아래에 "레벨업 순서 / 준비할 기술머신" 요약. 도구는 자속 타입 강화 도구, 먹다남은음식/조개껍질방울, 행복의알
   - 대전용: Smogon 룰별 세트 + 모든 세트에서 많이 쓰는 도구 3개, 세트가 없으면 자동 추천 + 능력치로 고른 도구 (진화의휘석, 돌격조끼, 생명의구슬, 구애 시리즈 등)
   - 대전용도 기술마다 최신 게임에서 배우는 방법(레벨업·기술머신·알 기술·기술 가르침, 못 배우면 그렇게 표시)과 요약을 붙인다 (`learnOf`, `describeSet(name, set, d)`)
   - 공격 기술 4개는 자속 기술을 먼저 넣고, 나머지는 아직 못 찌르는 약점 타입을 많이 찌르는 기술로 채운다 (`pickFour`)
   - 4개가 안 되면 다른 계열(물리↔특수) 공격 기술, 그다음 변화 기술(능력 올리기 → 회복 → 상태이상 → 그 밖의 기술, `SETUP_*`·`RECOVERY_MOVES`·`STATUS_MOVES`)로 채운다 (`pickMoves`). 튀어오르기 같은 효과 없는 기술(`USELESS_MOVES`)은 빼서, 배우는 기술 자체가 적으면 4개보다 적을 수 있다
10. 기술 목록: 게임 선택, 레벨업 / 기술머신(번호) / 알 기술 / 기술 가르침

## 소드·실드 맥스레이드 화면 (RaidPage)

- 헤더의 "전국도감 / 소드·실드 맥스레이드" 버튼으로 바꾼다. 도감 목록(이름)은 두 화면이 같이 쓴다.
- 위에서 소드/실드, 지역(와일드에리어·갑옷섬·왕관설원, 게임 속 표기), 검색(포켓몬 이름·번호·모습 이름, 장소 이름), 별 단계(★1~5), 거다이맥스만 고른다.
- 세 지역 모두 지도가 나온다 (데스크톱: 왼쪽에 고정, 화면 높이에 맞춤 / 900px 미만: 목록 위). 굴이 없는 땅은 비워 둔다. 장소를 누르면 그 장소만 펼쳐 보여주고, 필터·검색 중에는 맞는 굴이 없는 장소를 흐리게 하고 맞는 굴 수를 빨간 원으로 표시한다. 모바일에서는 장소를 누르면 목록으로, "모든 장소 보기"를 누르면 지도로 스크롤한다.
- 와일드에리어·갑옷섬 지도: 굴마다 반지름을 제한한 보로노이 칸을 만들고 같은 장소 칸을 한 영역으로 묶었다 (굴이 없는 땅은 비어 있다). 장소 사이 경계선(`borders`)과 장소마다 자기 경계선(`edge`, 고른 장소 빨간 테두리)을 따로 그린다. 이름이 겹치는 곳은 빈 곳에 두고 선(`anchor`)으로 잇는다.
- 왕관설원 지도: 같은 방식(반지름 110). 옮겨 그린 얼어붙은 바다·세갈래 들판은 점선 상자(`insets`)와 "실제로는 더 동쪽"으로 표시한다.
- 지도의 점은 굴 하나하나의 실제 위치다. 장소를 고르면 그 장소 굴 번호가 보이고, 점을 누르면 그 장소를 고르고 그 굴 카드로 스크롤한다. 굴 카드에 마우스를 올리거나 "지도에서 보기"를 누르면 지도에서 그 굴을 빨간 고리로 강조한다.
- 굴 카드 제목은 게임 속 굴 번호("굴 23번"). 출현표가 같은 굴은 한 카드로 묶고 번호를 모두 적는다.
- 지도를 다시 만들 일이 있으면: 굴 좌표 → 굴마다 원(반지름 와일드에리어 42, 갑옷섬 100, 왕관설원 110) 안 보로노이 → 장소별로 묶기. 글자 크기는 `font`(viewBox 단위).
- 장소마다 접는 칸(`details`), 필터나 검색을 걸면 모두 펼친다. 굴마다 일반(빨간 빛)·레어(보라 빛) 출현표, 포켓몬마다 별 범위(별 단계를 고르면 그 단계 확률)·거다이맥스·숨특 표시.
- 포켓몬을 누르면 상세가 열린다. 가라르 모습은 그 리전폼 상세, 거다이맥스·로토무 폼 등은 원래 포켓몬 상세.
- 와일드에어리어 이벤트(기간 한정)는 반영하지 않는다.

리전폼은 따로 상세 화면이 있다. 주소는 PokeAPI의 포켓몬 id(`#10100` 알로라 라이츄)이고, 목록에서는 원래 포켓몬 카드 바로 뒤에 카드로 나온다. 이전/다음도 목록 순서대로 리전폼을 거친다.

- 리전폼 화면: 타입·특성·종족값·기술·키·몸무게·암수 모습은 그 모습의 `pokemon/{id}`에서, 성비·진화는 원래 종에서 가져온다. 종의 도감 설명은 원래 모습 이야기라 대신 리전폼 안내 문장을 보여준다. 진화 기믹은 원래 모습에만 붙인다.
- Smogon 세트는 리전폼의 PokeAPI 이름으로 찾는다 (`showdownName`, `-breed`·`-standard`를 뺀다).

## 디자인 규칙

- 몬스터볼 테마: 빨간 헤더(`--red`), 검은 띠(`--band`)와 가운데 흰 버튼, 카드의 몬스터볼 워터마크.
- 배경은 흰색(`--bg: #ffffff`). 다크 모드는 사용자 요청으로 제거했다. 다시 넣지 말 것.
- 색은 `:root`의 CSS 변수로만 쓴다. 타입 색은 `TYPES`, 기믹 색은 `GIMMICKS`, 지방 색은 `REGIONS`. 컴포넌트에서는 `style={cssVars({ '--tc': color })}`처럼 CSS 변수로 넘긴다 (React의 style 타입에 사용자 정의 변수가 없어서 `cssVars`를 거친다).
- 타입 뱃지는 줄바꿈하지 않는다 (`.type { white-space: nowrap }`).
- 폰트: 제목 Jua, 본문 Noto Sans KR (Google Fonts, index.html).
- 모바일: 상세 모달은 아래에서 올라오는 시트, 기믹 카드는 세로 배치.
- 모바일(520px 이하): 추천 탭(스토리용/대전용)은 폭을 꽉 채우고, Smogon 룰 버튼은 한 줄로 옆으로 넘긴다(`.rec-formats`). 짧은 묶음 글자("♂ 50%", "TM090 압정뿌리기")는 `white-space: nowrap`으로 중간에서 안 끊기게 한다.

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
3. 레이아웃은 헤드리스 Chrome(`/Applications/Google Chrome.app`, `--headless=new --remote-debugging-port`)을 CDP로 조종해 캡처해서 본다. 탭 클릭 같은 조작은 `Runtime.evaluate`로, 캡처는 `Page.captureScreenshot`. 데스크톱(1100px)과 모바일(400px) 폭 둘 다 확인.
4. 테스트 스크립트는 프로젝트 폴더가 아니라 임시(scratchpad) 폴더에 둔다.
5. 끝나면 개발 서버를 띄우고 `open http://localhost:5173`으로 사용자 브라우저에 연다.

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
- 데인차·포트데스의 진작 모습은 한국어 데이터가 없어서 "Antique"로 나온다.
- 레이드 지도 영역 경계는 굴 위치로 만든 근사다. 왕관설원의 얼어붙은 바다·세갈래 들판은 지도 폭을 줄이려고 실제보다 서쪽(오른쪽 위 빈 곳)에 그렸다.
- 와일드에리어 17번 굴(감시탑 유적지, RaidFinder에서 Special)은 출현표가 없어서 빠져 있다.

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
| 15 | 리전폼을 원래 포켓몬 상세에서 빼고 따로 상세 화면으로 분리 (`#10100`), 리전폼도 Smogon 세트 표시 |
| 16 | 추천 기술을 스토리용 / 대전용으로 나누고, 잘 맞는 도구 추천 추가 |
| 17 | 스토리용 기술에 배우는 레벨·기술머신 번호를 모두 표시, 레벨업 순서·준비할 기술머신 요약 |
| 18 | 대전용(Smogon 세트·자동 추천)에도 배우는 방법 표시 (알 기술·기술 가르침 포함) |
| 19 | 대전용 카드 레이아웃 수정: 대안 기술 줄이 세로로 늘어나던 문제, 요약 줄 항목 중간 줄바꿈 |
| 20 | 모바일 정리: 성비 줄바꿈, 추천 탭 꽉 채우기, 룰 버튼 가로 스크롤, 룰 이름 번역 추가 |
| 21 | BDSP 기술머신 "번호 모름" 해결: PokeAPI에 없는 칸을 다이아몬드·펄 번호로 채우고 비전머신은 TM93~100으로 |
| 22 | 공격 기술이 적은 포켓몬(잉어킹, 딱충이, 메타몽 등)도 추천이 나오게: 다른 계열 공격 기술·변화 기술로 채움 |
| 23 | 저장된 기술 데이터 캐시를 쓰기 전에 내용을 확인하고, 키를 `pokedex-moves-v2`로 올림 (추천이 "추천할 공격 기술이 없어요"로 비던 문제) |
| 24 | 기본 게임에서 포켓몬 챔피언스 제외: 챔피언스 기술은 전부 `train`이라 피죤투 등의 스토리 추천·기술 목록이 비던 문제 (`versionGroups`는 레벨업·기술머신·알·가르침만 셈) |
| 25 | 소드·실드 맥스레이드 카테고리 (`#raid`): Serebii 굴 데이터, 버전·지역·별·거다이맥스 필터, 포켓몬 검색 |
| 26 | 레이드 장소 이름을 게임 속 한국어로 (PKHeX 텍스트), 와일드에리어 지도에서 장소를 눌러 출현 포켓몬 보기 |
| 27 | 갑옷섬·왕관설원 지도 (임의 배치), 눈 지형 추가 |
| 28 | 굴을 정확히: RaidFinder 굴 번호·좌표로 와일드에리어·갑옷섬 지도를 다시 그리고 굴마다 점, 굴 카드 ↔ 지도 강조 |
| 29 | 왕관설원도 굴 좌표(pkTeraRaid)로 지도를 다시 그림, 먼 동쪽 바다는 점선 상자로 당겨 표시 |

새 작업을 하면 위 표에 한 줄 추가하고, 구조·규칙·한계가 바뀌면 해당 절도 고친다.
