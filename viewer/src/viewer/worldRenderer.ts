import * as THREE from 'three';
import type { TwinState, WorldSnapshot } from '../../../src/core/types.js';
import {
  tankBulletAsset,
  tankSphereAsset,
  tankStorageAsset,
  pipeAsset,
  valveAsset,
  pumpAsset,
  suppressionAsset,
  workerAsset,
  flareAsset,
  wallAsset,
  fireAsset,
  releaseAsset,
  blastAsset
} from './assets.js';

function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}

export class WorldRenderer {
  private objects = new Map<string, THREE.Object3D>();
  private twinStates = new Map<string, TwinState>();
  showThreatZones = false;

  constructor(private scene: THREE.Scene) {}

  sync(snapshot: WorldSnapshot) {
    const alive = new Set<string>();
    for (const twin of snapshot.twins) {
      alive.add(twin.id);
      this.twinStates.set(twin.id, twin);
      let o = this.objects.get(twin.id);
      if (!o) {
        o = this.create(twin);
        this.objects.set(twin.id, o);
        this.scene.add(o);
      }
      this.update(o, twin);
    }
    for (const [id, o] of this.objects) {
      if (!alive.has(id)) {
        this.scene.remove(o);
        disposeHierarchy(o);
        this.objects.delete(id);
        this.twinStates.delete(id);
      }
    }
  }

