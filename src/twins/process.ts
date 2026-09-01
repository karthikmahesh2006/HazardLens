import { SimEvent, Twin, TwinContext, TwinState } from "../core/types.js";
import { BaseTwin } from "./base.js";

const cloneState = (s: TwinState): TwinState => structuredClone(s);

export class WeatherTwin extends BaseTwin {
  constructor(id: string, public windX = 2, public windZ = 0) {
    super({ id, kind: "weather", position: {x:0,y:0,z:0}, fidelity: 1, active: true, integrity: 1, temperatureK: 303, metadata: {} });
  }
  onEvent(): void {}
  tick(): void {}
  clone(): Twin { const c = new WeatherTwin(this.state.id, this.windX, this.windZ); Object.assign(c.state, cloneState(this.state)); return c; }
}

export class PipeTwin extends BaseTwin {
  leakRateKgS = 0;
  constructor(id: string, position: TwinState["position"], public chemical = "propane") {
    super({ id, kind: "pipe", position, fidelity: 1, active: true, integrity: 1, temperatureK: 303, metadata: { chemical } });
  }
  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.type === "fault.pipe_leak" && event.targetId === this.state.id) {
      this.leakRateKgS = Number((event.payload as Record<string, unknown>).rateKgS ?? 0.3);
      this.state.integrity = Math.max(0, this.state.integrity - 0.15);
      context.emit({ type: "release.created", sourceId: this.state.id, payload: { chemical: this.chemical, rateKgS: this.leakRateKgS, origin: this.state.position } });
    }
    if (event.type === "valve.command" && (event.payload as Record<string, unknown>).pipeId === this.state.id) this.leakRateKgS *= 0.08;
  }
  tick(): void {}
  clone(): Twin { const c = new PipeTwin(this.state.id, {...this.state.position}, this.chemical); c.leakRateKgS = this.leakRateKgS; Object.assign(c.state, cloneState(this.state)); return c; }
}

export class IgnitionSourceTwin extends BaseTwin {
  constructor(id: string, position: TwinState["position"], public enabled = true) {
    super({ id, kind: "ignition", position, fidelity: 1, active: true, integrity: 1, temperatureK: 650, metadata: { enabled } });
  }
  onEvent(): void {}
  tick(): void {}
  clone(): Twin { const c = new IgnitionSourceTwin(this.state.id, {...this.state.position}, this.enabled); Object.assign(c.state, cloneState(this.state)); return c; }
}

export class TankTwin extends BaseTwin {
  heatDose = 0;
  constructor(id: string, position: TwinState["position"], public chemical = "propane") {
    super({ id, kind: "tank", position, fidelity: 1, active: true, integrity: 1, temperatureK: 303, metadata: { chemical, failureRisk: 0 } });
  }
  onEvent(event: SimEvent): void {
    if (event.type !== "thermal.exposure" || event.targetId !== this.state.id) return;
    const flux = Number((event.payload as Record<string, unknown>).heatFluxKwM2 ?? 0);
    this.heatDose += flux;
    this.state.temperatureK += flux * 0.018;
    this.state.integrity = Math.max(0, this.state.integrity - flux * 0.00008);
    this.state.metadata.failureRisk = Math.min(0.99, this.heatDose / 16000);
  }
  tick(): void {}
  clone(): Twin { const c = new TankTwin(this.state.id, {...this.state.position}, this.chemical); c.heatDose = this.heatDose; Object.assign(c.state, cloneState(this.state)); return c; }
}

export class WallTwin extends BaseTwin {
  constructor(id: string, position: TwinState["position"]) {
    super({ id, kind: "wall", position, fidelity: 0, active: true, integrity: 1, temperatureK: 303, metadata: { damageState: "normal" } });
  }
  onEvent(event: SimEvent): void {
    if (event.type !== "thermal.exposure" || event.targetId !== this.state.id) return;
    const flux = Number((event.payload as Record<string, unknown>).heatFluxKwM2 ?? 0);
    this.state.temperatureK += flux * 0.01;
    this.state.integrity = Math.max(0, this.state.integrity - flux * 0.00004);
    this.state.metadata.damageState = this.state.integrity < 0.55 ? "severe" : this.state.integrity < 0.8 ? "damaged" : "normal";
  }
  tick(): void {}
  clone(): Twin { const c = new WallTwin(this.state.id, {...this.state.position}); Object.assign(c.state, cloneState(this.state)); return c; }
}
