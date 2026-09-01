import * as THREE from 'three';

const metalMat = (color: number, roughness = 0.35, metalness = 0.65) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

export function tankBulletAsset() {
  const group = new THREE.Group();
  // Horizontal cylinder
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6.5, 32), metalMat(0x687888));
  body.rotation.z = Math.PI / 2;
  body.position.y = 2.2;
  // Dished ends
  const end1 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), metalMat(0x687888));
  end1.rotation.z = -Math.PI / 2;
  end1.position.set(-3.25, 2.2, 0);
  const end2 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), metalMat(0x687888));
  end2.rotation.z = Math.PI / 2;
  end2.position.set(3.25, 2.2, 0);

  // Saddle concrete/steel supports
  const saddle1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 3.4), metalMat(0x35404d, 0.8, 0.2));
  saddle1.position.set(-1.8, 0.6, 0);
  const saddle2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 3.4), metalMat(0x35404d, 0.8, 0.2));
  saddle2.position.set(1.8, 0.6, 0);

  // Top relief valve & nozzle
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 16), metalMat(0x8fa2b2));
  nozzle.position.set(0, 4.0, 0);

  group.add(body, end1, end2, saddle1, saddle2, nozzle);
  return group;
}

export function tankSphereAsset() {
  const group = new THREE.Group();
  // Horton Sphere
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(2.4, 36, 28), metalMat(0x758595));
  sphere.position.y = 3.6;

  // 6 Support Legs
  const legCount = 6;
  for (let i = 0; i < legCount; i++) {
    const angle = (i / legCount) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.8, 12), metalMat(0x3a4855));
    leg.position.set(Math.cos(angle) * 1.8, 1.9, Math.sin(angle) * 1.8);
    group.add(leg);
  }

  // Top dome platform & relief valve
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 24), metalMat(0x405060));
  topCap.position.y = 6.05;
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16), metalMat(0xa5b8c7));
  relief.position.y = 6.45;

  group.add(sphere, topCap, relief);
  return group;
}

export function tankStorageAsset() {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4.5, 48), metalMat(0x5a6a7a));
  shell.position.y = 2.25;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 0.8, 48), metalMat(0x4a5a6a));
  roof.position.y = 4.9;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.08, 12, 48), metalMat(0x303c48));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.5;
  group.add(shell, roof, rim);
  return group;
}

export function tankAsset() {
  return tankBulletAsset();
}

export function pipeAsset() {
  const group = new THREE.Group();
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8, 24), metalMat(0x8a96a3));
  pipe.rotation.z = Math.PI / 2;
  const joint1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 12, 24), metalMat(0xb7c1ca));
  joint1.rotation.y = Math.PI / 2;
  const joint2 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 12, 24), metalMat(0xb7c1ca));
  joint2.rotation.y = Math.PI / 2;
  joint2.position.x = 3.8;
  const joint3 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 12, 24), metalMat(0xb7c1ca));
  joint3.rotation.y = Math.PI / 2;
  joint3.position.x = -3.8;
  group.add(pipe, joint1, joint2, joint3);
  return group;
}

export function valveAsset() {
  const group = new THREE.Group();
  // Valve body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), metalMat(0xc07030, 0.4, 0.4));
  body.scale.set(1.4, 0.9, 0.9);
  // Flanges
  const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16), metalMat(0x707a82));
  f1.rotation.z = Math.PI / 2;
  f1.position.x = -0.55;
  const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16), metalMat(0x707a82));
  f2.rotation.z = Math.PI / 2;
  f2.position.x = 0.55;
  // Actuator cylinder / handwheel
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16), metalMat(0x909fa8));
  stem.position.y = 0.5;
  const actuator = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.55, 16), metalMat(0x2880b9));
  actuator.position.y = 0.95;
  group.add(body, f1, f2, stem, actuator);
  return group;
}

export function pumpAsset() {
  const group = new THREE.Group();
  // Skid base
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.4), metalMat(0x26333e, 0.8, 0.2));
  base.position.y = 0.15;
  // Electric Motor
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 24), metalMat(0x1e5a8a));
  motor.rotation.z = Math.PI / 2;
  motor.position.set(-0.4, 0.75, 0);
  // Centrifugal Pump Volute
  const pumpVolute = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 24), metalMat(0x566776));
  pumpVolute.rotation.x = Math.PI / 2;
  pumpVolute.position.set(0.6, 0.8, 0);
  // Discharge Nozzle
  const discharge = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16), metalMat(0x788a99));
  discharge.position.set(0.6, 1.35, 0);

  group.add(base, motor, pumpVolute, discharge);
  return group;
}

