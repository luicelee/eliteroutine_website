/* 스모크 테스트 — node test/smoke.mjs
 *
 * 단일 파일 사이트라 스크립트가 한 스코프로 이어져 있다. 위쪽에서 오타 하나 나면
 * 그 아래 데모가 통째로 죽는데 화면은 멀쩡해 보인다. 그걸 잡는 게 목적이다.
 * 정적 서버를 직접 띄우므로 사전 준비 없이 이 한 줄이면 끝난다.
 *
 * 영상은 H.264 디코더가 있는 환경에서만 검증한다(Windows는 OS 디코더를 쓴다).
 * 없는 환경 — 리눅스 컨테이너의 Chromium — 에서는 SKIP으로 넘어가고 실패로 세지 않는다.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

/* 브라우저 찾기.
 * 로컬은 `npx playwright install chromium` 후 알아서 찾는다.
 * 클라우드 컨테이너는 브라우저가 미리 깔려 있고 CDN이 막혀 있어 install이 불가능한데,
 * playwright 버전과 미리 깔린 빌드 번호가 어긋나면 기본 경로를 못 찾는다. 그때 주워온다. */
async function launchChromium() {
  try {
    return await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  } catch (err) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    const found = [];
    if (existsSync(base)) {
      if (existsSync(join(base, 'chromium'))) found.push(join(base, 'chromium'));
      for (const d of readdirSync(base)) {
        const p = join(base, d, 'chrome-linux', 'chrome');
        if (d.startsWith('chromium') && existsSync(p)) found.push(p);
      }
    }
    if (!found.length) throw err;
    console.log(`  (미리 설치된 브라우저 사용: ${found[0]})`);
    return await chromium.launch({ executablePath: found[0] });
  }
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.mp4': 'video/mp4', '.css': 'text/css', '.js': 'text/javascript' };

/* Range 요청을 받아준다. 지원하지 않으면 브라우저의 seekable.end(0)이 0이 되어
 * 영상 탐색이 전부 실패한다 (python -m http.server로 한 번 헤맨 지점이다). */
