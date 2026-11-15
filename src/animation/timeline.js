// Linha do tempo determinística com GSAP.
// A timeline fica pausada e é posicionada com seek(t) a cada quadro: o quadro N
// sempre mostra o mesmo estado, independentemente de quanto tempo o render leva.
import { gsap } from 'gsap';

export function createTimeline() {
  const tl = gsap.timeline({ paused: true });
  return {
    gsap,
    tl,
    // Anima propriedades de um objeto: to(obj, { x: 2, duration: 1, ease: 'power2.inOut' }, 0.5)
    to: (target, vars, at = 0) => tl.to(target, vars, at),
    fromTo: (target, from, to, at = 0) => tl.fromTo(target, from, { ...to }, at),
    set: (target, vars, at = 0) => tl.set(target, vars, at),
    call: (fn, at) => tl.call(fn, [], at),
    seek: (t) => tl.seek(t, false),
    duration: () => tl.duration(),
  };
}

// Atalhos de animação de objetos, prontos para uso nas cenas.
export const objectMoves = {
  moveTo: (tl, obj, pos, at, duration = 1, ease = 'power2.inOut') =>
    tl.to(obj.position, { ...pos, duration, ease }, at),
  rotateTo: (tl, obj, rot, at, duration = 1, ease = 'power2.inOut') =>
    tl.to(obj.rotation, { ...rot, duration, ease }, at),
  pop: (tl, obj, at, duration = 0.4) =>
    tl.fromTo(obj.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration, ease: 'back.out(2)' }, at),
  bounce: (tl, obj, at, height = 0.5, duration = 0.6) =>
    tl.to(obj.position, { y: `+=${height}`, duration: duration / 2, ease: 'power2.out', yoyo: true, repeat: 1 }, at),
};
