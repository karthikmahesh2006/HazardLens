import { SimulationRuntime } from "./core/runtime.js";
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
} from "./twins/process.js";

const sim = new SimulationRuntime([
  new WeatherTwin("WEATHER", 2.5, 0),
  new TankTwin("T-01_SPHERE", { x: -10, y: 0, z: -5 }, "propane", "sphere", 250),
  new PipeTwin("P-10", { x: -2, y: 1, z: -4 }),
  new ValveTwin("ESV-101", { x: 0, y: 1, z: -4 }, "esdv", "P-17"),
  new PumpTwin("PUMP-01", { x: 3, y: 0, z: -3 }),
  new IgnitionSourceTwin("M-04", { x: 4, y: 0, z: -3 }),
  new PipeTwin("P-17", { x: 7, y: 1, z: -2 }),
  new TankTwin("T-04_BULLET", { x: 14, y: 0, z: 0 }, "propane", "bullet", 120),
  new SuppressionTwin("DELUGE-01", { x: 6, y: 0, z: -2 }, 15, 35),
  new FlareStackTwin("FLARE-01", { x: 25, y: 0, z: -10 }),
  new WallTwin("W-07", { x: 10, y: 2, z: 4 }),
  new WorkerTwin("WORKER-ALPHA", { x: 2, y: 0, z: 2 })
]);

console.log(`Facility initialized with ${sim.snapshot().twins.length} digital twins.`);

// Operator introduces pipe leak
sim.emit({ type: "fault.pipe_leak", sourceId: "operator", targetId: "P-17", payload: { rateKgS: 0.7 } });
sim.run(6);

// Operator triggers emergency shutdown valve and deluge cooling
sim.emit({ type: "valve.command", sourceId: "operator", targetId: "ESV-101", payload: { openFraction: 0, closed: true } });
sim.emit({ type: "suppression.command", sourceId: "operator", targetId: "DELUGE-01", payload: { strength: 10 } });
sim.run(6);

const s = sim.snapshot();
console.log(
  JSON.stringify(
    {
      time: s.time,
      twinCount: s.twins.length,
      twins: s.twins.map(t => ({ id: t.id, kind: t.kind, integrity: t.integrity, tempK: t.temperatureK })),
      causalEvents: s.events.map(e => ({ t: e.time, type: e.type, source: e.sourceId, target: e.targetId }))
    },
    null,
    2
  )
);

