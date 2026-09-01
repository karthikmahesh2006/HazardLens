import { SimEvent, Twin, WorldSnapshot } from "./types.js";
export declare class SimulationRuntime {
    private readonly registry;
    private readonly queue;
    private readonly history;
    private sequence;
    time: number;
    constructor(twins?: Twin[]);
    add(t: Twin): void;
    get(id: string): Twin | undefined;
    emit<T extends Record<string, unknown>>(e: Omit<SimEvent<T>, "id" | "time">): void;
    step(dt: number): void;
    run(duration: number, dt?: number): void;
    snapshot(): WorldSnapshot;
    clone(): SimulationRuntime;
    private context;
    private materialize;
    private drainEvents;
}
