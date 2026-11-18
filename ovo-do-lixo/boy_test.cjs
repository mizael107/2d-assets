const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const W = 720, H = 1280, FPS = 24, T = 10;
const START = +(process.argv[2] || 0), END = +(process.argv[3] || FPS * T), PORT = 8820 + (+process.argv[4] || 0);
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => window.init()); await p.evaluate(() => window.initHuman()); await p.evaluate(() => window.arena());
  // chickens around (scale 1 -> about half the boy's height), each with its own fixed routine
  const CH = [['caipira', -1.2, 0.6, 0.9, ['scratch', 'peck', 'idle']], ['branca', 1.3, 0.9, -1.2, ['peck', 'idle', 'preen']],
              ['fogo', -1.5, -1.0, 0.4, ['idle', 'scratch', 'peck']], ['gelo', 1.4, -0.9, -0.6, ['preen', 'peck', 'scratch']],
              ['sombra', -0.85, 1.75, Math.PI - 0.45, ['idle', 'idle', 'idle']]];
  await p.evaluate(CH => CH.forEach(([v, x, z, ry], i) => window.place('c' + i, v, x, z, ry)), CH);
  await p.evaluate(() => window.placeHuman('h', 0, -3.2, 0, 3));
  const sp = await p.evaluate(() => window.speedOf('h', 'walk'));
  fs.mkdirSync('tripo/boy', { recursive: true });
  for (let f = START; f < END; f++) {
    const t = f / FPS; const poses = {};
    // boy: walk 0-3.6s toward camera, idle, point at the dark chicken, scared when it flaps, celebrate
    const walkT = Math.min(t, 2.0), bz = -3.2 + walkT * sp;
    const bs = t < 2.0 ? 'walk' : t < 3.4 ? 'idle' : t < 4.9 ? 'point' : t < 6.5 ? 'scared' : 'celebrate';
    const bry = (t >= 3.2 && t < 6.6) ? Math.min(1, (t - 3.2) / 0.35) * -0.45 : t >= 6.6 ? -0.45 * Math.max(0, 1 - (t - 6.6) / 0.4) : 0;
    await p.evaluate(([z, ry]) => window.move('h', 0, z, ry), [bz, bry]);
    poses.h = bs;
    CH.forEach(([v, x, z, ry, plan], i) => {
      let st = plan[Math.floor((t + i * 0.7) / 3.3) % plan.length];
      if (v === 'sombra') st = t < 4.9 ? 'idle' : t < 6.4 ? 'flap' : t < 7.4 ? 'idle' : 'peck';
      poses['c' + i] = st;
    });
    const cz = bz;
    await p.evaluate(([poses, t, cam, tgt]) => window.frame(poses, t, cam, tgt, 52), [poses, t, [0.6, 2.4, Math.min(cz + 3.7, 3.9)], [-0.3, 0.6, cz + 0.7]]);
    await p.screenshot({ path: `tripo/boy/f${String(f).padStart(4, '0')}.png` });
  }
  await b.close(); srv.kill();
})();
