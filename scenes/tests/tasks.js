// (Navegador) Verificações que rodam dentro do Chromium, chamadas por scripts/studio-tests.mjs.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createPreviewControls } from '@studio/cameras/preview.js';
import { createHumanoid } from '@studio/characters/humanoid.js';
import { motions } from '@studio/animation/motions.js';
import { loadCharacter } from '@studio/characters/loader.js';
import { playOnce } from '@studio/audio/preview.js';
import { prepareSurface, surfaceHeight } from '@studio/physics/bvh.js';

// camera-controls: transição suave até um enquadramento.
export async function cameraControls() {
  const cam = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 100); cam.position.set(0, 1.6, 8);
  const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  const pc = createPreviewControls(cam, canvas);
  pc.controls.setLookAt(0, 1.6, 8, 0, 1, 0, false); pc.controls.update(0);
  const start = cam.position.toArray();
  pc.goTo([4, 3, 4], [0, 1, 0], true);
  const path = [];
  for (let i = 0; i < 90; i++) { pc.controls.update(1 / 30); if (i % 15 === 0) path.push(cam.position.toArray().map((n) => +n.toFixed(2))); }
  return { start, end: cam.position.toArray().map((n) => +n.toFixed(3)), path, snapshot: pc.snapshot() };
}

// Exporta o humanoide com todos os movimentos como GLB (base64).
export async function exportHumanoid() {
  const ch = createHumanoid({ name: 'boneco_base' });
  const clips = [motions.idle(), motions.walk(), motions.run(), motions.jump(), motions.fall(), motions.wave(), motions.panic(), motions.cast()];
  const scene = new THREE.Scene(); scene.add(ch.root); ch.root.updateMatrixWorld(true);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips });
  let bin = ''; const bytes = new Uint8Array(glb);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { base64: btoa(bin), bytes: bytes.length, clips: clips.map((c) => `${c.name} (${c.duration.toFixed(2)}s)`) };
}

// Carrega um GLB pelo loader do estúdio (GLTFLoader + plugin VRM) e toca a caminhada.
export async function loadAndPlay(url) {
  const r = await loadCharacter(url);
  let skinned = 0, bones = 0, meshes = 0; const skels = new Set();
  r.scene.traverse((o) => { if (o.isSkinnedMesh) { skinned++; skels.add(o.skeleton.bones.map((b) => b.uuid).join()); bones = Math.max(bones, o.skeleton.bones.length); } if (o.isMesh) meshes++; });
  const target = r.scene.getObjectByProperty('type', 'SkinnedMesh');
  const mixer = new THREE.AnimationMixer(target ?? r.scene);
  const clip = r.animations.find((a) => a.name === 'andar');
  const thigh = r.scene.getObjectByName('thigh_L');
  const angle = () => +new THREE.Euler().setFromQuaternion(thigh.quaternion).x.toFixed(3);
  const a = mixer.clipAction(clip); a.play(); mixer.setTime(0); const x0 = angle(); mixer.setTime(clip.duration / 4); const x1 = angle();
  return { vrm: !!r.vrm, skinned, bones, skeletons: skels.size, meshes, animations: r.animations.map((a) => a.name), thighAt0: x0, thighAtQuarter: x1 };
}

export async function vrmAvailable() {
  const m = await import('@pixiv/three-vrm');
  return { VRMLoaderPlugin: typeof m.VRMLoaderPlugin, expressionPresets: Object.values(m.VRMExpressionPresetName ?? {}), humanBones: Object.keys(m.VRMHumanBoneName ?? {}).length };
}

export const howler = (url) => playOnce(url);

// MediaPipe: verifica o WASM e tenta criar o FaceLandmarker (precisa do modelo .task).
export async function mediapipe(modelPath) {
  const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks('/node_modules/@mediapipe/tasks-vision/wasm');
  const wasm = await fetch('/node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm');
  const compiled = await WebAssembly.compile(await wasm.arrayBuffer()).then(() => true, (e) => String(e));
  let landmarker = null;
  try { const lm = await FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: modelPath, delegate: 'CPU' }, runningMode: 'IMAGE', outputFaceBlendshapes: true }); landmarker = 'criado'; lm.close(); }
  catch (e) { landmarker = 'falhou: ' + String(e.message || e).slice(0, 160); }
  return { fileset: !!fileset.wasmBinaryPath, wasmHttp: wasm.status, wasmCompiles: compiled, landmarker };
}

// lil-gui + stats.js num render real.
export async function debugTools() {
  const { GUI } = await import('lil-gui');
  const renderer = new THREE.WebGLRenderer(); renderer.setSize(200, 200); document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(); cam.position.z = 3;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial()); scene.add(mesh);
  const params = { rotacao: 0.5, cor: '#ff8800' };
  const gui = new GUI({ title: 'Teste' }); gui.add(params, 'rotacao', 0, 3); gui.addColor(params, 'cor');
  const stats = new window.Stats(); document.body.appendChild(stats.dom);
  for (let i = 0; i < 10; i++) { stats.begin(); mesh.rotation.y = params.rotacao * i; renderer.render(scene, cam); stats.end(); }
  return { guiControllers: gui.controllersRecursive().length, guiDom: !!gui.domElement.isConnected, statsDom: !!stats.dom.isConnected, stats: typeof stats.update };
}

// three-mesh-bvh: altura do terreno sob um ponto, comparada com raycast sem BVH.
export async function bvh() {
  const g = new THREE.PlaneGeometry(100, 100, 300, 300); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 0.3) * Math.cos(p.getZ(i) * 0.2) * 2);
  g.computeVertexNormals();
  const plain = new THREE.Mesh(g.clone(), new THREE.MeshBasicMaterial());
  const accel = prepareSurface(new THREE.Mesh(g, new THREE.MeshBasicMaterial()));
  plain.updateMatrixWorld(); accel.updateMatrixWorld();
  const ray = new THREE.Raycaster(new THREE.Vector3(3.3, 50, -7.1), new THREE.Vector3(0, -1, 0));
  let t0 = performance.now(); for (let i = 0; i < 20; i++) ray.intersectObject(plain); const slowMs = (performance.now() - t0) / 20;
  const slowY = ray.intersectObject(plain)[0].point.y;
  t0 = performance.now(); let fastY = 0; for (let i = 0; i < 20; i++) fastY = surfaceHeight(accel, 3.3, -7.1); const fastMs = (performance.now() - t0) / 20;
  const expected = Math.sin(3.3 * 0.3) * Math.cos(-7.1 * 0.2) * 2;
  return { triangles: g.index.count / 3, expected: +expected.toFixed(3), slowY: +slowY.toFixed(3), fastY: +fastY.toFixed(3), slowMs: +slowMs.toFixed(3), fastMs: +fastMs.toFixed(3) };
}
