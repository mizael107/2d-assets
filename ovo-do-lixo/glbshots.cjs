const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const [glb, outPrefix, hS] = process.argv.slice(2); const h = +(hS || 1);
  const srv = spawn('python3', ['-m', 'http.server', '8767'], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 600, height: 600 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8767/glbview.html'); await p.waitForFunction(() => window.ready);
  await p.evaluate(u => window.load(u), glb);
  const views = [['34', 0.6, [0, 0.62*h, 3.2*h], [0, 0.48*h, 0]], ['frente', 0, [0, 0.62*h, 3.2*h], [0, 0.48*h, 0]], ['lado', 1.5708, [0, 0.62*h, 3.2*h], [0, 0.48*h, 0]], ['costas', Math.PI, [0, 0.62*h, 3.2*h], [0, 0.48*h, 0]], ['rosto', 0.25, [0, 0.86*h, 0.75*h], [0, 0.84*h, 0]]];
  for (const [n, ry, c, t] of views) { await p.evaluate(([ry, c, t]) => window.shot(ry, c, t), [ry, c, t]); await p.screenshot({ path: `${outPrefix}_${n}.png` }); }
  await b.close(); srv.kill();
})();
