// three-mesh-bvh: raycast acelerado em malhas grandes (terreno, cenários).
// Usado para medir a altura do chão sob os pés, colocar objetos sobre superfícies
// irregulares e detectar se algo atravessou o cenário (verificação de contato).
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

let enabled = false;
export function enableBVH() {
  if (enabled) return;
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  enabled = true;
}

export function prepareSurface(mesh) { enableBVH(); mesh.geometry.computeBoundsTree(); return mesh; }

const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
const DOWN = new THREE.Vector3(0, -1, 0);
// Altura da superfície abaixo do ponto (x, z), ou null se não houver nada.
export function surfaceHeight(surfaces, x, z, fromY = 100) {
  ray.set(new THREE.Vector3(x, fromY, z), DOWN);
  const hit = ray.intersectObjects(Array.isArray(surfaces) ? surfaces : [surfaces], false)[0];
  return hit ? hit.point.y : null;
}
