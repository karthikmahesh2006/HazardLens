import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { FlareStackTwin, PipeTwin, PumpTwin, SuppressionTwin, TankTwin, ValveTwin, WallTwin, WeatherTwin, WorkerTwin } from "../src/twins/process.js";
import { FireTwin } from "../src/twins/hazards.js";
test("ESDV valve closure isolates downstream pipe leak", () => {
    const pipe = new PipeTwin("P-17", { x: 5, y: 0, z: 0 });
    const valve = new ValveTwin("ESV-101", { x: 0, y: 0, z: 0 }, "esdv", "P-17");
    const rt = new SimulationRuntime([pipe, valve]);
    rt.emit({ type: "fault.pipe_leak", sourceId: "op", targetId: "P-17", payload: { rateKgS: 0.8 } });
    rt.step(0.25);
    assert.equal(pipe.leakRateKgS, 0.8);
    rt.emit({ type: "valve.command", sourceId: "op", targetId: "ESV-101", payload: { openFraction: 0, closed: true } });
    rt.step(0.25);
    assert.ok(pipe.leakRateKgS < 0.1, "Pipe leak rate should be dramatically reduced upon ESDV closure");
});
test("Deluge suppression cools exposed tank and terminates fire", () => {
    const tank = new TankTwin("T-04", { x: 4, y: 0, z: 0 }, "propane", "bullet");
    const fire = new FireTwin("fire-1", { x: 0, y: 0, z: 0 }, 6);
    const deluge = new SuppressionTwin("DELUGE-01", { x: 2, y: 0, z: 0 }, 15, 30);
    const rt = new SimulationRuntime([tank, fire, deluge]);
    rt.step(1.0);
    assert.ok(tank.heatDose > 0, "Tank should receive initial thermal exposure");
    // Activate deluge
    rt.emit({ type: "suppression.command", sourceId: "op", targetId: "DELUGE-01", payload: { strength: 10 } });
    rt.run(3, 0.25);
    assert.equal(fire.state.active, false, "Fire should be extinguished by deluge");
    assert.equal(tank.failed, false, "Tank should be preserved from rupture");
});
test("Pump overheat can ignite vapor cloud and trigger worker evacuation", () => {
    const weather = new WeatherTwin("weather", 3, 0);
    const pipe = new PipeTwin("P-10", { x: 0, y: 0, z: 0 });
    const pump = new PumpTwin("PUMP-01", { x: 4, y: 0, z: 0 });
    const worker = new WorkerTwin("WORKER-ALPHA", { x: 6, y: 0, z: 0 }, "Field Operator", { x: 30, y: 0, z: 0 });
    const rt = new SimulationRuntime([weather, pipe, pump, worker]);
    // Trip pump to overheated state
    rt.emit({ type: "fault.pump_overheat", sourceId: "op", targetId: "PUMP-01", payload: {} });
    // Break pipe
    rt.emit({ type: "fault.pipe_leak", sourceId: "op", targetId: "P-10", payload: { rateKgS: 0.6 } });
    rt.run(8, 0.25);
    const snap = rt.snapshot();
    assert.ok(snap.events.some(e => e.type === "fire.created"), "Fire should ignite at overheated pump");
    assert.ok(worker.isEvacuating, "Worker should start evacuating towards muster point");
});
test("Tank BLEVE rupture generates BlastTwin shockwave damaging blast wall", () => {
    const tank = new TankTwin("T-01", { x: 0, y: 0, z: 0 }, "propane", "sphere", 200);
    const wall = new WallTwin("W-01", { x: 6, y: 0, z: 0 }, 8, 4);
    const fire = new FireTwin("primary-fire", { x: 0, y: 0, z: 0 }, 15);
    const rt = new SimulationRuntime([tank, wall, fire]);
    rt.run(8, 0.25);
    const snap = rt.snapshot();
    assert.equal(tank.failed, true, "Tank should rupture under intense fire");
    assert.ok(snap.events.some(e => e.type === "blast.created"), "Blast wave should be created on tank rupture");
    assert.ok(wall.state.integrity < 1.0, "Blast wall integrity should degrade from shockwave impact");
});
test("FlareStackTwin ignites relief flaring on emergency command", () => {
    const flare = new FlareStackTwin("FLARE-01", { x: 20, y: 0, z: 0 }, 25);
    const rt = new SimulationRuntime([flare]);
    rt.emit({ type: "flare.ignited", sourceId: "op", targetId: "FLARE-01", payload: { rateKgS: 10 } });
    rt.step(0.25);
    const snap = rt.snapshot();
    assert.equal(flare.flaringRateKgS, 10);
    assert.ok(snap.events.some(e => e.type === "fire.created" && e.sourceId === "FLARE-01"));
});
