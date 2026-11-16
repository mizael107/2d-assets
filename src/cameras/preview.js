// Controle de câmera interativo (camera-controls) para pré-visualizar e enquadrar cenas.
// No render final use o diretor (director.js), que é determinístico; aqui é para testes
// manuais ou para descobrir um enquadramento e copiar os números para o diretor.
import * as THREE from 'three';
import CameraControls from 'camera-controls';

let installed = false;
export function createPreviewControls(camera, domElement) {
  if (!installed) { CameraControls.install({ THREE }); installed = true; }
  const controls = new CameraControls(camera, domElement);
  controls.smoothTime = 0.35;
  return {
    controls,
    // Transição suave até um enquadramento (avance com controls.update(dt)).
    goTo: (pos, look, animate = true) => controls.setLookAt(...pos, ...look, animate),
    // Enquadramento atual em formato pronto para o diretor.
    snapshot: () => {
      const p = controls.getPosition(new THREE.Vector3()), l = controls.getTarget(new THREE.Vector3());
      return { pos: p.toArray().map((n) => +n.toFixed(3)), look: l.toArray().map((n) => +n.toFixed(3)), fov: camera.fov };
    },
  };
}
