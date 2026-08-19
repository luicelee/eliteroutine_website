/* 스모크 테스트 — node test/smoke.mjs
 *
 * 단일 파일 사이트라 스크립트가 한 스코프로 이어져 있다. 위쪽에서 오타 하나 나면
 * 그 아래 데모가 통째로 죽는데 화면은 멀쩡해 보인다. 그걸 잡는 게 목적이다.
 * 정적 서버를 직접 띄우므로 사전 준비 없이 이 한 줄이면 끝난다.
 *
 * 영상 재생은 여기서 확인하지 않는다 — Playwright의 Chromium에 H.264 디코더가
 * 없어서 재생 자체가 불가능하다. 실제 브라우저에서만 확인된다.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.mp4': 'video/mp4', '.css': 'text/css', '.js': 'text/javascript' };

const server = createServer(async (req, res) => {
  const path = join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : req.url.split('?')[0]);
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
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

console.log('\n· 콘솔');
check('콘솔 에러 0', errors.length === 0, errors.join(' | '));

await browser.close();
server.close();
console.log(fails.length ? `\n실패 ${fails.length}건: ${fails.join(', ')}\n` : '\n전부 통과\n');
process.exit(fails.length ? 1 : 0);
