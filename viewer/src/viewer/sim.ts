import { SimulationRuntime } from '../../../src/core/runtime.js';
import type { CounterfactualComparison, WorldSnapshot } from '../../../src/core/types.js';
import {
  FlareStackTwin,
  IgnitionSourceTwin,
  PipeTwin,
  PumpTwin,
  SuppressionTwin,
  TankTwin,
  ValveTwin,
  WallTwin,
  WeatherTwin,
  WorkerTwin
} from '../../../src/twins/process.js';

export class ViewerSimulation {
  runtime: SimulationRuntime;
  running = false;
  speed = 1;
  private accumulator = 0;

  // VCR Time-Travel Replay Buffer (records up to 1200 snapshots at ~10Hz = 2 mins)
  private historySnapshots: WorldSnapshot[] = [];
  private lastRecordTime = -1;
  scrubbedSnapshot?: WorldSnapshot;

  constructor() {
    this.runtime = this.makeWorld();
    this.running = true;
    this.recordHistory();
  }

  private makeWorld() {
    return new SimulationRuntime([
      new WeatherTwin('WEATHER', 2.8, 0.4),

      // Spherical LPG feed farm
      new TankTwin('T-01_SPHERE', { x: -12, y: 0, z: -8 }, 'propane', 'sphere', 250),
      new TankTwin('T-02_SPHERE', { x: -6, y: 0, z: -8 }, 'butane', 'sphere', 250),

      // Manifold feed piping & Emergency Shutdown Valve
      new PipeTwin('P-10', { x: -2, y: 1.2, z: -5 }, 'propane', 8, 200),
      new ValveTwin('ESV-101', { x: 1, y: 1.2, z: -4.5 }, 'esdv', 'P-17'),

      // Pumping station & Ignition risk
      new PumpTwin('PUMP-01', { x: 3.5, y: 0, z: -4 }, 'centrifugal_feed', 120),
      new IgnitionSourceTwin('M-04', { x: 4.2, y: 0.5, z: -3.5 }),

      // Transfer piping
      new PipeTwin('P-17', { x: 7, y: 1.2, z: -3 }, 'propane', 8, 150),
      new IgnitionSourceTwin('E-08_SWITCHBOARD', { x: 10.5, y: 0.5, z: -2.8 }),
      new ValveTwin('V-12', { x: 11, y: 1.2, z: -2 }, 'control', 'P-22'),
      new PipeTwin('P-22', { x: 14, y: 1.2, z: -1 }, 'propane', 8, 150),

      // Product bullet tanks & vertical storage
      new TankTwin('T-03_BULLET', { x: 18, y: 0, z: -6 }, 'propane', 'bullet', 120),
      new TankTwin('T-04_BULLET', { x: 18, y: 0, z: 2 }, 'propane', 'bullet', 120),
      new TankTwin('T-05_STORAGE', { x: 26, y: 0, z: -2 }, 'condensate', 'vertical_storage', 400),

      // Blast & firewall protection
      new WallTwin('W-01', { x: 5, y: 2, z: -8 }, 10, 4),
      new WallTwin('W-07', { x: 13, y: 2, z: 5 }, 12, 4),

      // Automated suppression monitors
      new SuppressionTwin('DELUGE-01', { x: 6, y: 0, z: -1.5 }, 16, 40),
      new SuppressionTwin('DELUGE-02', { x: 18, y: 0, z: -2 }, 18, 50),

      // Pressure relief flare tower
      new FlareStackTwin('FLARE-01', { x: 34, y: 0, z: -12 }, 20, true),

      // Active field operators
      new WorkerTwin('WORKER-ALPHA', { x: 2, y: 0, z: 2 }, 'Field Operator', { x: 30, y: 0, z: 14 }),
      new WorkerTwin('WORKER-BRAVO', { x: 16, y: 0, z: -8 }, 'Process Technician', { x: 30, y: 0, z: 14 })
    ]);
  }

  reset() {
    this.runtime = this.makeWorld();
    this.running = true;
    this.accumulator = 0;
    this.historySnapshots = [];
    this.historyFrames = [];
    this.scrubbedSnapshot = undefined;
    this.recordHistory();
  }

  breakPipe(pipeId = 'P-17', rateKgS = 0.7) {
    this.runtime.emit({
      type: 'fault.pipe_leak',
      sourceId: 'operator',
      targetId: pipeId,
      payload: { rateKgS }
    });
    this.running = true;
  }

