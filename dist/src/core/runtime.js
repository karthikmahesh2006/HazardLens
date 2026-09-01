import { BlastTwin, FireTwin, ReleaseTwin } from "../twins/hazards.js";
export class SimulationRuntime {
    registry = new Map();
    queue = [];
    history = [];
    sequence = 0;
    time = 0;
    constructor(twins = []) {
        for (const t of twins)
            this.add(t);
    }
    add(t) {
        if (this.registry.has(t.state.id))
            throw new Error(`Duplicate twin ${t.state.id}`);
        this.registry.set(t.state.id, t);
    }
    get(id) {
        return this.registry.get(id);
    }
    emit(e) {
        this.queue.push({ ...e, id: `evt-${++this.sequence}`, time: this.time });
    }
    step(dt) {
        if (dt <= 0)
            throw new Error("dt must be positive");
        this.drainEvents();
        const c = this.context();
        for (const t of [...this.registry.values()]) {
            if (t.state.active)
                t.tick(dt, c);
        }
        this.time += dt;
        this.drainEvents();
    }
    run(duration, dt = 0.25) {
        const end = this.time + duration;
        while (this.time + 1e-9 < end)
            this.step(Math.min(dt, end - this.time));
    }
    snapshot() {
        return {
            time: this.time,
            twins: [...this.registry.values()].map(t => structuredClone(t.state)),
            events: structuredClone(this.history)
        };
    }
    clone() {
        const x = new SimulationRuntime([...this.registry.values()].map(t => t.clone()));
        x.time = this.time;
        x.sequence = this.sequence;
        for (const e of this.history)
            x.history.push(structuredClone(e));
        for (const e of this.queue)
            x.queue.push(structuredClone(e));
        return x;
    }
    context() {
        return {
            now: this.time,
            get: id => this.registry.get(id),
            twins: () => [...this.registry.values()],
            emit: e => this.emit(e)
        };
    }
    materialize(e) {
        if (e.type === "release.created") {
            const p = e.payload;
            const id = `release-${this.sequence}`;
            if (!this.registry.has(id)) {
                this.add(new ReleaseTwin(id, p.origin, e.sourceId, Number(p.rateKgS)));
            }
        }
        if (e.type === "fire.created") {
            const p = e.payload;
            const id = `fire-${this.sequence}`;
            if (!this.registry.has(id)) {
                this.add(new FireTwin(id, p.origin, Number(p.intensityMw)));
            }
        }
        if (e.type === "blast.created") {
            const p = e.payload;
            const id = `blast-${this.sequence}`;
            if (!this.registry.has(id)) {
                this.add(new BlastTwin(id, p.origin, Number(p.energyMj ?? 1000), Number(p.yieldKgTnt ?? 250)));
            }
        }
    }
    drainEvents() {
        let guard = 0;
        while (this.queue.length) {
            if (++guard > 10000)
                throw new Error("Event cascade exceeded safety limit");
            const e = this.queue.shift();
            this.history.push(e);
            this.materialize(e);
            const c = this.context();
            if (e.targetId) {
                this.registry.get(e.targetId)?.onEvent(e, c);
            }
            else {
                for (const t of [...this.registry.values()]) {
                    t.onEvent(e, c);
                }
            }
        }
    }
}
