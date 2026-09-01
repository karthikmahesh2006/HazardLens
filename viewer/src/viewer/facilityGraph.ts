export interface FacilityZone {
  id: string;
  name: string;
  assets: string[];
  safetyRadius: number;
}

export interface FacilityConnection {
  from: string;
  to: string;
  type: 'pipe' | 'walkway' | 'emergency_route' | 'control' | 'suppression';
}

export class FacilityGraph {
  zones: FacilityZone[] = [
    {
      id: 'feed_storage',
      name: 'High-Pressure Sphere Farm',
      assets: ['T-01_SPHERE', 'T-02_SPHERE'],
      safetyRadius: 30
    },
    {
      id: 'pumping_station',
      name: 'Hydrocarbon Feed Pump Station',
      assets: ['PUMP-01', 'PUMP-02', 'ESV-101'],
      safetyRadius: 20
    },
    {
      id: 'transfer_manifold',
      name: 'Process Distribution Manifold',
      assets: ['P-10', 'P-17', 'P-22', 'V-12'],
      safetyRadius: 18
    },
    {
      id: 'product_storage',
      name: 'Bullet & Atmospheric Storage Yard',
      assets: ['T-03_BULLET', 'T-04_BULLET', 'T-05_STORAGE'],
      safetyRadius: 28
    },
    {
      id: 'safety_perimeter',
      name: 'Fire Protection & Flare Perimeter',
      assets: ['DELUGE-01', 'DELUGE-02', 'FLARE-01', 'W-01', 'W-07'],
      safetyRadius: 40
    },
    {
      id: 'personnel',
      name: 'Active Field Operations & Muster Area',
      assets: ['WORKER-ALPHA', 'WORKER-BRAVO'],
      safetyRadius: 15
    }
  ];

  connections: FacilityConnection[] = [
    { from: 'T-01_SPHERE', to: 'P-10', type: 'pipe' },
    { from: 'T-02_SPHERE', to: 'P-10', type: 'pipe' },
    { from: 'P-10', to: 'ESV-101', type: 'pipe' },
    { from: 'ESV-101', to: 'PUMP-01', type: 'pipe' },
    { from: 'PUMP-01', to: 'P-17', type: 'pipe' },
    { from: 'P-17', to: 'V-12', type: 'pipe' },
    { from: 'V-12', to: 'P-22', type: 'pipe' },
    { from: 'P-22', to: 'T-03_BULLET', type: 'pipe' },
    { from: 'P-22', to: 'T-04_BULLET', type: 'pipe' },
    { from: 'T-04_BULLET', to: 'T-05_STORAGE', type: 'pipe' },
    { from: 'PUMP-01', to: 'FLARE-01', type: 'emergency_route' },
    { from: 'DELUGE-01', to: 'P-17', type: 'suppression' },
    { from: 'DELUGE-02', to: 'T-04_BULLET', type: 'suppression' },
    { from: 'WORKER-ALPHA', to: 'pumping_station', type: 'walkway' },
    { from: 'WORKER-BRAVO', to: 'product_storage', type: 'walkway' }
  ];

  findZone(assetId: string) {
    return this.zones.find(zone => zone.assets.includes(assetId));
  }

  neighbors(assetId: string) {
    return this.connections
      .filter(c => c.from === assetId || c.to === assetId)
      .map(c => (c.from === assetId ? c.to : c.from));
  }
}

