// (Navegador) Medições por quadro que alimentam as verificações automáticas.
import * as THREE from 'three';

const v = new THREE.Vector3(); const box = new THREE.Box3();
// Posição na tela em coordenadas normalizadas (-1..1); z > 1 = atrás da câmera.
export function ndc(objOrVec, camera) {
  if (objOrVec.isObject3D) objOrVec.getWorldPosition(v); else v.copy(objOrVec);
  v.project(camera); return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
}
// precise=true usa os vértices reais (a caixa de um objeto girado não fica inflada).
export function minY(obj) { obj.updateWorldMatrix(true, true); box.setFromObject(obj, true); return +box.min.y.toFixed(4); }
export const vec = (o) => { o.getWorldPosition(v); return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]; };