  ruptureFeedLine(rateKgS = 1.8) {
    this.runtime.emit({
      type: 'fault.pipe_leak',
      sourceId: 'operator',
      targetId: 'P-10',
      payload: { rateKgS }
    });
    this.running = true;
  }

  tripPump() {
    this.runtime.emit({
      type: 'fault.pump_overheat',
      sourceId: 'operator',
      targetId: 'PUMP-01',
      payload: { reason: 'bearing_overheat_friction' }
    });
    this.running = true;
  }

  igniteFire(origin = { x: 7, y: 1.2, z: -3 }, intensityMw = 6) {
    this.runtime.emit({
      type: 'fire.created',
      sourceId: 'operator',
      payload: { origin, intensityMw }
    });
    this.running = true;
  }

  igniteTankFire(tankId = 'T-04_BULLET') {
    const tank = this.runtime.get(tankId);
    const pos = tank ? { ...tank.state.position } : { x: 18, y: 0, z: 2 };
    this.runtime.emit({
      type: 'fire.created',
      sourceId: 'operator',
      payload: { origin: { x: pos.x, y: pos.y + 1, z: pos.z }, intensityMw: 8 }
    });
    this.running = true;
  }

  closeESV() {
    this.runtime.emit({
      type: 'valve.command',
      sourceId: 'operator',
      targetId: 'ESV-101',
      payload: { openFraction: 0, closed: true }
    });
  }

  openESV() {
    this.runtime.emit({
      type: 'valve.command',
      sourceId: 'operator',
      targetId: 'ESV-101',
      payload: { openFraction: 1, closed: false }
    });
  }

  throttleValve(valveId = 'V-12', openFraction = 0.5) {
    this.runtime.emit({
      type: 'valve.command',
      sourceId: 'operator',
      targetId: valveId,
      payload: { openFraction }
    });
  }

  triggerDeluge(targetId?: string) {
    this.runtime.emit({
      type: 'suppression.command',
      sourceId: 'operator',
      targetId,
      payload: { strength: 12, coolingRateK: 25 }
    });
  }

  evacuateWorkers() {
    this.runtime.emit({
      type: 'worker.evacuate',
      sourceId: 'operator',
      payload: { musterZone: 'MUSTER_POINT' }
    });
  }

  triggerFlare(rateKgS = 15.0) {
    this.runtime.emit({
      type: 'flare.ignited',
      sourceId: 'operator',
      targetId: 'FLARE-01',
      payload: { rateKgS }
    });
  }

  extinguishAll() {
    for (const t of this.runtime.snapshot().twins) {
      if (t.kind === 'fire' && t.active) {
        this.runtime.emit({
          type: 'suppression.command',
          sourceId: 'operator',
          targetId: t.id,
          payload: { strength: 50 }
        });
      }
    }
  }

  shiftWind(windX: number, windZ: number) {
    const w = this.runtime.get('WEATHER');
    if (w) {
      (w as any).windX = windX;
      (w as any).windZ = windZ;
      w.state.metadata.windX = windX;
      w.state.metadata.windZ = windZ;
    }
  }

  private historyFrames: { snapshot: WorldSnapshot; runtime: SimulationRuntime }[] = [];

  private recordHistory() {
    const now = this.runtime.time;
    if (now - this.lastRecordTime >= 0.1) {
      this.lastRecordTime = now;
      this.historySnapshots.push(this.runtime.snapshot());
      this.historyFrames.push({ snapshot: this.runtime.snapshot(), runtime: this.runtime.clone() });
      if (this.historySnapshots.length > 1200) {
        this.historySnapshots.shift();
        this.historyFrames.shift();
      }
    }
  }

  getHistory(): WorldSnapshot[] {
    return this.historySnapshots;
  }

