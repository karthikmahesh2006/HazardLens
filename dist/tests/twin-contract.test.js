import test from "node:test";
import assert from "node:assert/strict";
import { FlareStackTwin, IgnitionSourceTwin, PipeTwin, PumpTwin, SuppressionTwin, TankTwin, ValveTwin, WallTwin, WeatherTwin, WorkerTwin } from "../src/twins/process.js";
import { BlastTwin, FireTwin, ReleaseTwin } from "../src/twins/hazards.js";
test("all physical and hazard twins expose metadata and physical profile contracts", () => {
    const twins = [
        new WeatherTwin("weather-1"),
        new PipeTwin("pipe-1", { x: 0, y: 0, z: 0 }),
        new TankTwin("tank-1", { x: 5, y: 0, z: 0 }, "propane", "bullet"),
        new TankTwin("tank-sphere", { x: 10, y: 0, z: 0 }, "butane", "sphere"),
        new ValveTwin("valve-1", { x: 2, y: 0, z: 0 }, "esdv"),
        new PumpTwin("pump-1", { x: 4, y: 0, z: 0 }),
        new SuppressionTwin("suppression-1", { x: 6, y: 0, z: 0 }),
        new WorkerTwin("worker-1", { x: 8, y: 0, z: 0 }),
        new FlareStackTwin("flare-1", { x: 12, y: 0, z: 0 }),
        new WallTwin("wall-1", { x: 14, y: 0, z: 0 }),
        new IgnitionSourceTwin("ign-1", { x: 16, y: 0, z: 0 }),
        new ReleaseTwin("rel-1", { x: 0, y: 0, z: 0 }, "pipe-1", 0.5),
        new FireTwin("fire-1", { x: 0, y: 0, z: 0 }, 5),
        new BlastTwin("blast-1", { x: 0, y: 0, z: 0 }, 1000, 250)
    ];
    for (const twin of twins) {
        assert.ok(twin.metadata, `Twin ${twin.state.id} (${twin.state.kind}) missing metadata`);
        assert.ok(Array.isArray(twin.metadata.relationships), `Twin ${twin.state.id} missing relationships array`);
        assert.ok(Array.isArray(twin.metadata.history), `Twin ${twin.state.id} missing history array`);
        assert.ok(twin.metadata.physicalProfile, `Twin ${twin.state.id} missing physical profile`);
    }
});
test("twin cloning preserves all upgraded metadata and internal parameters", () => {
    const valve = new ValveTwin("val-test", { x: 1, y: 2, z: 3 }, "esdv", "pipe-1");
    const pump = new PumpTwin("pump-test", { x: 4, y: 5, z: 6 });
    const worker = new WorkerTwin("worker-test", { x: 7, y: 8, z: 9 });
    const tank = new TankTwin("tank-test", { x: 10, y: 11, z: 12 }, "propane", "sphere", 300);
    const valveClone = valve.clone();
    const pumpClone = pump.clone();
    const workerClone = worker.clone();
    const tankClone = tank.clone();
    assert.equal(valveClone.state.id, valve.state.id);
    assert.equal(pumpClone.state.id, pump.state.id);
    assert.equal(workerClone.state.id, worker.state.id);
    assert.equal(tankClone.state.id, tank.state.id);
    assert.ok(valveClone.metadata && Array.isArray(valveClone.metadata.relationships));
    assert.ok(pumpClone.metadata && Array.isArray(pumpClone.metadata.relationships));
    assert.ok(workerClone.metadata && Array.isArray(workerClone.metadata.relationships));
    assert.ok(tankClone.metadata && Array.isArray(tankClone.metadata.relationships));
});
