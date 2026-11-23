// Storyboard: one still per moment of the script, rendered in the real scenarios with the real characters.
// usage: node storyboard.cjs [onlyScene] [port]   -> tripo/sb/<id>.png  (+ checks of what stands in front of the subject)
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const W = 540, H = 960, ONLY = process.argv[2] || '', PORT = +(process.argv[3] || 8801);
const P = Math.PI;

// helpers available in the page as window.SB
const HELPERS = `
window.SB = {
  dyn: ['boy', 'kaio', 'pen', 'penS', 'penM', 'sb', 'cRaio', 'cFogo', 'cGelo', 'cPreta'],
  async setup() {
    await window.init(); await window.loadAnimated('pen', 'ref/chickensoft_mascot.glb'); await window.loadAnimated('sb', 'ref/chickensoft_mascot.glb');
    window.chickenSkin('pen', 0xffd04d, 0xff8142, 0xff434c, true); window.dressPenosa('pen');
    window.chickenSkin('sb', 0x16131a, 0x1e1a22, 0xc8102e, true); window.dressSombra('sb');
    await window.placeKit('boy', 0, 0, 0, 1.95); await window.placeKaio('kaio', 0, 0, 0, 1.95);
    window.placeAnimated('pen', 'pen', 0, 0, 0, 0.75); window.placeAnimated('penS', 'pen', 0, 0, 0, 0.32); window.placeAnimated('penM', 'pen', 0, 0, 0, 0.48);
    window.placeAnimated('sb', 'sb', 0, 0, 0, 1.35);
    window.place('cRaio', 'raio', 0, 0, 0); window.place('cFogo', 'fogo', 0, 0, 0); window.place('cGelo', 'gelo', 0, 0, 0); window.place('cPreta', 'preta', 0, 0, 0);
    return true; },
  reset() { this.dyn.forEach(id => { window.vis(id, false); window.tilt(id, 0, 0, 0); }); window.clearShot(); ['L', 'R'].forEach(sd => { window.holdProp('boy', sd, null); window.holdProp('kaio', sd, null); }); return true; },
  put(id, x, z, ry, y = 0) { window.vis(id, true); window.pos(id, x, y, z, ry); return true; },
};`;

// each shot: scene, id, text (what the script says), setup (page JS), poses, cam, tgt, fov, chk (point that must be visible), ov (overlay)
const S = [];
const shot = (o) => S.push(o);

// ---------------- 1. GANCHO
shot({ scene: 'Arena', id: '01a', txt: '1. "Nessa cidade, galinha não é bicho de estimação. É lutadora." (luta raio x fogo)',
  setup: `SB.put('cRaio', -0.42, 0.35, P/2 + 0.5); SB.put('cFogo', 0.42, -0.35, -P/2 + 0.5); window.addFX('bolt', [[-0.2, 0.6, 0.3], [0.3, 0.5, -0.25], 0.016, 0xbfe8ff, 3, 1]);`,
  poses: { cRaio: 'fight', cFogo: 'fight' }, cam: [1.7, 0.95, 2.1], tgt: [0, 0.5, 0], fov: 46, chk: [0, 0.5, 0] });
shot({ scene: 'Street', id: '01b', txt: '1. "Todo mundo tem um ovo dourado, roxo, brilhante..." (vitrine)',
  setup: ``, poses: {}, cam: [2.3, 1.45, -7.95], tgt: [0, 1.12, -8.6], fov: 50, chk: [0, 1.0, -8.5] });
shot({ scene: 'Street', id: '01c', txt: '1. "O meu eu achei no lixo: pequeno, rachado e sem cor nenhuma."',
  setup: ``, poses: {}, cam: [-6.1, 0.9, -16.4], tgt: [-6.7, 0.25, -18.6], fov: 46, chk: [-6.75, 0.12, -18.35] });
