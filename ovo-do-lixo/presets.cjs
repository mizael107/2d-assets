const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8771'], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 480, height: 480 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8771/rig.html'); await p.waitForFunction(() => window.ready); await p.evaluate(() => window.init());
  for (const v of ['comum','caipira','preta','branca','raio','fogo','gelo','sombra','arcoiris']) {
    await p.evaluate(v => { window.clear(); window.place('c', v, 0, 0, 0.55); }, v);
    await p.evaluate(() => window.frame({ c: 'idle' }, 0.7, [0, 0.7, 3.0], [0, 0.48, 0]));
    await p.screenshot({ path: `tripo/preset_${v}.png` });
  }
  for (const [v, side] of [['gelo', 1], ['caipira', -1], ['sombra', 1]]) {
    await p.evaluate(([v, side]) => { window.clear(); window.place('c', v, 0, 0, side * 0.9); }, [v, side]);
    await p.evaluate((side) => window.frame({ c: 'idle' }, 0.0, [side * 0.25, 0.82, 1.2], [side * 0.05, 0.74, 0]), side);
    await p.screenshot({ path: `tripo/eye_${v}.png` });
  }
  await b.close(); srv.kill();
})();
