const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const W = 720, H = 1280, FPS = 24, T = 10;
const START = +(process.argv[2] || 0), END = +(process.argv[3] || FPS * T), PORT = 8840 + (+process.argv[4] || 0);
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => Promise.all([window.init(), window.initHuman(), window.initChick()])); await p.evaluate(() => window.arena());
  await p.evaluate(() => { window.placeHuman('h', 0.3, -3.0, 0, 3); window.placeChick('k', -0.85, -3.0, 0, 0.6);
    window.place('c0', 'caipira', 1.5, 0.9, -1.0); window.place('c1', 'branca', -1.6, 0.6, 0.8); window.place('c2', 'raio', 1.2, -1.6, -0.5); });
  const hs = await p.evaluate(() => window.speedOf('h', 'walk')), ks = await p.evaluate(() => window.speedOf('k', 'run'));
  fs.mkdirSync('tripo/duo', { recursive: true });
  for (let f = START; f < END; f++) {
    const t = f / FPS, poses = {};
    // boy walks 0-3s, then idle, 6-7.5 points at the chick, 7.5+ celebrates
    const hz = -3.0 + Math.min(t, 3.0) * hs;
    poses.h = t < 3 ? 'walk' : t < 6 ? 'idle' : t < 7.5 ? 'point' : 'celebrate';
    const hry = t >= 5.7 && t < 7.6 ? -0.6 * Math.min(1, (t - 5.7) / 0.4) : 0;
    await p.evaluate(([z, ry]) => window.move('h', 0.3, z, ry), [hz, hry]);
    // chick follows ~0.5s behind with its own speed (needs more steps), then scratches, pecks, flaps at the end
    const kt = Math.max(0, Math.min(t - 0.3, (3.0 * hs + 0.7) / ks));
    const kz = -3.0 + kt * ks; const kWalk = t > 0.3 && kt < (3.0 * hs + 0.7) / ks;
    poses.k = kWalk ? 'run' : t < 6.0 ? 'scratch' : t < 7.6 ? 'peck' : 'flap';
    const kry = 0;
    await p.evaluate(([z, ry]) => window.move('k', -0.85, z, ry), [kz, kry]);
    poses.c0 = ['scratch', 'peck', 'idle'][Math.floor(t / 3.3) % 3]; poses.c1 = ['peck', 'preen', 'idle'][Math.floor((t + 1) / 3.1) % 3]; poses.c2 = ['idle', 'scratch', 'peck'][Math.floor((t + 2) / 3.5) % 3];
    const cz = Math.max(hz, kz);
    await p.evaluate(([poses, t, cam, tgt]) => window.frame(poses, t, cam, tgt, 46), [poses, t, [0.3, 2.3, cz + 4.3], [-0.3, 0.5, cz - 0.1]]);
    await p.screenshot({ path: `tripo/duo/f${String(f).padStart(4, '0')}.png` });
  }
  await b.close(); srv.kill();
})();
