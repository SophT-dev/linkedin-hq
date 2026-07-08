// Static 1080x1350 PNG from an HTML page (brand visual export).
const path = require('path');
const BASE = 'c:/Users/sophi/Downloads/SOPH VS Code';
const puppeteer = require(BASE + '/lm-sales-agent/node_modules/puppeteer');

const htmlFile = process.argv[2];
const outPng   = process.argv[3];
const width    = parseInt(process.argv[4], 10) || 1080;
const height   = parseInt(process.argv[5], 10) || 1350;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-web-security', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  const url = 'file:///' + htmlFile.replace(/\\/g, '/').replace(/ /g, '%20');
  console.log('loading', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch (e) {} });
  // wait for all logo/avatar images to finish (or fail over to letter fallback)
  await page.waitForFunction(() => {
    const i = [...document.querySelectorAll('.chip img, .ava, .logo, .drop')];
    return i.every(x => x.complete);
  }, { timeout: 15000 }).catch(() => {});
  await sleep(800);
  // Full-viewport screenshot, not el.screenshot('#stage') -- the latter produced a reproducible
  // ghosting artifact (bottom content bleeding into the top edge) on a 1080x1350 @ dsf2 page.
  // #stage is always sized to match the viewport exactly, so this is equivalent and correct.
  await page.screenshot({ path: outPng });
  await browser.close();
  console.log('DONE ->', outPng);
})().catch(e => { console.error('ERR', e); process.exit(1); });
