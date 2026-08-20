# 엘리트 루틴 케어 — 제품 홈페이지

초·중·고 유소년 엘리트 선수(38개 종목)와 학부모를 위한 루틴·부상·진학 관리 앱
**엘리트 루틴 케어**의 제품 홈페이지입니다.

> 스스로, 루틴, 부상을 관리, 진학 리포트까지.

- 단일 `index.html` — 바닐라 JS/CSS, 외부 의존성 없음 (사진은 `img/`, 히어로 영상에서 뽑은 스틸)
- Cloudflare Pages로 배포 → **https://routi.pages.dev** (절차는 [DEPLOY.md](DEPLOY.md))
- 에디토리얼 다큐멘터리 지면 · 다크(기본)/라이트(웜페이퍼) 2테마 · 인터랙티브 데모 4종 내장
- 히어로 영상 2편 크로스페이드 체인 + 종목별 컬러 그레이딩 4장면 로테이션

## 로컬 확인

```
python -m http.server 8000
# → http://localhost:8000
```

## 검증

```
npm install                      # 최초 1회
npx playwright install chromium  # 최초 1회 (로컬만)
npm test                         # 약 15초
```

`npx playwright install`은 **로컬에서만** 필요하다. 클라우드 컨테이너에는 브라우저가
미리 깔려 있고 Playwright CDN이 막혀 있어 실행해도 실패하는데, 테스트가 미리 깔린
브라우저를 알아서 찾으므로 그냥 `npm test`만 하면 된다.

콘솔 에러, 영상 재생·카피 동기·탐색, 데모 4종 동작, 종목 탭 11개, 가격 표기 없음,
테마 토글, 560/960/1440px 가로 스크롤을 확인한다.

영상 항목은 H.264 디코더가 있는 환경에서만 돈다. Windows는 OS 디코더를 쓰므로 재생되고,
리눅스 컨테이너의 Chromium은 디코더가 없어 `SKIP`으로 넘어간다(실패로 세지 않는다).

## 관련 문서

- [초보자 설명서](https://eliteroutine.github.io/beginner_guide.html)
- [학부모 안내서](https://eliteroutine.github.io/parent_guide.html)
- [개인정보 처리방침](https://eliteroutine.github.io/privacy_policy.html)
- [공식 안내 사이트](https://k-elite.github.io)
