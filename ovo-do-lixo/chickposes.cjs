const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8830'], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 400 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8830/rig.html'); await p.waitForFunction(() => window.ready); await p.evaluate(() => window.initChick());
  const shots = [['idle', 0.3, 0.6], ['walk', 0.05, 1.4], ['walk', 0.32, 1.4], ['scratch', 0.2, 1.2], ['peck', 0.3, 1.2], ['flap', 0.12, 0.5], ['sit', 0.5, 0.6], ['preen', 0.4, 0.6], ['sleep', 0.5, 0.6]];
  let i = 0;
  for (const [st, t, ry] of shots) {
    await p.evaluate(([ry]) => { window.clear(); window.placeChick('c', 0, 0, ry, 1); }, [ry]);
    await p.evaluate(([st, t]) => window.frame({ c: st }, t, [0, 0.75, 3.0], [0, 0.45, 0], 28), [st, t]);
    await p.screenshot({ path: `tripo/cp_${i++}.png` });
  }
  await b.close(); srv.kill();
})();