shot({ scene: 'Street', id: '01d', txt: '1. "Ninguém quis. Eu quis." (o menino pega o ovo)',
  setup: `SB.put('boy', -6.62, -17.72, P); window.hideNamed('grayEgg'); window.holdProp('boy', 'R', 'grayEgg', [0.1], [0, -0.2, 0.04]);`,
  camJS: `(() => { const h = new window.THREE_V(); window.__hand('boy', 'R', h); return [[h.x + 1.0, h.y + 0.75, h.z - 1.7], [h.x - 0.1, h.y + 0.05, h.z - 0.1]]; })()`, poses: { boy: ['pickup', { mouth: 'smile' }] }, cam: [-4.75, 1.0, -18.45], tgt: [-6.55, 0.55, -17.95], fov: 50, chk: [-6.6, 0.6, -17.95] });
shot({ scene: 'Arena', id: '01e', txt: '1. "Dele nasceu a minha galinha: 347 lutas... 347 derrotas."',
  setup: `SB.put('pen', 0.15, 0.9, 0.9); window.tilt('pen', 0, 1.45, 0.2); window.addFX('dizzy', [0.14], [0.55, 0.42, 0.95]); SB.put('cRaio', -0.45, -0.1, 0.5);`,
  poses: { pen: ['idle', { face: 'sad' }], cRaio: 'flap' }, cam: [0.25, 1.0, 2.7], tgt: [0, 2.0, -7.8], fov: 70, chk: [0.3, 0.25, 0.9] });

// ---------------- 2. REGRAS
shot({ scene: 'Street', id: '02a', txt: '2. "O ovo choca..." (ovo brilhando e rachando)',
  setup: `window.addFX('nestBox', ['dourado', 0.45, 0.11], [-1.6, 0, -5.2], [0, 0.3, 0]);`,
  poses: {}, cam: [-1.1, 0.62, -4.25], tgt: [-1.6, 0.42, -5.2], fov: 45, chk: [-1.6, 0.4, -5.2] });
shot({ scene: 'Arena', id: '02b', txt: '2. "...a galinha treina..." (galinha no saco de pancada)',
  setup: `window.addFX('miniBag', [0.95], [2.05, 0, 0.6], [0, -0.2, 0]); SB.put('cFogo', 1.45, 0.75, 1.35);`,
  poses: { cFogo: 'fight' }, cam: [1.55, 0.8, 2.6], tgt: [1.8, 0.5, 0.7], fov: 48, chk: [1.6, 0.45, 0.75] });
shot({ scene: 'Arena', id: '02c', txt: '2. "Ganhou, leva troféu e dinheiro." (+100 TROFÉUS)', ov: 'trofeus',
  setup: `SB.put('cRaio', -0.2, 1.4, 0.3); window.addFX('trophy', [0.9], [0.45, 0, 1.6]);`,
  poses: { cRaio: 'flap' }, cam: [0.3, 1.0, 3.6], tgt: [0, 0.9, 0.5], fov: 55, chk: [-0.2, 0.5, 1.4] });
shot({ scene: 'Arena', id: '02d', txt: '2. "Perdeu, volta pra casa de bico baixo."',
  setup: `SB.put('cPreta', 0.2, 2.2, P * 0.9);`, poses: { cPreta: 'sit' }, cam: [-0.9, 0.75, 4.3], tgt: [0.1, 0.4, 2.1], fov: 42, chk: [0.2, 0.4, 2.2] });
shot({ scene: 'Arena', id: '02e', txt: '2. Poder: RAIO', setup: `SB.put('cRaio', -0.45, 0, P/2); window.addFX('bolt', [[-0.1, 0.62, 0], [1.1, 0.3, 0], 0.022, 0xbfe8ff, 5, 2]); window.addFX('dust', [8, 0.3, 0.4], [1.1, 0, 0]);`,
  poses: { cRaio: 'fight' }, cam: [0.55, 0.85, 2.6], tgt: [0.25, 0.5, 0], fov: 50, chk: [-0.45, 0.5, 0] });
shot({ scene: 'Arena', id: '02f', txt: '2. Poder: FOGO', setup: `SB.put('cFogo', -0.45, 0, P/2); window.addFX('flameCone', [1.3, 0.28], [-0.05, 0.58, 0], [0, P/2, 0]);`,
  poses: { cFogo: 'fight' }, cam: [0.55, 0.85, 2.6], tgt: [0.25, 0.5, 0], fov: 50, chk: [-0.45, 0.5, 0] });
