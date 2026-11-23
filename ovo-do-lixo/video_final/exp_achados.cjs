const { chromium } = require('playwright'); const fs = require('fs'); const { spawn } = require('child_process');
const DIR = process.argv[2], OUT = __dirname + '/ref/achados/';
const jobs = [
  ['index_thief.html', 'leo=2&lia=2&rita=2&arm=2&cop=2&sis=2&afr=2&gir=2&wom=2&thief=2&doc=2', { __LEO: 'leo', __LIA: 'lia', __RITA: 'rita', __ARM2: 'armando', __COP2: 'policial', __SIS2: 'bia', __AFR2: 'afro', __GIR2: 'menina', __WOM2: 'mulher', __THIEF2: 'ladrao', __DOC2: 'medico' }],
  ['index_thief.html', 'sis=1', { __SIS1: 'duda' }],
  ['index_sisb.html', 'sis=1', { __SIS1: 'irma_loira' }],
  ['index_bob.html', 'bob=2', { __BOB2: 'bob' }], ['index_boy.html', 'boy=2', { __BOY2: 'menino_bone' }],
  ['index_gramps.html', 'gramps=2', { __GRAMPS2: 'vovo' }], ['index_nyx.html', 'nyx=2', { __NYX2: 'mae_preto' }],
];
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8768'], { cwd: DIR, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [page, q, map] of jobs) {
    const pg = await br.newPage({ viewport: { width: 270, height: 480 } }); pg.on('pageerror', e => console.log('[err]', e.message));
    await pg.goto(`http://localhost:8768/${page}?q=0.5&sm=512&aa=0&test=1&${q}`); await pg.waitForFunction('window.glReady', null, { timeout: 180000 });
    for (const [k, name] of Object.entries(map)) {
      const b64 = await pg.evaluate(async (k) => { const h = window[k]; if (!h) return null; const { GLTFExporter } = await import('./lib/GLTFExporter.js');
        ['body','hip','lL','lR','kL','kR','aL','aR','eL','eR','tor','neck','fm'].forEach(k2 => { if (h[k2]) h[k2].name = 'J_' + k2; });
        const r = h.root; r.visible = true; r.position.set(0, 0, 0); r.rotation.set(0, 0, 0); r.updateMatrixWorld(true);
        r.traverse(n => { if (n.isMesh && n.material && n.material.map && n.material.map.isCanvasTexture === undefined) {} });
        const ab = await new GLTFExporter().parseAsync(r, { binary: true, onlyVisible: true }); let s = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }, k);
      if (!b64) { console.log('missing', k); continue; } fs.writeFileSync(OUT + name + '.glb', Buffer.from(b64, 'base64')); console.log('ok', name, Math.round(b64.length * 0.75 / 1024) + 'KB');
    }
    await pg.close();
  }
  await br.close(); srv.kill();
})();
