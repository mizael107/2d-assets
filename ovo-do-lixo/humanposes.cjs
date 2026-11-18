const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8810'], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 560 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8810/rig.html'); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => window.initHuman());
  const shots = [['idle', 0.3, 0.5], ['walk', 0.0, 1.0], ['walk', 0.15, 1.0], ['run', 0.09, 1.0], ['celebrate', 0.22, 0.4], ['scared', 0.2, 0.3], ['point', 0, 0.6]];
  let i = 0;
  for (const [st, t, ry] of shots) {
    await p.evaluate(([ry]) => { window.clear(); window.placeHuman('h', 0, 0, ry, 3); }, [ry]);
    await p.evaluate(([st, t]) => window.frame({ h: st }, t, [0, 1.25, 5.2], [0, 0.95, 0], 30), [st, t]);
    await p.screenshot({ path: `tripo/hp_${i++}.png` });
  }
  await b.close(); srv.kill();
})();
