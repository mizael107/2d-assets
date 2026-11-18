const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const W = 720, H = 1280, FPS = 24, T = 9;
const START = +(process.argv[2] || 0), END = +(process.argv[3] || FPS * T), PORT = 8780 + (+process.argv[4] || 0);
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => window.init()); await p.evaluate(() => window.arena());
  // 9 chickens in 3 rows, each with its own start position, heading and time offset
  const C = [
    ['comum', -1.05, 2.0, 0.2, 0.0], ['caipira', 0.05, 2.25, -0.1, 0.4], ['preta', 0.95, 2.0, -0.3, 0.8],
    ['branca', -1.15, 0.35, 0.25, 1.1], ['raio', 0.0, 0.5, 0.05, 0.2], ['fogo', 1.15, 0.35, -0.3, 0.6],
    ['gelo', -1.05, -1.35, 0.2, 0.9], ['sombra', 0.05, -1.2, -0.05, 0.3], ['arcoiris', 1.1, -1.35, -0.2, 0.7],
  ];
  await p.evaluate(C => C.forEach(([v, x, z, ry], i) => window.place('c' + i, v, x, z, ry)), C);
  fs.mkdirSync('tripo/video', { recursive: true });
  // per-chicken timeline: idle -> walk -> flap -> peck/walk, offset so they are not in sync
  const plan = [[0, 'idle'], [1.6, 'walk'], [4.4, 'flap'], [5.6, 'walk'], [7.4, 'peck']];
  for (let f = START; f < END; f++) {
    const t = f / FPS; const poses = {};
    for (let i = 0; i < C.length; i++) {
      const [v, x0, z0, ry, off] = C[i]; const lt = t - off;
      let st = 'idle'; for (const [t0, s] of plan) if (lt >= t0) st = s;
      // walking distance accumulated over walk segments
      const w1 = Math.max(0, Math.min(lt, 4.4) - 1.6), w2 = Math.max(0, Math.min(lt, 7.4) - 5.6);
      const d = (w1 + w2) * 0.22;
      await p.evaluate(([id, x, z, ry]) => window.move(id, x, z, ry), ['c' + i, x0 + Math.sin(ry) * d, z0 + Math.cos(ry) * d, ry]);
      poses['c' + i] = st;
    }
    // camera: slow push-in + gentle orbit, vertical framing
    const k = t / T, a = -0.35 + k * 0.7;
    const dist = 7.4 - k * 1.4;
    await p.evaluate(([poses, t, cam, tgt]) => window.frame(poses, t, cam, tgt, 42), [poses, t, [Math.sin(a) * dist, 3.6 - k * 0.8, Math.cos(a) * dist + 0.6], [0, 0.3, 0.3]]);
    await p.screenshot({ path: `tripo/video/f${String(f).padStart(4, '0')}.png` });
  }
  await b.close(); srv.kill();
})();