shot({ scene: 'Arena', id: '02g', txt: '2. Poder: GELO', setup: `SB.put('cGelo', -0.45, 0, P/2); window.addFX('iceShards', [10, 0.4], [-0.05, 0.58, 0], [0, P/2, 0]);`,
  poses: { cGelo: 'fight' }, cam: [0.55, 0.85, 2.6], tgt: [0.25, 0.5, 0], fov: 50, chk: [-0.45, 0.5, 0] });
shot({ scene: 'Arena', id: '02h', txt: '2. Poder: ENERGIA ROXA', setup: `SB.put('cPreta', -0.45, 0, P/2); window.addFX('energyBall', [0.2], [0.85, 0.6, 0]); window.addFX('trail', [[0.0, 0.62, 0], [0.7, 0.6, 0], 0.16]);`,
  poses: { cPreta: 'fight' }, cam: [0.55, 0.85, 2.6], tgt: [0.25, 0.5, 0], fov: 50, chk: [-0.45, 0.5, 0] });

// ---------------- 3. A GALINHA MAIS FRACA
shot({ scene: 'House', id: '03a', txt: '3. "O ovo demorou um mês pra chocar."',
  setup: `window.hideNamed('grayEgg'); window.addFX('hatchEgg', ['gray', 0.085, 0.12], [-4.3, 0.272, -1.5]);`,
  poses: {}, cam: [-3.55, 0.72, -0.65], tgt: [-4.3, 0.38, -1.5], fov: 40, chk: [-4.3, 0.38, -1.5] });
shot({ scene: 'House', id: '03b', txt: '3. "Saiu uma galinha do tamanho de um limão. Dei o nome de Penosa."',
  setup: `window.hideNamed('grayEgg'); window.addFX('hatchEgg', ['gray', 0.12, 1.0], [-4.3, 0.21, -1.5]); SB.put('penS', -4.3, -1.45, 0.4, 0.27);`,
  poses: { penS: ['idle', { face: 'sleepy' }] }, cam: [-3.7, 0.72, -0.55], tgt: [-4.3, 0.42, -1.5], fov: 40, chk: [-4.3, 0.42, -1.45] });
shot({ scene: 'House', id: '03c', txt: '3. "Poder: dormir."', ov: 'dormir',
  setup: `SB.put('penM', 0.2, 2.4, 0.5); window.addFX('zzz', [0.06], [0.32, 0.55, 2.4]);`,
  poses: { penM: ['idle', { face: 'sleep' }] }, cam: [0.75, 0.55, 3.4], tgt: [0.25, 0.4, 2.4], fov: 42, chk: [0.2, 0.3, 2.4] });
shot({ scene: 'Arena', id: '03d', txt: '3. "Na primeira luta, ela dormiu. Na segunda, também."',
  setup: `SB.put('pen', 0.45, 0.55, -0.6); SB.put('cRaio', -0.7, -0.2, 0.9); window.addFX('zzz', [0.07], [0.6, 0.85, 0.55]);`,
  poses: { pen: ['idle', { face: 'sleep' }], cRaio: 'fight' }, cam: [0.9, 0.75, 2.5], tgt: [-0.05, 0.5, 0.2], fov: 48, chk: [0.45, 0.4, 0.55] });
shot({ scene: 'Arena', id: '03e', txt: '3. "Na terceira, perdeu pra uma minhoca."',
  setup: `SB.put('pen', 0.5, 3.6, P); window.addFX('worm', [0.85], [0.5, 0, 2.95], [0, 0, 0]); window.addFX('dust', [10, 0.25, 0.3], [0.5, 0, 3.9]);`,
  poses: { pen: ['butt_slide', { face: 'surprised' }] }, cam: [1.9, 0.55, 2.5], tgt: [0.45, 0.25, 3.2], fov: 46, chk: [0.5, 0.15, 3.0] });
