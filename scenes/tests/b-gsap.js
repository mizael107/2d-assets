// Teste B — GSAP: esfera atravessa a cena com easing suave, depois quica e gira.
import { createTimeline, objectMoves } from '@studio/animation/timeline.js';

export default async function ({ THREE }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#1c2433');
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 100); camera.position.set(0, 1.2, 7); camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#334', 1.2)); const d = new THREE.DirectionalLight('#fff', 2); d.position.set(2, 4, 3); scene.add(d);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 16), new THREE.MeshStandardMaterial({ color: '#36c' })); ball.position.set(-1.5, 0.8, 0); scene.add(ball);
  const T = createTimeline();
  objectMoves.moveTo(T.tl, ball, { x: 1.5 }, 0, 2, 'power2.inOut');
  objectMoves.bounce(T.tl, ball, 2, 0.8, 0.6);
  objectMoves.rotateTo(T.tl, ball, { y: Math.PI * 2 }, 2.6, 0.4, 'none');
  return { scene, camera, duration: 3, update: (t) => T.seek(t), probes: () => ({ ball: [ball.position.x, ball.position.y] }) };
}