  private create(t: TwinState): THREE.Object3D {
    let o: THREE.Object3D;
    switch (t.kind) {
      case 'tank': {
        const geom = String(t.metadata.tankGeometry ?? 'bullet');
        if (geom === 'sphere') o = tankSphereAsset();
        else if (geom === 'vertical_storage') o = tankStorageAsset();
        else o = tankBulletAsset();
        break;
      }
      case 'pipe':
        o = pipeAsset();
        break;
      case 'valve':
        o = valveAsset();
        break;
      case 'pump':
        o = pumpAsset();
        break;
      case 'suppression':
        o = suppressionAsset();
        break;
      case 'worker':
        o = workerAsset();
        break;
      case 'flare':
        o = flareAsset();
        break;
      case 'wall':
        o = wallAsset();
        break;
      case 'fire':
        o = fireAsset();
        break;
      case 'release':
        o = releaseAsset();
        break;
      case 'blast':
        o = blastAsset();
        break;
      default:
        o = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xd6b34a }));
    }

    o.userData.twinId = t.id;
    return o;
  }

  private update(o: THREE.Object3D, t: TwinState) {
    o.position.set(t.position.x, t.position.y, t.position.z);
    o.visible = t.active || ['tank', 'pipe', 'valve', 'pump', 'suppression', 'worker', 'flare', 'wall'].includes(t.kind);

    if (t.kind === 'release') {
      const r = Math.max(0.4, Number(t.metadata.radiusM ?? 1));
      const angle = Number(t.metadata.windAngle ?? 0);
      o.rotation.y = -angle;
      o.scale.set(r * 1.7, r * 0.8, r * 1.1);
    }

    if (t.kind === 'fire') {
      const i = Number(t.metadata.intensityMw ?? 1);
      const flicker = 1.0 + Math.sin(Date.now() * 0.015) * 0.08;
      const s = (1 + i * 0.18) * flicker;
      o.scale.set(s, (1.2 + i * 0.25) * flicker, s);
      const light = o.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight | undefined;
      if (light) {
        light.intensity = Math.min(8.0, 2.0 + i * 0.5) * flicker;
      }

      // Threat zone perimeter rings
      const threatGroup = o.children.find(c => c.name === 'threatZones') as THREE.Group | undefined;
      if (threatGroup) {
        threatGroup.visible = this.showThreatZones;
        if (this.showThreatZones) {
          const hotR = Number(t.metadata.threatHotM ?? 3);
          const warmR = Number(t.metadata.threatWarmM ?? 6);
          const coldR = Number(t.metadata.threatColdM ?? 12);

          const hotRing = threatGroup.children.find(c => c.name === 'hotRing') as THREE.Mesh | undefined;
          const warmRing = threatGroup.children.find(c => c.name === 'warmRing') as THREE.Mesh | undefined;
          const coldRing = threatGroup.children.find(c => c.name === 'coldRing') as THREE.Mesh | undefined;

          if (hotRing) hotRing.scale.setScalar(Math.max(0.1, hotR));
          if (warmRing) warmRing.scale.setScalar(Math.max(0.1, warmR));
          if (coldRing) coldRing.scale.setScalar(Math.max(0.1, coldR));
        }
      }
    }

    if (t.kind === 'suppression') {
      const isDeluging = Boolean(t.metadata.isDeluging ?? false);
      const sprayGroup = o.children.find(c => c.name === 'delugeSpray') as THREE.Group | undefined;
      if (sprayGroup) {
        sprayGroup.visible = isDeluging;
        if (isDeluging) {
          // Dynamically aim monitor turret toward the nearest active fire or threatened equipment
          let targetFire: TwinState | undefined;
          let minDist = Infinity;
          for (const twin of this.twinStates.values()) {
            if (twin.kind === 'fire' && twin.active) {
              const dist = Math.hypot(twin.position.x - t.position.x, twin.position.z - t.position.z);
              if (dist < minDist) {
                minDist = dist;
                targetFire = twin;
              }
            }
          }
          if (targetFire) {
            const dx = targetFire.position.x - t.position.x;
            const dz = targetFire.position.z - t.position.z;
            o.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
          }
          sprayGroup.rotation.z += 0.05; // swirling deluge mist
        }
      }
    }

    if (t.kind === 'blast') {
      const r = Number(t.metadata.radiusM ?? 1);
      o.scale.setScalar(Math.max(0.5, r));
    }

    if (t.kind === 'worker') {
      // Update worker safety halo color
      const halo = o.children.find(c => c instanceof THREE.Mesh && c.geometry instanceof THREE.TorusGeometry) as THREE.Mesh | undefined;
      if (halo && halo.material instanceof THREE.MeshBasicMaterial) {
        if (t.metadata.evacuated) {
          halo.material.color.setHex(0x1890ff); // Blue safe
        } else if (t.integrity < 0.6 || Number(t.metadata.thermalDose ?? 0) > 20) {
          halo.material.color.setHex(0xf5222d); // Red danger
        } else if (t.integrity < 0.9) {
          halo.material.color.setHex(0xfaad14); // Yellow warning
        } else {
          halo.material.color.setHex(0x52c41a); // Green normal
        }
      }
    }

    if (t.kind === 'valve') {
      const openFrac = Number(t.metadata.openFraction ?? 1.0);
      const actuator = o.children[4] as THREE.Mesh | undefined;
      if (actuator && actuator.material instanceof THREE.MeshStandardMaterial) {
        if (t.metadata.actuatorState === 'SEIZED') {
          actuator.material.color.setHex(0x722ed1); // Purple seized
        } else if (openFrac <= 0.05) {
          actuator.material.color.setHex(0xf5222d); // Red closed
        } else if (openFrac >= 0.95) {
          actuator.material.color.setHex(0x52c41a); // Green open
        } else {
          actuator.material.color.setHex(0xfa8c16); // Orange throttling
        }
      }
    }

    if (t.kind === 'flare') {
      const flaringRate = Number(t.metadata.flaringRateKgS ?? 0);
      const flame = o.children[2] as THREE.Mesh | undefined;
      if (flame) {
        const scale = flaringRate > 0 ? 2.5 + flaringRate * 0.2 : 0.8;
        flame.scale.set(scale, scale * 1.5, scale);
      }
    }

    if (['tank', 'pipe', 'wall', 'pump'].includes(t.kind)) {
      o.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const heat = Math.min(1, Math.max(0, (t.temperatureK - 303) / 250));
          if (heat > 0.05) {
            child.material.emissive.setRGB(heat * 0.8, heat * 0.15, 0);
            child.material.emissiveIntensity = heat * 2.5;
          } else {
            child.material.emissive.setRGB(0, 0, 0);
            child.material.emissiveIntensity = 0;
          }
        }
      });

      if (t.integrity < 0.7) {
        o.rotation.z = (1 - t.integrity) * 0.15;
      }
    }
  }

  pick(raycaster: THREE.Raycaster, camera: THREE.Camera, pointer: THREE.Vector2): TwinState | undefined {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    for (const hit of intersects) {
      let cur: THREE.Object3D | null = hit.object;
      while (cur && cur !== this.scene) {
        if (cur.userData?.twinId) {
          const twin = this.twinStates.get(cur.userData.twinId);
          if (twin) return twin;
        }
        cur = cur.parent;
      }
    }
    return undefined;
  }

  getObject(id: string) {
    return this.objects.get(id);
  }

  getTwinState(id: string): TwinState | undefined {
    return this.twinStates.get(id);
  }
}

