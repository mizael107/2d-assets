// Pós-processamento cinematográfico (biblioteca postprocessing):
// bloom, profundidade de campo, vinheta, granulação, aberração cromática e tone mapping.
//
//   const fx = createPostFX(renderer, scene, camera, { bloom: { intensity: 1.2 }, dof: { focus: 4 } });
//   ...no render(dt): fx.setFocus(distância); fx.render(dt);
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, DepthOfFieldEffect, VignetteEffect,
  NoiseEffect, ToneMappingEffect, ToneMappingMode, ChromaticAberrationEffect, BlendFunction, SMAAEffect,
} from 'postprocessing';

export function createPostFX(renderer, scene, camera, {
  bloom = { intensity: 1.0, threshold: 0.75, smoothing: 0.2, radius: 0.7 },
  dof = null,              // { focus: metros, range: metros, bokeh: 1..5 }
  vignette = { offset: 0.3, darkness: 0.55 },
  grain = 0,               // 0..0.3
  chromatic = 0,           // 0..0.003
  smaa = true,
} = {}) {
  // O tone mapping passa a ser feito no fim da cadeia de efeitos (não no renderer).
  renderer.toneMapping = THREE.NoToneMapping;
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  composer.addPass(new RenderPass(scene, camera));
  const effects = []; const handles = {};
  if (dof) {
    handles.dof = new DepthOfFieldEffect(camera, { worldFocusDistance: dof.focus ?? 5, worldFocusRange: dof.range ?? 3, bokehScale: dof.bokeh ?? 2.5 });
    effects.push(handles.dof);
  }
  if (bloom) {
    handles.bloom = new BloomEffect({ intensity: bloom.intensity, luminanceThreshold: bloom.threshold, luminanceSmoothing: bloom.smoothing, mipmapBlur: true, radius: bloom.radius });
    effects.push(handles.bloom);
  }
  if (chromatic) effects.push(handles.chromatic = new ChromaticAberrationEffect({ offset: new THREE.Vector2(chromatic, chromatic) }));
  if (vignette) effects.push(handles.vignette = new VignetteEffect({ offset: vignette.offset, darkness: vignette.darkness }));
  if (grain) { const n = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY }); n.blendMode.opacity.value = grain; effects.push(handles.grain = n); }
  effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
  if (smaa) effects.push(new SMAAEffect());
  // DoF usa sua própria passagem (efeito de convolução não pode dividir passe com outros).
  if (handles.dof) composer.addPass(new EffectPass(camera, handles.dof));
  composer.addPass(new EffectPass(camera, ...effects.filter((e) => e !== handles.dof)));
  return {
    composer, effects: handles,
    setFocus(distance, range) { if (handles.dof) { handles.dof.cocMaterial.worldFocusDistance = distance; if (range) handles.dof.cocMaterial.worldFocusRange = range; } },
    setBloom(intensity) { if (handles.bloom) handles.bloom.intensity = intensity; },
    render(dt = 1 / 30) { composer.render(dt); },
    setSize(w, h) { composer.setSize(w, h); },
  };
}
