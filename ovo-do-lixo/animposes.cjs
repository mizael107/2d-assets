const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8850'], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 560 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8850/rig.html'); await p.waitForFunction(() => window.ready); await p.evaluate(() => window.initAnimHuman());
  const shots = [['idle', 1.0, 0.4], ['walk', 0.4, 1.2], ['walk', 1.6, 1.2], ['run', 0.3, 1.2], ['jump', 0.9, 0.4], ['scared', 1.5, 0.4]];
  let i = 0;
  for (const [st, t, ry] of shots) {
    await p.evaluate(([ry]) => { window.clear(); window.placeAnimHuman('h', 0, 0, ry, 1.95); }, [ry]);
    await p.evaluate(([st, t]) => { window.frame({ h: st }, 0, [0, 1.25, 5.2], [0, 0.95, 0], 30); return window.frame({ h: st }, t, [0, 1.25, 5.2], [0, 0.95, 0], 30); }, [st, t]);
    await p.screenshot({ path: `tripo/ap_${i++}.png` });
  }
  await b.close(); srv.kill();
})();