shot({ scene: 'ArenaRindo', id: '03f', txt: '3. "A cidade inteira riu. Principalmente o Kaio."',
  setup: `SB.put('kaio', 0, -5.75, 0.35); SB.put('sb', -1.1, -5.45, 0.5);`,
  poses: { kaio: ['laugh', { mouth: 'happy' }], sb: ['idle', { face: 'meanLaugh', talk: true }] }, cam: [2.0, 1.5, -4.75], tgt: [-0.3, 1.5, -6.0], fov: 60, chk: [0, 1.5, -5.75] });

// ---------------- 4. O RIVAL
shot({ scene: 'Arena', id: '04a', txt: '4. "O Kaio é o campeão da arena. A Sombra nunca perdeu uma luta."',
  setup: `SB.put('kaio', -1.9, -3.4, 0.2); SB.put('sb', -0.75, -3.0, -0.3);`,
  poses: { kaio: 'cross', sb: ['idle', { face: 'mean', sparks: 0.8 }] }, cam: [-0.6, 1.4, 0.6], tgt: [-1.6, 1.2, -4.2], fov: 52, chk: [-1.9, 1.3, -3.4] });
shot({ scene: 'Street', id: '04b', txt: '4. "Ele me deu um apelido: o menino do lixo."',
  setup: `SB.put('kaio', -6.0, -10.4, 2.3); SB.put('boy', -5.0, -11.3, -0.84);`,
  poses: { kaio: ['laugh', { mouth: 'happy' }], boy: 'sad' }, cam: [-3.6, 1.55, -8.4], tgt: [-5.5, 1.3, -10.85], fov: 64, chk: [-5.0, 1.2, -11.3] });

// ---------------- 5. TREINO
shot({ scene: 'HouseChuva', id: '05a', txt: '5. "Treinei a Penosa na chuva..." / "Ela correu na esteira... dormindo."',
  setup: `SB.put('penM', -2.8, 1.6, 0.3, 0.22); SB.put('boy', -4.0, 2.4, 1.5); window.addFX('zzz', [0.08], [-2.7, 0.75, 1.6]);`,
  poses: { penM: ['run', { face: 'sleep' }], boy: ['point', { mouth: 'talk' }] }, cam: [-1.1, 1.35, 4.0], tgt: [-3.0, 0.75, 1.8], fov: 52, chk: [-2.8, 0.45, 1.6] });
shot({ scene: 'House', id: '05b', txt: '5. "...no sol..." / "Levantou peso... dormindo."',
  setup: `SB.put('penM', 0.2, 2.6, 0.3); window.addFX('miniDumbbell', [0.42], [0.2, 0.55, 2.74], [0, 0.3, 0]); window.addFX('zzz', [0.08], [0.4, 0.75, 2.6]);`,
  poses: { penM: ['idle', { face: 'sleep' }] }, cam: [0.85, 0.65, 3.8], tgt: [0.25, 0.42, 2.6], fov: 42, chk: [0.2, 0.3, 2.6] });
shot({ scene: 'HouseNoite', id: '05c', txt: '5. "...de madrugada."',
  setup: `window.addFX('miniBag', [0.95], [1.0, 0, 2.6]); SB.put('penM', 0.62, 2.85, 0.6); SB.put('boy', -0.3, 2.5, 1.3); window.addFX('zzz', [0.08], [0.75, 0.6, 2.85]);`,
  poses: { penM: ['idle', { face: 'sleep' }], boy: ['idle', { mouth: 'neutral' }] }, cam: [2.7, 1.3, 4.7], tgt: [0.6, 0.8, 2.6], fov: 54, chk: [0.62, 0.3, 2.85] });
shot({ scene: 'Arena', id: '05d', txt: '5. "100 derrotas. 200. 347."', ov: 'derrotas',
  setup: `SB.put('pen', 0.2, 0.75, 0.9); window.tilt('pen', 0, 1.45, 0.2); window.addFX('dizzy', [0.14], [0.6, 0.42, 0.8]); SB.put('cGelo', -0.55, -0.1, 0.5);`,
  poses: { pen: ['idle', { face: 'sleep' }], cGelo: 'flap' }, cam: [0.3, 1.25, 3.1], tgt: [0, 0.6, 0.3], fov: 50, chk: [0.35, 0.25, 0.75] });