export function suppressionAsset() {
  const group = new THREE.Group();
  // Raised post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.2, 16), metalMat(0xb02820));
  post.position.y = 1.1;
  // Monitor Turret Nozzle
  const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.9, 16), metalMat(0xd4382c));
  cannon.rotation.x = Math.PI / 4;
  cannon.position.set(0, 2.25, 0.3);
  // Base flange
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), metalMat(0x404b54));
  base.position.y = 0.05;

  // Deluge Water Spray Cone & Mist (visible when isDeluging is true)
  const sprayGroup = new THREE.Group();
  sprayGroup.name = 'delugeSpray';
  sprayGroup.visible = false;

  const sprayCone = new THREE.Mesh(
    new THREE.ConeGeometry(12, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x40a9ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  sprayCone.position.set(0, 3, 4);
  sprayCone.rotation.x = -Math.PI / 3;

  const sprayRing = new THREE.Mesh(
    new THREE.RingGeometry(2, 14, 32),
    new THREE.MeshBasicMaterial({
      color: 0x1890ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  sprayRing.rotation.x = -Math.PI / 2;
  sprayRing.position.y = 0.08;

  sprayGroup.add(sprayCone, sprayRing);

  group.add(post, cannon, base, sprayGroup);
  return group;
}

export function workerAsset() {
  const group = new THREE.Group();
  // Hi-Vis Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), metalMat(0xfa8c16, 0.6, 0.1));
  torso.position.y = 1.05;
  // Hardhat & Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), metalMat(0xfadb14, 0.4, 0.1));
  head.position.y = 1.6;
  // Legs
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.25), metalMat(0x182430, 0.8, 0.1));
  legs.position.y = 0.35;
  // Safety halo ring on ground
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.65, 0.04, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x52c41a, transparent: true, opacity: 0.85 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.05;

  group.add(torso, head, legs, halo);
  return group;
}

export function flareAsset() {
  const group = new THREE.Group();
  // Tall lattice mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 22, 16), metalMat(0x6b7785));
  mast.position.y = 11;
  // Flare tip burner
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 2.5, 16), metalMat(0x2f3742));
  tip.position.y = 22.8;
  // Pilot flame
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.8, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7a00, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  flame.position.y = 25.2;

  group.add(mast, tip, flame);
  return group;
}

export function wallAsset() {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.5), metalMat(0x595959, 0.95, 0.05));
  wall.position.y = 2;
  group.add(wall);
  return group;
}

export function fireAsset() {
  const group = new THREE.Group();

  // Outer orange roaring flame
  const outerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 5.0, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );
  outerFlame.position.y = 2.5;

  // Inner intense yellow flame core
  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 3.8, 14),
    new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    })
  );
  innerFlame.position.y = 1.9;

  // Base burning pool
  const basePool = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.2, 0.3, 16),
    new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.85 })
  );
  basePool.position.y = 0.15;

  // Real-time dynamic point light for fire illumination
  const light = new THREE.PointLight(0xff5500, 3.5, 30);
  light.position.y = 3.0;

  // ERPG / ALOHA Threat Zone Ground Rings
  const threatGroup = new THREE.Group();
  threatGroup.name = 'threatZones';
  threatGroup.visible = false;

  // Hot Zone (Lethal) - Red
  const hotRing = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 1, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff1100,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    })
  );
  hotRing.rotation.x = -Math.PI / 2;
  hotRing.position.y = 0.08;
  hotRing.name = 'hotRing';

  // Warm Zone (Injury) - Orange
  const warmRing = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 1, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0.20,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5
    })
  );
  warmRing.rotation.x = -Math.PI / 2;
  warmRing.position.y = 0.06;
  warmRing.name = 'warmRing';

  // Cold Zone (Public Safety Boundary) - Yellow
  const coldRing = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 1, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  coldRing.rotation.x = -Math.PI / 2;
  coldRing.position.y = 0.04;
  coldRing.name = 'coldRing';

  threatGroup.add(hotRing, warmRing, coldRing);

  group.add(outerFlame, innerFlame, basePool, light, threatGroup);
  return group;
}

export function releaseAsset() {
  const group = new THREE.Group();

  // Outer soft gas plume
  const outerCloud = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0x8ed5ec,
      roughness: 0.95,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    })
  );

  // Inner denser vapor core
  const innerCloud = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xb5e8f7,
      roughness: 0.9,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    })
  );

  group.add(outerCloud, innerCloud);
  return group;
}

export function blastAsset() {
  const group = new THREE.Group();
  // Shockwave expanding ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.08, 12, 36),
    new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = Math.PI / 2;

  // Expanding hemisphere
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffaa44, wireframe: true, transparent: true, opacity: 0.4 })
  );

  group.add(ring, dome);
  return group;
}


