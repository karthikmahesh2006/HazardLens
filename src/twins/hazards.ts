import { SimEvent, Twin, TwinContext, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";
import { IgnitionSourceTwin, PumpTwin, WeatherTwin } from "./process.js";

const d = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ─── ReleaseTwin ────────────────────────────────────────────────────────────
// Hydrocarbon vapour cloud dispersing from a leak source.
//
// Domino triggers:
//   1. Ignition source / hot pump within cloud radius → jet fire
//   2. Active FireTwin touching cloud radius          → instant auto-ignition
//      (flame front already present — no separate source required)
//   3. Blast shockwave through cloud                  → shock-ignition

export class ReleaseTwin extends BaseTwin {
  age = 0;
  ignited = false;

  constructor(id: string, p: Vec3, public sourceId: string, public rateKgS: number) {
    super(
      {
        id,
        kind: "release",
        position: { ...p },
        fidelity: 2,
        active: true,
        integrity: 1,
        temperatureK: 303,
        metadata: { radiusM: 0.5, ignited: false, rateKgS }
      },
      {
        physicalProfile: { material: "propane_gas", properties: { rateKgS, LFL: 0.021, UFL: 0.095 } },
        relationships: [],
        history: []
      }
    );
  }

  onEvent(e: SimEvent, c: TwinContext): void {
    // Blast shockwave → shock-ignition of the cloud
    if (e.type === "blast.shockwave_contact" && e.targetId === this.state.id && !this.ignited) {
      this._igniteNow(c);
    }
  }

  tick(dt: number, c: TwinContext) {
    if (!this.state.active) return;
    this.age += dt;

    // Wind drift
    const w = [...c.twins()].find(t => t instanceof WeatherTwin) as WeatherTwin | undefined;
    const wx = w?.windX ?? 0;
    const wz = w?.windZ ?? 0;
    this.state.position.x += wx * dt * 0.35;
    this.state.position.z += wz * dt * 0.35;

    const radius = 0.5 + Math.sqrt(this.age) * 1.5 + this.rateKgS * 2;
    this.state.metadata.radiusM = radius;
    this.state.metadata.windX = wx;
    this.state.metadata.windZ = wz;
    this.state.metadata.windAngle = Math.atan2(wz, wx);

    if (this.ignited) return;

    for (const t of c.twins()) {
      if (t.state.id === this.state.id) continue;

      // 1. Classic ignition: enabled ignition source or overheated pump
      const isHotPump = t instanceof PumpTwin && (t.state.temperatureK > 600 || t.vibrationMmS > 5);
      const isIgnition = t instanceof IgnitionSourceTwin && t.enabled;
      if ((isIgnition || isHotPump) && d(this.state.position, t.state.position) <= radius) {
        this._igniteNow(c);
        break;
      }

      // 2. Auto-ignition from a nearby active fire — flame front already present.
      //    Physical basis: if a vapour cloud expands into a region where a fire
      //    already exists, it ignites immediately (< 1 simulation step).
      if (t.state.kind === "fire" && t.state.active) {
        const fireDist = d(this.state.position, t.state.position);
        if (fireDist <= radius + 2) {
          this._igniteNow(c);
          break;
        }
      }
    }
  }

  private _igniteNow(c: TwinContext) {
    this.ignited = true;
    this.state.active = false;   // cloud consumed
    this.state.metadata.ignited = true;
    c.emit({ type: "release.ignited", sourceId: this.state.id, payload: { releaseId: this.state.id } });
    c.emit({
      type: "fire.created",
      sourceId: this.state.id,
      payload: {
        origin: { ...this.state.position },
        intensityMw: Math.max(1.0, this.rateKgS * 8)
      }
    });
  }

  clone(): Twin {
    const x = new ReleaseTwin(this.state.id, { ...this.state.position }, this.sourceId, this.rateKgS);
    x.age = this.age;
    x.ignited = this.ignited;
    Object.assign(x.state, structuredClone(this.state));
    return x;
  }
}

// ─── FireTwin ───────────────────────────────────────────────────────────────
// Active fire — jet fire, pool fire, or fireball.
//
// Domino triggers:
//   1. Thermal radiation (inverse-square)          → heats all equipment
//   2. Direct flame contact (< 4 m, 15 s)          → secondary fire spawns
//      Steel pipe: 150–350 kW/m² at contact; fails in ~15 s without protection
//   3. Suppression.command                         → reduces / extinguishes

export class FireTwin extends BaseTwin {
  fireAge = 0;
  private contactTime = new Map<string, number>(); // asset id → seconds of direct contact
  private spawned = new Set<string>();              // already cascaded to this asset

  constructor(id: string, p: Vec3, public intensityMw: number) {
    super(
      {
        id,
        kind: "fire",
        position: { ...p },
        fidelity: 3,
        active: true,
        integrity: 1,
        temperatureK: 1100,
        metadata: { intensityMw, fireAge: 0 }
      },
      {
        physicalProfile: {
          material: "combustion_field",
          properties: { intensityMw, flameHeightM: 3 + intensityMw * 0.4 }
        },
        relationships: [],
        history: []
      }
    );
  }

  onEvent(e: SimEvent) {
    if (e.type === "suppression.command") {
      const strength = Number((e.payload as any).strength ?? 0.5);
      this.intensityMw = Math.max(0, this.intensityMw - strength);
      this.state.metadata.intensityMw = this.intensityMw;
      if (this.intensityMw === 0) {
        this.state.active = false;
        this.state.metadata.extinguished = true;
      }
    }
  }

  tick(dt: number, c: TwinContext) {
    if (!this.state.active || this.intensityMw <= 0) return;
    this.fireAge += dt;
    this.state.metadata.fireAge = Number(this.fireAge.toFixed(1));

    // Calculate ERPG / ALOHA threat zone boundaries
    // Hot zone (Lethal): flux >= 10 kW/m2
    // Warm zone (2nd deg burn in 60s): flux >= 5 kW/m2
    // Cold zone (Public safety threshold): flux >= 1.6 kW/m2
    const hotRadius = Math.sqrt((this.intensityMw * 120) / 10);
    const warmRadius = Math.sqrt((this.intensityMw * 120) / 5);
    const coldRadius = Math.sqrt((this.intensityMw * 120) / 1.6);
    this.state.metadata.threatHotM = Number(hotRadius.toFixed(1));
    this.state.metadata.threatWarmM = Number(warmRadius.toFixed(1));
    this.state.metadata.threatColdM = Number(coldRadius.toFixed(1));

    for (const t of c.twins()) {
      if (t.state.id === this.state.id) continue;
      if (!["tank", "wall", "pipe", "valve", "pump", "worker", "suppression"].includes(t.state.kind)) continue;

      const r = Math.max(1, d(this.state.position, t.state.position));

      // ── Thermal radiation ──────────────────────────────────────────────
      // API RP 521 / SFPE formula: q = (F × intensity) / r²
      // F ≈ 120 for a typical jet/pool fire (fraction of heat radiated × geometry)
      const flux = Math.min(80, (this.intensityMw * 120) / (r * r));
      if (flux > 0.5) {
        c.emit({
          type: "thermal.exposure",
          sourceId: this.state.id,
          targetId: t.state.id,
          payload: { heatFluxKwM2: flux }
        });
      }

      // ── Direct flame contact (< 4 m, sustained ≥ 15 s) ──────────────
      // At < 4 m an asset is in direct flame impingement, not just radiation.
      // Unprotected carbon steel pipe fails in ~15 s of direct flame contact.
      if (r < 4 && ["pipe", "tank", "pump"].includes(t.state.kind) && !this.spawned.has(t.state.id)) {
        const contactSec = (this.contactTime.get(t.state.id) ?? 0) + dt;
        this.contactTime.set(t.state.id, contactSec);

        if (contactSec >= 15) {
          // Secondary fire spawns at the asset location
          this.spawned.add(t.state.id);
          c.emit({
            type: "fire.created",
            sourceId: this.state.id,
            payload: {
              origin: { x: t.state.position.x, y: t.state.position.y + 0.5, z: t.state.position.z },
              intensityMw: Math.max(1.5, this.intensityMw * 0.65)
            }
          });
        }
      } else if (r >= 4) {
        this.contactTime.delete(t.state.id);
      }
    }
  }

  clone(): Twin {
    const x = new FireTwin(this.state.id, { ...this.state.position }, this.intensityMw);
    x.fireAge = this.fireAge;
    Object.assign(x.state, structuredClone(this.state));
    return x;
  }
}

// ─── BlastTwin ──────────────────────────────────────────────────────────────
// Propagating pressure shockwave from a BLEVE or vapour cloud explosion (VCE).
//
// Domino triggers:
//   1. Structural blast impact → damages pipes/tanks/walls (Sadovsky formula)
//   2. Shockwave through vapour cloud → shock-to-detonation → secondary VCE
//   3. Blast concussion on workers → injury load

export class BlastTwin extends BaseTwin {
  radiusM = 1.0;
  age = 0;
  maxRadiusM = 35;
  propagationSpeedMPerS = 340;
  private shockIgnited = new Set<string>(); // clouds already shock-ignited

  constructor(id: string, p: Vec3, public energyMj = 1000, public yieldKgTnt = 250) {
    super(
      {
        id,
        kind: "blast",
        position: { ...p },
        fidelity: 2,
        active: true,
        integrity: 1,
        temperatureK: 800,
        metadata: { energyMj, yieldKgTnt, radiusM: 1.0, peakOverpressureKpa: 150 }
      },
      { physicalProfile: { material: "shockwave", properties: { energyMj, yieldKgTnt } }, relationships: [], history: [] }
    );
  }

  onEvent(): void {}

  tick(dt: number, c: TwinContext): void {
    if (!this.state.active) return;
    this.age += dt;
    this.radiusM += this.propagationSpeedMPerS * dt * 0.15;
    this.state.metadata.radiusM = this.radiusM;

    // Sadovsky overpressure (Z = scaled distance = r / W^(1/3))
    const scaledDist = Math.max(0.5, this.radiusM / Math.cbrt(this.yieldKgTnt));
    const overpressureKpa = Math.max(2, 100 / scaledDist + 400 / (scaledDist * scaledDist));
    this.state.metadata.peakOverpressureKpa = Number(overpressureKpa.toFixed(1));

    for (const t of c.twins()) {
      if (t.state.id === this.state.id) continue;
      const r = d(this.state.position, t.state.position);
      const onWavefront = Math.abs(r - this.radiusM) < 4.0 || r < this.radiusM;
      if (!onWavefront) continue;

      // ── Structural blast impact ───────────────────────────────────────
      if (!["fire", "release", "blast", "weather", "ignition", "worker"].includes(t.state.kind)) {
        c.emit({
          type: "blast.impact",
          sourceId: this.state.id,
          targetId: t.state.id,
          payload: { overpressureKpa, distanceM: r }
        });
      }

      // ── Shock-ignition of vapour clouds ──────────────────────────────
      // Physically: shockwave compresses and heats the cloud above autoignition
      // temperature (propane AIT ≈ 470°C). This triggers a secondary VCE.
      if (t.state.kind === "release" && t.state.active && !this.shockIgnited.has(t.state.id)) {
        this.shockIgnited.add(t.state.id);
        c.emit({
          type: "blast.shockwave_contact",
          sourceId: this.state.id,
          targetId: t.state.id,
          payload: { overpressureKpa, distanceM: r }
        });
        // Detonation fireball at cloud centre
        c.emit({
          type: "fire.created",
          sourceId: this.state.id,
          payload: {
            origin: { ...t.state.position },
            intensityMw: Math.max(2, Number(t.state.metadata.rateKgS ?? 1) * 6)
          }
        });
      }

      // ── Worker blast concussion ───────────────────────────────────────
      if (t.state.kind === "worker" && overpressureKpa > 15) {
        c.emit({
          type: "thermal.exposure",
          sourceId: this.state.id,
          targetId: t.state.id,
          payload: { heatFluxKwM2: Math.min(30, overpressureKpa * 0.3) }
        });
      }
    }

    if (this.radiusM >= this.maxRadiusM || this.age > 3.0) {
      this.state.active = false;
      this.state.metadata.dissipated = true;
    }
  }

  clone(): Twin {
    const x = new BlastTwin(this.state.id, { ...this.state.position }, this.energyMj, this.yieldKgTnt);
    x.radiusM = this.radiusM;
    x.age = this.age;
    Object.assign(x.state, structuredClone(this.state));
    return x;
  }
}
