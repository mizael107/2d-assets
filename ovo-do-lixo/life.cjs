// Arena "life" scene: each chicken runs its own behavior (walk to a point, scratch, idle, peck, flap).
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const W = 720, H = 1280, FPS = 24, T = 14, NF = FPS * T;
const START = +(process.argv[2] || 0), END = +(process.argv[3] || NF), PORT = 8800 + (+process.argv[4] || 0);
const VARS = ['comum', 'caipira', 'preta', 'branca', 'raio', 'fogo', 'gelo', 'sombra', 'arcoiris'];
// deterministic RNG
let sd = 12345; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const RX = 1.75, RZ = 2.9;                       // area the chickens roam (ellipse), fits the vertical frame
const randPoint = () => { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()); return [Math.cos(a) * r * RX, Math.sin(a) * r * RZ]; };
const pick = (w) => { let r = rnd() * w.reduce((a, b) => a + b[1], 0); for (const [k, x] of w) { if ((r -= x) <= 0) return k; } return w[0][0]; };
const BEH = [['walk', 0.28], ['scratch', 0.22], ['idle', 0.16], ['peck', 0.12], ['preen', 0.1], ['sit', 0.07], ['flap', 0.05]];
const DUR = { scratch: [2.6, 4.2], idle: [1.4, 3.0], peck: [1.6, 2.6], flap: [1.0, 1.4], preen: [2.2, 3.6], sit: [3.0, 5.0] };