const server = createServer(async (req, res) => {
  const path = join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : req.url.split('?')[0]);
  try {
    const body = await readFile(path);
    const type = MIME[extname(path)] || 'application/octet-stream';
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? +m[1] : body.length - +m[2];
      const end = m[1] && m[2] ? Math.min(+m[2], body.length - 1) : body.length - 1;
      const slice = body.subarray(start, end + 1);
      res.writeHead(206, {
        'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': slice.length,
        'Content-Range': `bytes ${start}-${end}/${body.length}`,
      });
      return res.end(slice);
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': body.length });
    res.end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0);
await new Promise(r => server.once('listening', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const fails = [], errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) fails.push(name);
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};
const skip = (name, why) => console.log(`  SKIP ${name} — ${why}`);

const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

console.log('\n· 히어로');
const hero = await page.evaluate(() => ({
  slides: document.querySelectorAll('.nk-slide').length,
  segs: document.querySelectorAll('.nk-seg').length,
  rate: document.getElementById('nkVid1').playbackRate,
  theme: document.documentElement.dataset.theme,
}));
check('장면과 세그먼트 수가 같다', hero.slides === hero.segs && hero.slides > 0, `${hero.slides}장면 / ${hero.segs}세그먼트`);
check('영상 재생속도 0.8배', hero.rate === 0.8, String(hero.rate));
check('첫 접속은 다크 테마', hero.theme === 'dark', hero.theme);

/* 두 페이지가 스타일시트를 따로 들고 있다. 토큰이 어긋나기 시작하면 색과 활자가 서서히
 * 갈라지는데 각 페이지만 보면 멀쩡해 보인다. 값을 직접 비교해 잡는다. */
const TOKENS = ['--bg', '--ink', '--mark', '--rule', '--sans'];
const readTokens = () => page.evaluate(ks => {
  const cs = getComputedStyle(document.documentElement);
  return ks.map(k => k + '=' + cs.getPropertyValue(k).trim()).join(' | ');
}, TOKENS);
const indexTokens = await readTokens();

console.log('\n· 히어로 영상 — 재생 · 카피 동기 · 탐색');
/* H.264가 디코딩되는 환경에서만 본다. Windows는 OS(Media Foundation) 디코더를 쓰므로 재생되고,
 * 리눅스 컨테이너의 Chromium에는 디코더가 없어 canPlayType이 빈 문자열을 준다. */
const h264 = await page.evaluate(() => !!document.getElementById('nkVid1').canPlayType('video/mp4; codecs="avc1.42E01E"'));
if (!h264) {
  skip('영상 4종', 'H.264 디코더가 없는 환경이다 (실제 브라우저에서만 확인된다)');
} else {
  const play = await page.evaluate(async () => {
    const v = document.getElementById('nkVid1');
    const t0 = v.currentTime;
    await new Promise(r => setTimeout(r, 900));
    return { adv: v.currentTime - t0, dur: v.duration, err: v.error && v.error.code, w: v.videoWidth };
  });
  check('영상1이 실제로 재생된다', play.adv > 0.3 && !play.err && play.w > 0,
    `+${play.adv.toFixed(2)}s / ${play.w}px`);
  /* 장면표(DECISIONS.md 1번)가 전제하는 길이다. 영상을 갈아끼우면 여기서 먼저 걸린다 */
  check('영상1 길이 10.0초 — 장면표 전제', Math.abs(play.dur - 10.01) < 0.3, `${play.dur}초`);

  /* 카피는 타이머가 아니라 영상 시각을 따라간다. 임의 시점으로 감고 그 컷의 종목이 뜨는지 본다 */
  const at = async (t) => page.evaluate(async (t) => {
    const v = document.getElementById('nkVid1');
    v.currentTime = t;
    await new Promise(r => setTimeout(r, 260));
    const on = document.querySelector('.nk-slide.on');
    return { slide: on && on.dataset.sport, stage: document.querySelector('.nk').dataset.sport };
  }, t);
  const tk = await at(5.2), gf = await at(8.6);
  check('영상 시각 → 카피 동기 (5.2s 태권도 · 8.6s 골프)',
    tk.slide === 'tk' && tk.stage === 'tk' && gf.slide === 'gf' && gf.stage === 'gf',
    `${tk.slide} / ${gf.slide}`);

  /* 영상1 끝 → 영상2 크로스페이드 체인. load()가 배속을 되돌리지 않는지도 여기서 잡힌다 */
  const chain = await page.evaluate(async () => {
    const v1 = document.getElementById('nkVid1'), v2 = document.getElementById('nkVid2');
    v1.currentTime = 9.9;
    for (let i = 0; i < 40 && !v2.classList.contains('von'); i++) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => setTimeout(r, 300));
    const on = document.querySelector('.nk-slide.on');
    return { von2: v2.classList.contains('von'), von1: v1.classList.contains('von'),
             paused: v2.paused, rate: v2.playbackRate, slide: on && on.dataset.sport };
  });
  check('영상1 끝 → 영상2로 이어진다 (첫 장면 배구)',
    chain.von2 && !chain.von1 && !chain.paused && chain.slide === 'vb', chain.slide);
  check('영상2도 0.8배 — load() 후에도 유지', chain.rate === 0.8, String(chain.rate));

  /* 세그먼트 클릭 → 다른 영상의 그 장면 머리로. 두 가지가 한 번에 걸린다:
   * 서버가 Range를 지원하지 않으면 탐색이 죽고, 대상 영상이 아직 로드 전이면
   * currentTime 대입이 조용히 무시된다 (2026-08-20 라이브에서 실제로 터졌다). */
  await page.click('.nk-seg:nth-child(9)');   /* 육상 — 영상2의 4.0초 */
  await page.waitForTimeout(900);
  const jump = await page.evaluate(() => {
    const v1 = document.getElementById('nkVid1'), v2 = document.getElementById('nkVid2');
    const on = document.querySelector('.nk-slide.on');
    return { von1: v1.classList.contains('von'), von2: v2.classList.contains('von'),
             t: v2.currentTime, paused: v2.paused, slide: on && on.dataset.sport };
  });
  check('세그먼트 클릭 → 해당 영상·장면으로 탐색 (영상2 4.0초, 육상)',
    jump.von2 && !jump.von1 && jump.t >= 3.9 && jump.t < 6 && !jump.paused && jump.slide === 'at',
    `영상2 t=${jump.t.toFixed(2)} ${jump.slide}`);
}

console.log('\n· 인터랙티브 데모 4종');
for (const it of await page.$$('#routineList .r-item')) await it.click();
await page.waitForTimeout(300);
check('루틴 체크리스트 → 100% + 보상', await page.$eval('#routineReward', el => el.classList.contains('won')),
  await page.$eval('#routinePct', el => el.textContent));

await page.click('.demo-tab[data-panel="p-injury"]');
await page.waitForTimeout(300);
await page.$eval('#loadSlider', s => { s.value = 13; s.dispatchEvent(new Event('input')); });
await page.click('.bodymap .zone[data-part="어깨"]');
await page.waitForTimeout(200);
check('ACWR 슬라이더 → 위험 구간', (await page.$eval('#acwrZone', el => el.textContent)).includes('위험'));
check('몸 그림 클릭 → 통증 기록', (await page.$eval('#painNote', el => el.textContent)).includes('어깨'));

await page.click('.demo-tab[data-panel="p-report"]');
await page.waitForTimeout(200);
await page.click('#genReport');
await page.waitForTimeout(1500);
check('실적표 생성', await page.$eval('#reportPaper', el => el.classList.contains('show')));

await page.click('.demo-tab[data-panel="p-parent"]');
await page.waitForTimeout(200);
await page.click('#pairBtn');
await page.waitForTimeout(2400);
check('학부모 대시보드 연동', await page.$eval('#parentCards', el => el.classList.contains('live')));

