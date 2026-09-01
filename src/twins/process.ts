import { SimEvent, Twin, TwinContext, TwinState, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";

const cloneState = (s: TwinState): TwinState => structuredClone(s);

const physical = (material: string, properties: Record<string, string | number | boolean>) => ({
  physicalProfile: { material, properties },
  relationships: [],
  history: []
});

const dist3D = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export class WeatherTwin extends BaseTwin {
  constructor(id: string, public windX = 2, public windZ = 0) {
    super(
      { id, kind: "weather", position: { x: 0, y: 0, z: 0 }, fidelity: 1, active: true, integrity: 1, temperatureK: 303, metadata: { windX, windZ } },
      physical("atmosphere", { windX, windZ })
    );
  }
  onEvent(): void {}
  tick(): void {}
  clone(): Twin {
    const c = new WeatherTwin(this.state.id, this.windX, this.windZ);
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class PipeTwin extends BaseTwin {
  leakRateKgS = 0;
  failed = false;
  connectedValveId?: string;

  constructor(id: string, position: TwinState["position"], public chemical = "propane", public lengthM = 8, public diameterMm = 150) {
    super(
      { id, kind: "pipe", position, fidelity: 1, active: true, integrity: 1, temperatureK: 303, metadata: { chemical, lengthM, diameterMm, flowRateKgS: 5.0, leakRateKgS: 0 } },
      physical("carbon_steel", { chemical, lengthM, diameterMm, nominalPressureBar: 25 })
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    this.record(event, `processed ${event.type}`);

    if (event.type === "fault.pipe_leak" && event.targetId === this.state.id) {
      this.release(context, Number(event.payload.rateKgS ?? 0.5));
    }

    if (event.type === "thermal.exposure" && event.targetId === this.state.id) {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      this.state.temperatureK += flux * 0.025;
      this.state.integrity = Math.max(0, this.state.integrity - flux * 0.00045);

      // Accelerated failure for directly-impinged pipes (flux > 35 kW/m²)
      // Uninsulated carbon steel loses structural integrity rapidly above this threshold
      if (flux > 35) {
        this.state.integrity = Math.max(0, this.state.integrity - flux * 0.0008);
      }

      if (!this.failed && (this.state.integrity <= 0.55 || this.state.temperatureK >= 390)) {
        this.failed = true;
        this.state.metadata.failed = true;
        context.emit({ type: "asset.failed", sourceId: this.state.id, payload: { kind: "pipe", mode: "thermal-rupture" } });

        const biggerLeak = Math.max(0.8, this.leakRateKgS * 2.5);
        this.release(context, biggerLeak);

        // Secondary jet fire — if an active fire already exists within 12 m,
        // the ruptured pipe ignites instantly from the existing flame.
        // Physical basis: hot escaping gas hits nearby flame → immediate ignition.
        const nearbyFire = [...context.twins()].find(t =>
          t.state.kind === "fire" && t.state.active &&
          Math.hypot(t.state.position.x - this.state.position.x,
                     t.state.position.z - this.state.position.z) < 12
        );
        if (nearbyFire) {
          context.emit({
            type: "fire.created",
            sourceId: this.state.id,
            payload: {
              origin: { ...this.state.position },
              intensityMw: Math.max(2.0, biggerLeak * 6)
            }
          });
        }
      }
    }

    if (event.type === "blast.impact" && event.targetId === this.state.id) {
      const overpressureKpa = Number(event.payload.overpressureKpa ?? 0);
      if (overpressureKpa > 40) {
        this.state.integrity = Math.max(0, this.state.integrity - overpressureKpa * 0.005);
        if (!this.failed && this.state.integrity <= 0.4) {
          this.failed = true;
          const blastLeak = 1.2;
          this.release(context, blastLeak);

          // If an active fire is within 20 m, the blast-ruptured pipe ignites
          // immediately — fire is already present in the scene.
          const nearbyFire = [...context.twins()].find(t =>
            t.state.kind === "fire" && t.state.active &&
            Math.hypot(t.state.position.x - this.state.position.x,
                       t.state.position.z - this.state.position.z) < 20
          );
          if (nearbyFire) {
            context.emit({
              type: "fire.created",
              sourceId: this.state.id,
              payload: {
                origin: { ...this.state.position },
                intensityMw: Math.max(2.5, blastLeak * 7)
              }
            });
          }
        }
      }
    }

    if (event.type === "valve.command" && (event.targetId === this.state.id || event.payload.pipeId === this.state.id || event.sourceId === this.connectedValveId)) {
      const openFraction = Number(event.payload.openFraction ?? (event.payload.closed ? 0 : 1));
      this.leakRateKgS *= Math.max(0.02, openFraction);
      this.state.metadata.leakRateKgS = this.leakRateKgS;
    }
  }

  private release(context: TwinContext, rate: number) {
    this.leakRateKgS = Math.max(this.leakRateKgS, rate);
    this.state.metadata.leakRateKgS = this.leakRateKgS;
    this.state.integrity = Math.max(0, this.state.integrity - 0.15);
    context.emit({
      type: "release.created",
      sourceId: this.state.id,
      payload: { chemical: this.chemical, rateKgS: this.leakRateKgS, origin: { ...this.state.position } }
    });
  }

  tick(): void {}

  clone(): Twin {
    const c = new PipeTwin(this.state.id, { ...this.state.position }, this.chemical, this.lengthM, this.diameterMm);
    c.leakRateKgS = this.leakRateKgS;
    c.failed = this.failed;
    c.connectedValveId = this.connectedValveId;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export type TankGeometry = "sphere" | "bullet" | "vertical_storage";

export class TankTwin extends BaseTwin {
  heatDose = 0;
  failed = false;
  pressureBar = 15;

  constructor(
    id: string,
    position: TwinState["position"],
    public chemical = "propane",
    public tankGeometry: TankGeometry = "bullet",
    public capacityM3 = 100
  ) {
    super(
      {
        id,
        kind: "tank",
        position,
        fidelity: 1,
        active: true,
        integrity: 1,
        temperatureK: 303,
        metadata: {
          chemical,
          tankGeometry,
          capacityM3,
          pressureBar: 15,
          fillPercent: 75,
          failureRisk: 0,
          bleveThresholdDose: 900
        }
      },
      physical("high_strength_steel", { chemical, tankGeometry, capacityM3, designPressureBar: 30 })
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.type === "suppression.command") {
      const coolingRate = Number(event.payload.coolingRateK ?? 5);
      this.state.temperatureK = Math.max(303, this.state.temperatureK - coolingRate);
      this.heatDose = Math.max(0, this.heatDose - coolingRate * 10);
      this.state.metadata.failureRisk = Math.min(0.99, this.heatDose / 16000);
      return;
    }

    if (event.type === "blast.impact" && event.targetId === this.state.id) {
      const overpressureKpa = Number(event.payload.overpressureKpa ?? 0);
      if (overpressureKpa > 60) {
        this.state.integrity = Math.max(0, this.state.integrity - overpressureKpa * 0.003);
      }
    }

    if (event.type !== "thermal.exposure" || event.targetId !== this.state.id || this.failed) return;
    this.record(event, "thermal exposure received");

    const flux = Number(event.payload.heatFluxKwM2 ?? 0);
    this.heatDose += flux;
    this.state.temperatureK += flux * 0.018;
    this.pressureBar += flux * 0.008;
    this.state.integrity = Math.max(0, this.state.integrity - flux * 0.00008);
    this.state.metadata.pressureBar = Number(this.pressureBar.toFixed(1));
    this.state.metadata.failureRisk = Math.min(0.99, this.heatDose / 16000);

    if (this.heatDose >= 900 || this.state.temperatureK >= 520 || this.state.integrity <= 0.65) {
      this.failed = true;
      this.state.active = false;
      this.state.integrity = 0;
      this.state.metadata.ruptured = true;

      context.emit({
        type: "asset.failed",
        sourceId: this.state.id,
        payload: { kind: "tank", mode: "thermal-rupture-bleve", heatDose: this.heatDose, chemical: this.chemical }
      });
      context.emit({
        type: "blast.created",
        sourceId: this.state.id,
        payload: { origin: { ...this.state.position }, energyMj: this.capacityM3 * 25, yieldKgTnt: this.capacityM3 * 6 }
      });
      context.emit({
        type: "release.created",
        sourceId: this.state.id,
        payload: { chemical: this.chemical, rateKgS: 5.0, origin: { ...this.state.position } }
      });
      context.emit({
        type: "fire.created",
        sourceId: this.state.id,
        payload: { origin: { ...this.state.position }, intensityMw: 12 }
      });

      // Domino cascade: pre-heat adjacent tanks within the fireball radius.
      // A BLEVE fireball delivers intense radiant heat to tanks within ~20 m,
      // dramatically accelerating their own failure timeline.
      // Also spawn direct fire impingement on adjacent tanks (< 12 m).
      for (const t of context.twins()) {
        if (t.state.id === this.state.id || t.state.kind !== "tank") continue;
        const dist = Math.hypot(
          t.state.position.x - this.state.position.x,
          t.state.position.z - this.state.position.z
        );
        if (dist < 20) {
          // Immediate high heat dose from fireball radiation
          const fireball_flux = Math.min(60, (12 * 120) / Math.max(1, dist * dist));
          context.emit({
            type: "thermal.exposure",
            sourceId: this.state.id,
            targetId: t.state.id,
            payload: { heatFluxKwM2: fireball_flux }
          });
        }
        if (dist < 12) {
          // Direct impingement — spawn a secondary fire at the adjacent tank
          context.emit({
            type: "fire.created",
            sourceId: this.state.id,
            payload: {
              origin: { x: t.state.position.x, y: t.state.position.y + 0.5, z: t.state.position.z },
              intensityMw: 8
            }
          });
        }
      }
    }
  }

  tick(): void {}

  clone(): Twin {
    const c = new TankTwin(this.state.id, { ...this.state.position }, this.chemical, this.tankGeometry, this.capacityM3);
    c.heatDose = this.heatDose;
    c.failed = this.failed;
    c.pressureBar = this.pressureBar;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class ValveTwin extends BaseTwin {
  openFraction = 1.0;
  failed = false;

  constructor(
    id: string,
    position: TwinState["position"],
    public valveType: "esdv" | "control" | "manual" = "esdv",
    public connectedPipeId?: string
  ) {
    super(
      {
        id,
        kind: "valve",
        position,
        fidelity: 1,
        active: true,
        integrity: 1,
        temperatureK: 303,
        metadata: { valveType, openFraction: 1.0, connectedPipeId: connectedPipeId ?? "none", actuatorState: "OPEN" }
      },
      physical("forged_steel", { valveType, ratingClass: 600, actuationSpeedS: 2 })
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.sourceId === this.state.id) return;

    if (event.type === "valve.command" && (event.targetId === this.state.id || !event.targetId)) {
      if (this.failed) return;
      const target = Number(event.payload.openFraction ?? (event.payload.closed ? 0 : 1));
      this.openFraction = Math.max(0, Math.min(1, target));
      this.state.metadata.openFraction = this.openFraction;
      this.state.metadata.actuatorState = this.openFraction === 0 ? "CLOSED" : this.openFraction === 1 ? "OPEN" : "THROTTLED";
      this.record(event, `valve commanded to ${this.openFraction}`);

      if (this.connectedPipeId) {
        context.emit({
          type: "valve.command",
          sourceId: this.state.id,
          targetId: this.connectedPipeId,
          payload: { pipeId: this.connectedPipeId, openFraction: this.openFraction }
        });
      }
    }

    if (event.type === "thermal.exposure" && event.targetId === this.state.id) {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      this.state.temperatureK += flux * 0.02;
      this.state.integrity = Math.max(0, this.state.integrity - flux * 0.0003);
      if (this.state.temperatureK > 450 && !this.failed) {
        this.failed = true;
        this.state.metadata.actuatorState = "SEIZED";
        context.emit({ type: "fault.valve_fail", sourceId: this.state.id, payload: { reason: "thermal_seizure" } });
      }
    }
  }

  tick(): void {}

  clone(): Twin {
    const c = new ValveTwin(this.state.id, { ...this.state.position }, this.valveType, this.connectedPipeId);
    c.openFraction = this.openFraction;
    c.failed = this.failed;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class PumpTwin extends BaseTwin {
  rpm = 2950;
  vibrationMmS = 1.2;
  failed = false;

  constructor(
    id: string,
    position: TwinState["position"],
    public pumpType = "centrifugal_feed",
    public flowRateM3H = 85
  ) {
    super(
      {
        id,
        kind: "pump",
        position,
        fidelity: 1,
        active: true,
        integrity: 1,
        temperatureK: 325,
        metadata: { pumpType, flowRateM3H, rpm: 2950, vibrationMmS: 1.2, status: "RUNNING", isIgnitionSource: true }
      },
      physical("cast_steel", { pumpType, flowRateM3H, motorPowerKw: 45 })
    );
  }

  onEvent(event: SimEvent): void {
    if (event.type === "fault.pump_overheat" && (event.targetId === this.state.id || !event.targetId)) {
      this.vibrationMmS = 8.5;
      this.state.temperatureK = 680;
      this.state.integrity = 0.35;
      this.state.metadata.status = "OVERHEATED_HOT_SURFACE";
      this.state.metadata.vibrationMmS = this.vibrationMmS;
      this.record(event, "pump mechanical seal failure & bearing overheat");
    }

    if (event.type === "thermal.exposure" && event.targetId === this.state.id) {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      this.state.temperatureK += flux * 0.03;
      if (this.state.temperatureK > 550 && !this.failed) {
        this.failed = true;
        this.state.metadata.status = "TRIPPED_OVERTEMP";
        this.rpm = 0;
      }
    }
  }

  tick(): void {}

  clone(): Twin {
    const c = new PumpTwin(this.state.id, { ...this.state.position }, this.pumpType, this.flowRateM3H);
    c.rpm = this.rpm;
    c.vibrationMmS = this.vibrationMmS;
    c.failed = this.failed;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class SuppressionTwin extends BaseTwin {
  isDeluging = false;

  constructor(
    id: string,
    position: TwinState["position"],
    public coverageRadiusM = 14,
    public flowRateKgS = 30,
    public agent = "water_deluge"
  ) {
    super(
      {
        id,
        kind: "suppression",
        position,
        fidelity: 1,
        active: true,
        integrity: 1,
        temperatureK: 295,
        metadata: { agent, coverageRadiusM, flowRateKgS, status: "STANDBY", isDeluging: false }
      },
      physical("bronze_piping", { agent, nozzleCount: 8, pressureSupplyBar: 10 })
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.sourceId === this.state.id) return;
    // Don't re-trigger from other suppression units
    if (event.sourceId.startsWith('DELUGE') || event.sourceId.startsWith('suppression')) return;

    if (event.type === "suppression.command" && (event.targetId === this.state.id || !event.targetId)) {
      this.isDeluging = true;
      this.state.metadata.status = "ACTIVATED_DELUGE";
      this.state.metadata.isDeluging = true;
      this.record(event, "deluge activated");

      // Apply immediate cooling to surrounding physical assets
      for (const t of context.twins()) {
        if (t.state.id !== this.state.id && ['tank', 'pipe', 'pump', 'fire', 'valve'].includes(t.state.kind) && dist3D(this.state.position, t.state.position) <= this.coverageRadiusM) {
          context.emit({
            type: "suppression.command",
            sourceId: this.state.id,
            targetId: t.state.id,
            payload: { coolingRateK: 15, strength: 8 }
          });
        }
      }
    }
  }

  tick(_dt: number, context: TwinContext): void {
    if (!this.isDeluging) return;
    for (const t of context.twins()) {
      if (t.state.id !== this.state.id && dist3D(this.state.position, t.state.position) <= this.coverageRadiusM) {
        if (t.state.kind === "fire") {
          context.emit({
            type: "suppression.command",
            sourceId: this.state.id,
            targetId: t.state.id,
            payload: { strength: 4.0 }
          });
        } else if (t.state.kind === "tank" || t.state.kind === "pipe" || t.state.kind === "pump") {
          t.state.temperatureK = Math.max(295, t.state.temperatureK - 2.5);
        }
      }
    }
  }

  clone(): Twin {
    const c = new SuppressionTwin(this.state.id, { ...this.state.position }, this.coverageRadiusM, this.flowRateKgS, this.agent);
    c.isDeluging = this.isDeluging;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class WorkerTwin extends BaseTwin {
  thermalDose = 0;
  toxicDose = 0;
  isEvacuating = false;
  targetPos: Vec3;
  evacuated = false;

  constructor(
    id: string,
    position: TwinState["position"],
    public role = "Field Operator",
    public musterPoint: Vec3 = { x: 30, y: 0, z: 20 }
  ) {
    super(
      {
        id,
        kind: "worker",
        position,
        fidelity: 1,
        active: true,
        integrity: 1,
        temperatureK: 310,
        metadata: { role, thermalDose: 0, toxicDose: 0, status: "PATROL", evacuated: false }
      },
      physical("human_responder", { role, ppeRating: "Level_B_FireResistant", speedMPerS: 3.5 })
    );
    this.targetPos = { ...position };
  }

  onEvent(event: SimEvent): void {
    if (event.type === "worker.evacuate" || event.type === "fire.created" || event.type === "blast.created") {
      this.isEvacuating = true;
      this.targetPos = { ...this.musterPoint };
      this.state.metadata.status = "EVACUATING_TO_MUSTER";
    }

    if (event.type === "thermal.exposure" && event.targetId === this.state.id) {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      this.thermalDose += flux;
      this.state.integrity = Math.max(0, this.state.integrity - flux * 0.005);
      this.state.metadata.thermalDose = Number(this.thermalDose.toFixed(1));
      if (!this.isEvacuating) {
        this.isEvacuating = true;
        this.targetPos = { ...this.musterPoint };
      }
    }
  }

  tick(dt: number, context: TwinContext): void {
    for (const t of context.twins()) {
      if (t.state.kind === "release" && t.state.active) {
        const d = dist3D(this.state.position, t.state.position);
        const radius = Number(t.state.metadata.radiusM ?? 2);
        if (d <= radius * 1.5) {
          this.toxicDose += dt * 0.5;
          this.state.metadata.toxicDose = Number(this.toxicDose.toFixed(2));
          this.state.integrity = Math.max(0, this.state.integrity - dt * 0.02);
          if (!this.isEvacuating) {
            this.isEvacuating = true;
            this.targetPos = { ...this.musterPoint };
          }
        }
      }
    }

    if (this.isEvacuating && !this.evacuated) {
      // Dynamic Threat Repulsion: Compute safe egress vector
      // 1. Goal attraction vector toward muster point
      let dirX = this.targetPos.x - this.state.position.x;
      let dirZ = this.targetPos.z - this.state.position.z;
      const targetDist = Math.hypot(dirX, dirZ);

      if (targetDist < 0.6) {
        this.evacuated = true;
        this.state.metadata.status = "SAFELY_EVACUATED";
        this.state.metadata.evacuated = true;
        return;
      }

      // Normalize target direction
      dirX /= targetDist;
      dirZ /= targetDist;

      // 2. Obstacle & Threat Repulsion: Steer away from active fires and dense vapour
      let repX = 0;
      let repZ = 0;
      for (const t of context.twins()) {
        if (t.state.id === this.state.id) continue;
        if (t.state.kind === "fire" && t.state.active) {
          const rx = this.state.position.x - t.state.position.x;
          let rz = this.state.position.z - t.state.position.z;
          // Add lateral evasion bias if directly collinear on axis
          if (Math.abs(rz) < 0.2) {
            rz = 2.0;
          }
          const d = Math.hypot(rx, rz);
          if (d < 18 && d > 0.1) {
            const force = (18 - d) / (d * d) * 16.0;
            repX += (rx / d) * force;
            repZ += (rz / d) * force;
          }
        }
      }

      // 3. Combine attraction and repulsion
      let stepX = dirX + repX;
      let stepZ = dirZ + repZ;
      const stepLen = Math.hypot(stepX, stepZ);
      if (stepLen > 0.001) {
        stepX /= stepLen;
        stepZ /= stepLen;
      }

      const speed = 3.8 * dt;
      const step = Math.min(speed, targetDist);
      this.state.position.x += stepX * step;
      this.state.position.z += stepZ * step;
    }
  }

  clone(): Twin {
    const c = new WorkerTwin(this.state.id, { ...this.state.position }, this.role, this.musterPoint);
    c.thermalDose = this.thermalDose;
    c.toxicDose = this.toxicDose;
    c.isEvacuating = this.isEvacuating;
    c.targetPos = { ...this.targetPos };
    c.evacuated = this.evacuated;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class FlareStackTwin extends BaseTwin {
  flaringRateKgS = 0;

  constructor(
    id: string,
    position: TwinState["position"],
    public stackHeightM = 22,
    public pilotActive = true
  ) {
    super(
      {
        id,
        kind: "flare",
        position,
        fidelity: 1,
        active: true,
        integrity: 1,
        temperatureK: 580,
        metadata: { stackHeightM, pilotActive: true, flaringRateKgS: 0, status: "PILOT_BURNING" }
      },
      physical("structural_alloy", { stackHeightM, capacityKgS: 50, designRadiationLimitKwM2: 4.73 })
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.type === "flare.ignited" && (event.targetId === this.state.id || !event.targetId)) {
      this.flaringRateKgS = Number(event.payload.rateKgS ?? 8.0);
      this.state.metadata.flaringRateKgS = this.flaringRateKgS;
      this.state.metadata.status = "FULL_FLARING_RELIEF";
      this.record(event, `flaring active at ${this.flaringRateKgS} kg/s`);

      context.emit({
        type: "fire.created",
        sourceId: this.state.id,
        payload: {
          origin: { x: this.state.position.x, y: this.state.position.y + this.stackHeightM, z: this.state.position.z },
          intensityMw: 15
        }
      });
    }
  }

  tick(): void {}

  clone(): Twin {
    const c = new FlareStackTwin(this.state.id, { ...this.state.position }, this.stackHeightM, this.pilotActive);
    c.flaringRateKgS = this.flaringRateKgS;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class IgnitionSourceTwin extends BaseTwin {
  constructor(id: string, position: TwinState["position"], public enabled = true) {
    super(
      { id, kind: "ignition", position, fidelity: 1, active: true, integrity: 1, temperatureK: 650, metadata: { enabled } },
      physical("ignition-source", { enabled })
    );
  }
  onEvent(): void {}
  tick(): void {}
  clone(): Twin {
    const c = new IgnitionSourceTwin(this.state.id, { ...this.state.position }, this.enabled);
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class WallTwin extends BaseTwin {
  constructor(id: string, position: TwinState["position"], public widthM = 8, public heightM = 4) {
    super(
      {
        id,
        kind: "wall",
        position,
        fidelity: 0,
        active: true,
        integrity: 1,
        temperatureK: 303,
        metadata: { damageState: "normal", blastShieldRatingKpa: 120, widthM, heightM }
      },
      physical("reinforced_blast_concrete", { widthM, heightM, thicknessM: 0.4 })
    );
  }

  onEvent(event: SimEvent): void {
    if (event.type === "blast.impact" && event.targetId === this.state.id) {
      const overpressureKpa = Number(event.payload.overpressureKpa ?? 0);
      this.state.integrity = Math.max(0, this.state.integrity - overpressureKpa * 0.003);
      this.state.metadata.damageState = this.state.integrity < 0.4 ? "collapsed" : this.state.integrity < 0.75 ? "cracked" : "normal";
    }

    if (event.type === "thermal.exposure" && event.targetId === this.state.id) {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      this.state.temperatureK += flux * 0.01;
      this.state.integrity = Math.max(0, this.state.integrity - flux * 0.00004);
      this.state.metadata.damageState = this.state.integrity < 0.55 ? "severe" : this.state.integrity < 0.8 ? "damaged" : "normal";
    }
  }

  tick(): void {}

  clone(): Twin {
    const c = new WallTwin(this.state.id, { ...this.state.position }, this.widthM, this.heightM);
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

