// Put the whole video together from the timeline: frames -> video, narration at each section start, music + ambience + effects.
// usage: node assemble.cjs <animDir> <fightDir> <out.mp4> [W H]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { build, FPS } = require('./timeline.cjs');
const [animDir, fightDir, outMp4] = process.argv.slice(2, 5), W = +(process.argv[5] || 720), H = +(process.argv[6] || 1280);
const B = build(), seq = path.join(__dirname, 'tripo', 'seq_' + path.basename(outMp4, '.mp4'));
fs.rmSync(seq, { recursive: true, force: true }); fs.mkdirSync(seq, { recursive: true });
const black = path.join(seq, '_black.png'); execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=black:s=${W}x${H}`, '-frames:v', '1', black]);
let k = 0, missing = 0;
const pick = (dir, i) => { for (let j = i; j >= 0; j--) { const f = path.join(dir, `f${String(j).padStart(4, '0')}.png`); if (fs.existsSync(f)) return f; } return null; };
for (const it of B.items) for (let i = 0; i < it.n; i++) {
  let src = it.kind === 'black' ? black : pick(it.kind === 'anim' ? path.join(animDir, it.id) : path.join(fightDir, it.key), i);
  if (!src) { src = black; missing++; }
  fs.symlinkSync(path.resolve(src), path.join(seq, `s${String(k++).padStart(5, '0')}.png`)); }
console.log('frames', k, 'missing', missing, 'seconds', (k / FPS).toFixed(2));
fs.writeFileSync(path.join(seq, 'narr.json'), JSON.stringify(B.narr));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(seq, 's%05d.png'), '-vf', `scale=${W}:${H}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', path.join(seq, 'video.mp4')]);
