// side tracking shot: 3 chickens walking, then stop, look around, peck, flap
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const W = 720, H = 1280, FPS = 24, T = 8;
const START = +(process.argv[2] || 0), END = +(process.argv[3] || FPS * T), PORT = 8790 + (+process.argv[4] || 0);
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => window.init()); await p.evaluate(() => window.arena());
  const C = [['caipira', -2.6, 0.9, 0.0], ['fogo', -3.2, 0.0, 0.35], ['gelo', -2.4, -0.9, 0.2]];  // walk toward +X
  await p.evaluate(C => C.forEach(([v, x, z], i) => window.place('c' + i, v, x, z, Math.PI / 2)), C);
  const speed = await p.evaluate(() => window.speedOf('c0', 'walk'));
  fs.mkdirSync('tripo/walk', { recursive: true });
  // timeline per chicken (local time = t - offset): walk 0-4.6, idle (look around) 4.6-6, peck 6-7, flap 7-8
  const seg = (lt) => lt < 0 ? 'idle' : lt < 4.6 ? 'walk' : lt < 6.0 ? 'idle' : lt < 7.0 ? 'peck' : 'flap';
  for (let f = START; f < END; f++) {
    const t = f / FPS; const poses = {};
    for (let i = 0; i < C.length; i++) {
      const [v, x0, z0, off] = C[i]; const lt = t - off;
      const walked = Math.max(0, Math.min(lt, 4.6)) * speed;
      await p.evaluate(([id, x, z]) => window.move(id, x, z, Math.PI / 2), ['c' + i, x0 + walked, z0]);
      poses['c' + i] = seg(lt);
    }
    const gx = C.reduce((acc, [v, x0, z0, off]) => acc + x0 + Math.max(0, Math.min(t - off, 4.6)) * speed, 0) / C.length;
    await p.evaluate(([poses, t, cam, tgt]) => window.frame(poses, t, cam, tgt, 40), [poses, t, [gx + 0.3, 1.25, 4.1], [gx + 0.1, 0.36, -0.1]]);
    await p.screenshot({ path: `tripo/walk/f${String(f).padStart(4, '0')}.png` });
  }
  await b.close(); srv.kill();
})();
