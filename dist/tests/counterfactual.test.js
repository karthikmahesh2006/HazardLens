import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationRuntime } from '../src/core/runtime.js';
import { FireTwin } from '../src/twins/hazards.js';
import { WorkerTwin } from '../src/twins/process.js';
import { ViewerSimulation } from '../viewer/src/viewer/sim.js';
test('FireTwin calculates ERPG / ALOHA threat zone radii', () => {
    const fire = new FireTwin('FIRE-TEST', { x: 0, y: 0, z: 0 }, 10);
    const runtime = new SimulationRuntime([fire]);
    runtime.step(0.5);
    const snap = runtime.snapshot();
    const f = snap.twins.find(t => t.id === 'FIRE-TEST');
    assert.ok(f);
    // hot = sqrt(10 * 120 / 10) = sqrt(120) ≈ 10.95
    // warm = sqrt(10 * 120 / 5) = sqrt(240) ≈ 15.49
    // cold = sqrt(10 * 120 / 1.6) = sqrt(750) ≈ 27.38
    assert.ok(Number(f.metadata.threatHotM) >= 10);
    assert.ok(Number(f.metadata.threatWarmM) >= 14);
    assert.ok(Number(f.metadata.threatColdM) >= 25);
});
test('WorkerTwin dynamic threat repulsion pathfinding steers around active fires', () => {
    // Worker at (0, 0, 0), goal at (20, 0, 0), Fire directly in between at (10, 0, 0)
    const worker = new WorkerTwin('WORKER-TEST', { x: 0, y: 0, z: 0 }, 'Operator', { x: 20, y: 0, z: 0 });
    const fire = new FireTwin('FIRE-BLOCK', { x: 10, y: 0, z: 0 }, 15);
    const runtime = new SimulationRuntime([worker, fire]);
    // Order evacuation
    runtime.emit({ type: 'worker.evacuate', sourceId: 'operator', payload: {} });
    // Step 6 seconds (allowing worker to flank around the flame boundary)
    for (let i = 0; i < 60; i++) {
        runtime.step(0.1);
    }
    const snap = runtime.snapshot();
    const w = snap.twins.find(t => t.id === 'WORKER-TEST');
    assert.ok(w);
    // Worker should dynamically deviate in Z (repelling from fire at Z=0) and advance towards X=20
    assert.ok(Math.abs(w.position.z) > 0.5, 'Worker should dynamically repel and flank in Z dimension');
    assert.ok(w.position.x > 0.5, 'Worker should advance towards egress point in X');
});
test('ViewerSimulation counterfactual engine calculates loss avoided and prevents BLEVE', () => {
    const sim = new ViewerSimulation();
    // Trigger a serious pipe leak on P-17
    sim.breakPipe('P-17', 1.2);
    // Evaluate counterfactual intervention forward 30 seconds
    const result = sim.evaluateCounterfactual('Emergency ESDV Isolation + Process Deluge', s => {
        s.emit({ type: 'valve.command', sourceId: 'operator', targetId: 'ESV-101', payload: { openFraction: 0, closed: true } });
        s.emit({ type: 'suppression.command', sourceId: 'operator', targetId: 'DELUGE-01', payload: { strength: 20 } });
    }, 30);
    assert.equal(result.counterfactualName, 'Emergency ESDV Isolation + Process Deluge');
    assert.ok(result.lossAvoidedUsd >= 0);
    assert.ok(result.assetsDestroyedBaseline >= result.assetsDestroyedMitigated);
});
test('VCR replay buffer stores snapshots and allows time scrubbing', () => {
    const sim = new ViewerSimulation();
    // Run a few steps to populate history
    for (let i = 0; i < 20; i++) {
        sim.update(0.1);
    }
    const history = sim.getHistory();
    assert.ok(history.length >= 5, 'History should contain recorded snapshots');
    // Scrub to timestamp 0.5s
    const scrubbed = sim.scrubTo(0.5);
    assert.ok(scrubbed);
    assert.ok(Math.abs(scrubbed.time - 0.5) < 0.3);
    // Stop scrubbing
    sim.stopScrubbing();
    assert.equal(sim.scrubbedSnapshot, undefined);
});
