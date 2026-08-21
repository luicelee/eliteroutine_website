# 배포 — routi.pages.dev

정적 사이트(`index.html` · `story.html` + 히어로 영상 2개 + 기능별 영상 5개 + 사진 34장)라
빌드 과정이 없다.

| 항목 | 값 |
|---|---|
| 저장소 | https://github.com/luicelee/eliteroutine_website |
| 호스팅 | Cloudflare Pages, 프로젝트 이름 `routi` |
| 주소 | https://routi.pages.dev |

`elite`는 전역에서 이미 선점되어 `routi`로 잡았다. Pages 프로젝트 이름이 곧 서브도메인이다.

## 갱신하는 법

`main`에 push하면 Cloudflare가 알아서 다시 배포한다. 따로 할 일이 없다.

```bash
cd eliteroutine_website
git add -A && git commit -m "..." && git push
```

브랜치를 push하면 `<branch>.routi.pages.dev` 미리보기 주소가 자동으로 붙는다.

## 빌드 설정 (이미 적용됨)

| 항목 | 값 |
|---|---|
| Framework preset | None |
| Build command | (비움) |
| Build output directory | `/` |

## 배포 후 확인할 것

- 첫 화면이 **다크 테마**이고 히어로 영상이 재생되는지
- 영상이 `heroplayer.mp4` → `heroplayer2.mp4`로 이어지며 크로스페이드되는지
- 11장면이 영상 컷에 맞춰 넘어가고 카피·색 보정이 같이 바뀌는지 (하단 세그먼트 11개)
- 데모 4종(루틴 체크·ACWR 슬라이더·실적표 생성·학부모 연동)이 실제로 조작되는지
- 모바일에서 가로 스크롤이 생기지 않는지

이 목록은 `npm test`가 대신 본다(영상 포함). H.264 디코더가 없는 환경에서는 영상 항목만
SKIP되니, 그때만 실제 브라우저로 확인한다.

## 영상 파일 주의

`heroplayer.mp4`(2.4MB) + `heroplayer2.mp4`(2.5MB) = 4.9MB가 첫 화면에서 로드된다.
`img/`의 사진 34장(합 1.1MB)은 첫 화면 폰 스크린샷 2장을 빼면 전부 `loading="lazy"`다.
기능별 영상 5편(14.4MB)은 누를 때까지 한 바이트도 받지 않는다.
**실측(2026-08-20): 콜드 FCP 420ms · load 528ms** — 엣지 캐시가 물고 있어 지금은 문제가
아니다. 그래도 더 줄여야 하면:

- 2번째 영상만 `preload="auto"` → `preload="metadata"`로 낮추기
- 720p로 재인코딩해 용량 절반으로 줄이기
- `poster` 이미지를 넣어 영상 로드 전 첫 프레임을 보여주기

## 커스텀 도메인을 붙인다면

Pages 프로젝트 → **Custom domains** → 도메인 추가. Cloudflare에서 산 도메인이면 DNS가
자동으로 잡히고, 외부에서 샀다면 CNAME을 `routi.pages.dev`로 지정한다.
