// Whole-video timeline, cut to the narration (audio/narr/n1..n9.mp3).
// Each section starts with its narration part. Items play back to back inside the section.
//   ['anim', id, d]            -> a shot from anim_video.cjs, d seconds
//   ['fight', SEG, a, b, d]    -> fight_video.cjs segment SEG, its real time a..b stretched to d seconds (smooth slow motion: frames are re-rendered at the exact times)
//   ['black', d]
const SECTIONS = [
  { narr: 'n1', items: [['fight', 'A', 0.0, 5.0, 5.0], ['anim', '01b', 3.8], ['anim', '01c', 4.8], ['anim', '01d', 2.4], ['anim', '01e', 7.3]] },
  { narr: 'n2', items: [['anim', '02a', 2.8], ['anim', '02b', 2.3], ['anim', '02c', 2.4], ['anim', '02d', 2.9], ['anim', '02i', 3.5],
      ['fight', 'A', 3.3, 4.0, 0.7], ['fight', 'A', 4.85, 5.65, 0.8], ['fight', 'B', 0.75, 1.55, 0.8], ['fight', 'C', 1.6, 2.55, 1.3]] },
  { narr: 'n3', items: [['anim', '03a', 2.2], ['anim', '03b', 4.5], ['anim', '03c', 1.9], ['anim', '03d1', 2.0], ['anim', '03d2', 1.9], ['anim', '03e', 2.55], ['anim', '03f', 3.95]] },
  { narr: 'n4', items: [['anim', '04a', 2.3], ['anim', '04s', 3.7], ['anim', '04c', 3.5], ['anim', '04b', 3.5]] },
  { narr: 'n5', items: [['anim', '05z', 1.5], ['anim', '05r', 1.5], ['anim', '05s', 1.3], ['anim', '05c', 1.4], ['anim', '05a', 2.8], ['anim', '05b', 2.6], ['anim', '05d', 4.9], ['anim', '05e', 2.2]] },
  { narr: 'n6', items: [['anim', '06a', 3.2], ['anim', '06b', 2.6], ['anim', '06c', 1.7], ['anim', '06d', 2.0]] },
  { narr: 'n7', items: [['anim', '07a', 3.56], ['fight', 'C', 0.0, 2.55, 4.74], ['fight', 'C', 2.55, 5.98, 3.2], ['fight', 'C', 5.98, 8.03, 4.0], ['fight', 'C', 8.03, 9.0, 1.5],
      ['anim', '07e', 3.6], ['fight', 'C', 9.0, 11.0, 2.4], ['fight', 'C', 11.0, 12.0, 2.0], ['anim', '07f', 2.0], ['fight', 'C', 11.9, 13.4, 2.0], ['anim', '07g', 2.5]] },
  { narr: 'n8a', items: [['fight', 'C', 13.0, 13.9, 1.8], ['fight', 'C', 13.9, 14.95, 2.1], ['fight', 'C', 14.95, 15.5, 1.6], ['fight', 'C', 15.5, 16.4, 1.4], ['fight', 'C', 16.4, 17.35, 1.7],
      ['fight', 'C', 17.35, 18.95, 2.6], ['fight', 'S', 0.0, 2.5, 2.5], ['fight', 'K', 0.0, 4.9, 4.9]] },
  { narr: 'n8b', items: [['fight', 'C', 21.05, 25.0, 4.0], ['fight', 'C', 25.0, 26.3, 1.2], ['anim', '08b', 1.6], ['anim', '08c', 3.1]] },
  { narr: 'n9', items: [['anim', '09a', 3.8], ['anim', '09b', 1.2], ['anim', '09c', 4.4], ['anim', '09d', 2.6], ['black', 1.0]] },
];
const FPS = 24;
// flatten: every item gets its start time in the video, its frame count and (for fights) the source time of each frame
function build() {
  let t = 0; const out = [], narr = [];
  for (const S of SECTIONS) { narr.push([S.narr, t]);
    for (const it of S.items) { const d = it[0] === 'fight' ? it[4] : it[it.length - 1], n = Math.round(d * FPS);
      const o = { kind: it[0], start: t, n, d: n / FPS };
      if (it[0] === 'anim') o.id = it[1];
      if (it[0] === 'fight') { o.seg = it[1]; o.times = Array.from({ length: n }, (_, i) => it[2] + (it[3] - it[2]) * i / n); o.key = `${it[1]}_${it[2]}_${it[3]}_${n}`; }
      out.push(o); t += n / FPS; } }
  return { items: out, narr, total: t };
}
module.exports = { SECTIONS, FPS, build };
