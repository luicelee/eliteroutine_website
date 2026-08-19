# 배포 — elite.pages.dev

정적 사이트 하나(`index.html` + 영상 2개)라 빌드 과정이 없다. 저장소를 연결하면 끝난다.

## 1. GitHub 저장소 만들기

Claude Code에 붙은 GitHub App은 저장소 생성 권한이 없어(403) 이 단계만 직접 해야 한다.

1. https://github.com/new
2. Repository name: **`eliteroutine_website`**
3. Public, **README·.gitignore·license 전부 체크 해제** (빈 저장소여야 한다)
4. Create repository

만든 뒤 Claude에게 알려주면 아래 push까지 대신 해준다. 직접 한다면:

```bash
cd eliteroutine_website
git remote add origin https://github.com/luicelee/eliteroutine_website.git
git push -u origin main
```

## 2. Cloudflare Pages 연결

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**
2. `luicelee/eliteroutine_website` 선택
3. 빌드 설정 — **빌드가 없으므로 전부 비운다**:

   | 항목 | 값 |
   |---|---|
   | Framework preset | None |
   | Build command | (비움) |
   | Build output directory | `/` |

4. **Save and Deploy**

## 3. 짧은 주소 확보 — `elite.pages.dev`

Pages 프로젝트 이름이 그대로 서브도메인이 된다. 2단계에서 프로젝트 이름을 **`elite`**
로 지정하면 `elite.pages.dev`가 된다.

이미 다른 이름으로 만들었다면 프로젝트 → **Settings** → **General** → Project name에서
`elite`로 바꾼다. 전역에서 선점되어 있으면 `elite-kr`, `eliteroutine` 순으로 시도한다.

브랜치별 미리보기 주소(`<branch>.elite.pages.dev`)도 자동으로 붙는다.

## 4. 확인

- `https://elite.pages.dev` 접속 — 첫 화면이 **다크 테마**이고 히어로 영상이 재생되는지
- 영상이 `heroplayer.mp4` → `heroplayer2.mp4`로 이어지며 크로스페이드되는지
- 데모 4종(루틴 체크·ACWR 슬라이더·실적표 생성·학부모 연동)이 실제로 조작되는지
- 모바일에서 가로 스크롤이 생기지 않는지

## 영상 파일 주의

`heroplayer.mp4`(2.4MB) + `heroplayer2.mp4`(2.9MB) = 5.3MB가 첫 화면에서 로드된다.
Cloudflare CDN이 캐시하지만, 첫 방문 체감이 느리면 아래를 고려한다.

- `preload="auto"` → `preload="metadata"`로 낮추기 (2번째 영상만)
- 720p로 재인코딩해 용량 절반으로 줄이기
- 포스터 이미지를 넣어 영상 로드 전 첫 프레임을 보여주기

## 나중에 커스텀 도메인을 붙인다면

Pages 프로젝트 → **Custom domains** → 도메인 추가. Cloudflare에서 산 도메인이면 DNS가
자동으로 잡히고, 외부에서 샀다면 CNAME을 `elite.pages.dev`로 지정한다.
