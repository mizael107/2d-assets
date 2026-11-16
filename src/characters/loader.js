// Carregamento de personagens e animações externos: GLB/GLTF, VRM e FBX (Mixamo).
// Os arquivos precisam estar no projeto (assets/characters, assets/animations); o
// estúdio não baixa nada sozinho de serviços externos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const gltfLoader = new GLTFLoader();
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

// GLB/GLTF/VRM. Retorna { scene, animations, vrm|null }.
export async function loadCharacter(url) {
  const gltf = await gltfLoader.loadAsync(url);
  const vrm = gltf.userData.vrm ?? null;
  if (vrm) { VRMUtils.removeUnnecessaryVertices(gltf.scene); VRMUtils.combineSkeletons?.(gltf.scene); vrm.scene.traverse((o) => { o.frustumCulled = false; }); }
  gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { scene: vrm ? vrm.scene : gltf.scene, animations: gltf.animations, vrm, gltf };
}

// Cópia independente (vários figurantes com o mesmo modelo, cada um com seu esqueleto).
export const cloneCharacter = (scene) => SkeletonUtils.clone(scene);

// Mapa de ossos Mixamo -> ossos humanoides VRM.
export const MIXAMO_TO_VRM = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine1: 'chest', mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder', mixamorigLeftArm: 'leftUpperArm', mixamorigLeftForeArm: 'leftLowerArm', mixamorigLeftHand: 'leftHand',
  mixamorigRightShoulder: 'rightShoulder', mixamorigRightArm: 'rightUpperArm', mixamorigRightForeArm: 'rightLowerArm', mixamorigRightHand: 'rightHand',
  mixamorigLeftUpLeg: 'leftUpperLeg', mixamorigLeftLeg: 'leftLowerLeg', mixamorigLeftFoot: 'leftFoot', mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg', mixamorigRightLeg: 'rightLowerLeg', mixamorigRightFoot: 'rightFoot', mixamorigRightToeBase: 'rightToes',
};
// Mapa Mixamo -> humanoide procedural do estúdio.
export const MIXAMO_TO_STUDIO = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine2: 'chest', mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftArm: 'upperArm_L', mixamorigLeftForeArm: 'foreArm_L', mixamorigLeftHand: 'hand_L',
  mixamorigRightArm: 'upperArm_R', mixamorigRightForeArm: 'foreArm_R', mixamorigRightHand: 'hand_R',
  mixamorigLeftUpLeg: 'thigh_L', mixamorigLeftLeg: 'shin_L', mixamorigLeftFoot: 'foot_L',
  mixamorigRightUpLeg: 'thigh_R', mixamorigRightLeg: 'shin_R', mixamorigRightFoot: 'foot_R',
};

// Animação Mixamo (.fbx baixado manualmente de mixamo.com, "Without Skin").
// Retorna o clipe com os nomes de ossos já trocados pelo mapa escolhido.
// Para VRM, a rotação de repouso difere: use retargetToVRM (abaixo).
export async function loadMixamoClip(url, boneMap = MIXAMO_TO_STUDIO) {
  const fbx = await new FBXLoader().loadAsync(url);
  const clip = fbx.animations[0];
  const tracks = [];
  for (const tr of clip.tracks) {
    const [bone, prop] = tr.name.split('.');
    const mapped = boneMap[bone.replace(':', '')];
    if (!mapped || (prop !== 'quaternion' && !(prop === 'position' && mapped === 'hips'))) continue;
    const t = tr.clone(); t.name = `${mapped}.${prop}`;
    if (prop === 'position') t.values = t.values.map((v) => v * 0.01); // Mixamo usa centímetros
    tracks.push(t);
  }
  return new THREE.AnimationClip(clip.name || 'mixamo', clip.duration, tracks);
}

// Retarget Mixamo -> VRM levando em conta a pose de repouso de cada osso
// (mesma abordagem do exemplo oficial do three-vrm).
export async function retargetMixamoToVRM(url, vrm) {
  const fbx = await new FBXLoader().loadAsync(url);
  const clip = THREE.AnimationClip.findByName(fbx.animations, 'mixamo.com') ?? fbx.animations[0];
  const tracks = []; const restInv = new THREE.Quaternion(), parentRest = new THREE.Quaternion(), q = new THREE.Quaternion();
  const hipsY = fbx.getObjectByName('mixamorigHips')?.position.y ?? 100;
  const vrmHipsY = vrm.humanoid.normalizedRestPose?.hips?.position?.[1] ?? 1;
  const scale = vrmHipsY / hipsY;
  for (const tr of clip.tracks) {
    const [bone, prop] = tr.name.split('.');
    const humanName = MIXAMO_TO_VRM[bone]; const node = vrm.humanoid.getNormalizedBoneNode(humanName);
    const src = fbx.getObjectByName(bone);
    if (!node || !src) continue;
    src.getWorldQuaternion(restInv).invert(); src.parent.getWorldQuaternion(parentRest);
    if (tr instanceof THREE.QuaternionKeyframeTrack) {
      const v = tr.values.slice();
      for (let i = 0; i < v.length; i += 4) { q.fromArray(v, i).premultiply(parentRest).multiply(restInv); q.toArray(v, i); }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, tr.times, v.map((x, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -x : x))));
    } else if (tr instanceof THREE.VectorKeyframeTrack && humanName === 'hips') {
      tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, tr.times, tr.values.map((x, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -x : x) * scale)));
    }
  }
  return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
}
