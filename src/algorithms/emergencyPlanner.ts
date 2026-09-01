import type { Vec3, WorldSnapshot } from '../core/types.js';

export interface FacilityEdge {
  from: string;
  to: string;
  type: string;
}

export interface RouteResult {
  workerId: string;
  path: string[];
  distanceM: number;
  riskScore: number;
  estimatedSeconds: number;
  avoidedHazardCost: number;
}

export interface RiskAssessment {
  score: number;
  level: 'LOW' | 'GUARDED' | 'HIGH' | 'CRITICAL';
  contributors: string[];
}

export interface InterventionCandidate {
  name: string;
  apply: (runtime: { emit(event: any): void }) => void;
}

export interface RankedIntervention {
  name: string;
  lossAvoidedUsd: number;
  crewDoseReduction: number;
  assetLossReduction: number;
  firesReduced: number;
  score: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Deterministic decision-support algorithms used by the viewer.
 * These are intentionally conservative educational heuristics, not a safety
 * instrument or substitute for validated process-safety calculations.
 */
export class EmergencyPlanner {
  private readonly edges: FacilityEdge[];

  constructor(edges: FacilityEdge[]) {
    this.edges = edges;
  }

  /**
   * Dijkstra on a facility graph. Edge weights increase near active fires,
   * releases and failed equipment, so the safest route can differ from the
   * geometrically shortest route.
   */
  safestRoute(snapshot: WorldSnapshot, workerId: string, muster: Vec3): RouteResult | undefined {
    const worker = snapshot.twins.find(t => t.id === workerId && t.kind === 'worker');
    if (!worker) return undefined;

    const positions = new Map<string, Vec3>();
    for (const twin of snapshot.twins) positions.set(twin.id, twin.position);
    positions.set('MUSTER_POINT', muster);

    const adjacency = new Map<string, { to: string; type: string }[]>();
    for (const edge of this.edges) {
      if (!positions.has(edge.from) || !positions.has(edge.to)) continue;
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
      adjacency.get(edge.from)!.push({ to: edge.to, type: edge.type });
      adjacency.get(edge.to)!.push({ to: edge.from, type: edge.type });
    }

    // Worker-to-zone connections in the existing facility graph are represented
    // by zone IDs, so attach workers to nearby physical assets as entry points.
    const nearby = snapshot.twins
      .filter(t => t.kind !== 'worker' && t.kind !== 'weather')
      .map(t => ({ id: t.id, d: distance(worker.position, t.position) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const n of nearby) {
      if (!adjacency.has(workerId)) adjacency.set(workerId, []);
      adjacency.get(workerId)!.push({ to: n.id, type: 'walkway' });
      if (!adjacency.has(n.id)) adjacency.set(n.id, []);
      adjacency.get(n.id)!.push({ to: workerId, type: 'walkway' });
    }

    // Connect the nearest graph nodes to the muster point.
    const exits = snapshot.twins
      .filter(t => t.kind === 'worker' || t.kind === 'flare' || t.kind === 'wall')
      .map(t => ({ id: t.id, d: distance(t.position, muster) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const e of exits) {
      if (!adjacency.has(e.id)) adjacency.set(e.id, []);
      adjacency.get(e.id)!.push({ to: 'MUSTER_POINT', type: 'emergency_route' });
      adjacency.set('MUSTER_POINT', [...(adjacency.get('MUSTER_POINT') ?? []), { to: e.id, type: 'emergency_route' }]);
    }

    const dist = new Map<string, number>([[workerId, 0]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();

    while (true) {
      let current: string | undefined;
      let best = Infinity;
      for (const [node, d] of dist) {
        if (!visited.has(node) && d < best) {
          best = d;
          current = node;
        }
      }
      if (!current || current === 'MUSTER_POINT') break;
      visited.add(current);

      for (const edge of adjacency.get(current) ?? []) {
        if (visited.has(edge.to)) continue;
        const a = positions.get(current)!;
        const b = positions.get(edge.to)!;
        const base = Math.max(1, distance(a, b));
        const hazard = this.hazardPenalty(snapshot, b);
        const routePenalty = edge.type === 'emergency_route' ? 0.8 : edge.type === 'walkway' ? 1 : 1.15;
        const failurePenalty = this.assetFailurePenalty(snapshot, edge.to);
        const weight = base * (1 + hazard * routePenalty + failurePenalty);
        const candidate = (dist.get(current) ?? Infinity) + weight;
        if (candidate < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, candidate);
          previous.set(edge.to, current);
        }
      }
    }

    if (!dist.has('MUSTER_POINT')) return undefined;
    const path: string[] = [];
    let node = 'MUSTER_POINT';
    while (node) {
      path.unshift(node);
      if (node === workerId) break;
      node = previous.get(node)!;
      if (!node) return undefined;
    }

    const geometricDistance = path.slice(0, -1).reduce((sum, id, i) =>
      sum + distance(positions.get(id)!, positions.get(path[i + 1])!), 0);
    const riskScore = clamp(dist.get('MUSTER_POINT')! / Math.max(1, geometricDistance) * 20, 0, 100);
    return {
      workerId,
      path,
      distanceM: Number(geometricDistance.toFixed(1)),
      riskScore: Number(riskScore.toFixed(1)),
      estimatedSeconds: Number((geometricDistance / 1.4).toFixed(1)),
      avoidedHazardCost: Number(Math.max(0, dist.get('MUSTER_POINT')! - geometricDistance).toFixed(1))
    };
  }

  assessRisk(snapshot: WorldSnapshot): RiskAssessment {
    const fires = snapshot.twins.filter(t => t.kind === 'fire' && t.active);
    const releases = snapshot.twins.filter(t => t.kind === 'release' && t.active);
    const failed = snapshot.twins.filter(t => t.integrity <= 0.1 || t.metadata.failed || t.metadata.ruptured);
    const workers = snapshot.twins.filter(t => t.kind === 'worker');
    const maxDose = Math.max(0, ...workers.map(w => Number(w.metadata.thermalDose ?? 0)));
    const maxHazard = Math.max(0, ...workers.map(w => fires.reduce((sum, f) => sum + this.hazardIntensity(f, w.position), 0)));

    let score = fires.length * 18 + releases.length * 12 + failed.length * 8 + maxDose * 0.15 + maxHazard * 0.8;
    score = clamp(score, 0, 100);
    const contributors: string[] = [];
    if (fires.length) contributors.push(`${fires.length} active fire source${fires.length > 1 ? 's' : ''}`);
    if (releases.length) contributors.push(`${releases.length} active release${releases.length > 1 ? 's' : ''}`);
    if (failed.length) contributors.push(`${failed.length} compromised asset${failed.length > 1 ? 's' : ''}`);
    if (maxDose > 0) contributors.push(`crew thermal dose ${maxDose.toFixed(1)}`);
    if (!contributors.length) contributors.push('No active hazard indicators');

    const level = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'GUARDED' : 'LOW';
    return { score: Number(score.toFixed(1)), level, contributors };
  }

  rankInterventions(
    runtime: any,
    candidates: InterventionCandidate[],
    horizonSec = 45
  ): RankedIntervention[] {
    const baseline = runtime.clone();
    baseline.run(horizonSec, 0.1);
    const base = baseline.snapshot();
    const baseLoss = this.loss(base);
    const baseDose = this.maxDose(base);
    const baseFires = base.twins.filter(t => t.kind === 'fire' && t.active).length;

    return candidates.map(candidate => {
      const branch = runtime.clone();
      candidate.apply(branch);
      branch.run(horizonSec, 0.1);
      const snap = branch.snapshot();
      const loss = this.loss(snap);
      const dose = this.maxDose(snap);
      const fires = snap.twins.filter(t => t.kind === 'fire' && t.active).length;
      const lossAvoided = Math.max(0, baseLoss - loss);
      const doseReduction = Math.max(0, baseDose - dose);
      const assetReduction = Math.max(0, this.failedCount(base) - this.failedCount(snap));
      const firesReduced = Math.max(0, baseFires - fires);
      const score = lossAvoided * 10 + doseReduction * 2 + assetReduction * 8 + firesReduced * 6;
      return {
        name: candidate.name,
        lossAvoidedUsd: Number(lossAvoided.toFixed(2)),
        crewDoseReduction: Number(doseReduction.toFixed(1)),
        assetLossReduction: assetReduction,
        firesReduced,
        score: Number(score.toFixed(2))
      };
    }).sort((a, b) => b.score - a.score);
  }

  private hazardIntensity(fire: any, point: Vec3): number {
    const d = Math.max(2, distance(fire.position, point));
    const mw = Number(fire.metadata.intensityMw ?? fire.metadata.intensity ?? 1);
    return Math.min(80, mw * 120 / (d * d));
  }

  private hazardPenalty(snapshot: WorldSnapshot, point: Vec3): number {
    const fireRisk = snapshot.twins.filter(t => t.kind === 'fire' && t.active)
      .reduce((sum, fire) => sum + this.hazardIntensity(fire, point), 0);
    const releaseRisk = snapshot.twins.filter(t => t.kind === 'release' && t.active)
      .reduce((sum, release) => sum + Math.min(40, 20 / Math.max(2, distance(release.position, point))), 0);
    return clamp((fireRisk + releaseRisk) / 20, 0, 8);
  }

  private assetFailurePenalty(snapshot: WorldSnapshot, id: string): number {
    const t = snapshot.twins.find(x => x.id === id);
    return t && (t.integrity <= 0.1 || t.metadata.failed || t.metadata.ruptured) ? 100 : 0;
  }

  private failedCount(snapshot: WorldSnapshot): number {
    return snapshot.twins.filter(t => t.integrity <= 0.1 || t.metadata.failed || t.metadata.ruptured).length;
  }

  private maxDose(snapshot: WorldSnapshot): number {
    return Math.max(0, ...snapshot.twins.filter(t => t.kind === 'worker').map(w => Number(w.metadata.thermalDose ?? 0)));
  }

  private loss(snapshot: WorldSnapshot): number {
    let total = 0;
    for (const t of snapshot.twins) {
      if (t.integrity <= 0.2 || t.metadata.ruptured || t.metadata.failed) {
        if (t.kind === 'tank') total += 2.5;
        else if (t.kind === 'pipe') total += 0.4;
        else if (t.kind === 'pump') total += 0.25;
        else if (t.kind === 'wall') total += 0.1;
      }
    }
    if (snapshot.twins.some(t => t.kind === 'blast')) total += 6;
    return total;
  }
}
