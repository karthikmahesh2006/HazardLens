import { SimEvent, Twin, TwinContext, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";
export declare class ReleaseTwin extends BaseTwin {
    sourceId: string;
    rateKgS: number;
    age: number;
    ignited: boolean;
    constructor(id: string, p: Vec3, sourceId: string, rateKgS: number);
    onEvent(e: SimEvent, c: TwinContext): void;
    tick(dt: number, c: TwinContext): void;
    private _igniteNow;
    clone(): Twin;
}
export declare class FireTwin extends BaseTwin {
    intensityMw: number;
    fireAge: number;
    private contactTime;
    private spawned;
    constructor(id: string, p: Vec3, intensityMw: number);
    onEvent(e: SimEvent): void;
    tick(dt: number, c: TwinContext): void;
    clone(): Twin;
}
export declare class BlastTwin extends BaseTwin {
    energyMj: number;
    yieldKgTnt: number;
    radiusM: number;
    age: number;
    maxRadiusM: number;
    propagationSpeedMPerS: number;
    private shockIgnited;
    constructor(id: string, p: Vec3, energyMj?: number, yieldKgTnt?: number);
    onEvent(): void;
    tick(dt: number, c: TwinContext): void;
    clone(): Twin;
}
