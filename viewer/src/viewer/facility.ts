import * as THREE from 'three';

export function createFacility(scene: THREE.Scene) {
  // Main facility concrete pad
  const mainPad = new THREE.Mesh(
    new THREE.BoxGeometry(68, 0.4, 44),
    new THREE.MeshStandardMaterial({ color: 0x161d24, roughness: 0.95, metalness: 0.1 })
  );
  mainPad.position.set(10, -0.2, 0);
  scene.add(mainPad);

  const addZonePad = (x: number, z: number, w: number, d: number, color = 0x22303c, label: string) => {
    const zone = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.12, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.2 })
    );
    zone.position.set(x, 0.06, z);
    zone.name = label;
    scene.add(zone);

    // Perimeter line marker
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.12, d));
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x4a6572, opacity: 0.6, transparent: true }));
    line.position.set(x, 0.06, z);
    scene.add(line);
  };

  // Spheres storage zone
  addZonePad(-10, -6, 16, 14, 0x1d2933, 'SPHERE_FARM');

  // Feed pump and manifold zone
  addZonePad(4, -4, 12, 10, 0x253644, 'PUMPING_STATION');

  // Bullet and storage tanks zone
  addZonePad(20, -2, 18, 16, 0x1e2c38, 'BULLET_STORAGE_YARD');

  // Flare perimeter pad
  addZonePad(34, -12, 10, 10, 0x1b242e, 'FLARE_ZONE');

  // Emergency muster point
  addZonePad(30, 14, 8, 8, 0x1b3b2b, 'MUSTER_POINT');

  // Pipe racks connecting zones
  const createRack = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x3d4b58, metalness: 0.6 })
    );
    rack.position.set((x1 + x2) / 2, 0.2, (z1 + z2) / 2);
    rack.rotation.y = -angle;
    scene.add(rack);
  };

  createRack(-2, -5, 12, -4);
  createRack(10, -4, 20, -2);
  createRack(6, -4, 30, -12);
}