function simulate(speeds, runSpeeds) {
  const C = VARS.map((v, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const p = [(col - 1) * 1.2 + (rnd() - 0.5) * 0.4, (row - 1) * 1.9 + (rnd() - 0.5) * 0.5];
    const first = ['walk', 'scratch', 'idle', 'peck', 'walk', 'idle', 'scratch', 'walk', 'peck'][i];
    const a = rnd() * Math.PI * 2; return { v, p, yaw: rnd() * Math.PI * 2, state: first, timer: 0.4 + rnd() * 2.5, walkT: 0, target: [p[0] + Math.sin(a) * 0.9, p[1] + Math.cos(a) * 0.9] };
  });
  const frames = [];
  const dt = 1 / FPS;
  for (let f = 0; f < NF; f++) {
    for (let i = 0; i < C.length; i++) {
      const c = C[i];
      const t = f * dt;
      // ---- scripted moment: caipira (1) vs preta (2) fight; comum (0) gets scared ----
      if (i === 6 || i === 7) {
        const o = C[i === 6 ? 7 : 6];
        if (t >= 4.0 && !c.fightDone) {
          const dx = o.p[0] - c.p[0], dz = o.p[1] - c.p[1], d = Math.hypot(dx, dz);
          if (!c.fightT && d > 0.86) { c.state = 'walk'; c.target = [(c.p[0] + o.p[0]) / 2 - dx / (d || 1) * 0.43, (c.p[1] + o.p[1]) / 2 - dz / (d || 1) * 0.43]; c.timer = 0.01; c.walkT = 0; c.noAvoid = true; }
          else { c.fightT = c.fightT || t; c.state = 'fight'; c.timer = 9; c.yaw = Math.atan2(dx, dz); }
          if (c.fightT && t - c.fightT > 2.6) {
            c.fightDone = true;
            if (i === 7) { c.state = 'run'; c.runAway = [c.p[0] - dx / d * 2, c.p[1] - dz / d * 2]; c.timer = 1.4; }
            else { c.state = 'flap'; c.timer = 1.2; }
          }
          if (c.state === 'fight') continue;
        }
      }
      if (i === 8 && t >= 5.2 && !c.scared) { c.scared = true; c.state = 'run'; const fx = C[6].p[0], fz = C[6].p[1]; const dx = c.p[0] - fx, dz = c.p[1] - fz, d = Math.hypot(dx, dz) || 1; c.runAway = [c.p[0] + dx / d * 1.6, c.p[1] + dz / d * 1.6]; c.timer = 1.2; }
      if (c.state === 'run') {
        const desired = Math.atan2(c.runAway[0] - c.p[0], c.runAway[1] - c.p[1]);
        let diff = ((desired - c.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        c.yaw += Math.max(-5 * dt, Math.min(5 * dt, diff));
        const sp = runSpeeds[i] * Math.max(0.3, Math.cos(diff));
        c.p[0] += Math.sin(c.yaw) * sp * dt; c.p[1] += Math.cos(c.yaw) * sp * dt;
        const k = (c.p[0] / RX) ** 2 + (c.p[1] / RZ) ** 2; if (k > 1.15) { c.p[0] /= Math.sqrt(k / 1.15); c.p[1] /= Math.sqrt(k / 1.15); }
      }
      c.timer -= dt;
      if (c.state === 'walk') {
        let dx = c.target[0] - c.p[0], dz = c.target[1] - c.p[1];
        // keep distance from the others
        if (!c.noAvoid) for (let j = 0; j < C.length; j++) if (j !== i) { const ox = c.p[0] - C[j].p[0], oz = c.p[1] - C[j].p[1], d = Math.hypot(ox, oz); if (d < 0.9 && d > 1e-3) { dx += ox / d * (0.9 - d) * 3; dz += oz / d * (0.9 - d) * 3; } }
        const desired = Math.atan2(dx, dz);
        let diff = ((desired - c.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        c.yaw += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
        const sp = speeds[i] * Math.max(0.3, Math.cos(diff));
        c.p[0] += Math.sin(c.yaw) * sp * dt; c.p[1] += Math.cos(c.yaw) * sp * dt;
        const dist = Math.hypot(c.target[0] - c.p[0], c.target[1] - c.p[1]);
        c.walkT += dt; if (dist < 0.2 || c.walkT > 3.2) { c.timer = 0; c.walkT = 0; }
        else c.timer = Math.max(c.timer, 0.01);
      }
      if (c.timer <= 0) {                               // choose the next behavior (never the same twice in a row)
        c.noAvoid = false; let nx; do { nx = pick(BEH); } while (nx === c.state);
        c.state = nx;
        if (nx === 'walk') { for (let k = 0; k < 20; k++) { const a = rnd() * Math.PI * 2, r = 0.6 + rnd() * 0.8; const tx = c.p[0] + Math.sin(a) * r, tz = c.p[1] + Math.cos(a) * r; if ((tx / RX) ** 2 + (tz / RZ) ** 2 < 1) { c.target = [tx, tz]; break; } } c.timer = 0.01; }
        else { const [a, b] = DUR[nx]; c.timer = a + rnd() * (b - a); }
      }
    }
    frames.push(C.map(c => ({ x: c.p[0], z: c.p[1], yaw: c.yaw, s: c.state })));
  }
  return frames;
}

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => window.init()); await p.evaluate(() => window.arena());
  await p.evaluate(V => V.forEach((v, i) => window.place('c' + i, v, 0, 0, 0)), VARS);
  const speeds = await p.evaluate(n => Array.from({ length: n }, (_, i) => window.speedOf('c' + i, 'walk')), VARS.length);
  const runSpeeds = await p.evaluate(n => Array.from({ length: n }, (_, i) => window.speedOf('c' + i, 'run')), VARS.length);
  const frames = simulate(speeds, runSpeeds);
  if (START === 0) fs.writeFileSync('tripo/life_plan.json', JSON.stringify(frames.filter((_, i) => i % 24 === 0).map(f => f.map(c => c.s))));
  fs.mkdirSync('tripo/life', { recursive: true });
  for (let f = START; f < END; f++) {
    const t = f / FPS, fr = frames[f]; const poses = {};
    await p.evaluate(fr => fr.forEach((c, i) => window.move('c' + i, c.x, c.z, c.yaw)), fr);
    fr.forEach((c, i) => (poses['c' + i] = c.s));
    const k = t / T, a = -0.15 + k * 0.3;
    await p.evaluate(([poses, t, cam, tgt]) => window.frame(poses, t, cam, tgt, 44), [poses, t, [Math.sin(a) * 7.0, 4.6, Math.cos(a) * 7.0], [0, 0.2, 0.2]]);
    await p.screenshot({ path: `tripo/life/f${String(f).padStart(4, '0')}.png` });
  }
  await b.close(); srv.kill();
})();