shot({ scene: 'HouseNoite', id: '05e', txt: '5. "E a Penosa? Dormindo." (no colo do menino)',
  setup: `SB.put('boy', 0, -1.25, 0); SB.put('penM', 0, -0.8, 0, 0.3); window.addFX('zzz', [0.06], [0.18, 0.85, -0.8]);`,
  poses: { boy: ['sit', { mouth: 'smile' }], penM: ['idle', { face: 'sleep' }] }, cam: [0.9, 0.95, 0.9], tgt: [0, 0.65, -1.1], fov: 52, chk: [0, 0.5, -0.8] });

// ---------------- 6. O EVENTO
shot({ scene: 'City', id: '06a', txt: '6. "Até que apareceu no céu: TORNEIO LENDÁRIO"',
  setup: ``, poses: {}, cam: [0, 1.7, 10], tgt: [0, 12, -25], fov: 62, chk: [0, 20.8, -32] });
shot({ scene: 'ArenaTorneio', id: '06b', txt: '6. "o vencedor ganha o Ovo do Trovão."',
  setup: ``, poses: {}, cam: [0.9, 2.1, -5.6], tgt: [2.9, 1.75, -5.0], fov: 50, chk: [2.9, 1.85, -5.0] });
shot({ scene: 'ArenaTorneio', id: '06c', txt: '6. "E a final seria... eu contra o Kaio."',
  setup: ``, poses: {}, cam: [-2, 2.6, 0.5], tgt: [15.6, 8.4, 0], fov: 40, chk: [15.6, 8.4, 0] });

// ---------------- 7. CLÍMAX
shot({ scene: 'ArenaTorneio', id: '07a', txt: '7. "A arena lotou. Todo mundo veio ver a Penosa apanhar."',
  setup: `SB.put('pen', 0, 1.3, P); SB.put('sb', 0, -1.4, 0); SB.put('boy', 0, 5.8, P); SB.put('kaio', 0, -5.8, 0);`,
  poses: { pen: ['idle', { face: 'sleepy' }], sb: ['idle', { face: 'mean', sparks: 0.6 }], boy: 'idle', kaio: 'cross' }, cam: [0, 14, 9.5], tgt: [0, 0, -2.5], fov: 55, chk: [0, 0.4, 0] });
shot({ scene: 'ArenaTorneio', id: '07b', txt: '7. "A Sombra atacou: uma bola de energia roxa direto nela."',
  setup: `SB.put('sb', -0.3, -1.3, 0.2); SB.put('pen', 0.15, 1.0, P + 0.2); window.addFX('energyBall', [0.2], [0, 0.6, 0.15]); window.addFX('trail', [[-0.25, 0.75, -0.8], [-0.02, 0.62, 0.02], 0.17]);`,
  poses: { sb: ['idle', { face: 'meanRage', sparks: 1 }], pen: ['idle', { face: 'surprised' }] }, cam: [1.9, 0.85, 2.6], tgt: [-0.1, 0.65, -0.3], fov: 56, chk: [0, 0.6, 0.15] });
shot({ scene: 'ArenaTorneio', id: '07c', txt: '7. "A Penosa voou longe... e bateu na grade."',
  setup: `SB.put('pen', 0.1, 4.15, P * 0.9); window.tilt('pen', 0.35, -1.3, 0.18); window.addFX('dizzy', [0.14], [-0.3, 0.45, 4.2]); window.addFX('dust', [16, 0.5, 0.5], [0.1, 0, 4.35]);`,
  poses: { pen: ['idle', { face: 'sad' }] }, cam: [1.7, 0.7, 2.4], tgt: [0.1, 0.5, 4.1], fov: 50, chk: [0.1, 0.4, 4.1] });