console.log('');
console.log('· 기능별 광고 영상');
const ads = await page.$$eval('.ad-link', bs => bs.map(b => ({
  name: b.dataset.adName, src: b.dataset.ad, panel: b.closest('.demo-panel').id,
})));
check('데모 4종에 영상 링크가 하나씩 붙어 있다', ads.length === 4, ads.map(a => a.name).join(' · '));
const WANT = { 'p-routine': '루틴 영상', 'p-injury': '부상 영상', 'p-report': '진학 영상', 'p-parent': '통증 기록 영상' };
check('영상이 맞는 데모에 붙었다',
  ads.every(a => WANT[a.panel] === a.name), ads.map(a => a.panel + '→' + a.name).join(' · '));
check('첫 화면에서 영상을 미리 받지 않는다',
  await page.$eval('#adVideo', v => !v.getAttribute('src') && v.preload === 'none'));

/* 실제로 열어 재생되는지. 파일이 없거나 경로가 틀리면 여기서 잡힌다 */
await page.click('.demo-tab[data-panel="p-routine"]');
await page.waitForTimeout(200);
await page.click('#p-routine .ad-link');
await page.waitForTimeout(1800);
const ad = await page.evaluate(() => {
  const v = document.getElementById('adVideo');
  return { on: document.getElementById('adModal').classList.contains('on'),
           src: (v.currentSrc || '').split('/').pop(), rs: v.readyState,
           err: v.error ? v.error.code : null, name: document.getElementById('adModalName').textContent };
});
check('링크를 누르면 영상이 열리고 로드된다', ad.on && ad.rs > 0 && !ad.err,
  `${ad.name} · ${ad.src} · readyState=${ad.rs}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('닫으면 src를 떼어 내려받기를 끊는다',
  await page.$eval('#adVideo', v => !v.getAttribute('src')));

/* 네 편 모두 서버에 실제로 있는지 */
const codes = await page.evaluate(async srcs => {
  const out = [];
  for (const s of srcs) out.push(s.split('/').pop() + ':' + (await fetch(s, { method: 'HEAD' })).status);
  return out;
}, ads.map(a => a.src));
check('영상 파일 4개가 모두 응답한다', codes.every(c => c.endsWith(':200')), codes.join(' '));

console.log('\n· 종목 사례');
const tabs = await page.$$eval('.sport-tab', ts => ts.map(t => t.dataset.sport));
let tabOk = 0;
for (const id of tabs) {
  await page.click(`.sport-tab[data-sport="${id}"]`);
  await page.waitForTimeout(90);
  const r = await page.evaluate(() => {
    const on = [...document.querySelectorAll('.sport-panel.on')];
    return on.length === 1 ? { id: on[0].id, items: on[0].querySelectorAll('.sp-item').length } : {};
  });
  if (r.id === id && r.items > 0) tabOk++;
}
check('탭마다 패널 하나씩 열린다', tabOk === tabs.length, `${tabOk}/${tabs.length}`);

console.log('\n· 정책 · 테마');
check('가격 표기 없음 (출시 기념 무료)',
  !(await page.evaluate(() => /9,?900원|월 구독료|구독료/.test(document.body.innerText))));
await page.click('#themeToggle');
await page.waitForTimeout(400);
check('테마 토글 → 라이트', await page.$eval('html', el => el.dataset.theme === 'light'));

console.log('\n· 반응형');
for (const [w, h] of [[1440, 900], [960, 800], [560, 800]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(250);
  check(`${w}px 가로 스크롤 없음`,
    !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
}

console.log('');
console.log('· 만든 이유 카툰 페이지');
const toonLinks = await page.$$eval('a[href="story.html"]', as => as.length);
check('index에서 카툰 페이지로 가는 링크가 있다', toonLinks >= 2, toonLinks + '곳');
await page.setViewportSize({ width: 1440, height: 900 });
const storyResp = await page.goto(BASE + '/story.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check('story.html 응답 200', storyResp.status() === 200, String(storyResp.status()));
const toon = await page.evaluate(() => {
  const img = document.querySelector('.toon-figure img');
  return { w: img.naturalWidth, h: img.naturalHeight, theme: document.documentElement.dataset.theme,
           back: document.querySelectorAll('a[href^="index.html"]').length };
});
check('만화 이미지가 실제로 로드된다', toon.w > 0 && toon.h > 0, toon.w + 'x' + toon.h);
check('카툰 페이지도 첫 접속은 다크', toon.theme === 'dark', toon.theme);
check('본편으로 돌아가는 링크가 있다', toon.back >= 3, toon.back + '곳');
check('디자인 토큰이 index와 같다', (await readTokens()) === indexTokens);
check('가로 스크롤 없음 (1440px)',
  !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
await page.setViewportSize({ width: 560, height: 800 });
await page.waitForTimeout(300);
check('가로 스크롤 없음 (560px)',
  !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));

console.log('\n· 콘솔');
check('콘솔 에러 0', errors.length === 0, errors.join(' | '));

await browser.close();
server.close();
console.log(fails.length ? `\n실패 ${fails.length}건: ${fails.join(', ')}\n` : '\n전부 통과\n');
process.exit(fails.length ? 1 : 0);
