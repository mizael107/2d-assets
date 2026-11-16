// Física com Rapier (motor principal do estúdio).
//
// Para render quadro a quadro, a simulação inteira é pré-calculada ("bake") em passos
// fixos de 1/120 s antes de renderizar. Assim:
//   - o quadro N sempre mostra o mesmo estado (determinístico);
//   - os momentos de impacto ficam conhecidos ANTES do render e viram cues de som.
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

let ready = null;
export const initPhysics = () => (ready ??= RAPIER.init());

export async function createPhysicsWorld({ gravity = -9.81, step = 1 / 120 } = {}) {
  await initPhysics();
  const world = new RAPIER.World({ x: 0, y: gravity, z: 0 });
  world.timestep = step;
  const queue = new RAPIER.EventQueue(true);
  const bodies = []; // { body, mesh, name, track: [] }
  const byHandle = new Map();
  let baked = null;

  const colliderFor = (shape) => {
    if (shape.type === 'box') return RAPIER.ColliderDesc.cuboid(shape.size[0] / 2, shape.size[1] / 2, shape.size[2] / 2);
    if (shape.type === 'sphere') return RAPIER.ColliderDesc.ball(shape.radius);
    if (shape.type === 'capsule') return RAPIER.ColliderDesc.capsule(shape.halfHeight, shape.radius);
    throw new Error('forma desconhecida: ' + shape.type);
  };

  const api = {
    RAPIER, world,
    // Chão infinito (plano grande e fino) na altura y.
    addGround({ y = 0, friction = 0.8, restitution = 0.1, size = 200 } = {}) {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, y - 0.5, 0));
      const c = world.createCollider(RAPIER.ColliderDesc.cuboid(size, 0.5, size).setFriction(friction).setRestitution(restitution).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
      byHandle.set(c.handle, 'chao');
      return body;
    },
    // Corpo físico ligado a uma malha. type: 'dynamic' | 'fixed' | 'kinematic'.
    // ccd: detecção contínua de colisão. Ligada por padrão nos corpos dinâmicos: evita que
    // objetos rápidos (queda de grande altura, projéteis) atravessem o chão ou sejam
    // arremessados pela correção de penetração.
    addBody(mesh, { shape, type = 'dynamic', mass, friction = 0.6, restitution = 0.25, velocity, angularVelocity, name, ccd = true } = {}) {
      const desc = type === 'fixed' ? RAPIER.RigidBodyDesc.fixed() : type === 'kinematic' ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.dynamic();
      desc.setTranslation(mesh.position.x, mesh.position.y, mesh.position.z).setRotation(mesh.quaternion);
      if (velocity) desc.setLinvel(...velocity);
      if (angularVelocity) desc.setAngvel({ x: angularVelocity[0], y: angularVelocity[1], z: angularVelocity[2] });
      if (ccd && type === 'dynamic') desc.setCcdEnabled(true);
      const body = world.createRigidBody(desc);
      const cd = colliderFor(shape).setFriction(friction).setRestitution(restitution).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      if (mass) cd.setMass(mass);
      const col = world.createCollider(cd, body);
      const entry = { body, mesh, name: name ?? mesh.name ?? `corpo${bodies.length}`, track: [] };
      byHandle.set(col.handle, entry.name);
      bodies.push(entry);
      return entry;
    },
    // Simula de 0 até duration e grava posições, rotações e contatos.
    bake(duration) {
      const contacts = []; const n = Math.ceil(duration / world.timestep) + 1;
      const vel = (b) => { const v = b.body.linvel(); return [v.x, v.y, v.z]; };
      for (let i = 0; i < n; i++) {
        const t = i * world.timestep;
        const before = new Map();
        for (const b of bodies) {
          const p = b.body.translation(), r = b.body.rotation();
          b.track.push([p.x, p.y, p.z, r.x, r.y, r.z, r.w]);
          before.set(b.name, vel(b));
        }
        world.step(queue);
        // Força do impacto = mudança brusca de velocidade (Δv) no passo da colisão.
        const dv = new Map();
        for (const b of bodies) { const a = before.get(b.name), c = vel(b); dv.set(b.name, Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2])); }
        queue.drainCollisionEvents((h1, h2, started) => {
          if (!started) return;
          const a = byHandle.get(h1), b = byHandle.get(h2);
          contacts.push({ t: t + world.timestep, a, b, speed: Math.max(dv.get(a) ?? 0, dv.get(b) ?? 0) });
        });
      }
      baked = { duration, contacts };
      return baked;
    },
    // Aplica o estado gravado no tempo t (interpolado) às malhas.
    apply(t) {
      if (!baked) throw new Error('chame bake() antes de apply()');
      const f = t / world.timestep; const i = Math.floor(f), a = f - i;
      const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
      for (const b of bodies) {
        const A = b.track[Math.min(i, b.track.length - 1)], B = b.track[Math.min(i + 1, b.track.length - 1)];
        b.mesh.position.set(A[0] + (B[0] - A[0]) * a, A[1] + (B[1] - A[1]) * a, A[2] + (B[2] - A[2]) * a);
        qa.set(A[3], A[4], A[5], A[6]); qb.set(B[3], B[4], B[5], B[6]);
        b.mesh.quaternion.slerpQuaternions(qa, qb, a);
      }
    },
    // Impactos fortes o suficiente para ter som (Δv em m/s; filtra toques mínimos).
    impacts(minSpeed = 1) { return (baked?.contacts ?? []).filter((c) => c.speed >= minSpeed); },
    bodies,
  };
  return api;
}
