# 배포 — routi.pages.dev

정적 사이트 하나(`index.html` + 영상 2개)라 빌드 과정이 없다.

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
- 4장면(야구·축구·농구·태권도)이 5.6초마다 넘어가고 색 보정이 바뀌는지
- 데모 4종(루틴 체크·ACWR 슬라이더·실적표 생성·학부모 연동)이 실제로 조작되는지
- 모바일에서 가로 스크롤이 생기지 않는지

영상 재생은 개발 환경의 Chromium에 H.264 코덱이 없어 자동 검증이 불가능하다. 실제
브라우저에서만 확인된다.

## 영상 파일 주의

`heroplayer.mp4`(2.4MB) + `heroplayer2.mp4`(2.9MB) = 5.3MB가 첫 화면에서 로드된다.
Cloudflare CDN이 캐시하지만(`_headers`에서 1년 immutable), 첫 방문 체감이 느리면:

- 2번째 영상만 `preload="auto"` → `preload="metadata"`로 낮추기
- 720p로 재인코딩해 용량 절반으로 줄이기
- `poster` 이미지를 넣어 영상 로드 전 첫 프레임을 보여주기

## 커스텀 도메인을 붙인다면

Pages 프로젝트 → **Custom domains** → 도메인 추가. Cloudflare에서 산 도메인이면 DNS가
자동으로 잡히고, 외부에서 샀다면 CNAME을 `routi.pages.dev`로 지정한다.
