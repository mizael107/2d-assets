const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8765'], { cwd: __dirname, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const jobs = JSON.parse(fs.readFileSync(process.argv[2]));
  const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.dpr || 1 });
    page.on('pageerror', e => console.log('ERR', e.message));
    await page.goto('http://localhost:8765/' + (process.env.PAGE || 'studio.html'));
    await page.waitForFunction(() => window.ready);
    await page.evaluate(cfg => window.setup(cfg), j.cfg);
    await page.screenshot({ path: `${out}/${j.name}.png` });
    await page.close(); console.log('ok', j.name);
  }
  await browser.close(); srv.kill();
})();