shot({ scene: 'ArenaTorneio', id: '07d', txt: '7. "E pela primeira vez em 347 lutas... ela abriu os olhos."',
  setup: `SB.put('pen', 0, 3.9, P);`, t: 1.7, poses: { pen: ['idle', { face: 'surprised' }] }, cam: [0.0, 0.62, 2.2], tgt: [0, 0.5, 3.9], fov: 34, chk: [0, 0.56, 3.9] });
shot({ scene: 'ArenaTorneio', id: '07e', txt: '7. "A casca rachada que ela tinha na barriga começou a brilhar. O cinza caiu como poeira."',
  setup: `SB.put('pen', 0, 3.9, P); window.addFX('grayDust', [50, 0.45], [0, 0.05, 3.9]);`, t: 0.25,
  poses: { pen: ['idle', { face: 'power', evo: 0.35, breakT: 0.1 }] }, cam: [0.9, 0.75, 2.8], tgt: [0, 0.5, 3.9], fov: 46, chk: [0, 0.45, 3.9] });
shot({ scene: 'ArenaTorneio', id: '07f', txt: '7. "E por baixo... ela era dourada, com olhos de fogo."',
  setup: `SB.put('pen', 0, 3.6, P);`, t: 2.0, poses: { pen: ['idle', { face: 'power', evo: 1, breakT: 0 }] }, cam: [1.2, 0.85, 2.3], tgt: [0, 0.6, 3.6], fov: 46, chk: [0, 0.6, 3.6] });
shot({ scene: 'ArenaTorneio', id: '07g', txt: '7. "Ela soltou um cocoricó... e um trovão rasgou a arena."',
  setup: `SB.put('pen', 0, 3.4, P); window.addFX('skyBolt', [0, 3.4, 18, 0.12]); window.addFX('flash', [4], [0, 1.0, 3.4]);`, t: 2.0,
  poses: { pen: ['jump', { face: 'power', evo: 1, breakT: 0, talk: true }] }, cam: [0, 3.2, -3.2], tgt: [0, 2.2, 3.4], fov: 62, chk: [0, 0.6, 3.4] });

// ---------------- 8. RECOMPENSA
shot({ scene: 'ArenaTorneio', id: '08a', txt: '8. "A Sombra saiu correndo. O Kaio também."',
  setup: `SB.put('sb', 1.3, -2.8, P + 0.4); SB.put('kaio', -0.4, -5.8, 0.2); window.addFX('dust', [10, 0.4, 0.5], [1.1, 0, -2.3]);`,
  poses: { sb: ['run', { face: 'surprised', sparks: 0.1 }], kaio: 'fallBack' }, cam: [-0.2, 1.3, 0.9], tgt: [0.3, 0.9, -4.4], fov: 55, chk: [-0.4, 0.8, -5.8] });
shot({ scene: 'ArenaTorneio', id: '08b', txt: '8. "348 lutas. A primeira vitória." (placar 1 – 347)',
  setup: `window.setBoard([{ t: 'TORNEIO LENDÁRIO', size: 0.15, y: 0.17, color: '#ffe27a', glow: '#ffb000' }, { t: 'VITÓRIAS  x  DERROTAS', size: 0.1, y: 0.38, color: '#cfe2ff' }, { t: '1  –  347', size: 0.32, y: 0.68, color: '#4aff7a', glow: '#20ff40' }]);`,
  poses: {}, cam: [0, 1.25, 3.4], tgt: [0, 4.6, -13], fov: 64, chk: [0, 9.5, -16.6] });
shot({ scene: 'ArenaTorneio', id: '08c', txt: '8. "O Ovo do Trovão era meu."',
  setup: `SB.put('boy', 0, 1.4, 0); SB.put('pen', 0.75, 1.65, -0.3); window.holdProp('boy', 'R', 'thunderEgg', [0.24], [-0.22, 0.12, 0]); window.addFX('dust', [0, 0, 0]);`, t: 2.0,
  poses: { boy: ['holdUp', { mouth: 'happy' }], pen: ['jump', { face: 'happy', evo: 1, breakT: 0 }] }, cam: [0.4, 1.05, 4.2], tgt: [0.3, 1.55, 1.4], fov: 58, chk: [0, 1.4, 1.4] });

