// (Navegador) Pré-visualização de áudio com Howler: toca a trilha e os cues junto com a
// cena em tempo real (para revisão no navegador). O áudio FINAL do vídeo não passa por
// aqui: ele é montado offline pelo FFmpeg (src/audio/mix.mjs), com tempo exato.
const H = () => window.Howl;

export function createAudioPreview({ bed, cues = [], sounds = {} } = {}) {
  const Howl = H();
  const howls = Object.fromEntries(Object.entries(sounds).map(([k, src]) => [k, new Howl({ src: [src], preload: true })]));
  const music = bed ? new Howl({ src: [bed.src], loop: true, volume: bed.volume ?? 0.5 }) : null;
  let fired = new Set();
  return {
    howls,
    start() { music?.play(); fired = new Set(); },
    stop() { music?.stop(); Object.values(howls).forEach((h) => h.stop()); },
    // Chame a cada quadro com o tempo da cena: dispara os cues que passaram.
    update(t) {
      cues.forEach((c, i) => { if (!fired.has(i) && t >= c.t) { fired.add(i); const h = howls[c.sound]; if (h) { h.volume(c.gain ?? 1); h.play(); } } });
    },
  };
}

// Toca um arquivo e resolve quando terminar (usado no teste de áudio).
export function playOnce(src, { volume = 1, format } = {}) {
  const Howl = H();
  return new Promise((resolve, reject) => {
    const events = [];
    const h = new Howl({
      src: [src], volume, html5: false, format: format ? [format] : undefined,
      onload: () => { events.push('load'); h.play(); },
      onplay: () => events.push('play'),
      onend: () => { events.push('end'); resolve({ events, duration: h.duration(), state: h.state(), ctx: window.Howler.ctx?.state }); },
      onloaderror: (_, e) => reject(new Error('loaderror: ' + e)),
      onplayerror: (_, e) => reject(new Error('playerror: ' + e)),
    });
  });
}
