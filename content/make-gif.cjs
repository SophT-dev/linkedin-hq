// High-quality GIF from an animated HTML page.
// puppeteer CDP screencast (dsf2, near-lossless jpeg) -> resample to constant fps
// -> ffmpeg two-pass palettegen/paletteuse (bayer dither) -> smooth gif + mp4.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const BASE = 'c:/Users/sophi/Downloads/SOPH VS Code';
const puppeteer = require(BASE + '/upwork-sales-agent/node_modules/puppeteer');
const ffmpeg = require('ffmpeg-static');

const htmlFile = process.argv[2] || (BASE + '/linkedin-hq/content/toolstack-budget-tiers.html');
const outGif   = process.argv[3] || (BASE + '/linkedin-hq/content/toolstack-budget-tiers.gif');
const OUT_W    = parseInt(process.argv[4] || '600', 10);
const FPS      = parseInt(process.argv[5] || '20', 10);
const REC_MS   = parseInt(process.argv[6] || '12000', 10);
const WIN_START= parseFloat(process.argv[7] || '1.3');   // s, skip entrance
const WIN_LEN  = parseFloat(process.argv[8] || '8.7');   // s, one cursor cycle (3 x 2.9s)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const framesDir = path.join(path.dirname(outGif), '_frames');

(async () => {
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  console.log('launching chromium (dsf2)...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-web-security', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
  const url = 'file:///' + htmlFile.replace(/\\/g, '/').replace(/ /g, '%20');
  console.log('loading', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    const s = document.getElementById('stage'); s.style.transform = 'none';
    document.body.style.cssText += ';margin:0;height:1350px;align-items:flex-start;background:#07070d;';
    document.querySelectorAll('.hint,.controls').forEach(e => e.style.display = 'none');
  });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch (e) {} });
  await page.waitForFunction(() => { const i = [...document.querySelectorAll('.lchip img,.logo,.ava')]; return i.length && i.every(x => x.complete); }, { timeout: 15000 }).catch(() => {});
  await sleep(600);

  const client = await page.target().createCDPSession();
  const raw = [];
  let t0 = null;
  client.on('Page.screencastFrame', async (f) => {
    const t = f.metadata.timestamp; if (t0 === null) t0 = t;
    raw.push({ buf: Buffer.from(f.data, 'base64'), t: t - t0 });
    try { await client.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {}
  });
  console.log('recording', REC_MS, 'ms...');
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 100, everyNthFrame: 1 });
  await sleep(REC_MS);
  await client.send('Page.stopScreencast');
  await browser.close();
  console.log('raw frames:', raw.length, '(span', raw.length ? raw[raw.length - 1].t.toFixed(2) : 0, 's)');

  // resample to constant FPS across the chosen window (even spacing -> smooth playback + clean loop)
  const n = Math.round(WIN_LEN * FPS);
  let written = 0;
  for (let i = 0; i < n; i++) {
    const target = WIN_START + i / FPS;
    let best = raw[0], bd = Infinity;
    for (const fr of raw) { const d = Math.abs(fr.t - target); if (d < bd) { bd = d; best = fr; } }
    fs.writeFileSync(path.join(framesDir, `f_${String(i + 1).padStart(4, '0')}.jpg`), best.buf);
    written++;
  }
  console.log('wrote', written, 'evenly-spaced frames @', FPS, 'fps');

  const pattern = path.join(framesDir, 'f_%04d.jpg');
  const palette = path.join(framesDir, 'palette.png');
  const vf = `fps=${FPS},scale=${OUT_W}:-1:flags=lanczos`;
  console.log('ffmpeg: palettegen...');
  execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', pattern, '-vf', `${vf},palettegen=max_colors=256:stats_mode=full`, palette], { stdio: 'ignore' });
  console.log('ffmpeg: gif (paletteuse + bayer dither)...');
  execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', pattern, '-i', palette,
    '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`, '-loop', '0', outGif], { stdio: 'ignore' });
  // bonus: crisp mp4 (LinkedIn-friendly, sharper than gif)
  const outMp4 = outGif.replace(/\.gif$/, '.mp4');
  console.log('ffmpeg: mp4...');
  execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', pattern, '-vf', `${vf},format=yuv420p`, '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart', outMp4], { stdio: 'ignore' });

  fs.rmSync(framesDir, { recursive: true, force: true });
  const mb = f => (fs.statSync(f).size / 1048576).toFixed(2);
  console.log('DONE');
  console.log('  GIF:', outGif, mb(outGif), 'MB');
  console.log('  MP4:', outMp4, mb(outMp4), 'MB');
})().catch(e => { console.error('ERR', e); process.exit(1); });