// ---------------- 9. FINAL
shot({ scene: 'Bedroom', id: '09a', txt: '9. "Naquela noite, a Penosa dormiu em cima do troféu."',
  setup: `SB.put('penM', -0.8, -2.12, 0.5, 1.44); window.addFX('zzz', [0.07], [-0.65, 1.95, -2.1]);`,
  poses: { penM: ['idle', { face: 'sleep' }] }, cam: [0.25, 1.55, -0.55], tgt: [-0.75, 1.45, -2.15], fov: 50, chk: [-0.8, 1.6, -2.12] });
shot({ scene: 'BedroomDia', id: '09b', txt: '9. "E de manhã..."',
  setup: `SB.put('penM', -0.8, -2.12, 0.5, 1.44);`, poses: { penM: ['idle', { face: 'awake' }] }, cam: [1.2, 1.7, 2.3], tgt: [-0.6, 1.2, -1.6], fov: 62, chk: [-0.8, 1.6, -2.12] });
shot({ scene: 'BedroomDia', id: '09c', txt: '9. "...ela botou um ovo. Pequeno. Rachado. E cinza."',
  setup: `SB.put('penM', -1.02, -2.25, 0.9, 1.44); window.addFX('grayEgg', [0.045], [-0.72, 1.47, -2.08], [0, 0, 0.2]); window.addFX('sparkle', [0.12], [-0.7, 1.59, -2.04]);`,
  poses: { penM: ['idle', { face: 'happy' }] }, cam: [-0.25, 1.72, -1.25], tgt: [-0.8, 1.5, -2.1], fov: 40, chk: [-0.72, 1.48, -2.08] });

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  fs.mkdirSync('tripo/sb', { recursive: true }); const report = {};
  const scenes = [...new Set(S.map(s => s.scene))].filter(s => !ONLY || ONLY.split(',').includes(s));
  for (const sc of scenes) {
    const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', sc, e.message));
    await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
    await p.evaluate(HELPERS); await p.evaluate(() => window.filmLook());
    await p.evaluate((n) => window.buildScene(n), sc); await p.evaluate(() => window.SB.setup()); await p.evaluate(() => window.populate());
    for (const o of S.filter(s => s.scene === sc)) {
      try {
        await p.evaluate(`(async () => { const P = Math.PI; window.SB.reset(); ${o.setup} })()`);
        const T0 = (S.indexOf(o) + 1) * 20, t = T0 + (o.t ?? 1.0);   // every shot lives in its own time window: no blending from the previous pose
        const poses = JSON.parse(JSON.stringify(o.poses)); for (const v of Object.values(poses)) if (Array.isArray(v) && v[1] && v[1].breakT != null) v[1].breakT += T0;
        await p.evaluate(([poses, t, cam, tgt, fov]) => window.frame(poses, t - 0.5, cam, tgt, fov), [poses, t, o.cam, o.tgt, o.fov]);   // settle the pose change
        if (o.camJS) { const r = await p.evaluate(o.camJS); o.cam = r[0]; o.tgt = r[1]; o.chk = r[1]; }
        await p.evaluate(([poses, t, cam, tgt, fov]) => window.frame(poses, t, cam, tgt, fov), [poses, t, o.cam, o.tgt, o.fov]);
        await p.screenshot({ path: `tripo/sb/${o.id}.png`, timeout: 180000 });
        report[o.id] = { txt: o.txt, ov: o.ov || null, blockers: await p.evaluate(([c, k]) => window.blockers(c, k), [o.cam, o.chk]) };
        console.log(o.id, JSON.stringify(report[o.id].blockers));
      } catch (e) { console.log('FAIL', o.id, e.message.split('\n')[0]); }
    }
    await p.close();
  }
  const old = fs.existsSync('tripo/sb/report.json') ? JSON.parse(fs.readFileSync('tripo/sb/report.json')) : {};
  fs.writeFileSync('tripo/sb/report.json', JSON.stringify({ ...old, ...report }, null, 1));
  await b.close(); srv.kill();
})();
