const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8772'], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 480, height: 480 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8772/rig.html'); await p.waitForFunction(() => window.ready); await p.evaluate(() => window.init());
  for (const v of ['comum','caipira','preta','branca','raio','fogo','gelo','sombra','arcoiris']) {
    await p.evaluate(v => { window.clear(); window.place('c', v, 0, 0, 1.75); }, v);
    await p.evaluate(() => window.frame({ c: 'idle' }, 0.7, [0, 0.75, 3.0], [0, 0.5, 0]));
    await p.screenshot({ path: `tripo/side_${v}.png` });
    await p.evaluate(v => { window.clear(); window.place('c', v, 0, 0, 0.9); }, v);
    await p.evaluate(() => window.frame({ c: 'idle' }, 0.3, [0.25, 0.84, 1.15], [0.05, 0.76, 0]));
    await p.screenshot({ path: `tripo/face_${v}.png` });
  }
  await b.close(); srv.kill();
})();