  scrubTo(timeSec: number): WorldSnapshot | undefined {
    if (!this.historySnapshots.length) return undefined;
    let closest = this.historySnapshots[0];
    let minDiff = Math.abs(closest.time - timeSec);
    for (const snap of this.historySnapshots) {
      const diff = Math.abs(snap.time - timeSec);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snap;
      }
    }
    this.scrubbedSnapshot = closest;
    return closest;
  }

  stopScrubbing() {
    this.scrubbedSnapshot = undefined;
  }

  resumeFromScrubbed(): boolean {
    if (!this.scrubbedSnapshot) return false;
    const targetTime = this.scrubbedSnapshot.time;
    let closestFrame = this.historyFrames[0];
    let minDiff = Infinity;
    let foundIdx = 0;
    for (let i = 0; i < this.historyFrames.length; i++) {
      const diff = Math.abs(this.historyFrames[i].snapshot.time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = this.historyFrames[i];
        foundIdx = i;
      }
    }
    if (closestFrame) {
      this.runtime = closestFrame.runtime.clone();
      this.historySnapshots = this.historySnapshots.slice(0, foundIdx + 1);
      this.historyFrames = this.historyFrames.slice(0, foundIdx + 1);
      this.scrubbedSnapshot = undefined;
      this.running = true;
      return true;
    }
    return false;
  }

  update(realDt: number) {
    if (!this.running || this.scrubbedSnapshot) return;
    this.accumulator += Math.min(realDt, 0.1) * this.speed;
    while (this.accumulator >= 0.05) {
      this.runtime.step(0.05);
      this.accumulator -= 0.05;
      this.recordHistory();
    }
  }

  snapshot(): WorldSnapshot {
    if (this.scrubbedSnapshot) return this.scrubbedSnapshot;
    return this.runtime.snapshot();
  }

  // ─── Counterfactual Branching Engine ──────────────────────────────────────
  // Forks the live simulation state into two parallel forward paths:
  // Path A (Baseline / Do Nothing) vs Path B (Intervention Applied)
  evaluateCounterfactual(
    interventionName: string,
    applyIntervention: (sim: SimulationRuntime) => void,
    horizonSec = 45
  ): CounterfactualComparison {
    // 1. Clone baseline world state
    const baseline = this.runtime.clone();
    const mitigated = this.runtime.clone();

    // 2. Run baseline path forward (no intervention)
    baseline.run(horizonSec, 0.1);
    const snapA = baseline.snapshot();

    // 3. Apply candidate emergency intervention & run forward
    applyIntervention(mitigated);
    mitigated.run(horizonSec, 0.1);
    const snapB = mitigated.snapshot();

    // 4. Calculate comparative damage & consequence metrics
    const destroyedA = snapA.twins.filter(t => t.integrity <= 0.1 || t.metadata?.failed || t.metadata?.ruptured).length;
    const destroyedB = snapB.twins.filter(t => t.integrity <= 0.1 || t.metadata?.failed || t.metadata?.ruptured).length;

    const bleveA = snapA.twins.some(t => t.kind === 'blast' || t.metadata?.ruptured);
    const bleveB = snapB.twins.some(t => t.kind === 'blast' || t.metadata?.ruptured);

    const firesA = snapA.twins.filter(t => t.kind === 'fire').length;
    const firesB = snapB.twins.filter(t => t.kind === 'fire' && t.active).length;

    const workersA = snapA.twins.filter(t => t.kind === 'worker');
    const workersB = snapB.twins.filter(t => t.kind === 'worker');
    const maxDoseA = Math.max(0, ...workersA.map(w => Number(w.metadata?.thermalDose ?? 0)));
    const maxDoseB = Math.max(0, ...workersB.map(w => Number(w.metadata?.thermalDose ?? 0)));

    // Cost model: Tank $2.5M, Pipe $400k, Pump $250k, BLEVE direct blast loss $6.0M
    const calcCost = (snap: WorldSnapshot) => {
      let cost = 0;
      for (const t of snap.twins) {
        if (t.integrity <= 0.2 || t.metadata?.ruptured || t.metadata?.failed) {
          if (t.kind === 'tank') cost += 2.5;
          else if (t.kind === 'pipe') cost += 0.4;
          else if (t.kind === 'pump') cost += 0.25;
          else if (t.kind === 'wall') cost += 0.1;
        }
      }
      if (snap.twins.some(t => t.kind === 'blast')) cost += 6.0;
      return cost;
    };

    const lossA = calcCost(snapA);
    const lossB = calcCost(snapB);
    const lossAvoided = Math.max(0, lossA - lossB);

    return {
      baselineName: 'Unmitigated Baseline (No Action)',
      counterfactualName: interventionName,
      horizonDurationSec: horizonSec,
      unmitigatedLossUsd: Number(lossA.toFixed(2)),
      mitigatedLossUsd: Number(lossB.toFixed(2)),
      lossAvoidedUsd: Number(lossAvoided.toFixed(2)),
      assetsDestroyedBaseline: destroyedA,
      assetsDestroyedMitigated: destroyedB,
      crewMaxDoseBaseline: Number(maxDoseA.toFixed(1)),
      crewMaxDoseMitigated: Number(maxDoseB.toFixed(1)),
      totalFiresBaseline: firesA,
      totalFiresMitigated: firesB,
      blevePrevented: bleveA && !bleveB
    };
  }
}
