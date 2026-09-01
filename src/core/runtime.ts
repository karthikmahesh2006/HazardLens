import { SimEvent, Twin, TwinContext, WorldSnapshot } from "./types.js";

export class SimulationRuntime {
  private readonly registry = new Map<string, Twin>();
  private readonly queue: SimEvent[] = [];
  private readonly history: SimEvent[] = [];
  private sequence = 0;
  time = 0;

  constructor(twins: Twin[] = []) {
    for (const twin of twins) this.add(twin);
  }

  add(twin: Twin): void {
    if (this.registry.has(twin.state.id)) throw new Error(`Duplicate twin ${twin.state.id}`);
    this.registry.set(twin.state.id, twin);
  }

  get(id: string): Twin | undefined { return this.registry.get(id); }

  emit<T>(event: Omit<SimEvent<T>, "id" | "time">): void {
    this.queue.push({ ...event, id: `evt-${++this.sequence}`, time: this.time });
  }

  step(dt: number): void {
    if (dt <= 0) throw new Error("dt must be positive");
    this.drainEvents();
    const context = this.context();
    for (const twin of this.registry.values()) {
      if (twin.state.active) twin.tick(dt, context);
    }
    this.time += dt;
    this.drainEvents();
  }

  run(duration: number, dt = 0.25): void {
    const end = this.time + duration;
    while (this.time + 1e-9 < end) this.step(Math.min(dt, end - this.time));
  }

  snapshot(): WorldSnapshot {
    return {
      time: this.time,
      twins: [...this.registry.values()].map(t => structuredClone(t.state)),
      events: structuredClone(this.history),
    };
  }

  clone(): SimulationRuntime {
    const copy = new SimulationRuntime([...this.registry.values()].map(t => t.clone()));
    copy.time = this.time;
    copy.sequence = this.sequence;
    for (const event of this.history) copy.history.push(structuredClone(event));
    for (const event of this.queue) copy.queue.push(structuredClone(event));
    return copy;
  }

  private context(): TwinContext {
    return {
      now: this.time,
      get: id => this.registry.get(id),
      twins: () => [...this.registry.values()],
      emit: event => this.emit(event),
    };
  }

  private drainEvents(): void {
    let guard = 0;
    while (this.queue.length) {
      if (++guard > 10000) throw new Error("Event cascade exceeded safety limit");
      const event = this.queue.shift()!;
      this.history.push(event);
      const context = this.context();
      if (event.targetId) this.registry.get(event.targetId)?.onEvent(event, context);
      else for (const twin of this.registry.values()) twin.onEvent(event, context);
    }
  }
}
